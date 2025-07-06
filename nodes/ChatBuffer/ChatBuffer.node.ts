import { 
	INodeType, 
	INodeTypeDescription, 
	NodeConnectionType,
	IExecuteFunctions,
	INodeExecutionData,
	IDataObject,
} from 'n8n-workflow';
import { chatBufferOperations, chatBufferFields } from './ChatBufferDescription';
import * as sqlite3 from 'sqlite3';

export class ChatBuffer implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Chat Buffer',
		name: 'chatBuffer',
		icon: { light: 'file:chatbuffer.svg', dark: 'file:chatbuffer.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Buffer temporal de mensajes para chat con SQLite - Replica tu workflow de buffer con MongoDB',
		defaults: {
			name: 'Chat Buffer',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Message Buffer',
						value: 'messageBuffer',
					},
				],
				default: 'messageBuffer',
			},
			...chatBufferOperations,
			...chatBufferFields,
		],
	};

	private async initializeDatabase(dbPath: string): Promise<sqlite3.Database> {
		return new Promise((resolve, reject) => {
			const db = new sqlite3.Database(dbPath, (err: any) => {
				if (err) {
					reject(err);
				} else {
					// Crear tabla si no existe
					db.run(`
						CREATE TABLE IF NOT EXISTS message_buffer (
							id INTEGER PRIMARY KEY AUTOINCREMENT,
							session_id TEXT NOT NULL,
							message TEXT NOT NULL,
							timestamp INTEGER NOT NULL,
							created_at DATETIME DEFAULT CURRENT_TIMESTAMP
						)
					`, (err: any) => {
						if (err) {
							reject(err);
						} else {
							resolve(db);
						}
					});
				}
			});
		});
	}

	private async insertMessage(db: sqlite3.Database, sessionId: string, message: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const stmt = db.prepare('INSERT INTO message_buffer (session_id, message, timestamp) VALUES (?, ?, ?)');
			stmt.run([sessionId, message, Date.now()], function(err: any) {
				if (err) {
					reject(err);
				} else {
					resolve();
				}
			});
			stmt.finalize();
		});
	}

	private async getMessages(db: sqlite3.Database, sessionId: string): Promise<Array<{message: string, timestamp: number}>> {
		return new Promise((resolve, reject) => {
			db.all(
				'SELECT message, timestamp FROM message_buffer WHERE session_id = ? ORDER BY timestamp ASC',
				[sessionId],
				(err: any, rows: any[]) => {
					if (err) {
						reject(err);
					} else {
						resolve(rows);
					}
				}
			);
		});
	}

	private async clearBuffer(db: sqlite3.Database, sessionId: string): Promise<number> {
		return new Promise((resolve, reject) => {
			db.run('DELETE FROM message_buffer WHERE session_id = ?', [sessionId], function(this: any, err: any) {
				if (err) {
					reject(err);
				} else {
					resolve(this.changes);
				}
			});
		});
	}

	private async getLastMessage(db: sqlite3.Database, sessionId: string): Promise<{message: string, timestamp: number} | null> {
		return new Promise((resolve, reject) => {
			db.get(
				'SELECT message, timestamp FROM message_buffer WHERE session_id = ? ORDER BY timestamp DESC LIMIT 1',
				[sessionId],
				(err: any, row: any) => {
					if (err) {
						reject(err);
					} else {
						resolve(row || null);
					}
				}
			);
		});
	}

	private async getOldestMessage(db: sqlite3.Database, sessionId: string): Promise<{message: string, timestamp: number} | null> {
		return new Promise((resolve, reject) => {
			db.get(
				'SELECT message, timestamp FROM message_buffer WHERE session_id = ? ORDER BY timestamp ASC LIMIT 1',
				[sessionId],
				(err: any, row: any) => {
					if (err) {
						reject(err);
					} else {
						resolve(row || null);
					}
				}
			);
		});
	}

	private async getBufferSize(db: sqlite3.Database, sessionId: string): Promise<number> {
		return new Promise((resolve, reject) => {
			db.get(
				'SELECT COUNT(*) as count FROM message_buffer WHERE session_id = ?',
				[sessionId],
				(err: any, row: any) => {
					if (err) {
						reject(err);
					} else {
						resolve(row.count || 0);
					}
				}
			);
		});
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;
			const sessionId = this.getNodeParameter('sessionId', i) as string;
			const message = this.getNodeParameter('message', i) as string;
			const timeout = this.getNodeParameter('timeout', i) as number;
			const separator = this.getNodeParameter('separator', i) as string;
			const dbPath = this.getNodeParameter('dbPath', i) as string;

			let responseData: IDataObject = {};

			try {
				const db = await this.initializeDatabase(dbPath);

				switch (operation) {
					case 'bufferMessage':
						const currentTime = Date.now();
						
						// 1. Insertar el mensaje actual en la base de datos
						await this.insertMessage(db, sessionId, message);

						// 2. Verificar si hay mensajes antiguos que procesar
						// Buscar el mensaje más antiguo de esta sesión
						const oldestMessage = await this.getOldestMessage(db, sessionId);
						
						if (oldestMessage && (currentTime - oldestMessage.timestamp) >= timeout) {
							// Ha pasado el tiempo suficiente, procesar el buffer
							
							// 3. Obtener todos los mensajes del buffer para esta sesión
							const messages = await this.getMessages(db, sessionId);
							
							if (messages.length > 0) {
								// 4. Concatenar mensajes
								const concatenatedMessage = messages
									.map((msg: any) => msg.message)
									.join(separator);

								// 5. Limpiar buffer de esta sesión
								const deletedCount = await this.clearBuffer(db, sessionId);

								responseData = {
									success: true,
									sessionId,
									textMessageContent: concatenatedMessage, // Usar el mismo nombre que tu workflow
									jid: sessionId, // Para compatibilidad con tu workflow
									bufferProcessed: true,
									messagesCount: messages.length,
									deletedCount,
									processingTime: currentTime - oldestMessage.timestamp,
								};
							} else {
								responseData = {
									success: true,
									sessionId,
									message: 'Buffer vacío al procesar',
									bufferProcessed: false,
								};
							}
						} else {
							// No ha pasado suficiente tiempo, solo agregar al buffer
							const bufferSize = await this.getBufferSize(db, sessionId);
							
							responseData = {
								success: true,
								sessionId,
								message: 'Mensaje agregado al buffer',
								bufferActive: true,
								bufferSize,
								waitingForTimeout: true,
								timeRemaining: oldestMessage ? timeout - (currentTime - oldestMessage.timestamp) : timeout,
							};
						}
						break;

					default:
						throw new Error(`Operación no soportada: ${operation}`);
				}

				db.close();
			} catch (error: any) {
				responseData = {
					success: false,
					error: error.message,
					sessionId,
				};
			}

			returnData.push({
				json: responseData,
				pairedItem: {
					item: i,
				},
			});
		}

		return [returnData];
	}
} 