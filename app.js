/* ============================================
   TALLERCITAS — APP LOGIC
   Sistema de Citas para Talleres Mecánicos
   Firebase + localStorage dual mode
   ============================================ */
(function () {
    'use strict';

    // ========== CONFIG ==========
    const KEYS = { talleres: 'tc_talleres', usuarios: 'tc_usuarios', citas: 'tc_citas', session: 'tc_session' };
    const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const DAYS_ES = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];

    // ========== DOM ==========
    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s);

    // ========== STATE ==========
    let db = null, auth = null, useFirebase = false;
    let currentUser = null;
    let talleres = [], usuarios = [], citas = [];
    let calYear, calMonth, selectedDate = null;

    // ========== DATA LAYER ==========
    function initFirebase() {
        if (typeof USE_FIREBASE === 'undefined' || !USE_FIREBASE) {
            return; // localStorage mode, banner stays visible
        }
        if (!FIREBASE_CONFIG || !FIREBASE_CONFIG.apiKey) {
            updateBanner('⚠️ firebase-config.js no tiene las credenciales completas.');
            return;
        }
        try {
            if (typeof firebase === 'undefined') {
                updateBanner('⚠️ No se pudo cargar el SDK de Firebase. Verifica tu conexión a internet.');
                return;
            }
            firebase.initializeApp(FIREBASE_CONFIG);
            db = firebase.firestore();
            auth = firebase.auth();
            useFirebase = true;
            const banner = $('#firebaseBanner');
            if (banner) banner.style.display = 'none';
        } catch (e) {
            updateBanner('⚠️ Error Firebase: ' + e.message);
            console.error('Firebase init error:', e);
        }
    }

    function updateBanner(msg) {
        const banner = $('#firebaseBanner');
        if (banner) {
            banner.querySelector('span').textContent = msg;
            banner.style.background = 'rgba(248,113,113,0.15)';
            banner.style.borderColor = 'rgba(248,113,113,0.3)';
            banner.style.color = '#f87171';
        }
    }


    function loadLocal(key) { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } }
    function saveLocal(key, data) { localStorage.setItem(key, JSON.stringify(data)); }

    async function loadAllData() {
        if (useFirebase) {
            try {
                const [tSnap, uSnap, cSnap] = await Promise.all([
                    db.collection('talleres').get(),
                    db.collection('usuarios').get(),
                    db.collection('citas').get()
                ]);
                talleres = tSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                usuarios = uSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                citas = cSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            } catch (e) { console.error('Firestore load error', e); loadFromLocal(); }
        } else { loadFromLocal(); }
    }

    function loadFromLocal() {
        talleres = loadLocal(KEYS.talleres);
        usuarios = loadLocal(KEYS.usuarios);
        citas = loadLocal(KEYS.citas);
    }

    function saveAll() {
        saveLocal(KEYS.talleres, talleres);
        saveLocal(KEYS.usuarios, usuarios);
        saveLocal(KEYS.citas, citas);
    }

    async function saveTaller(t) {
        if (useFirebase) { try { await db.collection('talleres').doc(t.id).set(t); } catch(e) { console.error(e); } }
        const idx = talleres.findIndex(x => x.id === t.id);
        if (idx >= 0) talleres[idx] = t; else talleres.push(t);
        saveLocal(KEYS.talleres, talleres);
    }

    async function deleteTallerById(id) {
        if (useFirebase) { try { await db.collection('talleres').doc(id).delete(); } catch(e) { console.error(e); } }
        talleres = talleres.filter(x => x.id !== id);
        saveLocal(KEYS.talleres, talleres);
    }

    async function saveUsuario(u) {
        if (useFirebase) { try { await db.collection('usuarios').doc(u.id).set(u); } catch(e) { console.error(e); } }
        const idx = usuarios.findIndex(x => x.id === u.id);
        if (idx >= 0) usuarios[idx] = u; else usuarios.push(u);
        saveLocal(KEYS.usuarios, usuarios);
    }

    async function deleteUsuarioById(id) {
        if (useFirebase) { try { await db.collection('usuarios').doc(id).delete(); } catch(e) { console.error(e); } }
        usuarios = usuarios.filter(x => x.id !== id);
        saveLocal(KEYS.usuarios, usuarios);
    }

    async function saveCita(c) {
        if (useFirebase) { try { await db.collection('citas').doc(c.id).set(c); } catch(e) { console.error(e); } }
        const idx = citas.findIndex(x => x.id === c.id);
        if (idx >= 0) citas[idx] = c; else citas.push(c);
        saveLocal(KEYS.citas, citas);
    }

    async function deleteCitaById(id) {
        if (useFirebase) { try { await db.collection('citas').doc(id).delete(); } catch(e) { console.error(e); } }
        citas = citas.filter(x => x.id !== id);
        saveLocal(KEYS.citas, citas);
    }

    // ========== HELPERS ==========
    function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 9); }
    function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
    function fmtDate(d) { if (!d) return '—'; const [y,m,dd] = d.split('-'); return `${dd}/${m}/${y}`; }
    function dateKey(y, m, d) { return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
    function prettyDate(ds) {
        if (!ds) return '';
        const [y,m,d] = ds.split('-').map(Number);
        return `${d} de ${MONTHS_ES[m-1]}, ${y}`;
    }

    function showToast(msg) {
        const t = $('#toast');
        t.textContent = msg;
        t.classList.add('visible');
        clearTimeout(t._t);
        t._t = setTimeout(() => t.classList.remove('visible'), 2800);
    }

    function openModal(id) { $(id).classList.add('active'); document.body.style.overflow = 'hidden'; }
    function closeModal(id) { $(id).classList.remove('active'); document.body.style.overflow = ''; }

    function getTallerName(id) { const t = talleres.find(x => x.id === id); return t ? t.nombre : '—'; }

    function getVisibleCitas() {
        const tId = $('#activeTallerSelect').value;
        let result = [...citas];
        if (currentUser && currentUser.rol === 'taller') {
            const allowed = currentUser.talleresAsignados || [];
            result = result.filter(c => allowed.includes(c.tallerId));
        }
        if (currentUser && currentUser.rol === 'cliente') {
            result = result.filter(c => c.creadoPor === currentUser.id || c.solicitanteEmail === currentUser.email);
        }
        if (tId) result = result.filter(c => c.tallerId === tId);
        return result;
    }

    function getMonthCitas(y, m) {
        const prefix = `${y}-${String(m + 1).padStart(2, '0')}`;
        return getVisibleCitas().filter(c => c.fecha && c.fecha.startsWith(prefix));
    }

    // ========== AUTH ==========
    function getSession() { try { return JSON.parse(localStorage.getItem(KEYS.session)); } catch { return null; } }
    function setSession(u) { localStorage.setItem(KEYS.session, JSON.stringify(u)); currentUser = u; }
    function clearSession() { localStorage.removeItem(KEYS.session); currentUser = null; }

    async function doLogin(email, password) {
        if (useFirebase) {
            try {
                const cred = await auth.signInWithEmailAndPassword(email, password);
                // Always fetch from Firestore to get latest role
                const snap = await db.collection('usuarios').where('email', '==', email).limit(1).get();
                if (!snap.empty) {
                    const u = { id: snap.docs[0].id, ...snap.docs[0].data() };
                    setSession(u);
                    // Update local array too
                    const idx = usuarios.findIndex(x => x.email === email);
                    if (idx >= 0) usuarios[idx] = u; else usuarios.push(u);
                    saveLocal(KEYS.usuarios, usuarios);
                    return true;
                }
                // User exists in Auth but not in Firestore yet — create with cliente role
                const newU = { id: cred.user.uid, nombre: cred.user.displayName || email.split('@')[0], email, rol: 'cliente', talleresAsignados: [], creadoEn: new Date().toISOString() };
                await db.collection('usuarios').doc(newU.id).set(newU);
                usuarios.push(newU);
                saveLocal(KEYS.usuarios, usuarios);
                setSession(newU);
                return true;
            } catch (e) { showToast('Error: ' + e.message); return false; }
        }
        const u = usuarios.find(x => x.email === email && x.password === password);
        if (u) { setSession(u); return true; }
        showToast('Credenciales incorrectas'); return false;
    }

    async function doRegister(name, email, password) {
        if (useFirebase) {
            try {
                const cred = await auth.createUserWithEmailAndPassword(email, password);
                // Check if admin already created a profile for this email
                const snap = await db.collection('usuarios').where('email', '==', email).limit(1).get();
                let u;
                if (!snap.empty) {
                    // Profile exists — update it with the Firebase Auth UID and keep role
                    u = { id: snap.docs[0].id, ...snap.docs[0].data() };
                    u.id = cred.user.uid;
                    if (!u.nombre || u.nombre === '') u.nombre = name;
                    await db.collection('usuarios').doc(cred.user.uid).set(u);
                    // Remove old doc if id was different
                    if (snap.docs[0].id !== cred.user.uid) {
                        await db.collection('usuarios').doc(snap.docs[0].id).delete();
                    }
                } else {
                    // No pre-created profile — new user, defaults to cliente
                    u = { id: cred.user.uid, nombre: name, email, rol: 'cliente', talleresAsignados: [], creadoEn: new Date().toISOString() };
                    await db.collection('usuarios').doc(u.id).set(u);
                }
                const idx = usuarios.findIndex(x => x.email === email);
                if (idx >= 0) usuarios[idx] = u; else usuarios.push(u);
                saveLocal(KEYS.usuarios, usuarios);
                setSession(u);
                return true;
            } catch (e) { showToast('Error: ' + e.message); return false; }
        }
        if (usuarios.find(x => x.email === email)) { showToast('El correo ya está registrado'); return false; }
        const u = { id: uid(), nombre: name, email, rol: 'cliente', password, talleresAsignados: [], creadoEn: new Date().toISOString() };
        await saveUsuario(u);
        setSession(u);
        return true;
    }

    function demoLogin(role) {
        const u = usuarios.find(x => x.rol === role);
        if (u) { setSession(u); enterApp(); }
        else { showToast('No hay usuario demo con rol ' + role); }
    }

    function logout() {
        if (useFirebase && auth) { try { auth.signOut(); } catch(e) {} }
        clearSession();
        $('#appShell').classList.add('hidden');
        $('#loginScreen').classList.remove('hidden');
    }

    // ========== DEMO DATA ==========
    function seedDemoData() {
        if (talleres.length > 0) return;
        const t1 = { id: uid(), nombre: 'Taller MTY Centro', direccion: 'Av. Constitución 500, Monterrey', telefono: '81 1234 5678', capacidad: 8 };
        const t2 = { id: uid(), nombre: 'Taller MTY Sur', direccion: 'Av. Revolución 1200, Monterrey', telefono: '81 2345 6789', capacidad: 6 };
        const t3 = { id: uid(), nombre: 'Taller GDL', direccion: 'Av. Vallarta 3000, Guadalajara', telefono: '33 1234 5678', capacidad: 10 };

        const u1 = { id: uid(), nombre: 'Carlos Hernández', email: 'carlosu.hernandez@mecanicatek.com', rol: 'admin', password: '', talleresAsignados: [t1.id, t2.id, t3.id], creadoEn: new Date().toISOString() };

        talleres = [t1, t2, t3]; usuarios = [u1];

        const now = new Date();
        const y = now.getFullYear(), m = now.getMonth();
        const estados = ['pendiente','confirmada','realizada','no_asistio','reprogramada'];
        const servicios = ['Mantenimiento preventivo','Cambio de frenos','Alineación y balanceo','Cambio de aceite','Revisión general','Diagnóstico electrónico','Reparación de suspensión','Cambio de llantas'];
        const vehiculos = ['Tractocamión','Remolque','Camioneta','Camión','Automóvil'];
        const solicitantes = ['Juan Pérez','Ana López','Pedro Martínez','Sofía Rodríguez','Luis Hernández','Miguel Torres'];

        citas = [];
        for (let i = 0; i < 35; i++) {
            const day = Math.floor(Math.random() * 28) + 1;
            const taller = [t1, t2, t3][Math.floor(Math.random() * 3)];
            citas.push({
                id: uid(),
                tallerId: taller.id,
                fecha: dateKey(y, m, day),
                economico: 'ECO-' + (1000 + Math.floor(Math.random() * 9000)),
                tipoVehiculo: vehiculos[Math.floor(Math.random() * vehiculos.length)],
                placas: String.fromCharCode(65+Math.floor(Math.random()*26)) + String.fromCharCode(65+Math.floor(Math.random()*26)) + String.fromCharCode(65+Math.floor(Math.random()*26)) + '-' + (100+Math.floor(Math.random()*900)),
                servicio: servicios[Math.floor(Math.random() * servicios.length)],
                solicitante: solicitantes[Math.floor(Math.random() * solicitantes.length)],
                telefonoSolicitante: '81 ' + (1000+Math.floor(Math.random()*9000)) + ' ' + (1000+Math.floor(Math.random()*9000)),
                generadoPor: u1.nombre,
                estado: estados[Math.floor(Math.random() * estados.length)],
                fechaReprogramada: null,
                notas: '',
                creadoPor: u1.id,
                creadoEn: new Date().toISOString(),
                actualizadoEn: null
            });
        }
        saveAll();
    }

    // ========== NAVIGATION ==========
    let currentView = 'calendario';

    function navigateTo(view) {
        currentView = view;
        $$('.view').forEach(v => v.classList.remove('active'));
        const el = $(`#view${view.charAt(0).toUpperCase() + view.slice(1)}`);
        if (el) el.classList.add('active');
        $$('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === view));
        // Close mobile sidebar
        $('#sidebar').classList.remove('open');
        $('#sidebarOverlay').classList.add('hidden');

        if (view === 'calendario') renderCalendar();
        else if (view === 'talleres') renderTalleres();
        else if (view === 'usuarios') renderUsuarios();
        else if (view === 'reportes') renderReportes();
    }

    function updateUIForRole() {
        if (!currentUser) return;
        const role = currentUser.rol;
        $$('.admin-only').forEach(el => { el.style.display = role === 'admin' ? '' : 'none'; });
        const tSelect = $('#tallerSelectContainer');
        if (role === 'cliente') { tSelect.style.display = 'none'; }
        else { tSelect.style.display = ''; }
        // Update user info
        $('#userName').textContent = currentUser.nombre;
        $('#userRole').textContent = role === 'admin' ? 'Administrador' : role === 'taller' ? 'Encargado' : 'Cliente';
        $('#userAvatar').textContent = currentUser.nombre.charAt(0).toUpperCase();
        // Populate taller select
        populateTallerSelects();
    }

    function populateTallerSelects() {
        const selects = ['#activeTallerSelect', '#citaTaller', '#reportTaller'];
        const userTalleres = currentUser.rol === 'taller' ? talleres.filter(t => (currentUser.talleresAsignados || []).includes(t.id)) : talleres;

        selects.forEach(sel => {
            const el = $(sel);
            if (!el) return;
            const isRequired = sel === '#citaTaller';
            const val = el.value;
            el.innerHTML = isRequired ? '<option value="">Seleccionar taller...</option>' : '<option value="">Todos los talleres</option>';
            userTalleres.forEach(t => { el.innerHTML += `<option value="${t.id}">${esc(t.nombre)}</option>`; });
            if (userTalleres.find(x => x.id === val)) el.value = val;
        });
    }

    // ========== CALENDAR ==========
    function renderCalendar() {
        const body = $('#calendarBody');
        const firstDay = new Date(calYear, calMonth, 1);
        const lastDay = new Date(calYear, calMonth + 1, 0);
        let startOffset = firstDay.getDay() - 1;
        if (startOffset < 0) startOffset = 6;

        const monthCitas = getMonthCitas(calYear, calMonth);

        // Update title
        const title = `${MONTHS_ES[calMonth]} ${calYear}`;
        $('#calendarMonthTitle').textContent = title;
        $('#calendarSubtitle').textContent = title;

        // Stats
        const counts = { pendiente: 0, confirmada: 0, realizada: 0, no_asistio: 0, reprogramada: 0 };
        monthCitas.forEach(c => { if (counts[c.estado] !== undefined) counts[c.estado]++; });
        $('#statPendientes').textContent = counts.pendiente;
        $('#statConfirmadas').textContent = counts.confirmada;
        $('#statRealizadas').textContent = counts.realizada;
        $('#statNoAsistio').textContent = counts.no_asistio;

        // Build grid
        const today = new Date();
        const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());
        let html = '';
        const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

        for (let i = 0; i < totalCells; i++) {
            const dayNum = i - startOffset + 1;
            const date = new Date(calYear, calMonth, dayNum);
            const isCurrentMonth = date.getMonth() === calMonth;
            const dk = dateKey(date.getFullYear(), date.getMonth(), date.getDate());
            const isToday = dk === todayKey;
            const isSelected = dk === selectedDate;
            const dayCitas = getVisibleCitas().filter(c => c.fecha === dk);

            let cls = 'cal-day';
            if (!isCurrentMonth) cls += ' other-month';
            if (isToday) cls += ' today';
            if (isSelected) cls += ' selected';

            let indicators = '';
            if (dayCitas.length > 0 && isCurrentMonth) {
                const grouped = {};
                dayCitas.forEach(c => { grouped[c.estado] = (grouped[c.estado] || 0) + 1; });
                for (const [estado, count] of Object.entries(grouped)) {
                    const label = estado === 'no_asistio' ? 'No asistió' : estado.charAt(0).toUpperCase() + estado.slice(1);
                    indicators += `<div class="day-indicator ${estado === 'no_asistio' ? 'noshow' : estado === 'pendiente' ? 'pending' : estado === 'confirmada' ? 'confirmed' : estado === 'realizada' ? 'done' : 'rescheduled'}">${count} ${label}</div>`;
                }
            }

            html += `<div class="${cls}" data-date="${dk}">
                <span class="day-num">${date.getDate()}</span>
                ${dayCitas.length > 0 && isCurrentMonth ? `<span class="day-badge">${dayCitas.length}</span>` : ''}
                <div class="day-indicators">${indicators}</div>
            </div>`;
        }
        body.innerHTML = html;

        // Bind day clicks
        body.querySelectorAll('.cal-day').forEach(cell => {
            cell.addEventListener('click', () => {
                selectedDate = cell.dataset.date;
                renderCalendar();
                openDayPanel(selectedDate);
            });
        });
    }

    function openDayPanel(dk) {
        const panel = $('#dayPanel');
        panel.classList.remove('hidden');
        const dayCitas = getVisibleCitas().filter(c => c.fecha === dk);
        $('#dayPanelTitle').textContent = prettyDate(dk);
        $('#dayPanelCount').textContent = `${dayCitas.length} cita${dayCitas.length !== 1 ? 's' : ''} programada${dayCitas.length !== 1 ? 's' : ''}`;

        const body = $('#dayPanelBody');
        if (dayCitas.length === 0) {
            body.innerHTML = '<div class="empty-state"><div class="empty-icon">📅</div><h3>Sin citas este día</h3><p>Agrega una nueva cita para este día.</p></div>';
            return;
        }

        body.innerHTML = dayCitas.map(c => {
            const isAdmin = currentUser && currentUser.rol === 'admin';
            const isTaller = currentUser && currentUser.rol === 'taller';
            const canManage = isAdmin || isTaller;
            const statusMap = { pendiente: 'Pendiente', confirmada: 'Confirmada', realizada: 'Realizada', no_asistio: 'No asistió', reprogramada: 'Reprogramada' };

            let actions = '';
            if (canManage) {
                if (c.estado === 'pendiente') {
                    actions += `<button class="btn-action confirm" title="Confirmar" data-id="${c.id}" data-action="confirmar">✅</button>`;
                    actions += `<button class="btn-action reschedule" title="Reprogramar" data-id="${c.id}" data-action="reprogramar">🔄</button>`;
                    actions += `<button class="btn-action noshow" title="No asistió" data-id="${c.id}" data-action="no_asistio">❌</button>`;
                }
                if (c.estado === 'confirmada') {
                    actions += `<button class="btn-action done" title="Marcar realizada" data-id="${c.id}" data-action="realizada">🔧</button>`;
                    actions += `<button class="btn-action noshow" title="No asistió" data-id="${c.id}" data-action="no_asistio">❌</button>`;
                    actions += `<button class="btn-action reschedule" title="Reprogramar" data-id="${c.id}" data-action="reprogramar">🔄</button>`;
                }
                actions += `<button class="btn-action edit" title="Editar" data-id="${c.id}" data-action="editar">✎</button>`;
                if (isAdmin) actions += `<button class="btn-action delete" title="Eliminar" data-id="${c.id}" data-action="eliminar">🗑</button>`;
            }

            return `<div class="cita-card">
                <div class="cita-header">
                    <span class="cita-economico">${esc(c.economico)}</span>
                    <span class="status-badge status-${c.estado}"><span class="dot"></span>${statusMap[c.estado] || c.estado}</span>
                </div>
                <div class="cita-body">
                    <div class="cita-field"><strong>Vehículo:</strong> ${esc(c.tipoVehiculo)}</div>
                    <div class="cita-field"><strong>Placas:</strong> ${esc(c.placas || '—')}</div>
                    <div class="cita-field"><strong>Servicio:</strong> ${esc(c.servicio)}</div>
                    <div class="cita-field"><strong>Solicitante:</strong> ${esc(c.solicitante)}</div>
                    <div class="cita-field"><strong>Taller:</strong> ${esc(getTallerName(c.tallerId))}</div>
                    <div class="cita-field"><strong>Generada por:</strong> ${esc(c.generadoPor || '—')}</div>
                    ${c.fechaReprogramada ? `<div class="cita-field"><strong>Reprog.:</strong> ${fmtDate(c.fechaReprogramada)}</div>` : ''}
                    ${c.notas ? `<div class="cita-field" style="grid-column:1/-1"><strong>Notas:</strong> ${esc(c.notas)}</div>` : ''}
                </div>
                ${actions ? `<div class="cita-actions">${actions}</div>` : ''}
            </div>`;
        }).join('');

        // Bind action buttons
        body.querySelectorAll('.btn-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                handleCitaAction(btn.dataset.id, btn.dataset.action);
            });
        });
    }

    // ========== CITA ACTIONS ==========
    let pendingAction = null;

    function handleCitaAction(citaId, action) {
        const c = citas.find(x => x.id === citaId);
        if (!c) return;

        if (action === 'editar') { openCitaModal(c); return; }
        if (action === 'eliminar') {
            pendingAction = async () => { await deleteCitaById(citaId); renderCalendar(); if (selectedDate) openDayPanel(selectedDate); showToast('Cita eliminada'); };
            $('#confirmIcon').textContent = '🗑️';
            $('#confirmText').textContent = '¿Eliminar esta cita?';
            $('#confirmDetail').textContent = `${c.economico} — ${c.servicio}`;
            $('#rescheduleGroup').classList.add('hidden');
            $('#btnConfirmOk').className = 'btn btn-danger';
            $('#btnConfirmOk').textContent = 'Eliminar';
            openModal('#modalConfirmOverlay');
            return;
        }
        if (action === 'reprogramar') {
            pendingAction = async () => {
                const newDate = $('#rescheduleDate').value;
                if (!newDate) { showToast('Selecciona una fecha'); return; }
                c.estado = 'reprogramada';
                c.fechaReprogramada = newDate;
                c.actualizadoEn = new Date().toISOString();
                await saveCita(c);
                closeModal('#modalConfirmOverlay');
                renderCalendar();
                if (selectedDate) openDayPanel(selectedDate);
                showToast('Cita reprogramada');
            };
            $('#confirmIcon').textContent = '🔄';
            $('#confirmText').textContent = 'Reprogramar cita';
            $('#confirmDetail').textContent = `${c.economico} — Fecha actual: ${fmtDate(c.fecha)}`;
            $('#rescheduleGroup').classList.remove('hidden');
            $('#rescheduleDate').value = '';
            $('#btnConfirmOk').className = 'btn btn-primary';
            $('#btnConfirmOk').textContent = 'Reprogramar';
            openModal('#modalConfirmOverlay');
            return;
        }

        const statusLabels = { confirmar: 'Confirmar', realizada: 'Marcar como realizada', no_asistio: 'Marcar como no asistió' };
        const statusIcons = { confirmar: '✅', realizada: '🔧', no_asistio: '❌' };
        const newStatus = action === 'confirmar' ? 'confirmada' : action;

        pendingAction = async () => {
            c.estado = newStatus;
            c.actualizadoEn = new Date().toISOString();
            if (action === 'confirmar') c.confirmadoPor = currentUser ? currentUser.nombre : '';
            await saveCita(c);
            closeModal('#modalConfirmOverlay');
            renderCalendar();
            if (selectedDate) openDayPanel(selectedDate);
            showToast(`Cita ${statusLabels[action].toLowerCase()}`);
        };
        $('#confirmIcon').textContent = statusIcons[action] || '⚠️';
        $('#confirmText').textContent = `¿${statusLabels[action]}?`;
        $('#confirmDetail').textContent = `${c.economico} — ${c.servicio}`;
        $('#rescheduleGroup').classList.add('hidden');
        $('#btnConfirmOk').className = action === 'no_asistio' ? 'btn btn-danger' : 'btn btn-primary';
        $('#btnConfirmOk').textContent = statusLabels[action];
        openModal('#modalConfirmOverlay');
    }

    // ========== CITA MODAL ==========
    function openCitaModal(cita) {
        const isEdit = !!cita;
        $('#modalCitaTitle').textContent = isEdit ? 'Editar Cita' : 'Nueva Cita';
        $('#citaId').value = isEdit ? cita.id : '';
        $('#citaTaller').value = isEdit ? cita.tallerId : '';
        $('#citaFecha').value = isEdit ? cita.fecha : (selectedDate || '');
        $('#citaEconomico').value = isEdit ? cita.economico : '';
        $('#citaTipoVehiculo').value = isEdit ? cita.tipoVehiculo : '';
        $('#citaPlacas').value = isEdit ? cita.placas : '';
        $('#citaServicio').value = isEdit ? cita.servicio : '';
        $('#citaSolicitante').value = isEdit ? cita.solicitante : '';
        $('#citaTelefono').value = isEdit ? cita.telefonoSolicitante : '';
        $('#citaGeneradaPor').value = isEdit ? (cita.generadoPor || '') : (currentUser ? currentUser.nombre : '');
        $('#citaNotas').value = isEdit ? (cita.notas || '') : '';
        openModal('#modalCitaOverlay');
    }

    async function handleCitaSubmit(e) {
        e.preventDefault();
        const id = $('#citaId').value || uid();
        const isEdit = !!$('#citaId').value;
        const existing = isEdit ? citas.find(x => x.id === id) : {};

        const c = {
            ...existing,
            id,
            tallerId: $('#citaTaller').value,
            fecha: $('#citaFecha').value,
            economico: $('#citaEconomico').value.trim(),
            tipoVehiculo: $('#citaTipoVehiculo').value,
            placas: $('#citaPlacas').value.trim(),
            servicio: $('#citaServicio').value.trim(),
            solicitante: $('#citaSolicitante').value.trim(),
            telefonoSolicitante: $('#citaTelefono').value.trim(),
            generadoPor: $('#citaGeneradaPor').value.trim(),
            notas: $('#citaNotas').value.trim(),
            estado: isEdit ? (existing.estado || 'pendiente') : 'pendiente',
            creadoPor: isEdit ? (existing.creadoPor || (currentUser ? currentUser.id : '')) : (currentUser ? currentUser.id : ''),
            creadoEn: isEdit ? (existing.creadoEn || new Date().toISOString()) : new Date().toISOString(),
            actualizadoEn: isEdit ? new Date().toISOString() : null
        };

        await saveCita(c);
        closeModal('#modalCitaOverlay');
        $('#formCita').reset();
        renderCalendar();
        if (selectedDate) openDayPanel(selectedDate);
        showToast(isEdit ? 'Cita actualizada' : 'Cita creada');
    }

    // ========== TALLERES VIEW ==========
    function renderTalleres() {
        const grid = $('#talleresGrid');
        const empty = $('#emptyTalleres');

        if (talleres.length === 0) {
            grid.innerHTML = '';
            empty.classList.remove('hidden');
            return;
        }
        empty.classList.add('hidden');

        grid.innerHTML = talleres.map(t => {
            const staff = usuarios.filter(u => u.rol === 'taller' && (u.talleresAsignados || []).includes(t.id));
            const citasCount = citas.filter(c => c.tallerId === t.id).length;

            return `<div class="taller-card">
                <div class="taller-card-header">
                    <h3>${esc(t.nombre)}</h3>
                    <div class="taller-actions">
                        <button class="btn-action edit" data-id="${t.id}" data-entity="taller" title="Editar">✎</button>
                        <button class="btn-action delete" data-id="${t.id}" data-entity="taller" title="Eliminar">🗑</button>
                    </div>
                </div>
                <div class="taller-card-body">
                    <div class="taller-info">
                        <div class="taller-info-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg><span>${esc(t.direccion || 'Sin dirección')}</span></div>
                        <div class="taller-info-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg><span>${esc(t.telefono || '—')}</span></div>
                        <div class="taller-info-item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><span>${citasCount} citas · Cap: ${t.capacidad || '—'}/día</span></div>
                    </div>
                    ${staff.length > 0 ? `<div class="taller-staff"><div class="taller-staff-label">Encargados</div><div class="taller-staff-list">${staff.map(s => `<span class="staff-chip">${esc(s.nombre)}</span>`).join('')}</div></div>` : ''}
                </div>
            </div>`;
        }).join('');

        grid.querySelectorAll('.btn-action.edit[data-entity="taller"]').forEach(btn => {
            btn.addEventListener('click', () => openTallerModal(talleres.find(t => t.id === btn.dataset.id)));
        });
        grid.querySelectorAll('.btn-action.delete[data-entity="taller"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const t = talleres.find(x => x.id === btn.dataset.id);
                pendingAction = async () => { await deleteTallerById(btn.dataset.id); closeModal('#modalConfirmOverlay'); renderTalleres(); populateTallerSelects(); showToast('Taller eliminado'); };
                $('#confirmIcon').textContent = '🗑️';
                $('#confirmText').textContent = '¿Eliminar este taller?';
                $('#confirmDetail').textContent = t ? t.nombre : '';
                $('#rescheduleGroup').classList.add('hidden');
                $('#btnConfirmOk').className = 'btn btn-danger';
                $('#btnConfirmOk').textContent = 'Eliminar';
                openModal('#modalConfirmOverlay');
            });
        });
    }

    function openTallerModal(t) {
        const isEdit = !!t;
        $('#modalTallerTitle').textContent = isEdit ? 'Editar Taller' : 'Nuevo Taller';
        $('#tallerId').value = isEdit ? t.id : '';
        $('#tallerNombre').value = isEdit ? t.nombre : '';
        $('#tallerDireccion').value = isEdit ? (t.direccion || '') : '';
        $('#tallerTelefono').value = isEdit ? (t.telefono || '') : '';
        $('#tallerCapacidad').value = isEdit ? (t.capacidad || '') : '';
        openModal('#modalTallerOverlay');
    }

    async function handleTallerSubmit(e) {
        e.preventDefault();
        const id = $('#tallerId').value || uid();
        const t = { id, nombre: $('#tallerNombre').value.trim(), direccion: $('#tallerDireccion').value.trim(), telefono: $('#tallerTelefono').value.trim(), capacidad: parseInt($('#tallerCapacidad').value) || 0 };
        await saveTaller(t);
        closeModal('#modalTallerOverlay');
        $('#formTaller').reset();
        renderTalleres();
        populateTallerSelects();
        showToast($('#tallerId').value ? 'Taller actualizado' : 'Taller creado');
    }

    // ========== USUARIOS VIEW ==========
    function renderUsuarios() {
        const body = $('#usuariosBody');
        const empty = $('#emptyUsuarios');
        const container = $('#usuariosTableContainer');

        if (usuarios.length === 0) {
            container.style.display = 'none';
            empty.classList.remove('hidden');
            return;
        }
        container.style.display = '';
        empty.classList.add('hidden');

        body.innerHTML = usuarios.map(u => {
            const roleLabels = { admin: 'Administrador', taller: 'Encargado', cliente: 'Cliente' };
            const assignedNames = (u.talleresAsignados || []).map(tid => getTallerName(tid)).filter(n => n !== '—');
            return `<tr>
                <td style="font-weight:600;color:var(--text-primary)">${esc(u.nombre)}</td>
                <td>${esc(u.email)}</td>
                <td><span class="role-badge role-${u.rol}">${roleLabels[u.rol] || u.rol}</span></td>
                <td>${assignedNames.length > 0 ? assignedNames.map(n => `<span class="staff-chip">${esc(n)}</span>`).join(' ') : '<span style="color:var(--text-muted)">—</span>'}</td>
                <td><div style="display:flex;gap:0.3rem">
                    <button class="btn-action edit" data-id="${u.id}" data-entity="usuario">✎</button>
                    <button class="btn-action delete" data-id="${u.id}" data-entity="usuario">🗑</button>
                </div></td>
            </tr>`;
        }).join('');

        body.querySelectorAll('.btn-action.edit[data-entity="usuario"]').forEach(btn => {
            btn.addEventListener('click', () => openUsuarioModal(usuarios.find(u => u.id === btn.dataset.id)));
        });
        body.querySelectorAll('.btn-action.delete[data-entity="usuario"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const u = usuarios.find(x => x.id === btn.dataset.id);
                pendingAction = async () => { await deleteUsuarioById(btn.dataset.id); closeModal('#modalConfirmOverlay'); renderUsuarios(); showToast('Usuario eliminado'); };
                $('#confirmIcon').textContent = '🗑️';
                $('#confirmText').textContent = '¿Eliminar este usuario?';
                $('#confirmDetail').textContent = u ? u.nombre : '';
                $('#rescheduleGroup').classList.add('hidden');
                $('#btnConfirmOk').className = 'btn btn-danger';
                $('#btnConfirmOk').textContent = 'Eliminar';
                openModal('#modalConfirmOverlay');
            });
        });
    }

    function openUsuarioModal(u) {
        const isEdit = !!u;
        $('#modalUsuarioTitle').textContent = isEdit ? 'Editar Usuario' : 'Nuevo Usuario';
        $('#usuarioId').value = isEdit ? u.id : '';
        $('#usuarioNombre').value = isEdit ? u.nombre : '';
        $('#usuarioEmail').value = isEdit ? u.email : '';
        $('#usuarioRol').value = isEdit ? u.rol : '';
        $('#usuarioPassword').value = '';
        // Taller checkboxes
        const cg = $('#tallerCheckboxes');
        const assigned = isEdit ? (u.talleresAsignados || []) : [];
        cg.innerHTML = talleres.map(t => `<label class="checkbox-label"><input type="checkbox" value="${t.id}" ${assigned.includes(t.id) ? 'checked' : ''}> ${esc(t.nombre)}</label>`).join('');
        openModal('#modalUsuarioOverlay');
    }

    async function handleUsuarioSubmit(e) {
        e.preventDefault();
        const id = $('#usuarioId').value || uid();
        const isEdit = !!$('#usuarioId').value;
        const existing = isEdit ? usuarios.find(x => x.id === id) : {};
        const checkedTalleres = Array.from($('#tallerCheckboxes').querySelectorAll('input:checked')).map(cb => cb.value);
        const pw = $('#usuarioPassword').value;

        const u = {
            ...existing,
            id,
            nombre: $('#usuarioNombre').value.trim(),
            email: $('#usuarioEmail').value.trim(),
            rol: $('#usuarioRol').value,
            talleresAsignados: checkedTalleres,
            creadoEn: isEdit ? (existing.creadoEn || new Date().toISOString()) : new Date().toISOString()
        };
        if (pw) u.password = pw;
        else if (!isEdit) u.password = '123456';

        await saveUsuario(u);
        closeModal('#modalUsuarioOverlay');
        $('#formUsuario').reset();
        renderUsuarios();
        showToast(isEdit ? 'Usuario actualizado' : 'Usuario creado');
    }

    // ========== REPORTES ==========
    function renderReportes() {
        const monthSel = $('#reportMonth');
        if (monthSel.options.length === 0) {
            const now = new Date();
            for (let i = -6; i <= 1; i++) {
                const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
                const val = `${d.getFullYear()}-${d.getMonth()}`;
                const label = `${MONTHS_ES[d.getMonth()]} ${d.getFullYear()}`;
                const opt = new Option(label, val);
                if (i === 0) opt.selected = true;
                monthSel.add(opt);
            }
        }

        const [ry, rm] = ($('#reportMonth').value || `${calYear}-${calMonth}`).split('-').map(Number);
        const tId = $('#reportTaller').value;
        const prefix = `${ry}-${String(rm + 1).padStart(2, '0')}`;
        let mc = getVisibleCitas().filter(c => c.fecha && c.fecha.startsWith(prefix));
        if (tId) mc = mc.filter(c => c.tallerId === tId);

        $('#reportSubtitle').textContent = `${MONTHS_ES[rm]} ${ry}`;

        const total = mc.length;
        const conf = mc.filter(c => c.estado === 'confirmada').length;
        const done = mc.filter(c => c.estado === 'realizada').length;
        const nosh = mc.filter(c => c.estado === 'no_asistio').length;
        const resc = mc.filter(c => c.estado === 'reprogramada').length;
        const rate = total > 0 ? Math.round((done / total) * 100) : 0;

        $('#kpiTotal').textContent = total;
        $('#kpiConfirmadas').textContent = conf;
        $('#kpiRealizadas').textContent = done;
        $('#kpiNoAsistio').textContent = nosh;
        $('#kpiReprogramadas').textContent = resc;
        $('#kpiTasa').textContent = rate + '%';

        const pct = n => total > 0 ? Math.round((n / total) * 100) + '%' : '0%';
        $('#kpiBarConfirmadas').style.width = pct(conf);
        $('#kpiBarRealizadas').style.width = pct(done);
        $('#kpiBarNoAsistio').style.width = pct(nosh);
        $('#kpiBarReprogramadas').style.width = pct(resc);
        $('#kpiBarTasa').style.width = rate + '%';

        // Daily chart
        const daysInMonth = new Date(ry, rm + 1, 0).getDate();
        const dailyCounts = {};
        for (let d = 1; d <= daysInMonth; d++) dailyCounts[d] = 0;
        mc.forEach(c => { const day = parseInt(c.fecha.split('-')[2]); if (dailyCounts[day] !== undefined) dailyCounts[day]++; });
        const maxCount = Math.max(...Object.values(dailyCounts), 1);

        const chartHtml = Object.entries(dailyCounts).map(([d, count]) => {
            const h = Math.round((count / maxCount) * 150);
            return `<div class="chart-bar-group"><div class="chart-bar" style="height:${h}px">${count > 0 ? `<span class="chart-bar-value">${count}</span>` : ''}</div><span class="chart-bar-label">${d}</span></div>`;
        }).join('');
        $('#dailyChart').innerHTML = chartHtml;

        // Top days
        const sortedDays = Object.entries(dailyCounts).filter(([,c]) => c > 0).sort((a,b) => b[1] - a[1]).slice(0, 5);
        $('#topDaysList').innerHTML = sortedDays.map(([d, count], i) => {
            const dk = `${ry}-${String(rm + 1).padStart(2, '0')}-${d.padStart(2, '0')}`;
            const w = Math.round((count / maxCount) * 100);
            return `<div class="top-day-item"><span class="top-day-rank">#${i + 1}</span><span class="top-day-date">${prettyDate(dk)}</span><div class="top-day-bar"><div class="top-day-bar-fill" style="width:${w}%"></div></div><span class="top-day-count">${count} citas</span></div>`;
        }).join('') || '<p style="color:var(--text-muted);padding:1rem">Sin datos para este período.</p>';

        // Report table
        const tbody = $('#reportTableBody');
        tbody.innerHTML = mc.sort((a,b) => a.fecha.localeCompare(b.fecha)).map(c => {
            const statusLabels = { pendiente: 'Pendiente', confirmada: 'Confirmada', realizada: 'Realizada', no_asistio: 'No asistió', reprogramada: 'Reprogramada' };
            return `<tr><td>${fmtDate(c.fecha)}</td><td style="font-weight:700;color:var(--accent)">${esc(c.economico)}</td><td>${esc(c.tipoVehiculo)}</td><td>${esc(c.servicio)}</td><td>${esc(c.solicitante)}</td><td>${esc(getTallerName(c.tallerId))}</td><td><span class="status-badge status-${c.estado}"><span class="dot"></span>${statusLabels[c.estado]||c.estado}</span></td></tr>`;
        }).join('');
    }

    function downloadReportCSV() {
        const [ry, rm] = ($('#reportMonth').value || `${calYear}-${calMonth}`).split('-').map(Number);
        const tId = $('#reportTaller').value;
        const prefix = `${ry}-${String(rm + 1).padStart(2, '0')}`;
        let mc = getVisibleCitas().filter(c => c.fecha && c.fecha.startsWith(prefix));
        if (tId) mc = mc.filter(c => c.tallerId === tId);

        if (mc.length === 0) { showToast('No hay datos para descargar'); return; }

        const headers = ['Fecha','Económico','Tipo Vehículo','Placas','Servicio','Solicitante','Teléfono','Taller','Estado','Generada por','Notas'];
        const rows = mc.map(c => [c.fecha, c.economico, c.tipoVehiculo, c.placas, c.servicio, c.solicitante, c.telefonoSolicitante, getTallerName(c.tallerId), c.estado, c.generadoPor, c.notas]);
        let csv = '\uFEFF' + headers.join(',') + '\n';
        rows.forEach(r => { csv += r.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',') + '\n'; });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `reporte_citas_${MONTHS_ES[rm]}_${ry}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
        showToast(`CSV descargado (${mc.length} registros)`);
    }

    // ========== ENTER APP ==========
    function enterApp() {
        $('#loginScreen').classList.add('hidden');
        $('#appShell').classList.remove('hidden');
        updateUIForRole();
        renderCalendar();
    }

    // ========== EVENT BINDINGS ==========
    function bindEvents() {
        // Login
        $('#loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (await doLogin($('#loginEmail').value, $('#loginPassword').value)) enterApp();
        });
        $('#registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            if (await doRegister($('#regName').value, $('#regEmail').value, $('#regPassword').value)) enterApp();
        });
        $('#btnShowRegister').addEventListener('click', () => { $('#loginForm').classList.add('hidden'); $('#registerForm').classList.remove('hidden'); });
        $('#btnShowLogin').addEventListener('click', () => { $('#registerForm').classList.add('hidden'); $('#loginForm').classList.remove('hidden'); });

        // Demo buttons (removed)

        // Logout
        $('#btnLogout').addEventListener('click', logout);

        // Navigation
        $$('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => { e.preventDefault(); navigateTo(item.dataset.view); });
        });

        // Mobile
        const toggleSidebar = () => { $('#sidebar').classList.toggle('open'); $('#sidebarOverlay').classList.toggle('hidden'); };
        $('#btnMobileMenu').addEventListener('click', toggleSidebar);
        $('#sidebarOverlay').addEventListener('click', toggleSidebar);
        $('#btnMobileAdd').addEventListener('click', () => openCitaModal(null));

        // Calendar nav
        $('#btnPrevMonth').addEventListener('click', () => { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } selectedDate = null; $('#dayPanel').classList.add('hidden'); renderCalendar(); });
        $('#btnNextMonth').addEventListener('click', () => { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } selectedDate = null; $('#dayPanel').classList.add('hidden'); renderCalendar(); });
        $('#btnToday').addEventListener('click', () => { const n = new Date(); calYear = n.getFullYear(); calMonth = n.getMonth(); selectedDate = null; $('#dayPanel').classList.add('hidden'); renderCalendar(); });

        // Taller select change
        $('#activeTallerSelect').addEventListener('change', () => { renderCalendar(); if (selectedDate) openDayPanel(selectedDate); });

        // New buttons
        $('#btnNewCita').addEventListener('click', () => openCitaModal(null));
        $('#btnAddCitaDay').addEventListener('click', () => openCitaModal(null));
        $('#btnNewTaller').addEventListener('click', () => openTallerModal(null));
        $('#btnNewUsuario').addEventListener('click', () => openUsuarioModal(null));

        // Close day panel
        $('#btnCloseDayPanel').addEventListener('click', () => { selectedDate = null; $('#dayPanel').classList.add('hidden'); renderCalendar(); });

        // Forms
        $('#formCita').addEventListener('submit', handleCitaSubmit);
        $('#formTaller').addEventListener('submit', handleTallerSubmit);
        $('#formUsuario').addEventListener('submit', handleUsuarioSubmit);

        // Modal closes
        const modalPairs = [
            ['#btnCloseCita', '#btnCancelCita', '#modalCitaOverlay'],
            ['#btnCloseTaller', '#btnCancelTaller', '#modalTallerOverlay'],
            ['#btnCloseUsuario', '#btnCancelUsuario', '#modalUsuarioOverlay'],
            ['#btnCloseConfirm', '#btnConfirmCancel', '#modalConfirmOverlay']
        ];
        modalPairs.forEach(([closeBtn, cancelBtn, overlay]) => {
            $(closeBtn).addEventListener('click', () => closeModal(overlay));
            $(cancelBtn).addEventListener('click', () => closeModal(overlay));
            $(overlay).addEventListener('click', (e) => { if (e.target === $(overlay)) closeModal(overlay); });
        });

        // Confirm button
        $('#btnConfirmOk').addEventListener('click', () => { if (pendingAction) pendingAction(); });

        // Reports
        $('#reportMonth').addEventListener('change', renderReportes);
        $('#reportTaller').addEventListener('change', renderReportes);
        $('#btnDownloadReport').addEventListener('click', downloadReportCSV);

        // Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                ['#modalCitaOverlay', '#modalTallerOverlay', '#modalUsuarioOverlay', '#modalConfirmOverlay'].forEach(id => closeModal(id));
            }
        });
    }

    // ========== INIT ==========
    async function init() {
        initFirebase();
        await loadAllData();
        seedDemoData();
        // Reload after seed
        if (!useFirebase) loadFromLocal();

        const now = new Date();
        calYear = now.getFullYear();
        calMonth = now.getMonth();

        bindEvents();

        // Auto-login from session
        const session = getSession();
        if (session) {
            currentUser = session;
            // Verify user still exists
            const u = usuarios.find(x => x.id === session.id);
            if (u) { currentUser = u; setSession(u); enterApp(); return; }
        }
        // Show login
        $('#loginScreen').classList.remove('hidden');
    }

    document.addEventListener('DOMContentLoaded', init);
})();
