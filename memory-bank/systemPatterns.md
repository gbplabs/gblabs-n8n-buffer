# System Patterns: Chat Buffer Architecture

## Arquitectura General

### Patrón de Buffer Temporal
```
Mensaje 1 → Buffer en Memoria → Timeout → Concatenación → Salida
Mensaje 2 → Buffer en Memoria → Timeout Reset
Mensaje 3 → Buffer en Memoria → Timeout Reset
                                    ↓
                              Procesa Todo Junto
```

### Estructura de Datos del Buffer
```javascript
const memoryBuffer = {
  [sessionId]: {
    messages: [
      { message: "texto", timestamp: 1234567890 },
      { message: "texto", timestamp: 1234567891 }
    ],
    timeout: 3000,
    separator: '. '
  }
}
```

## Patrones de Diseño Implementados

### 1. Singleton Pattern para Buffer Global
- **Razón**: Mantener estado entre ejecuciones del nodo
- **Implementación**: Variable global `memoryBuffer` compartida
- **Ventaja**: Persistencia simple sin dependencias externas

### 2. Timeout Pattern con Reset
- **Lógica**: Cada mensaje nuevo reinicia el timeout
- **Implementación**: `setTimeout` con timestamp comparison
- **Comportamiento**: Solo procesa cuando no hay actividad nueva

### 3. Session-based Isolation
- **Patrón**: Cada sesión maneja su propio buffer independiente
- **Identificador**: `sessionId` como clave única
- **Escalabilidad**: Múltiples conversaciones simultáneas

## Flujo de Ejecución

### Algoritmo Principal
```
1. Recibir mensaje con sessionId
2. Crear/actualizar buffer para sessionId
3. Agregar mensaje al buffer con timestamp
4. Esperar timeout configurado
5. Verificar si somos el último mensaje agregado
6. Si somos el último:
   - Concatenar todos los mensajes
   - Enviar resultado
   - Limpiar buffer
7. Si no somos el último:
   - No hacer nada (otro mensaje procesará)
```

### Manejo de Concurrencia
- **Problema**: Múltiples mensajes pueden llegar simultáneamente
- **Solución**: Timestamp comparison para determinar el "último mensaje"
- **Garantía**: Solo el último mensaje en el timeout procesará el buffer

## Componentes Técnicos

### Nodo n8n Structure
```
ChatBuffer.node.ts
├── INodeTypeDescription: Configuración del nodo
├── Properties: Parámetros de entrada
├── Execute Function: Lógica principal
└── Error Handling: Manejo de errores y continuación
```

### Parámetros de Configuración
```javascript
properties: [
  sessionId: { type: 'string', required: true },
  message: { type: 'string', required: true },
  timeout: { type: 'number', default: 3000 },
  separator: { type: 'string', default: '. ' }
]
```

## Decisiones de Arquitectura

### Por qué Buffer en Memoria vs Bases de Datos?
- **Rendimiento**: Acceso inmediato sin I/O, solo RAM
- **Simplicidad**: Sin configuración de BD externa, cero dependencias
- **Portabilidad**: Funciona en cualquier entorno n8n sin instalaciones adicionales
- **Gestión**: Auto-cleanup al procesar mensajes, sin persistencia innecesaria

### Por qué Timeout Interno vs Nodo Wait Externo?
- **Atomicidad**: Lógica completa en un solo nodo
- **Simplicidad**: Sin dependencias de workflow externo
- **Confiabilidad**: Menos puntos de falla

### Por qué Global Buffer vs Instance Buffer?
- **Persistencia**: Mantiene estado entre ejecuciones
- **Compartición**: Múltiples instancias del nodo acceden al mismo buffer
- **Eficiencia**: Una sola estructura de datos para toda la aplicación

## Patrones de Integración

### Reemplazo de Workflow Complejo
```
ANTES:
Webhook → MongoDB Check → Wait → MongoDB Get → Delete → Concatenate → Continue

DESPUÉS:
Webhook → Chat Buffer → Continue
```

### Compatibilidad con Workflows Existentes
- **Entrada**: Compatible con `jid`, `textMessageContent`, `sessionId`
- **Salida**: Mantiene formato exacto esperado por workflows downstream
- **Comportamiento**: Drop-in replacement sin cambios en el resto del workflow

## Limitaciones y Consideraciones

### Limitaciones Actuales
1. **Memoria**: Buffer se pierde si n8n reinicia (por diseño - sin persistencia)
2. **Escalabilidad**: Memoria crece con sesiones concurrentes
3. **Limpieza**: Solo se limpia al procesar, no por inactividad

### 🎯 VIRTUD PRINCIPAL: SIN BASES DE DATOS
- **Filosofía**: Buffer completamente en RAM, cero dependencias de BD
- **Ventaja**: Instalación inmediata sin configuración externa
- **Rendimiento**: Acceso instantáneo sin I/O de disco o red

### Consideraciones de Producción
- **Monitoring**: Monitorear uso de memoria del buffer
- **Cleanup**: Implementar limpieza periódica de sesiones inactivas
- **Backup**: Considerar persistencia para buffers críticos 