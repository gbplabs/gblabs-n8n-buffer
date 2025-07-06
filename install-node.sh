#!/bin/bash

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para logging
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Función para encontrar el contenedor n8n correcto
find_n8n_container() {
    local containers=$(docker ps --format "table {{.Names}}\t{{.Image}}" | grep -E "(n8n|n8nio)" | grep -v "n8n-mcp")
    
    if [ -z "$containers" ]; then
        error "No se encontró ningún contenedor n8n ejecutándose"
        exit 1
    fi
    
    local container_count=$(echo "$containers" | wc -l)
    
    if [ $container_count -eq 1 ]; then
        local container_name=$(echo "$containers" | awk '{print $1}')
        log "Contenedor n8n encontrado: $container_name"
        echo "$container_name"
    else
        warning "Se encontraron múltiples contenedores n8n:"
        echo "$containers"
        
        # Priorizar imagen estándar de n8n
        local standard_container=$(echo "$containers" | grep "docker.n8n.io/n8nio/n8n\|n8nio/n8n" | head -1 | awk '{print $1}')
    
        if [ -n "$standard_container" ]; then
            log "Usando contenedor estándar de n8n: $standard_container"
            echo "$standard_container"
        else
            local first_container=$(echo "$containers" | head -1 | awk '{print $1}')
            warning "Usando el primer contenedor encontrado: $first_container"
            echo "$first_container"
        fi
    fi
}

# Función principal de instalación
install_chatbuffer_node() {
    log "=== Instalación del nodo ChatBuffer ==="
    
    # Verificar que Docker esté ejecutándose
    if ! docker info > /dev/null 2>&1; then
        error "Docker no está ejecutándose"
        exit 1
    fi
    
    # Encontrar contenedor n8n
    local container_name=$(find_n8n_container)
    
    # Verificar que el directorio del nodo existe
    if [ ! -d "nodes/ChatBuffer" ]; then
        error "Directorio nodes/ChatBuffer no encontrado"
        exit 1
    fi
    
    log "Preparando el nodo ChatBuffer para instalación..."
    
    # Cambiar al directorio del nodo
    cd nodes/ChatBuffer
    
    # Verificar archivos necesarios
    local required_files=("package.json" "tsconfig.json" "nodes/ChatBuffer/ChatBuffer.node.ts" "credentials/ChatBufferCredentials.ts")
    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            error "Archivo requerido no encontrado: $file"
            exit 1
        fi
    done
    
    # Instalar dependencias localmente para compilar
    log "Instalando dependencias para compilación..."
    npm install --only=dev
    
    # Compilar TypeScript a JavaScript
    log "Compilando TypeScript..."
    npm run build
    
    if [ ! -d "dist" ]; then
        error "Error en la compilación - directorio dist no creado"
        exit 1
    fi
    
    # Crear paquete npm
    log "Creando paquete npm..."
    npm pack
    
    local package_file=$(ls n8n-nodes-gbplabs-chat-buffer-*.tgz | head -1)
    
    if [ ! -f "$package_file" ]; then
        error "No se pudo crear el paquete npm"
        exit 1
    fi
    
    success "Paquete creado: $package_file"
    
    # Copiar paquete al contenedor
    log "Copiando paquete al contenedor $container_name..."
    docker cp "$package_file" "$container_name:/tmp/"
    
    # Instalar el nodo en el contenedor
    log "Instalando nodo en el contenedor..."
    docker exec -u root "$container_name" npm install -g "/tmp/$package_file"
    
    # Verificar instalación
    log "Verificando instalación..."
    if docker exec "$container_name" npm list -g n8n-nodes-gbplabs-chat-buffer > /dev/null 2>&1; then
        success "Nodo ChatBuffer instalado correctamente"
    else
        error "Error en la verificación de la instalación"
        exit 1
    fi
    
    # Limpiar archivos temporales
    log "Limpiando archivos temporales..."
    rm -f "$package_file"
    docker exec "$container_name" rm -f "/tmp/$package_file"
    
    # Reiniciar n8n para cargar el nuevo nodo
    log "Reiniciando n8n para cargar el nuevo nodo..."
    if command -v docker-compose > /dev/null 2>&1; then
        cd ../..
        docker-compose restart "$container_name"
    else
        docker restart "$container_name"
    fi
    
    # Esperar a que n8n esté listo
    log "Esperando a que n8n esté listo..."
    sleep 10
    
    # Verificar que n8n está ejecutándose
    local max_attempts=30
    local attempt=1
    while [ $attempt -le $max_attempts ]; do
        if docker exec "$container_name" curl -f -s http://localhost:5678/healthz > /dev/null 2>&1; then
            success "n8n está ejecutándose correctamente"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            error "n8n no respondió después de $max_attempts intentos"
    exit 1
fi

        log "Intento $attempt/$max_attempts - Esperando a que n8n responda..."
        sleep 2
        ((attempt++))
    done
    
    success "=== Instalación completada ==="
    success "El nodo ChatBuffer está ahora disponible en n8n"
    log "Puedes encontrarlo en la categoría 'Transform' al agregar nuevos nodos"
    log ""
    log "Funcionalidades disponibles:"
    log "- Buffer Message: Almacenar mensajes temporalmente"
    log "- Get Messages: Recuperar mensajes del buffer"
    log "- Clear Buffer: Limpiar el buffer de mensajes"
    log ""
    log "La base de datos SQLite se creará automáticamente en ~/.n8n/chatbuffer/"
}

# Función de desinstalación
uninstall_chatbuffer_node() {
    log "=== Desinstalación del nodo ChatBuffer ==="
    
    local container_name=$(find_n8n_container)
    
    # Desinstalar el nodo
    log "Desinstalando nodo del contenedor..."
    if docker exec -u root "$container_name" npm uninstall -g n8n-nodes-gbplabs-chat-buffer > /dev/null 2>&1; then
        success "Nodo ChatBuffer desinstalado"
    else
        warning "El nodo no estaba instalado o ya fue desinstalado"
    fi
    
    # Reiniciar n8n
    log "Reiniciando n8n..."
    if command -v docker-compose > /dev/null 2>&1; then
        docker-compose restart "$container_name"
    else
        docker restart "$container_name"
    fi
    
    success "=== Desinstalación completada ==="
}

# Función de ayuda
show_help() {
    echo "Uso: $0 [OPCIÓN]"
    echo ""
    echo "Opciones:"
    echo "  install     Instalar el nodo ChatBuffer (por defecto)"
    echo "  uninstall   Desinstalar el nodo ChatBuffer"
    echo "  help        Mostrar esta ayuda"
echo ""
    echo "Ejemplos:"
    echo "  $0              # Instalar el nodo"
    echo "  $0 install      # Instalar el nodo"
    echo "  $0 uninstall    # Desinstalar el nodo"
}

# Función principal
main() {
    case "${1:-install}" in
        "install")
            install_chatbuffer_node
            ;;
        "uninstall")
            uninstall_chatbuffer_node
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            error "Opción desconocida: $1"
            show_help
            exit 1
            ;;
    esac
}

# Ejecutar función principal con todos los argumentos
main "$@" 