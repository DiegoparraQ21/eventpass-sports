# Actualización visual y preparación para Vercel

## Qué contiene esta actualización

- Portadas locales para EVT-001, EVT-002 y EVT-004 dentro de src/assets/events.
- Las portadas se muestran automáticamente si el campo imagen_url llega vacío desde n8n.
- Si más adelante agregas una URL en la columna imagen_url de Google Sheets, esa imagen tiene prioridad.
- Una portada EP26 renovada, con cuadrícula, órbitas, trazos en movimiento y una alternativa sin animación para personas que prefieren menos movimiento.
- Proxy local de Vite y proxy de Vercel para que el navegador no tenga que conectar directamente con n8n.

## Instalación en Visual Studio Code

1. Copia el contenido completo de esta carpeta a la raíz del proyecto EventPass, reemplazando los archivos existentes cuando Windows lo solicite.
2. No copies ni sobrescribas tu archivo .env actual: mantenlo y actualiza solo sus tres variables según el bloque siguiente.
3. En .env, usa:

~~~env
VITE_N8N_PROXY_TARGET=https://underdone-boxlike-impromptu.ngrok-free.dev
VITE_N8N_WEBHOOK_BASE_URL=/n8n/webhook
VITE_N8N_CHAT_URL=/n8n/webhook/1c02154a-ad78-4a2c-948b-901ca3672c27/chat
~~~

4. Detén Vite y vuelve a iniciarlo:

~~~bash
npm run dev
~~~

Las imágenes ya están conectadas desde src/App.jsx; no necesitas cargarlas en Google Sheets para los tres eventos actuales.

## CORS en n8n

Como el navegador se comunica con Vite en desarrollo y con Vercel en producción, elimina el encabezado manual Access-Control-Allow-Origin que agregaste en Responder catálogo público. Tampoco necesitas CORS por workflow para esta arquitectura de proxy.

## Publicar en Vercel

1. Sube el proyecto completo a GitHub, incluyendo api, src y vercel.json.
2. En Vercel importa el repositorio. Mantén Build Command: npm run build y Output Directory: dist.
3. En Settings → Environment Variables, crea:

~~~text
Name: N8N_PUBLIC_URL
Value: https://underdone-boxlike-impromptu.ngrok-free.dev
Environment: Production, Preview y Development
~~~

4. Despliega nuevamente.

Vercel recibirá las llamadas a /n8n/... y las enviará desde el servidor al dominio indicado. Por eso no expongas esta variable con el prefijo VITE_.

## Atención con ngrok

El túnel n8n debe mantenerse activo. Si ngrok te da un dominio nuevo, actualiza:

- VITE_N8N_PROXY_TARGET en tu .env local.
- N8N_PUBLIC_URL en Vercel.

Después reinicia Vite local o redeploy en Vercel, según corresponda.
