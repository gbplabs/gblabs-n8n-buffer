# Project Brief: n8n-nodes-gbplabs-chat-buffer

## Resumen del Proyecto

**Chat Buffer** es un nodo personalizado para n8n que implementa un buffer temporal de mensajes de chat, diseñado para solucionar el problema de múltiples ejecuciones innecesarias de modelos/agentes cuando llegan mensajes consecutivos en conversaciones de chat.

## Problema que Resuelve

En sistemas de chat automatizados, cuando llegan múltiples mensajes seguidos:
```
Usuario: "Hola"
Usuario: "¿Cómo estás?"
Usuario: "Necesito ayuda"
```

Sin el buffer, el modelo/agente se ejecutaría 3 veces por separado. Con el buffer, se ejecuta 1 vez con: "Hola. ¿Cómo estás?. Necesito ayuda".

## Objetivo Principal

Crear un nodo que:
1. Acumule mensajes en memoria durante un período de timeout configurable
2. Concatene todos los mensajes recibidos en ese período
3. Envíe un solo mensaje concatenado al final del timeout
4. Reemplace workflows complejos con bases de datos con una solución simple
5. **🎯 VIRTUD CLAVE**: Funcione completamente en RAM, SIN bases de datos

## Alcance del Proyecto

### Funcionalidades Clave
- Buffer temporal de mensajes en memoria
- Timeout configurable (por defecto 3000ms)
- Separador personalizable para concatenación
- Manejo de sesiones múltiples simultáneas
- Integración nativa con n8n workflow

### Ventajas sobre Alternativas
- **Simplicidad**: 1 nodo vs 10+ nodos del workflow manual
- **Rendimiento**: Buffer en memoria pura, SIN bases de datos
- **Portabilidad**: Sin dependencias externas, solo RAM
- **Mantenimiento**: Código centralizado y fácil de debuggear

## Autor y Contexto

**Desarrollador**: Pablo Luis Sánchez Stahslchsmidt (GBPLabs)  
**Versión Actual**: 1.0.11  
**Licencia**: MIT  
**Compatibilidad**: n8n v1.0+, Node.js v20.15+

## Implementación

El nodo usa un buffer global en memoria con estructura:
```javascript
{ 
  [sessionId]: { 
    messages: [], 
    timeout: 3000, 
    separator: '. ' 
  } 
}
```

Y procesa mensajes con lógica de timeout interno para acumular mensajes antes de enviar el resultado concatenado. 