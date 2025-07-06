#!/bin/bash

echo "🔧 Instalando nodo ChatBuffer en n8n..."

# Detectar si n8n está en Docker o instalado globalmente
if command -v docker &> /dev/null && docker ps | grep -q n8n; then
    echo "📦 Detectado n8n en Docker"
    
    # Copiar archivos al contenedor Docker
    CONTAINER_ID=$(docker ps | grep n8n | awk '{print $1}')
    
    if [ -z "$CONTAINER_ID" ]; then
        echo "❌ No se encontró contenedor n8n ejecutándose"
        exit 1
    fi
    
    echo "📋 Copiando archivos al contenedor $CONTAINER_ID"
    
    # Crear directorio custom en el contenedor
    docker exec -u root $CONTAINER_ID mkdir -p /home/node/.n8n/custom
    
    # Copiar archivos del nodo
    docker cp nodes/ChatBuffer/ $CONTAINER_ID:/home/node/.n8n/custom/
    
    # Instalar sqlite3 en el contenedor
    docker exec -u root $CONTAINER_ID npm install -g sqlite3
    
    # Configurar permisos
    docker exec -u root $CONTAINER_ID chown -R node:node /home/node/.n8n/custom
    
    # Reiniciar n8n
    docker restart $CONTAINER_ID
    
    echo "✅ Nodo instalado en Docker. Reiniciando contenedor..."
    
elif command -v n8n &> /dev/null; then
    echo "🌐 Detectado n8n instalado globalmente"
    
    # Crear directorio custom
    mkdir -p ~/.n8n/custom
    
    # Copiar archivos del nodo
    cp -r nodes/ChatBuffer ~/.n8n/custom/
    
    # Instalar sqlite3
    npm install -g sqlite3
    
    echo "✅ Nodo instalado globalmente"
    echo "🔄 Reinicia n8n para ver el nodo ChatBuffer"
    
else
    echo "❌ No se encontró n8n instalado"
    echo "Opciones:"
    echo "1. Instalar n8n: npm install -g n8n"
    echo "2. Usar Docker: docker run -p 5678:5678 n8nio/n8n"
    exit 1
fi

echo ""
echo "🎉 ¡Instalación completada!"
echo "📍 Busca el nodo 'ChatBuffer' en la categoría 'Transform'"
echo "🌐 Accede a n8n en: http://localhost:5678" 