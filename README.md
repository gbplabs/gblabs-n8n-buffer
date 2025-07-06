# n8n-nodes-chatbuffer

Este paquete contiene nodos personalizados para n8n, incluyendo un nodo de buffer de mensajes para chat.

## Nodos Incluidos

### Chat Buffer

El nodo **Chat Buffer** implementa un buffer temporal de mensajes para conversaciones de chat usando SQLite. Replica la funcionalidad del workflow manual de buffer que funciona con MongoDB, pero condensado en un solo nodo.

#### Funcionalidad

El nodo funciona de la siguiente manera:

1. **Recibe un mensaje**: Cada vez que se ejecuta, agrega el mensaje actual al buffer SQLite
2. **Verifica timeout**: Comprueba si el mensaje más antiguo del buffer ha superado el tiempo de timeout configurado
3. **Procesa o espera**: 
   - Si ha pasado el tiempo suficiente, concatena todos los mensajes del buffer y los devuelve
   - Si no, simplemente agrega el mensaje al buffer y espera

#### Parámetros

- **Session ID**: ID único de la sesión/conversación (compatible con `jid` de tu workflow)
- **Message**: Contenido del mensaje a agregar al buffer (compatible con `textMessageContent`)
- **Timeout (ms)**: Tiempo en milisegundos a esperar antes de procesar el buffer (por defecto: 3000ms)
- **Separator**: Separador para concatenar los mensajes (por defecto: ". ")
- **Database Path**: Ruta del archivo SQLite (por defecto: `/tmp/n8n_message_buffer.db`)

#### Salida

Cuando **NO** se procesa el buffer (mensaje agregado):
```json
{
  "success": true,
  "sessionId": "session123",
  "message": "Mensaje agregado al buffer",
  "bufferActive": true,
  "bufferSize": 3,
  "waitingForTimeout": true,
  "timeRemaining": 1500
}
```

Cuando **SÍ** se procesa el buffer (timeout alcanzado):
```json
{
  "success": true,
  "sessionId": "session123",
  "textMessageContent": "Mensaje 1. Mensaje 2. Mensaje 3",
  "jid": "session123",
  "bufferProcessed": true,
  "messagesCount": 3,
  "deletedCount": 3,
  "processingTime": 3250
}
```

#### Ventajas sobre el workflow manual

1. **Simplicidad**: Un solo nodo en lugar de 10+ nodos
2. **Rendimiento**: SQLite es más rápido que bases de datos para este caso de uso
3. **Portabilidad**: No requiere configuración de Ninguna DB
4. **Mantenimiento**: Más fácil de mantener y debuggear

#### Ejemplo de uso

```
Webhook → Chat Buffer → (procesar resultado)
```

El nodo se puede usar directamente en lugar de toda la cadena de nodos del workflow original.

## Instalación

```bash
npm install n8n-nodes-chatbuffer
```

## Desarrollo

```bash
# Instalar dependencias
npm install

# Compilar
npm run build

# Desarrollo con watch
npm run dev

# Linting
npm run lint
```

## Compatibilidad

- n8n v1.0+
- Node.js v20.15+

## Autor

Creado por GBPLabs
- Website: gbplabs.com
- Email: gbplabs@gmail.com
- Pablo Luis Sánchez Stahslchsmidt
- 📱 +5493541578899
