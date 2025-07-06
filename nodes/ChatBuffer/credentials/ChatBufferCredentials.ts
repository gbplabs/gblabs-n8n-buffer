import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ChatBufferCredentials implements ICredentialType {
	name = 'chatBufferCredentials';
	displayName = 'Chat Buffer Credentials';
	documentationUrl = 'https://github.com/usuario/n8n-nodes-chatbuffer';
	properties: INodeProperties[] = [
		{
			displayName: 'Database Path',
			name: 'databasePath',
			type: 'string',
			default: '',
			description: 'Ruta personalizada para la base de datos SQLite (opcional)',
		},
		{
			displayName: 'Max Connections',
			name: 'maxConnections',
			type: 'number',
			default: 10,
			description: 'Número máximo de conexiones concurrentes a la base de datos',
		},
	];
} 