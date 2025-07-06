import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';

// Buffer global en memoria
const memoryBuffer: Record<string, Array<{ message: string; timestamp: number }>> = {};

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

		try {
			for (let i = 0; i < items.length; i++) {
				const sessionId = this.getNodeParameter('sessionId', i) as string;
				const message = this.getNodeParameter('message', i) as string;
				const timeout = this.getNodeParameter('timeout', i) as number;
				const separator = this.getNodeParameter('separator', i) as string;

				const currentTime = Date.now();

				// 1. Agregar el mensaje actual al buffer en memoria
				if (!memoryBuffer[sessionId]) {
					memoryBuffer[sessionId] = [];
				}
				memoryBuffer[sessionId].push({ message, timestamp: currentTime });

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
		}

		// Solo retornar datos si hay mensajes procesados
		return returnData.length > 0 ? [returnData] : [];
	}

	private static processBuffer(sessionId: string, separator: string): INodeExecutionData | null {
		const messages = memoryBuffer[sessionId] || [];
		if (messages.length === 0) {
			return null;
		}

		// Concatenar mensajes
		const concatenatedMessage = messages.map((msg) => msg.message).join(separator);

		// Limpiar el buffer para esta sesión
		delete memoryBuffer[sessionId];

		return {
			json: {
				sessionId,
				concatenatedMessage,
			},
		};
	}

	private static startGlobalCheckLoop(defaultTimeout: number, defaultSeparator: string): void {
		if (globalCheckInterval) {
			clearInterval(globalCheckInterval);
		}

		globalCheckInterval = setInterval(() => {
			try {
				const currentTime = Date.now();
				for (const sessionId of Object.keys(memoryBuffer)) {
					const messages = memoryBuffer[sessionId];
					if (!messages || messages.length === 0) continue;
					const oldest = messages[0];
					const timeDiff = currentTime - oldest.timestamp;
					if (timeDiff >= defaultTimeout) {
						const result = ChatBuffer.processBuffer(sessionId, defaultSeparator);
						if (result) {
							const pendingKey = `${sessionId}_${defaultTimeout}_${defaultSeparator}`;
							pendingEmissions.set(pendingKey, result);
						}
					}
				}
			} catch (error) {
				console.error('Error en globalCheckLoop:', error);
			}
		}, 1000);
	}
}
