#!/bin/bash

# Script para optimizar el entorno de desarrollo Node.js
# Configurar variables de entorno para mejor rendimiento

echo "🚀 Configurando optimizaciones para desarrollo Node.js..."

# Aumentar heap size para desarrollo
export NODE_OPTIONS="--max-old-space-size=2048 --max-new-space-size=1024"

# Habilitar garbage collection manual si está disponible
export NODE_OPTIONS="$NODE_OPTIONS --expose-gc"

# Optimizar para desarrollo (más rápido startup)
export NODE_OPTIONS="$NODE_OPTIONS --no-lazy"

# Configurar para mejor debugging
export NODE_OPTIONS="$NODE_OPTIONS --enable-source-maps"

echo "✅ Variables NODE_OPTIONS configuradas:"
echo "   --max-old-space-size=2048 (Heap máximo: 2GB)"
echo "   --max-new-space-size=1024 (New space: 1GB)"
echo "   --expose-gc (Garbage collection manual)"
echo "   --no-lazy (Startup más rápido)"
echo "   --enable-source-maps (Mejor debugging)"

echo ""
echo "🎯 Para aplicar estas optimizaciones:"
echo "   1. Ejecuta: source ./scripts/dev-optimization.sh"
echo "   2. O añade al package.json: NODE_OPTIONS='--max-old-space-size=2048 --expose-gc'"
echo ""
echo "⚡ Memoria optimizada para desarrollo con ts-node y nodemon"
