(() => {
// 1. CONFIGURACIÓN

// Escenario (tienen que coincidir con el CSS de #escenario)
const ANCHO_ESCENARIO = 900;
const ALTO_ESCENARIO  = 500;

// Física de la llama
const GRAVEDAD = 1800;   // px/s²: cuánto aumenta la velocidad de caída por segundo
const IMPULSO  = -500;   // px/s: velocidad al saltar (negativo = hacia arriba)

const VELOCIDAD_MUNDO = 180;   // px/s

// Llama (tienen que coincidir con el CSS de #personaje)
const X_PERSONAJE     = 150;
const ANCHO_PERSONAJE = 100;
const ALTO_PERSONAJE  = 80;
const MARGEN          = 12;    // achica la caja de colisión para que el choque se sienta justo

// Cactus
const ANCHO_TUBERIA      = 80;
const HUECO_INICIAL      = 220;  // alto del hueco de la primera tubería
const HUECO_MIN          = 130;  // el hueco nunca baja de este valor
const REDUCCION          = 8;    // cuánto se achica el hueco por cada tubería nueva
const SEPARACION_INICIAL = 400;  // distancia hasta la primera tubería
const SEPARACION_MIN     = 300;  // distancia mínima entre tuberías (después es al azar)
const SEPARACION_MAX     = 500;  // distancia máxima entre tuberías
const MARGEN_VERTICAL    = 40;   // el hueco nunca queda pegado al techo o al piso

// Cartas y cóndores (tamaño en pantalla: tienen que coincidir con el CSS)
const TAM = {
  carta:  { w: 50,  h: 60 },
  condor: { w: 100, h: 99 },
};
const PROB_CARTA       = 0.6;  
const VEL_EXTRA_CONDOR = 60;   
const PUNTOS_TUBERIA   = 1;    
const PUNTOS_CARTA     = 5;    

// Reglas del juego
const VIDAS_INICIALES  = 3;
const PUNTOS_PARA_GANAR = 40;  // meta: al llegar a este puntaje se gana

// 2. ELEMENTOS DEL DOM
const escenario  = document.getElementById("escenario");
const personaje  = document.getElementById("personaje");
const elPuntaje  = document.getElementById("puntaje");
const elVidas    = document.getElementById("vidas");
const cartelFin  = document.getElementById("cartel-fin");
const tituloFin  = cartelFin.querySelector("h2");
const textoFinal = document.getElementById("texto-final");
const menuInicio = document.getElementById("menu-inicio-runner");

// Parallax: 4 capas. "factor" es qué fracción de VELOCIDAD_MUNDO se mueve cada una.
// La capa 1 es la más lejana (más lenta) y la 4 la más cercana (a la velocidad del mundo).
// "offset" guarda cuánto avanzó cada capa.
const capas = [
  { el: document.querySelector(".capa1"), factor: 0.1, offset: 0 },
  { el: document.querySelector(".capa2"), factor: 0.3, offset: 0 },
  { el: document.querySelector(".capa3"), factor: 0.6, offset: 0 },
  { el: document.querySelector(".capa4"), factor: 1.0, offset: 0 },
];

// 3. ESTADO DEL JUEGO
let jugando = false;           
let ultimoTiempo = 0;          

let y = 200;                   // posición vertical de la llama
let velY = 0;                  // velocidad vertical de la llama (px/s)

let puntos = 0;
let vidas = VIDAS_INICIALES;

let tuberia = [];              // cactus que hay en pantalla
let items = [];                // cartas y cóndores que hay en pantalla
let hueco = HUECO_INICIAL;     // alto del hueco de la próxima tubería
let distanciaDesdeUltima = 0;  // distancia recorrida desde la última tubería
let separacionActual = SEPARACION_INICIAL;

// 4. UTILIDADES

// Número entero al azar entre min (incluido) y max (excluido)
function aleatorio(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}


// 5. LA LLAMA

// Cambia la animación CSS de la llama: "volando", "aleteando", "explotando" o "golpeada".
// Cada clase tiene su @keyframes en flappy.css.
function setEstado(clase) {
  personaje.classList.remove("volando", "aleteando", "explotando", "golpeada");
  void personaje.offsetWidth;   // fuerza al navegador a reiniciar la animación (si no, no se repite)
  personaje.classList.add(clase);
}

// Cuando termina la animación de impulso o de golpe, la llama vuelve a "volando"
personaje.addEventListener("animationend", (e) => {
  if (e.animationName === "aletear" || e.animationName === "golpe") setEstado("volando");
});

// Impulso: pisa la velocidad (no la suma), así todos los saltos son iguales
function saltar() {
  if (!jugando) return;
  velY = IMPULSO;
  setEstado("aleteando");
}

// 6. CACTUS (TUBERÍAS)

// Crea una tubería: son DOS divs (cactus de arriba y de abajo) con un hueco en el medio.
function crearTuberia() {
  // Altura del hueco al azar -> las tuberías no están alineadas (req. 5c)
  const yHueco = aleatorio(MARGEN_VERTICAL, ALTO_ESCENARIO - hueco - MARGEN_VERTICAL);

  const elArriba = document.createElement("div");
  elArriba.className = "tuberia arriba";
  elArriba.style.top = "0px";
  elArriba.style.height = yHueco + "px";

  const elAbajo = document.createElement("div");
  elAbajo.className = "tuberia";
  elAbajo.style.top = (yHueco + hueco) + "px";
  elAbajo.style.height = (ALTO_ESCENARIO - yHueco - hueco) + "px";

  escenario.appendChild(elArriba);
  escenario.appendChild(elAbajo);

  tuberia.push({ x: ANCHO_ESCENARIO, yHueco, hueco, elArriba, elAbajo, contada: false });

  // El hueco se achica con cada tubería, hasta un mínimo (req. 5b)
  hueco = Math.max(HUECO_MIN, hueco - REDUCCION);
}

// 7. CARTAS Y CÓNDORES (elementos animados con spritesheet)

// Crea una carta (suma puntos) o un cóndor (resta una vida), centrado en xCentro.
function crearItem(xCentro) {
  const tipo = Math.random() < PROB_CARTA ? "carta" : "condor";
  const { w, h } = TAM[tipo];
  const yItem = aleatorio(MARGEN_VERTICAL, ALTO_ESCENARIO - h - MARGEN_VERTICAL);

  const el = document.createElement("div");
  el.className = "item " + tipo;   // la clase define el spritesheet y la animación en el CSS
  escenario.appendChild(el);

  items.push({ tipo, x: xCentro - w / 2, y: yItem, w, h, el });
}

function quitarItem(i) {
  items[i].el.remove();
  items.splice(i, 1);
}

// 8. COLISIONES (rectángulos, "AABB")
// Hay choque si los rectángulos se superponen en X y en Y a la vez.
// La caja de la llama se achica con MARGEN para que el choque sea justo.

function cajaLlama() {
  return {
    izq:    X_PERSONAJE + MARGEN,
    der:    X_PERSONAJE + ANCHO_PERSONAJE - MARGEN,
    arriba: y + MARGEN,
    abajo:  y + ALTO_PERSONAJE - MARGEN,
  };
}

// Cactus: choca si coincide en X con la tubería y NO está completamente dentro del hueco
function colisionaTuberia(t) {
  const c = cajaLlama();
  const coincideEnX = c.der > t.x && c.izq < t.x + ANCHO_TUBERIA;
  const estaEnElHueco = c.arriba > t.yHueco && c.abajo < t.yHueco + t.hueco;
  return coincideEnX && !estaEnElHueco;
}

// Carta o cóndor: choca si los dos rectángulos se superponen
function chocaConItem(it) {
  const c = cajaLlama();
  return c.der > it.x && c.izq < it.x + it.w && c.abajo > it.y && c.arriba < it.y + it.h;
}

// 9. PUNTAJE Y VIDAS

function mostrarPuntaje() {
  elPuntaje.textContent = "Puntaje: " + puntos + " / " + PUNTOS_PARA_GANAR;
}

function mostrarVidas() {
  elVidas.textContent = "♥ ".repeat(vidas);
}

function sumarPuntos(cantidad) {
  puntos += cantidad;
  mostrarPuntaje();
  if (puntos >= PUNTOS_PARA_GANAR) terminar(true);   // llegó a la meta: gana
}

// 10. LÓGICA DE CADA FRAME

// dt = segundos que pasaron desde el frame anterior.
// Multiplicar todo por dt hace que la velocidad sea la misma en cualquier monitor.

function actualizar(dt) {

  // --- Física de la llama ---
  // La gravedad cambia la VELOCIDAD, y la velocidad cambia la POSICIÓN.
  velY += GRAVEDAD * dt;
  y += velY * dt;

  if (y < 0) { y = 0; velY = 0; }                       // techo: se frena
  if (y > ALTO_ESCENARIO - ALTO_PERSONAJE) {            // piso: pierde
    y = ALTO_ESCENARIO - ALTO_PERSONAJE;
    terminar(false);
  }

  // --- Parallax: cada capa avanza una fracción de la velocidad del mundo ---
  for (const capa of capas) {
    capa.offset += VELOCIDAD_MUNDO * capa.factor * dt;
  }

  // --- Generar tuberías: cuando se recorrió la distancia, aparece una nueva ---
  // Se genera por DISTANCIA (no por cantidad de frames), y la separación
  // cambia al azar cada vez (req. 5a).
  distanciaDesdeUltima += VELOCIDAD_MUNDO * dt;
  if (distanciaDesdeUltima >= separacionActual) {
    crearTuberia();
    distanciaDesdeUltima = 0;
    separacionActual = aleatorio(SEPARACION_MIN, SEPARACION_MAX);

    // Una carta o un cóndor en el medio del espacio libre hasta la próxima tubería
    const xMedio = ANCHO_ESCENARIO + ANCHO_TUBERIA + (separacionActual - ANCHO_TUBERIA) / 2;
    crearItem(xMedio);
  }

  // --- Mover cactus, chocar, contar puntos y borrar los que salieron ---
  // Se recorre de atrás para adelante para poder borrar sin saltear elementos.
  for (let i = tuberia.length - 1; i >= 0; i--) {
    const t = tuberia[i];
    t.x -= VELOCIDAD_MUNDO * dt;

    if (colisionaTuberia(t)) terminar(false);

    // Suma 1 punto cuando la llama pasó completamente la tubería
    if (!t.contada && t.x + ANCHO_TUBERIA < X_PERSONAJE) {
      t.contada = true;
      sumarPuntos(PUNTOS_TUBERIA);
    }

    // Se borra al salir por la izquierda (si no, se acumularían sin parar)
    if (t.x + ANCHO_TUBERIA < 0) {
      t.elArriba.remove();
      t.elAbajo.remove();
      tuberia.splice(i, 1);
    }
  }

  // --- Mover cartas y cóndores, y ver si la llama los toca ---
  for (let i = items.length - 1; i >= 0; i--) {
    const it = items[i];
    const extra = it.tipo === "condor" ? VEL_EXTRA_CONDOR : 0;
    it.x -= (VELOCIDAD_MUNDO + extra) * dt;

    if (chocaConItem(it)) {
      if (it.tipo === "carta") {
        sumarPuntos(PUNTOS_CARTA);              // la carta suma puntos
      } else {
        vidas--;                                // el cóndor resta una vida...
        mostrarVidas();
        if (vidas <= 0) terminar(false);        // ...y solo termina si se quedó sin vidas
        else if (jugando) setEstado("golpeada");
      }
      quitarItem(i);
    } else if (it.x + it.w < 0) {
      quitarItem(i);
    }
  }
}

// 11. DIBUJO
// actualizar() cambia los DATOS; dibujar() los muestra en pantalla.

function dibujar() {
  personaje.style.top = y + "px";

  for (const capa of capas) {
    capa.el.style.backgroundPositionX = -capa.offset + "px";   // el "-" mueve el fondo a la izquierda
  }
  for (const t of tuberia) {
    t.elArriba.style.left = t.x + "px";
    t.elAbajo.style.left = t.x + "px";
  }
  for (const it of items) {
    it.el.style.left = it.x + "px";
    it.el.style.top = it.y + "px";
  }
}

// 12. GAME LOOP
// requestAnimationFrame llama a loop() justo antes de cada redibujado de pantalla
// y le pasa el tiempo actual.

function loop(tiempo) {
  if (!jugando) return;                                                   // si terminó, se corta el loop
  const dt = Math.max(0, Math.min((tiempo - ultimoTiempo) / 1000, 0.05)); // máximo 0,05 s para evitar saltos grandes
  ultimoTiempo = tiempo;
  actualizar(dt);
  dibujar();
  requestAnimationFrame(loop);                                            // pide el siguiente frame
}

// 13. INICIO, FIN Y REINICIO

// Deja todo en el estado inicial y arranca el loop (se usa para "Comenzar" y "Jugar de nuevo")
function reiniciar() {
  for (const t of tuberia) {
    t.elArriba.remove();
    t.elAbajo.remove();
  }
  tuberia = [];
  for (let i = items.length - 1; i >= 0; i--) quitarItem(i);

  y = 200;
  velY = 0;
  hueco = HUECO_INICIAL;
  distanciaDesdeUltima = 0;
  separacionActual = SEPARACION_INICIAL;

  puntos = 0;
  vidas = VIDAS_INICIALES;
  mostrarPuntaje();
  mostrarVidas();

  cartelFin.style.display = "none";
  setEstado("volando");

  jugando = true;
  ultimoTiempo = performance.now();
  requestAnimationFrame(loop);
}

// Fin de partida: gano = true si llegó a la meta, false si perdió
function terminar(gano) {
  if (!jugando) return;          // evita que se llame dos veces en el mismo frame
  jugando = false;               // esto corta el loop
  if (!gano) setEstado("explotando");

  tituloFin.textContent = gano ? "¡Ganaste!" : "¡Perdiste!";
  textoFinal.textContent = "Puntaje: " + puntos;
  cartelFin.style.display = "block";
}


// 14. EVENTOS

// Barra espaciadora = impulso. Solo bloquea la tecla mientras se juega,
// así se puede escribir espacios en los comentarios y en el buscador.
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && jugando) {
    e.preventDefault();
    if (!e.repeat) saltar();     // ignora la repetición al dejar la tecla apretada
  }
});

// Click dentro del escenario = impulso
escenario.addEventListener("mousedown", saltar);

document.getElementById("btn-comenzar").addEventListener("click", () => {
  menuInicio.style.display = "none";
  reiniciar();
});
document.getElementById("btn-reintentar").addEventListener("click", reiniciar);

// Estado inicial de la pantalla antes de empezar
mostrarPuntaje();
mostrarVidas();

})();
