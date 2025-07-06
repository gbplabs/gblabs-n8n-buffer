FROM n8nio/n8n:latest

USER root

# Instalar sqlite3 globalmente
RUN npm install -g sqlite3

# Crear directorio para nodos personalizados
RUN mkdir -p /home/node/.n8n/custom

# Copiar archivos del nodo personalizado
COPY nodes/ChatBuffer/ /home/node/.n8n/custom/
COPY package.json /home/node/.n8n/custom/

# Cambiar propietario de los archivos
RUN chown -R node:node /home/node/.n8n/custom

USER node

# Configurar variables de entorno
ENV NODE_FUNCTION_ALLOW_EXTERNAL=*

# Configurar NODE_PATH para que n8n encuentre los módulos
ENV NODE_PATH /usr/local/lib/node_modules 