import { useEffect, useMemo, useState } from 'react';
import { askAssistant, getVisitorId, request } from './api.js';
import './checkin.css';
import runningCover from './assets/events/carrera-5k-bucaramanga.png';
import footballCover from './assets/events/torneo-amateur-futbol.png';
import cyclingCover from './assets/events/jornada-ciclismo.png';
import padelCover from './assets/events/campeonato-padel.png';
import basketballCover from './assets/events/torneo-baloncesto.png';
import trailCover from './assets/events/carrera-trail.png';
import heroTeam from './assets/hero/eventpass-sports-team.png';

const blankRegister = { nombre: '', email: '', password: '' };
const blankLogin = { email: '', password: '' };
const blankCheckin = { inscripcion_id: '', evento_id: '' };
const icon = { calendar: '◷', pin: '⌖', users: '◉', arrow: '→', bolt: '✦' };
const formatDate = (value) => value
  ? new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value.slice(0, 10)}T12:00:00`))
  : 'Próximamente';
const eventImages = {
  'EVT-001': runningCover,
  'EVT-002': footballCover,
  'EVT-003': padelCover,
  'EVT-004': cyclingCover,
  'EVT-005': basketballCover,
  'EVT-006': trailCover,
};
const eventCoverPositions = {
  'EVT-001': 'center 68%',
  'EVT-002': 'center 62%',
  'EVT-003': 'center 67%',
  'EVT-004': 'center 66%',
  'EVT-005': 'center 65%',
  'EVT-006': 'center 68%',
};

function Toast({ notice, onClose }) {
  if (!notice) return null;
  return <div className={`toast ${notice.type}`} role="status"><span>{notice.type === 'error' ? '!' : '✓'}</span><p>{notice.text}</p><button aria-label="Cerrar mensaje" onClick={onClose}>×</button></div>;
}

function Status({ state, children }) {
  return <div className="empty-state"><span>{state === 'error' ? '!' : state === 'loading' ? '◌' : '⌁'}</span><p>{children}</p></div>;
}

function EventCard({ event, onSelect }) {
  const remaining = Number(event.cupos_disponibles ?? 0);
  const eventState = String(event.estado || 'PUBLICADO').toUpperCase();
  const hasStarted = event.fecha && new Date(`${event.fecha.slice(0, 10)}T${event.hora || '00:00'}-05:00`).getTime() <= Date.now();
  const noSeats = eventState !== 'PUBLICADO' || hasStarted || !event.disponible || remaining <= 0;
  const status = eventState === 'CANCELADO' ? 'Cancelado' : eventState === 'CERRADO' || hasStarted ? 'Cerrado' : noSeats ? 'Lista de espera' : `${remaining} cupos`;
  const cover = event.imagen_url?.trim() || eventImages[event.evento_id];
  const availabilityClass = eventState === 'CANCELADO' ? 'cancelled' : eventState === 'CERRADO' || hasStarted ? 'closed' : noSeats ? 'limited' : '';

  return <article className="event-card">
    <div className="event-visual" style={cover ? { backgroundImage: `linear-gradient(180deg, rgba(4,17,30,.05) 18%, rgba(4,17,30,.72) 100%), url("${cover}")`, backgroundPosition: eventCoverPositions[event.evento_id] || 'center center' } : undefined}>
      <span className="category">{event.categoria || 'Deportes'}</span>
      <span className={`availability ${availabilityClass}`}>{status}</span>
    </div>
    <div className="event-content">
      <h3>{event.nombre}</h3>
      <p className="event-description">{event.descripcion || 'Una experiencia deportiva para vivir, compartir y superarte.'}</p>
      <div className="event-meta"><span>{icon.calendar} {formatDate(event.fecha)} · {event.hora || 'Por definir'}</span><span>{icon.pin} {event.lugar || 'Lugar por confirmar'}</span></div>
      <button className="text-button" onClick={() => onSelect(event)}>Ver detalles <b>{icon.arrow}</b></button>
    </div>
  </article>;
}

function bookingStatusClass(status) {
  if (status === 'CONFIRMADA') return 'confirmed';
  if (status === 'ASISTIO') return 'attended';
  if (status === 'CANCELADA') return 'cancelled';
  return 'waiting';
}

function App() {
  const [events, setEvents] = useState([]);
  const [category, setCategory] = useState('');
  const [catalogState, setCatalogState] = useState('loading');
  const [notice, setNotice] = useState(null);
  const [view, setView] = useState('catalog');
  const [selected, setSelected] = useState(null);
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem('eventpass_session') || 'null'); } catch { return null; }
  });
  const [register, setRegister] = useState(blankRegister);
  const [login, setLogin] = useState(blankLogin);
  const [profile, setProfile] = useState({ nombre: '', email: '' });
  const [bookingName, setBookingName] = useState('');
  const [bookings, setBookings] = useState([]);
  const [bookingsState, setBookingsState] = useState('idle');
  const [telegramCode, setTelegramCode] = useState('');
  const [busy, setBusy] = useState('');
  const [chat, setChat] = useState([]);
  const [question, setQuestion] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [checkin, setCheckin] = useState(blankCheckin);
  const [checkinResult, setCheckinResult] = useState(null);
  const token = session?.session_token;
  const categories = useMemo(() => [...new Set(events.map((event) => event.categoria).filter(Boolean))].sort(), [events]);
  const visibleEvents = category ? events.filter((event) => event.categoria === category) : events;
  const selectedState = String(selected?.estado || 'PUBLICADO').toUpperCase();
  const selectedHasStarted = selected?.fecha && new Date(`${selected.fecha.slice(0, 10)}T${selected.hora || '00:00'}-05:00`).getTime() <= Date.now();
  const selectedFull = selected && (!selected.disponible || Number(selected.cupos_disponibles ?? 0) <= 0);
  const selectedUnavailable = selected && (selectedState !== 'PUBLICADO' || selectedHasStarted);
  const selectedUnavailableMessage = selectedState === 'CANCELADO'
    ? 'Este evento fue cancelado y no admite inscripciones.'
    : selectedState === 'CERRADO' || selectedHasStarted
      ? 'Las inscripciones para este evento están cerradas.'
      : 'Este evento no admite nuevas inscripciones.';
  const notify = (text, type = 'success') => {
    setNotice({ text, type });
    window.setTimeout(() => setNotice(null), 5000);
  };
  const fail = (error) => notify(error.message || String(error), 'error');
  const saveSession = (next) => {
    localStorage.setItem('eventpass_session', JSON.stringify(next));
    setSession(next);
    setProfile({ nombre: next.usuario?.nombre || '', email: next.usuario?.email_normalizado || next.usuario?.email || '' });
  };

  async function loadCatalog() {
    setCatalogState('loading');
    try {
      const data = await request(`eventpass/catalogo?visitor_id=${encodeURIComponent(getVisitorId())}`, { method: 'GET' });
      setEvents(data.eventos || []);
      setCatalogState('ready');
    } catch (error) {
      setCatalogState('error');
      fail(error);
    }
  }

  useEffect(() => { loadCatalog(); }, []);
  useEffect(() => {
    if (session?.usuario) setProfile({ nombre: session.usuario.nombre || '', email: session.usuario.email_normalizado || session.usuario.email || '' });
  }, [session]);

  async function registerUser(event) {
    event.preventDefault();
    setBusy('register');
    try {
      const data = await request('usuarios', { body: { operation: 'CREATE', data: register } });
      setRegister(blankRegister);
      setLogin({ email: data.email || register.email, password: '' });
      notify(`Cuenta creada para ${data.nombre}. Ya puedes iniciar sesión.`);
    } catch (error) { fail(error); } finally { setBusy(''); }
  }

  async function signIn(event) {
    event.preventDefault();
    setBusy('login');
    try {
      const data = await request('eventpass/wf02', { body: { operacion: 'LOGIN', email: login.email, password: login.password } });
      saveSession({ session_token: data.session_token, usuario: data.usuario, expira_en: data.expira_en });
      setLogin(blankLogin);
      notify('Sesión iniciada correctamente.');
    } catch (error) { fail(error); } finally { setBusy(''); }
  }

  async function signOut() {
    try { await request('eventpass/wf02', { body: { operacion: 'LOGOUT' }, token }); } catch { /* La sesión local se elimina incluso si venció. */ }
    localStorage.removeItem('eventpass_session');
    setSession(null);
    setBookings([]);
    setView('catalog');
    notify('Sesión cerrada.');
  }

  async function updateProfile(event) {
    event.preventDefault();
    setBusy('profile');
    try {
      const data = await request('usuarios', { body: { operation: 'UPDATE', data: { usuario_id: session.usuario.usuario_id, nombre: profile.nombre, email: profile.email } } });
      saveSession({ ...session, usuario: data });
      notify('Perfil actualizado.');
    } catch (error) { fail(error); } finally { setBusy(''); }
  }

  async function generateTelegramCode() {
    setBusy('telegram');
    try {
      const data = await request('eventpass/wf03', { body: { operacion: 'GENERAR_CODIGO' }, token });
      setTelegramCode(data.codigo);
      notify('Código creado. Envíalo al bot de Telegram antes de que venza.');
    } catch (error) { fail(error); } finally { setBusy(''); }
  }

  async function loadBookings() {
    if (!token) {
      setView('account');
      return notify('Inicia sesión para consultar tus inscripciones.', 'error');
    }
    setView('bookings');
    setBookingsState('loading');
    try {
      const data = await request('eventpass/inscripciones', { body: { operacion: 'READ' }, token });
      setBookings(data.inscripciones || []);
      setBookingsState('ready');
    } catch (error) {
      setBookingsState('error');
      fail(error);
    }
  }

  async function joinEvent(event) {
    event.preventDefault();
    if (!token) {
      setSelected(null);
      setView('account');
      return notify('Inicia sesión para continuar con tu inscripción.', 'error');
    }
    setBusy('booking');
    try {
      const data = await request('eventpass/inscripciones', { body: { operacion: 'CREATE', evento_id: selected.evento_id, nombre_acreditacion: bookingName }, token });
      setSelected(null);
      setBookingName('');
      await loadCatalog();
      notify(data.idempotente ? 'Ya contabas con una inscripción activa para este evento.' : `Inscripción creada: ${data.inscripcion.estado.replace('_', ' ')}.`);
    } catch (error) { fail(error); } finally { setBusy(''); }
  }

  async function cancelBooking(id) {
    setBusy(id);
    try {
      await request('eventpass/inscripciones', { body: { operacion: 'CANCEL', inscripcion_id: id }, token });
      await loadBookings();
      await loadCatalog();
      notify('Inscripción cancelada. Si hay lista de espera, se te reasignará el cupo.');
    } catch (error) { fail(error); } finally { setBusy(''); }
  }

  async function submitCheckin(event) {
    event.preventDefault();
    const payload = {
      inscripcion_id: checkin.inscripcion_id.trim(),
      evento_id: checkin.evento_id.trim(),
    };
    if (!payload.inscripcion_id || !payload.evento_id) {
      return notify('Ingresa el identificador de inscripción y el identificador del evento.', 'error');
    }
    setBusy('checkin');
    setCheckinResult(null);
    try {
      const data = await request('eventpass/checkin', { body: payload, token });
      const result = data.data || data;
      setCheckinResult(result);
      const type = result.resultado === 'RECHAZADO' ? 'error' : 'success';
      notify(result.mensaje || result.detalle || 'Check-in procesado.', type);
      if (result.resultado === 'EXITOSO') setCheckin(blankCheckin);
    } catch (error) { fail(error); } finally { setBusy(''); }
  }

  async function sendChat(event) {
    event.preventDefault();
    const text = question.trim();
    if (!text || busy === 'chat') return;
    setQuestion('');
    setChat((items) => [...items, { role: 'user', text }]);
    setBusy('chat');
    try {
      const answer = await askAssistant({ chatInput: text, sessionId: getVisitorId(), visitor_id: getVisitorId(), usuario_id: session?.usuario?.usuario_id || '' });
      setChat((items) => [...items, { role: 'assistant', text: answer }]);
    } catch (error) {
      setChat((items) => [...items, { role: 'assistant', text: error.message }]);
    } finally { setBusy(''); }
  }

  const openCatalog = () => {
    setView('catalog');
    window.setTimeout(() => document.getElementById('events')?.scrollIntoView({ behavior: 'smooth' }), 20);
  };

  return <div className="app-shell">
    <header className="site-header">
      <button className="brand" onClick={openCatalog}><span className="brand-mark">E</span><span>EventPass<em>Sports</em></span></button>
      <nav>
        <button className={view === 'catalog' ? 'active' : ''} onClick={openCatalog}>Eventos</button>
        <button className={view === 'bookings' ? 'active' : ''} onClick={loadBookings}>Mis pases</button>
        <button className={view === 'checkin' ? 'active' : ''} onClick={() => setView('checkin')}>Check-in</button>
        <button className="account-nav" onClick={() => setView('account')}><span className="avatar">{session?.usuario?.nombre?.[0] || '↗'}</span>{session ? 'Mi cuenta' : 'Acceder'}</button>
      </nav>
    </header>
    <main>
      <Toast notice={notice} onClose={() => setNotice(null)} />
      {view === 'catalog' && <>
        <section className="hero">
          <div className="hero-copy"><p className="kicker">{icon.bolt} EVENTOS DEPORTIVOS · BUCARAMANGA</p><h1>Vive el deporte.<br /><i>Haz que cuente.</i></h1><p className="hero-description">Encuentra carreras, torneos y experiencias para salir a darlo todo. Tu próximo reto está a un pase de distancia.</p><div className="hero-actions"><button className="primary" onClick={openCatalog}>Explorar eventos <b>{icon.arrow}</b></button><span><strong>{events.length || '—'}</strong> experiencias activas</span></div></div>
          <div className="hero-art hero-photo" style={{ backgroundImage: `url("${heroTeam}")` }} aria-label="Comunidad deportiva EventPass Sports"><div className="hero-photo-wash" /><div className="hero-grid" /><div className="hero-monogram"><span>EP</span><strong>26</strong></div><p className="hero-tag">MUEVE TU HISTORIA<br /><b>EVENTPASS SPORTS</b></p><div className="hero-sports-label"><span>RUN</span><span>RIDE</span><span>PLAY</span></div><p className="hero-community">Una comunidad,<br /><b>todos los deportes.</b></p></div>
        </section>
        <section id="events" className="events-section"><div className="section-title"><div><p className="kicker">DESCUBRE LA AGENDA</p><h2>Eventos para moverte</h2></div><div className="filter-wrap"><label htmlFor="category">Filtrar por categoría</label><select id="category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Todas las categorías</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></div></div>{catalogState === 'loading' ? <Status state="loading">Estamos preparando los eventos.</Status> : catalogState === 'error' ? <Status state="error"><button className="text-button" onClick={loadCatalog}>Intentar de nuevo {icon.arrow}</button></Status> : visibleEvents.length ? <div className="events-grid">{visibleEvents.map((event) => <EventCard key={event.evento_id} event={event} onSelect={setSelected} />)}</div> : <Status>No hay eventos en esta categoría todavía.</Status>}</section>
      </>}
      {view === 'account' && <section className="account-section"><p className="kicker">ESPACIO PERSONAL</p><h2>{session ? 'Mi cuenta' : 'Únete a EventPass'}</h2>{session ? <div className="account-layout"><form className="profile-card" onSubmit={updateProfile}><div className="profile-heading"><span className="profile-avatar">{session.usuario?.nombre?.[0] || 'E'}</span><div><h3>{session.usuario?.nombre}</h3><p>Perfil de participante</p></div></div><label>Nombre<input required value={profile.nombre} onChange={(event) => setProfile({ ...profile, nombre: event.target.value })} /></label><label>Correo electrónico<input required type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} /></label><button className="primary" disabled={busy === 'profile'}>{busy === 'profile' ? 'Guardando…' : 'Guardar cambios'}</button></form><aside className="telegram-card"><span className="telegram-icon">✈</span><p className="kicker">TELEGRAM</p><h3>No te pierdas nada.</h3><p>Vincula tu cuenta para recibir confirmaciones, recordatorios y avisos de cupos.</p>{telegramCode ? <div className="telegram-code"><small>Envía esto al bot</small><strong>/vincular {telegramCode}</strong></div> : <button className="secondary" disabled={busy === 'telegram'} onClick={generateTelegramCode}>{busy === 'telegram' ? 'Generando…' : 'Generar código de vínculo'}</button>}<button type="button" className="signout" onClick={signOut}>Cerrar sesión</button></aside></div> : <div className="auth-grid"><form className="auth-card" onSubmit={registerUser}><span className="form-index">01</span><h3>Crea tu cuenta</h3><p>Empieza a inscribirte en tus próximos retos.</p><input required placeholder="Nombre completo" value={register.nombre} onChange={(event) => setRegister({ ...register, nombre: event.target.value })} /><input required type="email" placeholder="Correo electrónico" value={register.email} onChange={(event) => setRegister({ ...register, email: event.target.value })} /><input required minLength="8" type="password" placeholder="Contraseña (mínimo 8 caracteres)" value={register.password} onChange={(event) => setRegister({ ...register, password: event.target.value })} /><button className="primary" disabled={busy === 'register'}>{busy === 'register' ? 'Creando…' : 'Crear cuenta'}</button></form><form className="auth-card dark" onSubmit={signIn}><span className="form-index">02</span><h3>Ya soy parte</h3><p>Ingresa para consultar tus pases e inscribirte.</p><input required type="email" placeholder="Correo electrónico" value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} /><input required type="password" placeholder="Contraseña" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} /><button className="secondary" disabled={busy === 'login'}>{busy === 'login' ? 'Ingresando…' : 'Iniciar sesión'}</button></form></div>}</section>}
      {view === 'bookings' && <section className="bookings-section"><p className="kicker">MI ACTIVIDAD</p><h2>Mis pases</h2><p className="section-intro">Aquí puedes consultar el estado de cada inscripción y liberar un cupo si cambian tus planes.</p>{bookingsState === 'loading' ? <Status state="loading">Consultando tus inscripciones.</Status> : bookingsState === 'error' ? <Status state="error">No fue posible cargar tus pases.</Status> : bookings.length ? <div className="booking-list">{bookings.map((row) => <article key={row.inscripcion_id} className="booking"><div className="booking-state"><span className={bookingStatusClass(row.estado)}>{row.estado.replace('_', ' ')}</span></div><div><h3>{row.evento_id}</h3><p>Inscrito el {formatDate(row.fecha_inscripcion || '')}</p></div>{!['CANCELADA', 'ASISTIO'].includes(row.estado) && <button className="cancel" disabled={busy === row.inscripcion_id} onClick={() => cancelBooking(row.inscripcion_id)}>{busy === row.inscripcion_id ? 'Cancelando…' : 'Cancelar'}</button>}</article>)}</div> : <Status>Aún no tienes pases. Explora el catálogo para encontrar tu próximo evento.</Status>}</section>}
      {view === 'checkin' && <section className="checkin-section"><div className="checkin-heading"><p className="kicker">CONTROL DE INGRESO</p><h2>Check-in digital</h2><p>Registra la llegada con los identificadores de la inscripción y del evento.</p></div><div className="checkin-layout"><form className="checkin-card" onSubmit={submitCheckin}><label>Identificador de inscripción<input required autoComplete="off" placeholder="Ej. INS-001" value={checkin.inscripcion_id} onChange={(event) => setCheckin({ ...checkin, inscripcion_id: event.target.value })} /></label><label>Identificador de evento<input required autoComplete="off" placeholder="Ej. EVT-001" value={checkin.evento_id} onChange={(event) => setCheckin({ ...checkin, evento_id: event.target.value })} /></label><button className="primary" disabled={busy === 'checkin'}>{busy === 'checkin' ? 'Validando…' : 'Registrar ingreso'} <b>{icon.arrow}</b></button></form>{checkinResult ? <aside className={`checkin-result ${String(checkinResult.resultado || '').toLowerCase()}`}><span>{checkinResult.resultado === 'EXITOSO' ? '✓' : checkinResult.resultado === 'DUPLICADO' ? 'i' : '!'}</span><div><p>{checkinResult.resultado || 'RESULTADO'}</p><h3>{checkinResult.mensaje || 'Solicitud procesada'}</h3><small>{checkinResult.detalle || `Inscripción: ${checkinResult.inscripcion_id || '—'}`}</small></div></aside> : <aside className="checkin-note"><span>⌁</span><p>El resultado mostrará si el ingreso fue exitoso, duplicado o rechazado.</p></aside>}</div></section>}
    </main>
    {selected && <div className="modal-layer" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="event-title"><button className="modal-close" aria-label="Cerrar" onClick={() => setSelected(null)}>×</button><span className="category">{selected.categoria}</span><h2 id="event-title">{selected.nombre}</h2><p className="modal-description">{selected.descripcion}</p><div className="modal-meta"><span>{icon.calendar}<b>{formatDate(selected.fecha)}</b> · {selected.hora || 'Por definir'}</span><span>{icon.pin}<b>{selected.lugar || 'Lugar por confirmar'}</b></span><span>{icon.users}<b>{selected.cupos_disponibles ?? 0} cupos disponibles</b></span></div>{selectedUnavailable ? <p className="modal-unavailable">{selectedUnavailableMessage}</p> : <form onSubmit={joinEvent}>{selectedFull && <p className="modal-description">Este evento está lleno. Puedes unirte a la lista de espera y recibirás un cupo si alguien cancela su inscripción.</p>}<label>Nombre para acreditación<input placeholder={session?.usuario?.nombre || 'Tu nombre'} value={bookingName} onChange={(event) => setBookingName(event.target.value)} /></label><button className="primary" disabled={busy === 'booking'}>{busy === 'booking' ? 'Procesando…' : token ? selectedFull ? 'Unirme a la lista de espera' : 'Solicitar mi pase' : selectedFull ? 'Acceder para unirme a la lista de espera' : 'Acceder para inscribirme'} <b>{icon.arrow}</b></button></form>}</section></div>}
    <button className="chat-launcher" onClick={() => setChatOpen(!chatOpen)} aria-label="Abrir asistente"><span>✦</span><i>¿Te ayudamos?</i></button>
    {chatOpen && <aside className="chat-panel"><div className="chat-header"><div><span>✦</span><b>Asistente EventPass</b><small>En línea</small></div><button aria-label="Cerrar asistente" onClick={() => setChatOpen(false)}>×</button></div><div className="messages">{chat.length ? chat.map((message, index) => <p key={index} className={message.role}>{message.text}</p>) : <p className="assistant">Hola, ¿quieres saber sobre eventos, horarios, cupos o lista de espera?</p>}</div><form onSubmit={sendChat}><input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Escribe tu pregunta…" /><button disabled={busy === 'chat'}>{busy === 'chat' ? '…' : icon.arrow}</button></form></aside>}
    <footer><button className="brand" onClick={openCatalog}><span className="brand-mark">E</span><span>EventPass<em>Sports</em></span></button><p>Eventos que te ponen en movimiento.</p><span>© 2026 EventPass Sports</span></footer>
  </div>;
}

export default App;
