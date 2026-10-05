const base = (import.meta.env.VITE_N8N_WEBHOOK_BASE_URL || '').replace(/\/$/, '');

export function getVisitorId() {
  let value = localStorage.getItem('eventpass_visitor_id');
  if (!value) { value = crypto.randomUUID(); localStorage.setItem('eventpass_visitor_id', value); }
  return value;
}

export async function request(path, { method = 'POST', body, token } = {}) {
  if (!base) throw new Error('Falta configurar VITE_N8N_WEBHOOK_BASE_URL.');
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try { response = await fetch(`${base}/${path.replace(/^\//, '')}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }); }
  catch { throw new Error('No fue posible conectar con n8n. Verifica que ngrok siga activo y las URLs configuradas.'); }
  const payload = await response.json().catch(() => ({ ok: false, error: { message: 'n8n no devolvió una respuesta JSON.' } }));
  if (!response.ok || payload.ok === false) throw new Error(payload.error?.message || payload.message || 'No fue posible completar la solicitud.');
  return payload.data ?? payload;
}

export async function askAssistant(payload) {
  const url = import.meta.env.VITE_N8N_CHAT_URL;
  if (!url) throw new Error('Falta configurar VITE_N8N_CHAT_URL.');
  let response;
  try { response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) }); }
  catch { throw new Error('No fue posible conectar con el asistente. Verifica que ngrok siga activo y la URL de WF10.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'El asistente no está disponible en este momento.');
  return data.output || data.text || 'No recibí una respuesta del asistente.';
}
