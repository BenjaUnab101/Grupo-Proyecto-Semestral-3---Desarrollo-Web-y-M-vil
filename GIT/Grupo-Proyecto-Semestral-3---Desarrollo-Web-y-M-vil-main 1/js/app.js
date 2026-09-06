// ========================= //
// Calendario de Actividades //
// ========================= //

document.addEventListener("DOMContentLoaded", () => {
    
    // Array de objetos simulando una Base de Datos o API //
    const actividades = [
        {
            titulo: "Muestra Folclórica Fiestas Patrias",
            fecha: "2026-09-15",
            hora: "10:30 hrs",
            lugar: "Patio Central",
            descripcion: "Celebración tradicional con bailes típicos preparados por los niveles preescolares. Asistencia con traje típico opcional."
        },
        {
            titulo: "Reunión de Apoderados",
            fecha: "2026-09-14",
            hora: "18:30 hrs",
            lugar: "Salas respectivas",
            descripcion: "Entrega de informes de evaluación fonoaudiológica del primer semestre y directrices generales."
        },
        {
            titulo: "Día del Párvulo",
            fecha: "2026-11-22",
            hora: "09:00 hrs",
            lugar: "Todo el establecimiento",
            descripcion: "Jornada de juegos, convivencia y actividades lúdicas. Los niños pueden asistir disfrazados."
        },
        {
            titulo: "Salida Anticipada por Capacitación",
            fecha: "2026-09-10",
            hora: "12:30 hrs",
            lugar: "Establecimiento",
            descripcion: "Suspensión de actividades jornada tarde por capacitación comunal docente."
        }
    ];

    // 2. Lógica para ordenar el array por fecha (ascendente) //
    actividades.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    // 3. Función auxiliar para extraer día, mes y año amigablemente //
    const formatearFecha = (fechaISO) => {
        // Se añade T00:00:00 para evitar problemas de zona horaria al renderizar //
        const fecha = new Date(fechaISO + "T00:00:00"); 
        const dia = fecha.getDate().toString().padStart(2, '0');
        const mes = fecha.toLocaleString('es-ES', { month: 'short' });
        const anio = fecha.getFullYear();
        
        return { dia, mes, anio };
    };

    // 4. Inyección en el DOM //
    const contenedor = document.getElementById('calendar-container');
    
    if (contenedor) {
        let htmlContenido = '';
        
        // Se establece la fecha de hoy a las 00:00 para comparar días exactos
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        actividades.forEach(act => {
            const { dia, mes, anio } = formatearFecha(act.fecha);
            
            // Convertir la fecha de la actividad para hacer la resta matemática
            const fechaActividad = new Date(act.fecha + "T00:00:00");
            const diferenciaMilisegundos = fechaActividad - hoy;
            const diferenciaDias = diferenciaMilisegundos / (1000 * 60 * 60 * 24);
            
            // Lógica: Si faltan entre 0 y 7 días, asignamos el diseño urgente
            let claseAlerta = '';
            let badgeHTML = '';
            let colorDia = '';
            
            if (diferenciaDias >= 0 && diferenciaDias <= 7) {
                claseAlerta = 'activity-soon';
                badgeHTML = '<span class="badge-soon">¡Esta semana!</span>';
                colorDia = 'color: var(--pr-orange);';
            }
            
            htmlContenido += `
                <div class="col-12 col-md-6 col-lg-4" style="position: relative;">
                    ${badgeHTML}
                    <article class="activity-card ${claseAlerta}">
                        <div class="activity-date">
                            <span class="activity-day" style="${colorDia}">${dia}</span>
                            <div class="activity-month-year">
                                <span>${mes}</span>
                                <span>${anio}</span>
                            </div>
                        </div>
                        <h3 class="activity-title">${act.titulo}</h3>
                        <p class="activity-desc">${act.descripcion}</p>
                        <div class="activity-meta">
                            <span>⏰ ${act.hora}</span>
                            <span>📍 ${act.lugar}</span>
                        </div>
                    </article>
                </div>
            `;
        });
        
        contenedor.innerHTML = htmlContenido;
    }
});

// =========================== //
// Sección muro de Comunicados //
// =========================== // 

// Array de objetos con los comunicados simulados //
    const comunicados = [
        {
            categoria: "general",
            esUrgente: true,
            etiquetaClase: "tag-urgent",
            etiquetaTexto: "Urgente Institucional",
            fechaISO: "2026-09-02",
            fechaDisplay: "02 Sep 2026",
            titulo: "Corte Programado y Salida Anticipada de Alumnos",
            cuerpo: "Informamos a los apoderados que este viernes se suspenden las actividades de la jornada de la tarde a contar de las 12:30 hrs debido a trabajos sanitarios en el sector. Rogamos puntualidad en el retiro de los menores.",
            emisor: "Dirección",
            alcance: "Todo el establecimiento"
        },
        {
            categoria: "tel",
            esUrgente: false,
            etiquetaClase: "tag-tel",
            etiquetaTexto: "Fonoaudiología",
            fechaISO: "2026-08-29",
            fechaDisplay: "29 Ago 2026",
            titulo: "Inicio de Evaluaciones Diagnósticas y Reevaluación",
            cuerpo: "Durante la primera quincena de septiembre se realizarán las sesiones de reevaluación semestral de habla y lenguaje para los niveles Medio Mayor B y Transición TEL. Se emitirán informes individuales.",
            emisor: "Equipo Fonoaudiológico",
            alcance: "Salas 3, 5 y 7"
        },
        {
            categoria: "preescolar",
            esUrgente: false,
            etiquetaClase: "tag-activity",
            etiquetaTexto: "Actividad Escolar",
            fechaISO: "2026-08-25",
            fechaDisplay: "25 Ago 2026",
            titulo: "Celebración Fiestas Patrias y Minuta de Convivencia",
            cuerpo: "Se encuentra disponible en el panel de descargas la minuta de alimentos saludables y sugerencias de vestimenta para la muestra folclórica de este mes.",
            emisor: "Docentes de Nivel",
            alcance: "Preescolar"
        }
    ];

    // Inyección dinámica en el contenedor //
    const noticesFeed = document.getElementById('noticesFeed');

    if (noticesFeed) {
        let comunicadosHTML = '';

        comunicados.forEach(aviso => {
            // Operador ternario para agregar la clase de urgencia si corresponde //
            const claseUrgente = aviso.esUrgente ? ' notice-urgent' : '';

            comunicadosHTML += `
              <article class="notice-item${claseUrgente}" data-category="${aviso.categoria}">
                <header class="notice-header">
                  <span class="tag-status ${aviso.etiquetaClase}">${aviso.etiquetaTexto}</span>
                  <time datetime="${aviso.fechaISO}">${aviso.fechaDisplay}</time>
                </header>
                <h3 class="notice-title">${aviso.titulo}</h3>
                <p class="notice-body">${aviso.cuerpo}</p>
                <footer class="notice-footer">
                  <span class="notice-emitter">Emite: ${aviso.emisor}</span>
                  <span class="notice-scope">Alcance: ${aviso.alcance}</span>
                </footer>
              </article>
            `;
        });

    // Filtro Dinamico de Comunicados //

    const botonesFiltro = document.querySelectorAll('.btn-filter');

    botonesFiltro.forEach(boton => {
        boton.addEventListener('click', (evento) => {
            // 1. Remover el estado activo de todos los botones //
            botonesFiltro.forEach(btn => btn.classList.remove('is-active'));
            
            // 2. Agregar el estado activo solo al botón clickeado //
            const botonClickeado = evento.target;
            botonClickeado.classList.add('is-active');

            // 3. Obtener qué categoría queremos filtrar leyendo el data-filter //
            const categoriaSeleccionada = botonClickeado.getAttribute('data-filter');

            // 4. Seleccionar todas las tarjetas del DOM (las que inyectamos antes) //
            const tarjetasComunicados = document.querySelectorAll('.notice-item');
            
            // 5. Recorrer las tarjetas y mostrar/ocultar según la categoría //
            tarjetasComunicados.forEach(tarjeta => {
                const categoriaTarjeta = tarjeta.getAttribute('data-category');
                
                if (categoriaSeleccionada === 'all' || categoriaTarjeta === categoriaSeleccionada) {
                    tarjeta.style.display = 'block'; // Mostrar
                } else {
                    tarjeta.style.display = 'none';  // Ocultar
                }
            });
        });
    });

        noticesFeed.innerHTML = comunicadosHTML;
    }

// ========================================================== //
// TAREA 2: INTERACCIÓN DE GALERÍA (LIGHTBOX SIMPLE)          //
// Manejo de evento click para mostrar imagen ampliada en JS  //
// ========================================================== //

function initGalleryLightbox() {
    const lightbox = document.getElementById('galleryLightbox');
    const lightboxImg = document.getElementById('lightboxImg');
    const lightboxTitle = document.getElementById('lightboxTitle');
    const lightboxDesc = document.getElementById('lightboxDesc');
    const lightboxTag = document.getElementById('lightboxTag');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxBackdrop = document.getElementById('lightboxBackdrop');
    const galleryCards = document.querySelectorAll('.gallery-card');

    if (!lightbox || !galleryCards.length) return;

    const openLightbox = (card) => {
        const imgSrc = card.getAttribute('data-img');
        const title = card.getAttribute('data-title');
        const desc = card.getAttribute('data-desc');
        const tagElem = card.querySelector('.gallery-tag');
        const tagText = tagElem ? tagElem.textContent : 'Actividad Institucional';

        if (lightboxImg) {
            lightboxImg.src = imgSrc;
            lightboxImg.alt = title;
        }
        if (lightboxTitle) lightboxTitle.textContent = title;
        if (lightboxDesc) lightboxDesc.textContent = desc;
        if (lightboxTag) lightboxTag.textContent = tagText;

        lightbox.classList.add('is-open');
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    };

    const closeLightbox = () => {
        lightbox.classList.remove('is-open');
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (lightboxImg) lightboxImg.src = '';
    };

    galleryCards.forEach(card => {
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Ampliar fotografía: ${card.getAttribute('data-title')}`);

        card.addEventListener('click', () => openLightbox(card));

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openLightbox(card);
            }
        });
    });

    if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
    if (lightboxBackdrop) lightboxBackdrop.addEventListener('click', closeLightbox);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightbox.classList.contains('is-open')) {
            closeLightbox();
        }
    });
}

// ========================================================== //
// TAREA 3: ESTRUCTURA DE DATOS APODERADO–ALUMNOS             //
// Modelado relacional en JS (1 apoderado a N alumnos)        //
// Soporte para familias con hermanos (Patricia Morales).     //
// Privacidad resguardada: solo nivel, asistencia, atrasos    //
// y estado de participación escolar.                         //
// ========================================================== //

const apoderadosData = [
    {
        rut: "12.345.678-9",
        email: "patricia.morales@example.com",
        password: "clave123",
        nombre: "Patricia Morales Castro",
        telefono: "+56 9 8765 4321",
        alumnos: [
            {
                id: "ALU-101",
                nombreCompleto: "Mateo Gómez Morales",
                edad: "3 años",
                nivelCurso: "Medio Mayor B (TEL)",
                sala: "Sala 3",
                asistenciaPorcentaje: 95,
                diasAsistidos: 57,
                diasTotales: 60,
                atrasosAcumulados: 1,
                estadoParticipacion: "Sobresaliente",
                observacionParticipacion: "Demuestra activa motivación en talleres grupales de estimulación fonoaudiológica y rondas lúdicas."
            },
            {
                id: "ALU-102",
                nombreCompleto: "Sofía Gómez Morales",
                edad: "5 años",
                nivelCurso: "Kínder Regular",
                sala: "Sala 6",
                asistenciaPorcentaje: 98,
                diasAsistidos: 59,
                diasTotales: 60,
                atrasosAcumulados: 0,
                estadoParticipacion: "Muy Activa y Colaborativa",
                observacionParticipacion: "Excelente disposición social, liderazgo positivo en juegos guiados y actividades de expresión artística."
            }
        ]
    },
    {
        rut: "15.678.901-2",
        email: "carlos.munoz@example.com",
        password: "clave456",
        nombre: "Carlos Muñoz Soto",
        telefono: "+56 9 7654 3210",
        alumnos: [
            {
                id: "ALU-103",
                nombreCompleto: "Lucas Muñoz Valenzuela",
                edad: "4 años",
                nivelCurso: "Prekínder TEL",
                sala: "Sala 5",
                asistenciaPorcentaje: 88,
                diasAsistidos: 53,
                diasTotales: 60,
                atrasosAcumulados: 3,
                estadoParticipacion: "Constante con Buena Disposición",
                observacionParticipacion: "Se integra con gran entusiasmo a las sesiones de articulación fonética y dinámicas en el patio activo."
            }
        ]
    },
    {
        rut: "18.234.567-8",
        email: "carolina.vargas@example.com",
        password: "clave789",
        nombre: "Carolina Vargas Silva",
        telefono: "+56 9 6543 2109",
        alumnos: [
            {
                id: "ALU-104",
                nombreCompleto: "Valentina Henríquez Vargas",
                edad: "2 años",
                nivelCurso: "Medio Menor",
                sala: "Sala 1",
                asistenciaPorcentaje: 96,
                diasAsistidos: 58,
                diasTotales: 60,
                atrasosAcumulados: 1,
                estadoParticipacion: "Frecuente y Lúdica",
                observacionParticipacion: "Rápida y armoniosa adaptación al grupo de pares y excelente vinculación afectiva con sus educadoras."
            }
        ]
    }
];

// Variable global de sesión simulada
let sesionApoderadoActivo = null;

// ========================================================== //
// TAREA 4: SIMULACIÓN DE ACCESO USUARIO / CONTRASEÑA         //
// Formulario de login validado contra arreglo JS sin backend //
// ========================================================== //

function initPortalLogin() {
    const loginForm = document.getElementById('portalLoginForm');
    const inputUser = document.getElementById('portalUser');
    const inputPass = document.getElementById('portalPass');
    const alertError = document.getElementById('portalLoginError');
    const demoButtons = document.querySelectorAll('.demo-user-btn');

    if (!loginForm) return;

    // Relleno automático de credenciales para demostración / evaluación rápida
    demoButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const user = btn.getAttribute('data-user');
            const pass = btn.getAttribute('data-pass');
            if (inputUser) inputUser.value = user;
            if (inputPass) inputPass.value = pass;
            if (alertError) alertError.style.display = 'none';
        });
    });

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userInput = (inputUser.value || '').trim().toLowerCase();
        const passInput = (inputPass.value || '').trim();

        // Normalizar entrada de usuario (remover puntos de RUT si los hubiere)
        const userNormalizado = userInput.replace(/\./g, '');

        const apoderadoEncontrado = apoderadosData.find(ap => {
            const rutNormalizado = ap.rut.toLowerCase().replace(/\./g, '');
            const emailNormalizado = ap.email.toLowerCase();

            const coincideUsuario = (userNormalizado === rutNormalizado || userInput === emailNormalizado);
            const coincideClave = (passInput === ap.password);

            return coincideUsuario && coincideClave;
        });

        if (apoderadoEncontrado) {
            sesionApoderadoActivo = apoderadoEncontrado;
            if (alertError) alertError.style.display = 'none';
            loginForm.reset();
            mostrarDashboardApoderado(apoderadoEncontrado);
        } else {
            if (alertError) {
                alertError.style.display = 'block';
                alertError.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }
    });

    // Botón de Cerrar Sesión
    const btnLogout = document.getElementById('portalLogoutBtn');
    if (btnLogout) {
        btnLogout.addEventListener('click', cerrarSesionApoderado);
    }
}

function cerrarSesionApoderado() {
    sesionApoderadoActivo = null;
    const viewLogin = document.getElementById('portalLoginView');
    const viewDashboard = document.getElementById('portalDashboardView');
    const headerSub = document.getElementById('portalHeaderSub');
    const alertError = document.getElementById('portalLoginError');

    if (viewLogin) viewLogin.style.display = 'block';
    if (viewDashboard) viewDashboard.style.display = 'none';
    if (headerSub) headerSub.textContent = 'Seguimiento general de párvulos';
    if (alertError) alertError.style.display = 'none';
}

// ========================================================== //
// TAREA 5: VISTA SIMULADA DE FICHA DEL ALUMNO                //
// Presenta curso, asistencia, atrasos y estado escolar       //
// con soporte para alternar entre hermanos.                  //
// Respeto absoluto a la privacidad (sin datos de salud/TEL). //
// ========================================================== //

function mostrarDashboardApoderado(apoderado) {
    const viewLogin = document.getElementById('portalLoginView');
    const viewDashboard = document.getElementById('portalDashboardView');
    const labelParentName = document.getElementById('portalParentName');
    const headerSub = document.getElementById('portalHeaderSub');
    const siblingWrapper = document.getElementById('portalSiblingSelectorWrapper');
    const siblingBtnGroup = document.getElementById('portalSiblingButtonGroup');

    if (viewLogin) viewLogin.style.display = 'none';
    if (viewDashboard) viewDashboard.style.display = 'block';
    if (labelParentName) labelParentName.textContent = apoderado.nombre;
    if (headerSub) headerSub.textContent = `Apoderado/a: ${apoderado.nombre}`;

    // Si el apoderado tiene más de un pupilo (caso hermanos)
    if (apoderado.alumnos.length > 1) {
        if (siblingWrapper) siblingWrapper.style.display = 'block';
        if (siblingBtnGroup) {
            siblingBtnGroup.innerHTML = '';
            apoderado.alumnos.forEach((alumno, index) => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = `btn btn-sm ${index === 0 ? 'btn-primary' : 'btn-outline-primary'}`;
                btn.innerHTML = `👶 <strong>${alumno.nombreCompleto.split(' ')[0]}</strong> (${alumno.nivelCurso})`;
                btn.addEventListener('click', () => {
                    siblingBtnGroup.querySelectorAll('button').forEach(b => {
                        b.className = 'btn btn-sm btn-outline-primary';
                    });
                    btn.className = 'btn btn-sm btn-primary';
                    renderizarFichaAlumno(alumno);
                });
                siblingBtnGroup.appendChild(btn);
            });
        }
    } else {
        if (siblingWrapper) siblingWrapper.style.display = 'none';
    }

    // Renderizar por defecto el primer alumno
    if (apoderado.alumnos.length > 0) {
        renderizarFichaAlumno(apoderado.alumnos[0]);
    }
}

function renderizarFichaAlumno(alumno) {
    const container = document.getElementById('studentDetailContainer');
    if (!container) return;

    let barraColor = 'bg-success';
    let asistenciaBadge = 'Excelente';
    if (alumno.asistenciaPorcentaje < 90) {
        barraColor = 'bg-warning text-dark';
        asistenciaBadge = 'Regular';
    }

    container.innerHTML = `
        <header class="student-header-meta">
            <div class="student-avatar" aria-hidden="true">
                👶
            </div>
            <div class="flex-grow-1">
                <div class="d-flex flex-wrap justify-content-between align-items-start gap-2">
                    <div>
                        <h4 class="mb-1 text-primary fw-bold">${alumno.nombreCompleto}</h4>
                        <span class="badge bg-secondary-subtle text-secondary me-2">ID Alumno: ${alumno.id}</span>
                        <span class="text-muted small">Edad: ${alumno.edad}</span>
                    </div>
                    <span class="room-pill">${alumno.sala}</span>
                </div>
                <div class="mt-1">
                    <strong class="text-dark small">Nivel Educativo Asignado:</strong>
                    <span class="text-muted small ms-1">${alumno.nivelCurso}</span>
                </div>
            </div>
        </header>

        <div class="row g-3 my-2">
            <!-- Indicador 1: Asistencia General -->
            <div class="col-12 col-md-6">
                <div class="metric-badge-card">
                    <span class="metric-badge-value text-success">${alumno.asistenciaPorcentaje}%</span>
                    <span class="metric-badge-label">Asistencia General (${asistenciaBadge})</span>
                    <div class="progress mt-2" style="height: 10px; border-radius: 6px;">
                        <div class="progress-bar ${barraColor}" role="progressbar" style="width: ${alumno.asistenciaPorcentaje}%;" aria-valuenow="${alumno.asistenciaPorcentaje}" aria-valuemin="0" aria-valuemax="100"></div>
                    </div>
                    <small class="text-muted d-block mt-2">${alumno.diasAsistidos} de ${alumno.diasTotales} jornadas asistidas en el año</small>
                </div>
            </div>

            <!-- Indicador 2: Atrasos Acumulados -->
            <div class="col-12 col-md-6">
                <div class="metric-badge-card">
                    <span class="metric-badge-value ${alumno.atrasosAcumulados > 2 ? 'text-warning' : 'text-primary'}">${alumno.atrasosAcumulados}</span>
                    <span class="metric-badge-label">Atrasos Registrados</span>
                    <div class="mt-2">
                        <span class="badge ${alumno.atrasosAcumulados === 0 ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'}">
                            ${alumno.atrasosAcumulados === 0 ? '✓ Registro de Puntualidad Impecable' : '⚠️ Notificar justificativo a Inspectoría'}
                        </span>
                    </div>
                    <small class="text-muted d-block mt-2">Tolerancia oficial de recepción: hasta 08:45 hrs</small>
                </div>
            </div>
        </div>

        <!-- Indicador 3: Estado de Participación en Aula -->
        <div class="p-3 mt-3 bg-light rounded-3 border">
            <div class="d-flex align-items-center gap-2 mb-1">
                <span class="fs-5">🌟</span>
                <strong class="text-dark">Estado de Participación e Integración:</strong>
                <span class="badge bg-primary-subtle text-primary">${alumno.estadoParticipacion}</span>
            </div>
            <p class="mb-0 text-muted small">
                ${alumno.observacionParticipacion}
            </p>
        </div>
    `;
}

// Inicialización de componentes al cargar el DOM
document.addEventListener("DOMContentLoaded", () => {
    initGalleryLightbox();
    initPortalLogin();
});