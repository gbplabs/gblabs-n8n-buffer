# Technical Context: Chat Buffer Implementation

## Stack Tecnológico

### Plataforma Base
- **n8n**: Plataforma de automatización workflow
- **Node.js**: Runtime (>=20.15)
- **TypeScript**: Lenguaje principal de desarrollo
- **npm/pnpm**: Gestión de dependencias (pnpm preferido)

### Estructura del Proyecto
```
n8n-nodes-gbplabs-chat-buffer/
├── nodes/ChatBuffer/           # Nodo principal
│   ├── nodes/ChatBuffer/       # Implementación del nodo
│   │   ├── ChatBuffer.node.ts  # Código principal
│   │   ├── ChatBuffer.node.json # Configuración
│   │   └── chatbuffer.svg      # Icono
│   ├── credentials/            # Credenciales (vacío)
│   ├── dist/                   # Código compilado
│   └── package.json           # Configuración del nodo
├── dist/                      # Build output
├── memory-bank/               # Documentación del proyecto
└── package.json              # Configuración principal
```

## Dependencias

### Dependencias de Desarrollo
```json
{
  "@types/node": "^18.16.16",
  "@typescript-eslint/parser": "^5.59.8",
  "eslint": "^8.42.0",
  "eslint-plugin-n8n-nodes-base": "^1.11.0",
  "n8n-workflow": "^1.0.0",
  "typescript": "^5.1.3"
}
```

### APIs de n8n Utilizadas
- **IExecuteFunctions**: Contexto de ejecución del nodo
- **INodeExecutionData**: Estructura de datos de entrada/salida
- **INodeType**: Interfaz base para nodos personalizados
- **INodeTypeDescription**: Configuración del nodo
- **NodeOperationError**: Manejo de errores
- **NodeConnectionType**: Tipos de conexión

## Configuración de Desarrollo

### Scripts de Build
```json
{
  "build": "tsc && cp nodes/ChatBuffer/nodes/ChatBuffer/chatbuffer.svg dist/nodes/ChatBuffer/nodes/ChatBuffer/",
  "dev": "tsc --watch",
  "lint": "eslint nodes package.json --fix"
}
```

### TypeScript Configuration
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./nodes",
    "strict": true,
    "esModuleInterop": true
  }
}
```

## Arquitectura del Nodo

### Estructura de Clase
```typescript
export class ChatBuffer implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'Chat Buffer',
    name: 'chatBuffer',
    icon: 'file:chatbuffer.svg',
    group: ['transform'],
    version: 1.1,
    // ... configuración
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    // ... lógica principal
  }
}
```

### Parámetros del Nodo
```typescript
properties: [
  {
    displayName: 'Session ID',
    name: 'sessionId',
    type: 'string',
    required: true,
    default: '={{ $json.sessionId || $json.jid || "default" }}'
  },
  // ... otros parámetros
]
```

## Implementación Técnica

### Buffer Global en Memoria
```typescript
const memoryBuffer: {
  [key: string]: {
    messages: { message: string; timestamp: number }[];
    timeout: number;
    separator: string;
  };
} = {};
```

### Lógica de Timeout
```typescript
// Espera interna replicando nodo Wait
await new Promise(resolve => setTimeout(resolve, timeout));

// Verificación de último mensaje
if (lastMessage.timestamp === messageTimestamp) {
  // Procesar buffer
}
```

### Manejo de Errores
```typescript
try {
  // Lógica principal
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
```

## Entorno de Despliegue

### Instalación Local
```bash
npm install n8n-nodes-gbplabs-chat-buffer
```

### Docker Support
```dockerfile
FROM n8nio/n8n
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
```

### Scripts de Instalación
- `install.sh`: Instalación automática en sistemas Linux/macOS
- `install-node.sh`: Instalación específica del nodo
- `run.sh`: Ejecución rápida para desarrollo

## Configuración n8n

### Registro del Nodo
```json
{
  "n8n": {
    "n8nNodesApiVersion": 1,
    "credentials": [],
    "nodes": [
      "dist/nodes/ChatBuffer/nodes/ChatBuffer/ChatBuffer.node.js"
    ]
  }
}
```

### Categorización
- **Grupo**: transform
- **Categoría**: Utility
- **Versión**: 1.1

## Limitaciones Técnicas

### Memoria y Persistencia
- **Buffer en RAM**: Se pierde al reiniciar n8n
- **Escala**: Limitada por memoria disponible
- **Concurrencia**: Depende de la arquitectura de n8n

### Compatibilidad
- **n8n**: Requiere v1.0+
- **Node.js**: Requiere v20.15+
- **Sistema**: Funciona en Linux, macOS, Windows

## Patrones de Código

### Uso de Parámetros n8n
```typescript
const sessionId = this.getNodeParameter('sessionId', i) as string;
const message = this.getNodeParameter('message', i) as string;
```

### Expresiones Dinámicas
```typescript
default: '={{ $json.sessionId || $json.jid || "default" }}'
```

### Estructura de Salida
```typescript
const result: INodeExecutionData = {
  json: {
    jid: sessionId,
    textMessageContent: concatenatedMessage,
    messageCount: session.messages.length,
    processedAt: new Date().toISOString(),
  },
};
```

## Debugging y Monitoreo

### Logs Disponibles
- Timestamps de mensajes
- Tamaño del buffer por sesión
- Tiempo de procesamiento
- Errores de ejecución

### Herramientas de Desarrollo
- **TypeScript**: Tipado fuerte para desarrollo
- **ESLint**: Linting y estilo de código
- **Prettier**: Formateo automático
- **Watch Mode**: Desarrollo con hot reload 