import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';

import Database from 'better-sqlite3';
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

		try {
			// Asegurar que la tabla existe
			db.exec(`
				CREATE TABLE IF NOT EXISTS message_buffer (
					id INTEGER PRIMARY KEY AUTOINCREMENT,
					session_id TEXT NOT NULL,
					message TEXT NOT NULL,
					timestamp INTEGER NOT NULL,
					created_at TEXT NOT NULL
				)
			`);

			// Preparar statement para insertar mensajes
			const insertStmt = db.prepare(`
				INSERT INTO message_buffer (session_id, message, timestamp, created_at) 
				VALUES (?, ?, ?, ?)
			`);

			for (let i = 0; i < items.length; i++) {
				const sessionId = this.getNodeParameter('sessionId', i) as string;
				const message = this.getNodeParameter('message', i) as string;
				const timeout = this.getNodeParameter('timeout', i) as number;
				const separator = this.getNodeParameter('separator', i) as string;

				const currentTime = Date.now();

				// 1. Agregar el mensaje actual al buffer
				insertStmt.run(sessionId, message, currentTime, new Date().toISOString());

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

	private static processBuffer(
		db: Database.Database,
		sessionId: string,
		separator: string,
	): INodeExecutionData | null {
		try {
			// Obtener todos los mensajes del buffer para esta sesión
			const messages = db
				.prepare(
					'SELECT message, timestamp FROM message_buffer WHERE session_id = ? ORDER BY timestamp ASC',
				)
				.all(sessionId);

			if (messages.length === 0) {
				return null;
			}

			// Concatenar mensajes
			const concatenatedMessage = messages.map((msg: any) => msg.message).join(separator);

			// Limpiar el buffer para esta sesión
			db.prepare('DELETE FROM message_buffer WHERE session_id = ?').run(sessionId);

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
		globalCheckInterval = setInterval(() => {
			try {
				const dbPath = ChatBuffer.initializeDatabase();
				const db = new Database(dbPath);

				try {
					// Obtener todas las sesiones con su último mensaje
					const sessions = db
						.prepare(
							`
						SELECT session_id, MAX(timestamp) as last_message_timestamp 
						FROM message_buffer 
						GROUP BY session_id
					`,
						)
						.all();

					const currentTime = Date.now();

					for (const session of sessions) {
						const sessionData = session as any;
						const timeDiff = currentTime - sessionData.last_message_timestamp;

						if (timeDiff >= defaultTimeout) {
							// Procesar el buffer para esta sesión
							const result = ChatBuffer.processBuffer(db, sessionData.session_id, defaultSeparator);

							if (result) {
								// Almacenar el resultado para la próxima ejecución del nodo
								const pendingKey = `${sessionData.session_id}_${defaultTimeout}_${defaultSeparator}`;
								pendingEmissions.set(pendingKey, result);
							}
						}
					}
				} finally {
					db.close();
				}
			} catch (error) {
				console.error('Error en globalCheckLoop:', error);
			}
		}, 1000);
	}

	private static initializeDatabase(): string {
		const dbDir = path.join('/tmp', 'n8n-chat-buffer');

		// Crear directorio si no existe
		if (!fs.existsSync(dbDir)) {
			fs.mkdirSync(dbDir, { recursive: true });
		}

		return path.join(dbDir, 'message_buffer.db');
	}
}
