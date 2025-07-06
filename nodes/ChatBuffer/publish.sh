#!/bin/bash

echo "🚀 Publicando n8n-nodes-chatbuffer en npm..."

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json. Ejecuta desde el directorio del nodo."
    exit 1
fi

# Verificar que npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm no está instalado."
    exit 1
fi

# Verificar login en npm
echo "🔐 Verificando login en npm..."
if ! npm whoami &> /dev/null; then
    echo "❌ No estás logueado en npm. Ejecuta: npm login"
    exit 1
fi

# Limpiar dist anterior
echo "🧹 Limpiando compilación anterior..."
rm -rf dist/

# Compilar TypeScript
echo "🔨 Compilando TypeScript..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error en la compilación."
    exit 1
fi

# Verificar que dist existe
if [ ! -d "dist" ]; then
    echo "❌ Error: No se generó el directorio dist."
    exit 1
fi

# Lint del código
echo "🔍 Verificando código con linter..."
npm run lint

if [ $? -ne 0 ]; then
    echo "⚠️  Advertencia: Hay errores de linting. ¿Continuar? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo "❌ Publicación cancelada."
        exit 1
    fi
fi

# Mostrar versión actual
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo "📦 Versión actual: $CURRENT_VERSION"

# Preguntar si incrementar versión
echo "¿Incrementar versión? (patch/minor/major/skip)"
read -r version_type

case $version_type in
    patch|minor|major)
        echo "📈 Incrementando versión $version_type..."
        npm version $version_type --no-git-tag-version
        NEW_VERSION=$(node -p "require('./package.json').version")
        echo "✅ Nueva versión: $NEW_VERSION"
        ;;
    skip)
        echo "⏭️  Manteniendo versión actual: $CURRENT_VERSION"
        ;;
    *)
        echo "❌ Opción inválida. Usa: patch, minor, major, o skip"
        exit 1
        ;;
esac

# Mostrar archivos que se van a publicar
echo "📂 Archivos que se incluirán en el paquete:"
npm pack --dry-run

echo ""
echo "🔍 Resumen de publicación:"
echo "  - Paquete: $(node -p "require('./package.json').name")"
echo "  - Versión: $(node -p "require('./package.json').version")"
echo "  - Descripción: $(node -p "require('./package.json').description")"
echo "  - Usuario npm: $(npm whoami)"
echo ""

# Confirmación final
echo "¿Proceder con la publicación? (y/n)"
read -r confirm

if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "❌ Publicación cancelada."
    exit 1
fi

# Publicar en npm
echo "🚀 Publicando en npm..."
npm publish --access public

if [ $? -eq 0 ]; then
    FINAL_VERSION=$(node -p "require('./package.json').version")
    echo ""
    echo "🎉 ¡Publicación exitosa!"
    echo "📦 Paquete: n8n-nodes-chatbuffer@$FINAL_VERSION"
    echo "🔗 npm: https://www.npmjs.com/package/n8n-nodes-chatbuffer"
    echo ""
    echo "📋 Próximos pasos:"
    echo "  1. Crear tag en git: git tag v$FINAL_VERSION"
    echo "  2. Push tag: git push origin v$FINAL_VERSION"
    echo "  3. Crear release en GitHub"
    echo "  4. Solicitar verificación en n8n (opcional)"
    echo ""
    echo "✅ ¡Tu nodo ya está disponible para la comunidad!"
else
    echo "❌ Error en la publicación."
    exit 1
fi 