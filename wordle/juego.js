// Quinteto: adivina la palabra de cinco letras en seis intentos.
(function () {
  'use strict';

  const LARGO = 5;
  const MAX_INTENTOS = 6;
  const PRIMER_DIA = new Date(2026, 8, 27); // el 27 de septiembre de 2026 es la palabra n.º 1
  const PAUSA_ENTRE_FICHAS = 300; // milisegundos
  const DURACION_GIRO = 500;
  const FELICITACIONES = ['¡Genio!', '¡Magnífico!', '¡Impresionante!', '¡Muy bien!', '¡Bien!', '¡Por poco!'];
  const FILAS_TECLADO = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'],
    ['enviar', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'borrar'],
  ];

  // Quita tildes y diéresis pero conserva la ñ: "Árbol" -> "arbol", "Sueño" -> "sueño".
  function normalizar(texto) {
    return texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/ñ/g, 'ñ')
      .replace(/[̀-ͯ]/g, '');
  }

  const RESPUESTAS = window.RESPUESTAS;
  const VALIDAS = new Set(window.VALIDAS.trim().split(/\s+/));
  RESPUESTAS.forEach(function (palabra) {
    VALIDAS.add(normalizar(palabra));
  });

  // ---------- Elegir la palabra ----------

  // Desordena la lista siempre de la misma manera, para que la palabra
  // de cada día sea la misma para todos los jugadores.
  function mezclar(lista, semilla) {
    const copia = lista.slice();
    let s = semilla;
    function azar() {
      s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(azar() * (i + 1));
      [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
  }

  const ORDEN_DIARIO = mezclar(RESPUESTAS, 20260927);

  function numeroDelDia(fecha) {
    const hoy = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    return Math.max(1, Math.round((hoy - PRIMER_DIA) / 86400000) + 1);
  }

  function palabraDelDia(numero) {
    return ORDEN_DIARIO[(numero - 1) % ORDEN_DIARIO.length];
  }

  function palabraAlAzar(evitar) {
    let palabra;
    do {
      palabra = RESPUESTAS[Math.floor(Math.random() * RESPUESTAS.length)];
    } while (palabra === evitar);
    return palabra;
  }

  // ---------- Comparar un intento con la solución ----------

  // Primero marca las letras en su sitio (verde) y después las que están
  // en otro lugar (amarillo). Así una letra repetida no se cuenta de más.
  function evaluar(intento, solucion) {
    const resultado = Array(LARGO).fill('ausente');
    const sobrantes = {};
    for (let i = 0; i < LARGO; i++) {
      if (intento[i] === solucion[i]) {
        resultado[i] = 'acierto';
      } else {
        sobrantes[solucion[i]] = (sobrantes[solucion[i]] || 0) + 1;
      }
    }
    for (let i = 0; i < LARGO; i++) {
      if (resultado[i] !== 'acierto' && sobrantes[intento[i]] > 0) {
        resultado[i] = 'presente';
        sobrantes[intento[i]]--;
      }
    }
    return resultado;
  }

  // ---------- Guardar en el navegador ----------
  // Si el navegador no deja guardar (por ejemplo, en modo incógnito),
  // el juego sigue funcionando y solo recuerda las cosas mientras la página esté abierta.

  const memoria = {};

  function leer(clave, porDefecto) {
    try {
      const valor = localStorage.getItem('quinteto:' + clave);
      if (valor !== null) return JSON.parse(valor);
    } catch (error) {
      // sin guardado disponible
    }
    return clave in memoria ? memoria[clave] : porDefecto;
  }

  function guardar(clave, valor) {
    memoria[clave] = JSON.parse(JSON.stringify(valor));
    try {
      localStorage.setItem('quinteto:' + clave, JSON.stringify(valor));
    } catch (error) {
      // sin guardado disponible
    }
  }

  function leerEstadisticas() {
    const e = leer('estadisticas', null);
    if (e && Array.isArray(e.distribucion)) return e;
    return { jugadas: 0, ganadas: 0, racha: 0, mejor: 0, distribucion: [0, 0, 0, 0, 0, 0] };
  }

  function registrarEstadistica(ganada, intentos) {
    const e = leerEstadisticas();
    e.jugadas++;
    if (ganada) {
      e.ganadas++;
      e.racha++;
      e.mejor = Math.max(e.mejor, e.racha);
      e.distribucion[intentos - 1]++;
    } else {
      e.racha = 0;
    }
    guardar('estadisticas', e);
  }

  // ---------- Estado de la partida ----------

  let partida = null; // { modo, numero, solucion, intentos, terminada, ganada }
  let escrito = ''; // letras de la fila que se está escribiendo
  let ocupado = false; // true mientras las fichas se dan la vuelta

  function esPartidaValida(p) {
    return p && typeof p.solucion === 'string' && Array.isArray(p.intentos);
  }

  function partidaNueva(modo, numero, solucion) {
    return { modo: modo, numero: numero, solucion: solucion, intentos: [], terminada: false, ganada: false };
  }

  function partidaDiaria() {
    const numero = numeroDelDia(new Date());
    const guardada = leer('diaria', null);
    if (esPartidaValida(guardada) && guardada.numero === numero) return guardada;
    return partidaNueva('diaria', numero, palabraDelDia(numero));
  }

  function partidaPractica(empezarOtra) {
    const guardada = leer('practica', null);
    if (!empezarOtra && esPartidaValida(guardada) && !guardada.terminada) return guardada;
    const deHoy = palabraDelDia(numeroDelDia(new Date()));
    return partidaNueva('practica', null, palabraAlAzar(deHoy));
  }

  function clave() {
    return normalizar(partida.solucion);
  }

  function guardarPartida() {
    guardar(partida.modo, partida);
    guardar('modo', partida.modo);
  }

  // ---------- Elementos de la página ----------

  const tablero = document.getElementById('tablero');
  const teclado = document.getElementById('teclado');
  const pista = document.getElementById('pista');
  const botonSeguir = document.getElementById('btn-seguir');
  const aviso = document.getElementById('aviso');
  const numeroDia = document.getElementById('numero-dia');
  const modoDiaria = document.getElementById('modo-diaria');
  const modoPractica = document.getElementById('modo-practica');
  const dlgAyuda = document.getElementById('dlg-ayuda');
  const dlgResultado = document.getElementById('dlg-resultado');
  const botonCompartir = document.getElementById('btn-compartir');
  const botonOtra = document.getElementById('btn-otra');
  const textoCompartir = document.getElementById('texto-compartir');
  const cuentaAtras = document.getElementById('cuenta-atras');

  const filas = [];
  const teclas = new Map();

  function construirTablero() {
    for (let f = 0; f < MAX_INTENTOS; f++) {
      const fila = document.createElement('div');
      fila.className = 'fila';
      for (let c = 0; c < LARGO; c++) {
        const ficha = document.createElement('div');
        ficha.className = 'ficha';
        fila.appendChild(ficha);
      }
      fila.addEventListener('animationend', function () {
        fila.classList.remove('sacude');
      });
      tablero.appendChild(fila);
      filas.push(fila);
    }
  }

  function construirTeclado() {
    FILAS_TECLADO.forEach(function (letras) {
      const fila = document.createElement('div');
      fila.className = 'teclado-fila';
      letras.forEach(function (tecla) {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'tecla';
        boton.dataset.tecla = tecla;
        if (tecla === 'enviar') {
          boton.classList.add('ancha');
          boton.textContent = 'Enviar';
        } else if (tecla === 'borrar') {
          boton.classList.add('ancha');
          boton.setAttribute('aria-label', 'Borrar');
          boton.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<path d="M21 5H9l-6 7 6 7h12z"/><path d="M17 9.5l-5 5M12 9.5l5 5"/></svg>';
        } else {
          boton.textContent = tecla;
          teclas.set(tecla, boton);
        }
        boton.addEventListener('click', function () {
          boton.blur(); // para que la tecla Enter del teclado físico no la vuelva a pulsar
          pulsar(tecla);
        });
        fila.appendChild(boton);
      });
      teclado.appendChild(fila);
    });
  }

  // ---------- Dibujar ----------

  function pintarFicha(ficha, letra, estado) {
    ficha.textContent = letra || '';
    ficha.classList.toggle('llena', Boolean(letra) && !estado);
    if (estado) {
      ficha.dataset.estado = estado;
    } else {
      delete ficha.dataset.estado;
    }
  }

  function pintarTablero() {
    filas.forEach(function (fila, f) {
      const fichas = fila.children;
      const intento = partida.intentos[f];
      const estados = intento ? evaluar(intento, clave()) : null;
      const letras = intento || (f === partida.intentos.length && !partida.terminada ? escrito : '');
      for (let c = 0; c < LARGO; c++) {
        fichas[c].classList.remove('gira', 'salta');
        fichas[c].style.animationDelay = '';
        pintarFicha(fichas[c], letras[c], estados && estados[c]);
      }
    });
  }

  function pintarFilaActual() {
    const fichas = filas[partida.intentos.length].children;
    for (let c = 0; c < LARGO; c++) {
      pintarFicha(fichas[c], escrito[c]);
    }
  }

  function pintarTeclado() {
    const prioridad = { ausente: 1, presente: 2, acierto: 3 };
    const mejor = {};
    partida.intentos.forEach(function (intento) {
      evaluar(intento, clave()).forEach(function (estado, i) {
        const letra = intento[i];
        if (!mejor[letra] || prioridad[estado] > prioridad[mejor[letra]]) mejor[letra] = estado;
      });
    });
    teclas.forEach(function (boton, letra) {
      if (mejor[letra]) {
        boton.dataset.estado = mejor[letra];
      } else {
        delete boton.dataset.estado;
      }
    });
  }

  function pintarModo() {
    numeroDia.textContent = 'n.º ' + numeroDelDia(new Date());
    modoDiaria.setAttribute('aria-pressed', String(partida.modo === 'diaria'));
    modoPractica.setAttribute('aria-pressed', String(partida.modo === 'practica'));
  }

  // Debajo del tablero: una indicación mientras se juega, o un botón para seguir al terminar.
  function pintarPista() {
    pista.hidden = partida.terminada;
    botonSeguir.hidden = !partida.terminada;
    botonSeguir.textContent = partida.modo === 'diaria' ? 'Jugar en Práctica' : 'Otra palabra';
    pista.textContent = partida.intentos.length === 0 ? 'Escribe una palabra de cinco letras y pulsa Enviar.' : '';
  }

  function pintarTodo() {
    pintarTablero();
    pintarTeclado();
    pintarModo();
    pintarPista();
  }

  let temporizadorAviso = null;
  function avisar(mensaje, duracion) {
    aviso.textContent = mensaje;
    aviso.classList.add('visible');
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(function () {
      aviso.classList.remove('visible');
    }, duracion || 1500);
  }

  function sinAnimaciones() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // ---------- Jugar ----------

  function hayVentanaAbierta() {
    return document.querySelector('dialog[open]') !== null;
  }

  function pulsar(tecla) {
    if (ocupado || partida.terminada || hayVentanaAbierta()) return;
    if (tecla === 'enviar') {
      enviar();
    } else if (tecla === 'borrar') {
      escrito = escrito.slice(0, -1);
      pintarFilaActual();
    } else if (escrito.length < LARGO) {
      escrito += tecla;
      pintarFilaActual();
    }
  }

  function rechazar(fila, mensaje) {
    avisar(mensaje);
    fila.classList.remove('sacude');
    void fila.offsetWidth; // reinicia la animación si ya estaba puesta
    fila.classList.add('sacude');
  }

  function enviar() {
    const fila = filas[partida.intentos.length];
    if (escrito.length < LARGO) {
      rechazar(fila, 'Faltan letras');
      return;
    }
    if (!VALIDAS.has(escrito)) {
      rechazar(fila, 'Esa palabra no está en la lista');
      return;
    }

    const intento = escrito;
    escrito = '';
    partida.intentos.push(intento);
    const numeroIntento = partida.intentos.length;
    const ganada = intento === clave();
    const perdida = !ganada && numeroIntento === MAX_INTENTOS;
    if (ganada || perdida) {
      partida.terminada = true;
      partida.ganada = ganada;
      registrarEstadistica(ganada, numeroIntento);
    }
    guardarPartida();

    revelar(fila, intento, function () {
      pintarTeclado();
      pintarPista();
      if (ganada) {
        avisar(FELICITACIONES[numeroIntento - 1], 1800);
        saltar(fila);
        setTimeout(mostrarResultado, 1800);
      } else if (perdida) {
        avisar(partida.solucion.toUpperCase(), 2500);
        setTimeout(mostrarResultado, 2200);
      }
    });
  }

  // Da la vuelta a las fichas una por una y les pone su color.
  function revelar(fila, intento, alTerminar) {
    const estados = evaluar(intento, clave());
    const fichas = fila.children;
    if (sinAnimaciones()) {
      for (let c = 0; c < LARGO; c++) pintarFicha(fichas[c], intento[c], estados[c]);
      alTerminar();
      return;
    }
    ocupado = true;
    for (let c = 0; c < LARGO; c++) {
      const ficha = fichas[c];
      setTimeout(function () {
        ficha.classList.add('gira');
        setTimeout(function () {
          pintarFicha(ficha, intento[c], estados[c]);
        }, DURACION_GIRO / 2);
        setTimeout(function () {
          ficha.classList.remove('gira');
        }, DURACION_GIRO);
      }, c * PAUSA_ENTRE_FICHAS);
    }
    setTimeout(function () {
      ocupado = false;
      alTerminar();
    }, (LARGO - 1) * PAUSA_ENTRE_FICHAS + DURACION_GIRO);
  }

  function saltar(fila) {
    Array.from(fila.children).forEach(function (ficha, c) {
      ficha.style.animationDelay = c * 100 + 'ms';
      ficha.classList.add('salta');
    });
  }

  function cambiarModo(modo, empezarOtra) {
    if (ocupado) return;
    partida = modo === 'diaria' ? partidaDiaria() : partidaPractica(empezarOtra);
    escrito = '';
    guardarPartida();
    pintarTodo();
  }

  // ---------- Resultado y estadísticas ----------

  let temporizadorCuenta = null;

  function mostrarResultado() {
    const e = leerEstadisticas();
    document.getElementById('st-jugadas').textContent = e.jugadas;
    document.getElementById('st-porcentaje').textContent = e.jugadas ? Math.round((e.ganadas * 100) / e.jugadas) : 0;
    document.getElementById('st-racha').textContent = e.racha;
    document.getElementById('st-mejor').textContent = e.mejor;

    const lista = document.getElementById('distribucion');
    lista.innerHTML = '';
    const maximo = Math.max(1, ...e.distribucion);
    e.distribucion.forEach(function (cantidad, i) {
      const item = document.createElement('li');
      const numero = document.createElement('span');
      numero.textContent = i + 1;
      const barra = document.createElement('span');
      barra.className = 'barra';
      barra.style.width = Math.max(8, (cantidad * 100) / maximo) + '%';
      barra.textContent = cantidad;
      if (partida.ganada && partida.intentos.length === i + 1) barra.classList.add('actual');
      item.append(numero, barra);
      lista.appendChild(item);
    });

    const titulo = document.getElementById('resultado-titulo');
    const palabra = document.getElementById('resultado-palabra');
    if (partida.terminada) {
      titulo.textContent = partida.ganada ? FELICITACIONES[partida.intentos.length - 1] : 'Esta vez no';
      const intentos = partida.intentos.length;
      palabra.innerHTML = partida.ganada
        ? 'Adivinaste <strong></strong> en ' + intentos + (intentos === 1 ? ' intento.' : ' intentos.')
        : 'La palabra era <strong></strong>.';
      palabra.querySelector('strong').textContent = partida.solucion.toUpperCase();
      palabra.hidden = false;
    } else {
      titulo.textContent = 'Estadísticas';
      palabra.hidden = true;
    }

    botonCompartir.hidden = !partida.terminada;
    botonCompartir.textContent = 'Copiar resultado';
    textoCompartir.hidden = true;
    botonOtra.textContent = partida.modo === 'diaria' ? 'Jugar en Práctica' : 'Otra palabra';
    botonOtra.hidden = partida.modo === 'practica' && !partida.terminada;

    const mostrarCuenta = partida.modo === 'diaria' && partida.terminada;
    cuentaAtras.hidden = !mostrarCuenta;
    clearInterval(temporizadorCuenta);
    if (mostrarCuenta) {
      actualizarCuentaAtras();
      temporizadorCuenta = setInterval(actualizarCuentaAtras, 1000);
    }

    if (!dlgResultado.open) dlgResultado.showModal();
  }

  function actualizarCuentaAtras() {
    const ahora = new Date();
    const manana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 1);
    const segundos = Math.max(0, Math.floor((manana - ahora) / 1000));
    const dosCifras = function (n) {
      return String(n).padStart(2, '0');
    };
    cuentaAtras.textContent =
      'Nueva palabra del día en ' +
      dosCifras(Math.floor(segundos / 3600)) + ':' +
      dosCifras(Math.floor((segundos % 3600) / 60)) + ':' +
      dosCifras(segundos % 60);
  }

  function textoResultado() {
    const cuadros = { acierto: '🟩', presente: '🟨', ausente: '⬛' };
    const titulo = partida.modo === 'diaria' ? 'Quinteto n.º ' + partida.numero : 'Quinteto (práctica)';
    const marcador = partida.ganada ? partida.intentos.length : 'X';
    const filasTexto = partida.intentos.map(function (intento) {
      return evaluar(intento, clave())
        .map(function (estado) {
          return cuadros[estado];
        })
        .join('');
    });
    return titulo + ' ' + marcador + '/' + MAX_INTENTOS + '\n\n' + filasTexto.join('\n');
  }

  function mostrarTextoParaCopiar(texto) {
    textoCompartir.value = texto;
    textoCompartir.hidden = false;
    textoCompartir.select();
    botonCompartir.textContent = 'Selecciona el texto y cópialo';
  }

  // ---------- Conectar botones y teclado ----------

  function prepararVentana(dialogo) {
    dialogo.querySelector('.cerrar').addEventListener('click', function () {
      dialogo.close();
    });
    // Un clic fuera de la ventana también la cierra.
    dialogo.addEventListener('click', function (evento) {
      if (evento.target !== dialogo) return;
      const r = dialogo.getBoundingClientRect();
      const fuera = evento.clientX < r.left || evento.clientX > r.right || evento.clientY < r.top || evento.clientY > r.bottom;
      if (fuera) dialogo.close();
    });
  }

  function conectarEventos() {
    prepararVentana(dlgAyuda);
    prepararVentana(dlgResultado);
    dlgResultado.addEventListener('close', function () {
      clearInterval(temporizadorCuenta);
    });

    document.getElementById('btn-ayuda').addEventListener('click', function () {
      dlgAyuda.showModal();
    });
    document.getElementById('btn-estadisticas').addEventListener('click', mostrarResultado);

    modoDiaria.addEventListener('click', function () {
      if (partida.modo !== 'diaria') cambiarModo('diaria');
    });
    modoPractica.addEventListener('click', function () {
      if (partida.modo !== 'practica') cambiarModo('practica');
    });

    botonSeguir.addEventListener('click', function () {
      cambiarModo('practica', partida.modo === 'practica');
    });

    botonOtra.addEventListener('click', function () {
      dlgResultado.close();
      cambiarModo('practica', partida.modo === 'practica');
    });

    botonCompartir.addEventListener('click', function () {
      const texto = textoResultado();
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(texto).then(
          function () {
            botonCompartir.textContent = '¡Copiado!';
          },
          function () {
            mostrarTextoParaCopiar(texto);
          }
        );
      } else {
        mostrarTextoParaCopiar(texto);
      }
    });

    // Teclado físico (ordenador).
    document.addEventListener('keydown', function (evento) {
      if (evento.ctrlKey || evento.metaKey || evento.altKey || hayVentanaAbierta()) return;
      if (evento.key === 'Enter') {
        evento.preventDefault();
        pulsar('enviar');
      } else if (evento.key === 'Backspace') {
        evento.preventDefault();
        pulsar('borrar');
      } else {
        const letra = normalizar(evento.key);
        if (/^[a-zñ]$/.test(letra)) pulsar(letra);
      }
    });

    // Si la página se queda abierta hasta el día siguiente, carga la nueva palabra del día.
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible' && partida.modo === 'diaria' && partida.numero !== numeroDelDia(new Date())) {
        cambiarModo('diaria');
      }
    });
  }

  // ---------- Arranque ----------

  construirTablero();
  construirTeclado();
  conectarEventos();
  partida = leer('modo', 'diaria') === 'practica' ? partidaPractica(false) : partidaDiaria();
  pintarTodo();

  if (!leer('ayuda-vista', false)) {
    guardar('ayuda-vista', true);
    dlgAyuda.showModal();
  }
})();
