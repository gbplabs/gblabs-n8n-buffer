# Product Context: Chat Buffer Node

## ¿Por qué existe este proyecto?

### El Problema Original
En sistemas de chat automatizados con n8n, cuando los usuarios envían múltiples mensajes seguidos, cada mensaje dispara independientemente el workflow, causando:

1. **Múltiples ejecuciones del modelo/agente**: Costoso y lento
2. **Respuestas fragmentadas**: El AI responde a cada mensaje por separado
3. **Experiencia de usuario degradada**: Respuestas incompletas o repetitivas
4. **Desperdicio de recursos**: Procesamiento innecesario múltiple

### La Solución Anterior (Workflow Manual)
Antes existía un workflow complejo con:
- 10+ nodos interconectados
- Dependencia de MongoDB u otras bases de datos
- Lógica de timeout distribuida
- Difícil mantenimiento y debuggeo

## Cómo debe funcionar

### Flujo Ideal del Usuario
```
Usuario envía: "Hola"
Sistema: [Agrega al buffer, inicia timeout]

Usuario envía: "¿Cómo estás?"
Sistema: [Agrega al buffer, reinicia timeout]

Usuario envía: "Necesito ayuda"
Sistema: [Agrega al buffer, reinicia timeout]

[Después de 3 segundos de inactividad]
Sistema: Procesa "Hola. ¿Cómo estás?. Necesito ayuda"
```

### Experiencia de Usuario Objetivo

**Para el Usuario Final del Chat:**
- Puede escribir mensajes naturalmente sin esperar
- Recibe respuestas contextualmente completas
- No experimenta lag o respuestas fragmentadas

**Para el Desarrollador de n8n:**
- Integración simple: solo agregar el nodo al workflow
- Configuración mínima: sessionId, message, timeout opcional
- Reemplazo directo del workflow complejo existente

## Parámetros de Configuración

### Esenciales
- **Session ID**: Identificador único de la conversación
- **Message**: Contenido del mensaje a buffer
- **Timeout**: Tiempo de espera en milisegundos (default: 3000ms)
- **Separator**: Separador para concatenar mensajes (default: ". ")

### Casos de Uso Típicos
1. **Chatbots de WhatsApp**: Usuarios escriben mensajes rápidos seguidos
2. **Asistentes de IA**: Preguntas multi-parte que deben procesarse juntas
3. **Sistemas de soporte**: Descripciones de problemas en múltiples mensajes

## Salida del Producto

### Cuando NO se procesa (mensaje agregado al buffer)
```json
{
  "jid": "session123",
  "textMessageContent": "Mensaje concatenado final",
  "messageCount": 3,
  "processedAt": "2024-01-15T10:30:45.123Z"
}
```

### Integración con Workflows Existentes
El nodo se diseñó para ser **drop-in replacement** del workflow manual existente, manteniendo compatibilidad total con:
- Formatos de salida esperados (`jid`, `textMessageContent`)
- Flujos de trabajo downstream existentes
- Estructura de datos familiar

## Medidas de Éxito

1. **Reducción de ejecuciones**: 70-90% menos llamadas al modelo
2. **Mejora en respuestas**: Contexto completo en lugar de fragmentado
3. **Simplificación**: 1 nodo vs 10+ nodos
4. **Mantenimiento**: Tiempo de debuggeo reducido significativamente 