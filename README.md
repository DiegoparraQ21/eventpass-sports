# Frontend actualizado — EventPass Sports

Esta carpeta reemplaza solo la parte visual del proyecto anterior. Conserva los mismos endpoints y operaciones de n8n.

| Función | Webhook de n8n | Método |
| --- | --- | --- |
| Registro y perfil | /usuarios | POST |
| Inicio/cierre de sesión | /eventpass/wf02 | POST |
| Código de Telegram | /eventpass/wf03 | POST |
| Catálogo | /eventpass/catalogo | GET |
| Inscripciones | /eventpass/inscripciones | POST |
| Asistente | URL propia del Chat Trigger WF10 | POST |

## 1. Sustituir el frontend en Visual Studio Code

1. Haz una copia de seguridad de la carpeta raíz de tu proyecto original.
2. Abre el proyecto original en Visual Studio Code.
3. Elimina únicamente estos elementos antiguos de la raíz: src, index.html, package.json, package-lock.json, vite.config.js, vercel.json y .gitignore. No borres n8n, docs, las plantillas de Sheets ni los JSON.
4. Copia todo el contenido de esta carpeta, no la carpeta contenedora, en la raíz de tu proyecto original.
5. En la terminal integrada ejecuta:

~~~bash
npm install
copy .env.example .env
npm run dev
~~~

En macOS/Linux, el segundo comando es cp .env.example .env.

## 2. Conectar el sitio con n8n

Abre el archivo .env creado en la raíz y completa solamente estas dos variables:

~~~env
VITE_N8N_WEBHOOK_BASE_URL=https://TU_DOMINIO_N8N/webhook
VITE_N8N_CHAT_URL=https://TU_DOMINIO_N8N/webhook/URL-EXACTA-DEL-CHAT-TRIGGER
~~~

- La primera dirección debe terminar exactamente en /webhook, no en /webhook-test y sin / al final.
- La segunda debe ser la URL Production POST mostrada por el nodo Chat Trigger EventPass Assistant de WF10. Cópiala desde tu n8n publicado.
- No modifiques los paths en el código: el frontend usa usuarios, eventpass/wf02, eventpass/wf03, eventpass/catalogo y eventpass/inscripciones.
- Activa/publica WF01, WF02, WF03, WF05, WF06 y WF10. WF04 es el formulario administrativo, no pertenece al sitio público.

### CORS: cambio imprescindible en n8n

Antes de probar desde Vercel, permite el origen de tu sitio:

1. Despliega primero en Vercel para conocer tu dominio, por ejemplo https://eventpass-sports.vercel.app.
2. En n8n Cloud, configura los webhooks para permitir ese origen si tu instancia expone dicha opción. En n8n autoalojado, añade o actualiza N8N_CORS_ORIGIN=https://eventpass-sports.vercel.app en la configuración del servidor y reinícialo.
3. En WF10 → Chat Trigger, en Allowed Origins (CORS) escribe ese mismo dominio. Evita dejar * para la entrega.
4. Para probar en local, agrega también http://localhost:5173 como origen permitido si tu configuración admite varios orígenes.

Si el navegador muestra “Failed to fetch”, normalmente la URL no termina en /webhook, el workflow no está activo o falta CORS.

## 3. Pruebas mínimas en el sitio

1. Crea una cuenta e inicia sesión.
2. En Mi cuenta, genera el código y envía /vincular CODIGO al bot de Telegram.
3. Vuelve al catálogo, abre un evento y solicita el pase.
4. Consulta Mis pases y prueba cancelar una inscripción.
5. Abre el botón flotante del asistente y haz una pregunta informativa.

Telegram debe estar vinculado antes de crear una inscripción: WF06 hace ese control, no el frontend.

## 4. GitHub y Vercel

Desde la raíz del proyecto completo —donde también están n8n y docs— ejecuta:

~~~bash
git init
git add .
git commit -m "Publicar EventPass Sports"
git branch -M main
git remote add origin URL_DE_TU_REPOSITORIO_GITHUB
git push -u origin main
~~~

Luego, en Vercel:

1. Inicia sesión con GitHub y elige Add New → Project.
2. Importa el repositorio completo.
3. Vercel detectará Vite. Conserva npm run build como comando de compilación y dist como carpeta de salida.
4. En Settings → Environment Variables agrega VITE_N8N_WEBHOOK_BASE_URL y VITE_N8N_CHAT_URL con exactamente los valores de tu .env.
5. Despliega. Cuando obtengas la URL pública, úsala para CORS en n8n y vuelve a desplegar.

Nunca subas .env. Este frontend ya incluye .gitignore y .env.example para mantener las URLs de ejemplo, sin secretos.
