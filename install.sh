#!/bin/bash
set -e

echo "🚀 Instalando Digital Signage Enterprise..."

# Crear directorios
mkdir -p logs/{api,nginx}
mkdir -p backups/{postgres,app}
mkdir -p nginx/ssl
mkdir -p monitoring/{prometheus,grafana/{dashboards,datasources},loki}

echo "✅ Estructura de directorios creada!"
echo ""
echo "📖 Documentación: https://docs.tusitio.com"
echo ""
