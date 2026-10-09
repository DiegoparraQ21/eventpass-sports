# EventPass Sports

EventPass Sports centraliza el catálogo de eventos deportivos, gestión de usuarios, autenticación, inscripción, lista de espera, cancelaciones, recordatorios, notificaciones y asistente. La interfaz se comunica con n8n mediante webhooks HTTP y los datos operativos se administran con Google Sheets.

## Examen — Check-in digital

Se incorporó la funcionalidad de control de ingreso de asistentes. La interfaz dispone de la vista **Check-in**, donde el operador registra el ingreso con el identificador de una inscripción y el evento al que corresponde. El workflow **WF11 — Check-in digital** valida la solicitud, persiste cada intento, actualiza la inscripción válida y reutiliza el servicio central de notificaciones.

### Endpoint

| Uso | Método | Ruta de producción de n8n | Ruta consumida por el frontend |
| --- | --- | --- | --- |
| Registro de check-in | `POST` | `/webhook/eventpass/checkin` | `/n8n/webhook/eventpass/checkin` |

### Estructura de la petición

```json
{
  "inscripcion_id": "INS-001",
  "evento_id": "EVT-001"
}
```

### Estructura de la respuesta

```json
{
  "ok": true,
  "data": {
    "resultado": "EXITOSO",
    "mensaje": "Check-in realizado correctamente.",
    "detalle": "Check-in realizado correctamente.",
    "checkin_id": "CHK-20261009143000-4821",
    "inscripcion_id": "INS-001",
    "evento_id": "EVT-001",
    "fecha_checkin": "2026-10-09T19:30:00.000Z"
  }
}
```

`resultado` utiliza únicamente los valores `EXITOSO`, `DUPLICADO` o `RECHAZADO`. Las respuestas de duplicado y rechazo preservan la misma estructura y describen el motivo en `detalle`.

### Validaciones implementadas

- Existencia de la inscripción.
- Existencia del evento.
- Correspondencia entre `inscripcion_id` y `evento_id`.
- Estado de la inscripción igual a `CONFIRMADA`.
- Ausencia de un check-in previo con resultado `EXITOSO` para la misma inscripción.

Las inscripciones en `LISTA_ESPERA`, `CANCELADA`, `ASISTIO` u otro estado no permitido generan un resultado `RECHAZADO` y quedan registradas como intento.

### Persistencia de check-ins

El archivo independiente **EP11_Checkin** contiene la hoja obligatoria `Checkins`. Su estructura es:

| Campo | Descripción |
| --- | --- |
| `checkin_id` | Identificador generado para un ingreso exitoso. |
| `inscripcion_id` | Identificador de la inscripción consultada. |
| `evento_id` | Identificador del evento recibido. |
| `usuario_id` | Usuario relacionado con la inscripción cuando existe. |
| `fecha_checkin` | Fecha y hora ISO del intento. |
| `resultado` | `EXITOSO`, `RECHAZADO` o `DUPLICADO`. |
| `detalle` | Resultado legible y trazable de la validación. |

Cada solicitud se guarda en `Checkins`. Solamente un resultado `EXITOSO` asigna un `checkin_id` y cambia la inscripción correspondiente de `CONFIRMADA` a `ASISTIO`.

### Idempotencia y notificaciones

WF11 consulta el historial de `Checkins` antes de registrar la asistencia. Si ya existe un registro `EXITOSO` para la inscripción, no crea un segundo ingreso válido, no actualiza la inscripción y responde `DUPLICADO`.

Al completar un check-in válido, WF11 ejecuta **WF09 — Notificaciones** como subworkflow con el evento `CHECKIN_EXITOSO`. La notificación mantiene el servicio central existente para los canales Gmail y Telegram; WF11 no replica esa lógica.

### Archivos del examen

- `n8n/WF11_checkin_digital.json`: export importable del workflow de check-in.
- `sheets/EP11_Checkin.xlsx`: plantilla del archivo independiente de registro.
- `docs/CONEXION_Y_PRUEBAS.md`: referencias de conexión y matriz de verificación.
