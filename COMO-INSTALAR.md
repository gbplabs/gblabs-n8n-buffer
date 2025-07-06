# Cómo Instalar el Nodo ChatBuffer en n8n

## 🎯 Objetivo
Instalar tu nodo personalizado ChatBuffer en tu instancia de n8n existente.

## 📋 Requisitos
- n8n ya instalado y funcionando
- Acceso de administrador/root si usas Docker

---

## 🚀 Método 1: Instalación Automática
```bash
./install-node.sh
```

---

## 🔧 Método 2: Instalación Manual

### Para n8n en Docker:

#### 1. Identificar tu contenedor n8n
```bash
docker ps | grep n8n
```

#### 2. Copiar archivos al contenedor
```bash
# Reemplaza CONTAINER_ID con el ID de tu contenedor
CONTAINER_ID=$(docker ps | grep n8n | awk '{print $1}')

# Crear directorio custom
docker exec -u root $CONTAINER_ID mkdir -p /home/node/.n8n/custom

# Copiar nodo ChatBuffer
docker cp nodes/ChatBuffer/ $CONTAINER_ID:/home/node/.n8n/custom/
```

#### 3. Instalar dependencias
```bash
# Instalar sqlite3 en el contenedor
docker exec -u root $CONTAINER_ID npm install -g sqlite3

# Configurar permisos
docker exec -u root $CONTAINER_ID chown -R node:node /home/node/.n8n/custom
```

#### 4. Reiniciar n8n
```bash
docker restart $CONTAINER_ID
```

### Para n8n instalado globalmente:

#### 1. Crear directorio custom
```bash
mkdir -p ~/.n8n/custom
```

#### 2. Copiar archivos del nodo
```bash
cp -r nodes/ChatBuffer ~/.n8n/custom/
```

#### 3. Instalar dependencias
```bash
npm install -g sqlite3
```

#### 4. Configurar variable de entorno
```bash
export NODE_FUNCTION_ALLOW_EXTERNAL=*
```

#### 5. Reiniciar n8n
```bash
# Detener n8n (Ctrl+C si está ejecutándose)
# Luego ejecutar:
n8n start
```

---

## ✅ Verificar Instalación

1. Accede a tu instancia de n8n (generalmente http://localhost:5678)
2. Crea un nuevo workflow
3. Busca "ChatBuffer" en la paleta de nodos
4. Debería aparecer en la categoría "Transform"

## 🔍 Solución de Problemas

### El nodo no aparece
- Verifica que los archivos estén en `~/.n8n/custom/ChatBuffer/`
- Reinicia n8n completamente
- Revisa los logs de n8n para errores

### Error de sqlite3
```bash
# Para Docker
docker exec -u root CONTAINER_ID npm install -g sqlite3

# Para instalación global
npm install -g sqlite3
```

### Error de permisos
```bash
# Para Docker
docker exec -u root CONTAINER_ID chown -R node:node /home/node/.n8n/custom

# Para instalación global
sudo chown -R $USER ~/.n8n/custom
```

## 📁 Estructura Final
```
~/.n8n/custom/
└── ChatBuffer/
    ├── ChatBuffer.node.ts
    ├── ChatBuffer.node.json
    ├── ChatBufferDescription.ts
    └── chatbuffer.svg
```

## 🎉 ¡Listo!
Tu nodo ChatBuffer ya está instalado y listo para usar en n8n. 