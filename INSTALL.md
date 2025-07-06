# Instalación del Nodo ChatBuffer para n8n

## Descripción
Este nodo personalizado permite crear un buffer temporal de mensajes de chat usando SQLite, replicando la funcionalidad de un workflow complejo en un solo nodo.

## Requisitos Previos
- Docker y Docker Compose instalados
- Puerto 5678 disponible

## Instalación con Docker (Recomendado)

### 1. Clonar o descargar este repositorio
```bash
git clone <tu-repositorio>
cd n8nodes
```

### 2. Construir y ejecutar
```bash
./run.sh
```

### 3. Acceder a n8n
Abre tu navegador en: http://localhost:5678

### 4. Verificar instalación
- Busca el nodo "ChatBuffer" en la paleta de nodos
- Debería aparecer en la categoría "Transform"

## Instalación Manual (Instancia Global)

Si tienes n8n instalado globalmente:

### 1. Copiar archivos
```bash
# Crear directorio personalizado
mkdir -p ~/.n8n/custom

# Copiar nodo
cp -r nodes/ChatBuffer ~/.n8n/custom/
cp package.json ~/.n8n/custom/
```

### 2. Instalar dependencias
```bash
npm install -g sqlite3
```

### 3. Configurar variables de entorno
```bash
export NODE_FUNCTION_ALLOW_EXTERNAL=*
```

### 4. Reiniciar n8n
```bash
n8n start
```

## Uso del Nodo

### Parámetros de Entrada
- **Session ID**: Identificador de la sesión de chat
- **Message**: Mensaje a agregar al buffer
- **Timeout (ms)**: Tiempo de espera antes de procesar (default: 3000ms)
- **Separator**: Separador entre mensajes (default: ". ")
- **Database Path**: Ruta de la base de datos SQLite

### Salidas
- **Buffer Activo**: `{success: true, bufferActive: true, bufferSize: X, timeRemaining: Y}`
- **Buffer Procesado**: `{textMessageContent: "concatenated", jid: sessionId, bufferProcessed: true, messagesCount: X}`

## Solución de Problemas

### Error: Cannot find module 'sqlite3'
```bash
# En Docker
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# En instalación global
npm install -g sqlite3
```

### El nodo no aparece en n8n
1. Verificar que los archivos estén en `~/.n8n/custom/`
2. Reiniciar n8n completamente
3. Verificar permisos de archivos

### Errores de base de datos
- Verificar que el directorio `/tmp/` sea escribible
- Cambiar la ruta de la base de datos si es necesario

## Estructura del Proyecto
```
n8nodes/
├── nodes/
│   └── ChatBuffer/
│       ├── ChatBuffer.node.ts
│       ├── ChatBuffer.node.json
│       ├── ChatBufferDescription.ts
│       └── chatbuffer.svg
├── Dockerfile
├── docker-compose.yml
├── run.sh
└── INSTALL.md
```

## Soporte
Para problemas o preguntas, revisa los logs de Docker:
```bash
docker-compose logs -f
``` 