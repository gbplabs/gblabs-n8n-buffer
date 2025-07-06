import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';

// Buffer global en memoria
// Estructura: { [sessionId]: { messages: [], timeout: 3000, separator: '. ' } }
const memoryBuffer: {
	[key: string]: {
		messages: { message: string; timestamp: number }[];
		timeout: number;
		separator: string;
	};
} = {};

export class ChatBuffer implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Chat Buffer',
		name: 'chatBuffer',
		icon: { light: 'file:chatbuffer.svg', dark: 'file:chatbuffer.svg' },
		group: ['transform'],
		version: 1.1,
		subtitle: 'Buffer temporal de mensajes',
		description: 'Acumula mensajes y los envía concatenados después de un timeout de inactividad',
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
				description:
					'Contenido del mensaje a agregar al buffer (El string con el texto del mensaje)',
			},
			{
				displayName: 'Timeout (Ms)',
				name: 'timeout',
				type: 'number',
				default: 3000,
				required: true,
				description: 'Tiempo de inactividad en milisegundos a esperar antes de procesar el buffer',
			},
			{
				displayName: 'Separator',
				name: 'separator',
				type: 'string',
				default: '. ',
				description: 'Separador para concatenar los mensajes (por defecto punto yespacio: ". ").',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		// Procesar los mensajes entrantes
		for (let i = 0; i < items.length; i++) {
			try {
				const sessionId = this.getNodeParameter('sessionId', i) as string;
				const message = this.getNodeParameter('message', i) as string;
				const timeout = this.getNodeParameter('timeout', i) as number;
				const separator = this.getNodeParameter('separator', i) as string;

				// Si no hay mensaje, no hacer nada
				if (!message) {
					continue;
				}

				// Crear buffer para la sesión si no existe
				if (!memoryBuffer[sessionId]) {
					memoryBuffer[sessionId] = {
						messages: [],
						timeout: timeout,
						separator: separator,
					};
				}

				// Actualizar timeout y separator por si cambiaron en el nodo
				memoryBuffer[sessionId].timeout = timeout;
				memoryBuffer[sessionId].separator = separator;

				// Agregar el mensaje actual al buffer de la sesión
				const messageTimestamp = Date.now();
				memoryBuffer[sessionId].messages.push({ message, timestamp: messageTimestamp });

				// ESPERA INTERNA - Replicando el comportamiento del nodo Wait
				// Esto permite que se acumulen mensajes durante el timeout
				await new Promise((resolve) => setTimeout(resolve, timeout));

				// Después de la espera, verificar si debemos procesar el buffer
				const session = memoryBuffer[sessionId];
				if (session && session.messages.length > 0) {
					// Obtener el último mensaje de la sesión DESPUÉS de la espera
					const lastMessage = session.messages[session.messages.length - 1];

					// Si el último mensaje es el mismo que agregamos antes de la espera,
					// significa que no llegaron mensajes nuevos durante el timeout
					if (lastMessage.timestamp === messageTimestamp) {
						// No hubo actividad nueva, procesar el buffer
						const concatenatedMessage = session.messages
							.map((msg) => msg.message)
							.join(session.separator);

						const result: INodeExecutionData = {
							json: {
								jid: sessionId,
								textMessageContent: concatenatedMessage,
								messageCount: session.messages.length,
								processedAt: new Date().toISOString(),
							},
						};

						returnData.push(result);

						// Limpiar el buffer para esta sesión
						delete memoryBuffer[sessionId];
					}
					// Si lastMessage.timestamp !== messageTimestamp, significa que llegaron
					// mensajes nuevos durante la espera, así que no procesamos todavía
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: this.getInputData(i)[0].json,
						error: error as NodeOperationError,
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
