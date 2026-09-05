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