import { INodeProperties } from 'n8n-workflow';

export const chatBufferOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['messageBuffer'],
			},
		},
		options: [
			{
				name: 'Buffer Message',
				value: 'bufferMessage',
				description: 'Agregar mensaje al buffer temporal y procesar cuando expire el timeout',
				action: 'Agregar mensaje al buffer temporal',
			},
		],
		default: 'bufferMessage',
	},
];

// Campos para la operación "Buffer Message"
const bufferMessageOperation: INodeProperties[] = [
	{
		displayName: 'Session ID',
		name: 'sessionId',
		type: 'string',
		default: '={{ $json.sessionId || $json.jid || "default" }}',
		required: true,
		description: 'ID único de la sesión/conversación',
		displayOptions: {
			show: {
				resource: ['messageBuffer'],
				operation: ['bufferMessage'],
			},
		},
	},
	{
		displayName: 'Message',
		name: 'message',
		type: 'string',
		default: '={{ $json.message || $json.textMessageContent || "" }}',
		required: true,
		description: 'Contenido del mensaje a agregar al buffer',
		displayOptions: {
			show: {
				resource: ['messageBuffer'],
				operation: ['bufferMessage'],
			},
		},
	},
	{
		displayName: 'Timeout (ms)',
		name: 'timeout',
		type: 'number',
		default: 3000,
		required: true,
		description: 'Tiempo en milisegundos a esperar antes de procesar el buffer',
		displayOptions: {
			show: {
				resource: ['messageBuffer'],
				operation: ['bufferMessage'],
			},
		},
	},
	{
		displayName: 'Separator',
		name: 'separator',
		type: 'string',
		default: '. ',
		description: 'Separador para concatenar los mensajes (por defecto: ". ")',
		displayOptions: {
			show: {
				resource: ['messageBuffer'],
				operation: ['bufferMessage'],
			},
		},
	},
	{
		displayName: 'Database Path',
		name: 'dbPath',
		type: 'string',
		default: '/tmp/n8n_message_buffer.db',
		description: 'Ruta del archivo de base de datos SQLite',
		displayOptions: {
			show: {
				resource: ['messageBuffer'],
				operation: ['bufferMessage'],
			},
		},
	},
];

export const chatBufferFields: INodeProperties[] = [
	...bufferMessageOperation,
]; 