![Banner image](https://user-images.githubusercontent.com/10284570/173569848-c624317f-42b1-45a6-ab09-f0ea3c247648.png)

# n8n-nodes-starter

This repo contains example nodes to help you get started building your own custom integrations for [n8n](https://n8n.io). It includes the node linter and other dependencies.

To make your custom node available to the community, you must create it as an npm package, and [submit it to the npm registry](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry).

If you would like your node to be available on n8n cloud you can also [submit your node for verification](https://docs.n8n.io/integrations/creating-nodes/deploy/submit-community-nodes/).

## Prerequisites

You need the following installed on your development machine:

* [git](https://git-scm.com/downloads)
* Node.js and npm. Minimum version Node 20. You can find instructions on how to install both using nvm (Node Version Manager) for Linux, Mac, and WSL [here](https://github.com/nvm-sh/nvm). For Windows users, refer to Microsoft's guide to [Install NodeJS on Windows](https://docs.microsoft.com/en-us/windows/dev-environment/javascript/nodejs-on-windows).
* Install n8n with:
  ```
  npm install n8n -g
  ```
* Recommended: follow n8n's guide to [set up your development environment](https://docs.n8n.io/integrations/creating-nodes/build/node-development-environment/).

## Using this starter

These are the basic steps for working with the starter. For detailed guidance on creating and publishing nodes, refer to the [documentation](https://docs.n8n.io/integrations/creating-nodes/).

1. [Generate a new repository](https://github.com/n8n-io/n8n-nodes-starter/generate) from this template repository.
2. Clone your new repo:
   ```
   git clone https://github.com/<your organization>/<your-repo-name>.git
   ```
3. Run `npm i` to install dependencies.
4. Open the project in your editor.
5. Browse the examples in `/nodes` and `/credentials`. Modify the examples, or replace them with your own nodes.
6. Update the `package.json` to match your details.
7. Run `npm run lint` to check for errors or `npm run lintfix` to automatically fix errors when possible.
8. Test your node locally. Refer to [Run your node locally](https://docs.n8n.io/integrations/creating-nodes/test/run-node-locally/) for guidance.
9. Replace this README with documentation for your node. Use the [README_TEMPLATE](README_TEMPLATE.md) to get started.
10. Update the LICENSE file to use your details.
11. [Publish](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry) your package to npm.

## More information

Refer to our [documentation on creating nodes](https://docs.n8n.io/integrations/creating-nodes/) for detailed information on building your own nodes.

## License

[MIT](https://github.com/n8n-io/n8n-nodes-starter/blob/master/LICENSE.md)

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
2. **Rendimiento**: SQLite es más rápido que MongoDB para este caso de uso
3. **Portabilidad**: No requiere configuración de MongoDB
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
