import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';

import { Database } from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs';

// Variable global para el loop de verificación
let globalCheckInterval: NodeJS.Timeout | null = null;

// Queue para almacenar mensajes procesados que necesitan ser emitidos
const pendingEmissions = new Map<string, any>();

export class ChatBuffer implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Chat Buffer',
		name: 'chatBuffer',
		icon: { light: 'file:chatbuffer.svg', dark: 'file:chatbuffer.svg' },
		group: ['transform'],
		version: 1,
		subtitle: 'Buffer temporal de mensajes',
		description: 'Acumula mensajes temporalmente y los envía concatenados después del timeout',
		defaults: {
			name: 'Chat Buffer',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				required: true,
				default: '={{ $json.sessionId || $json.jid || "default" }}',
				description: 'ID único de la sesión de chat',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				required: true,
				default: '={{ $json.message || $json.textMessageContent || "" }}',
				description: 'Contenido del mensaje a agregar al buffer',
			},
			{
				displayName: 'Timeout (Ms)',
				name: 'timeout',
				type: 'number',
				default: 3000,
				required: true,
				description: 'Tiempo en milisegundos a esperar antes de procesar el buffer',
			},
			{
				displayName: 'Separator',
				name: 'separator',
				type: 'string',
				default: '. ',
				description: 'Separador para concatenar los mensajes (por defecto: ". ").',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Inicializar base de datos
		const dbPath = ChatBuffer.initializeDatabase();
		const db = new Database(dbPath);

		// Asegurar que la tabla existe antes de continuar
		await new Promise<void>((resolve, reject) => {
			db.serialize(() => {
				db.run(
					`
					CREATE TABLE IF NOT EXISTS message_buffer (
						id INTEGER PRIMARY KEY AUTOINCREMENT,
						session_id TEXT NOT NULL,
						message TEXT NOT NULL,
						timestamp INTEGER NOT NULL,
						created_at TEXT NOT NULL
					)
				`,
					function (err: any) {
						if (err) reject(err);
						else resolve();
					},
				);
			});
		});

		try {
			for (let i = 0; i < items.length; i++) {
				const sessionId = this.getNodeParameter('sessionId', i) as string;
				const message = this.getNodeParameter('message', i) as string;
				const timeout = this.getNodeParameter('timeout', i) as number;
				const separator = this.getNodeParameter('separator', i) as string;

				const currentTime = Date.now();

				// 1. Agregar el mensaje actual al buffer
				await new Promise<void>((resolve, reject) => {
					db.run(
						`INSERT INTO message_buffer (session_id, message, timestamp, created_at) 
						 VALUES (?, ?, ?, ?)`,
						[sessionId, message, currentTime, new Date().toISOString()],
						function (err: any) {
							if (err) reject(err);
							else resolve();
						},
					);
				});

				// 2. Iniciar el loop global de verificación si no existe
				if (!globalCheckInterval) {
					ChatBuffer.startGlobalCheckLoop(timeout, separator);
				}

				// 3. Verificar si hay mensajes pendientes para emitir de ejecuciones anteriores
				const pendingKey = `${sessionId}_${timeout}_${separator}`;
				if (pendingEmissions.has(pendingKey)) {
					const pendingData = pendingEmissions.get(pendingKey);
					pendingEmissions.delete(pendingKey);
					returnData.push(pendingData);
				}
			}
		} catch (error: any) {
			throw new NodeOperationError(this.getNode(), `Error en ChatBuffer: ${error.message}`);
		} finally {
			db.close();
		}

		// Solo retornar datos si hay mensajes procesados
		return returnData.length > 0 ? [returnData] : [];
	}

	private static async processBuffer(
		db: Database,
		sessionId: string,
		separator: string,
	): Promise<INodeExecutionData | null> {
		try {
			// Obtener todos los mensajes del buffer para esta sesión
			const messages = await new Promise<any[]>((resolve, reject) => {
				db.all(
					'SELECT message, timestamp FROM message_buffer WHERE session_id = ? ORDER BY timestamp ASC',
					[sessionId],
					function (err: any, rows: any[]) {
						if (err) reject(err);
						else resolve(rows);
					},
				);
			});

			if (messages.length === 0) {
				return null;
			}

			// Concatenar mensajes
			const concatenatedMessage = messages.map((msg: any) => msg.message).join(separator);

			// Limpiar el buffer para esta sesión
			await new Promise<void>((resolve, reject) => {
				db.run('DELETE FROM message_buffer WHERE session_id = ?', [sessionId], function (err: any) {
					if (err) reject(err);
					else resolve();
				});
			});

			// Retornar solo sessionId y concatenatedMessage
			return {
				json: {
					sessionId,
					concatenatedMessage,
				},
			};
		} catch (error) {
			console.error('Error en processBuffer:', error);
			return null;
		}
	}

	private static startGlobalCheckLoop(defaultTimeout: number, defaultSeparator: string): void {
		// Limpiar interval anterior si existe
		if (globalCheckInterval) {
			clearInterval(globalCheckInterval);
		}

		// Crear nuevo interval que verifica cada 1000ms
		globalCheckInterval = setInterval(async () => {
			try {
				const dbPath = ChatBuffer.initializeDatabase();
				const db = new Database(dbPath);

				// Obtener todas las sesiones con su último mensaje
				const sessions = await new Promise<any[]>((resolve, reject) => {
					db.all(
						`SELECT session_id, MAX(timestamp) as last_message_timestamp 
						 FROM message_buffer 
						 GROUP BY session_id`,
						function (err: any, rows: any[]) {
							if (err) reject(err);
							else resolve(rows || []);
						},
					);
				});

				const currentTime = Date.now();

				// Verificar cada sesión
				for (const session of sessions) {
					const timeSinceLastMessage = currentTime - session.last_message_timestamp;

					// Si han pasado más de timeout ms desde el último mensaje
					if (timeSinceLastMessage >= defaultTimeout) {
						const processedData = await ChatBuffer.processBuffer(
							db,
							session.session_id,
							defaultSeparator,
						);

						if (processedData) {
							// Almacenar en pending emissions para la próxima ejecución
							const pendingKey = `${session.session_id}_${defaultTimeout}_${defaultSeparator}`;
							pendingEmissions.set(pendingKey, processedData);
						}
					}
				}

				db.close();
			} catch (error) {
				console.error('Error en globalCheckLoop:', error);
			}
		}, 1000); // Verificar cada 1000ms
	}

	private static initializeDatabase(): string {
		const n8nFolder = process.env.N8N_USER_FOLDER || path.join(process.cwd(), '.n8n');
		const dbFolder = path.join(n8nFolder, 'chatbuffer');
		const dbPath = path.join(dbFolder, 'messages.db');

		// Crear directorio si no existe
		if (!fs.existsSync(dbFolder)) {
			fs.mkdirSync(dbFolder, { recursive: true });
		}

		// Crear base de datos y tabla si no existen
		const db = new Database(dbPath);

		db.serialize(() => {
			db.run(`
				CREATE TABLE IF NOT EXISTS message_buffer (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					session_id TEXT NOT NULL,
					message TEXT NOT NULL,
					timestamp INTEGER NOT NULL,
					created_at TEXT NOT NULL
				)
			`);

			// Crear índices para mejorar el rendimiento
			db.run(
				'CREATE INDEX IF NOT EXISTS idx_session_timestamp ON message_buffer(session_id, timestamp)',
			);
			db.run('CREATE INDEX IF NOT EXISTS idx_session_id ON message_buffer(session_id)');
		});

		db.close();
		return dbPath;
	}
}
