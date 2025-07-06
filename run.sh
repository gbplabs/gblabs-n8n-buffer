#!/bin/bash

echo "🚀 Construyendo imagen Docker con nodo ChatBuffer..."

# Detener contenedores existentes
docker-compose down

# Construir la imagen
docker-compose build

# Ejecutar el contenedor
docker-compose up -d

echo "✅ n8n está ejecutándose en http://localhost:5678"
echo "🔧 Tu nodo ChatBuffer está listo para usar"

# Mostrar logs
docker-compose logs -f 