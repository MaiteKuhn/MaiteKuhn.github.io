(() => {

// 1. CONFIGURACIÓN
const RUTA_IMG = "assets/img-flappy/";
const IMAGENES = ["capa1.png", "capa2.png", "capa3.png", "capa4.png",
                  "llama.png", "cactus.png", "cartas.png", "condor.png"];
const ANCHO_ESCENARIO = 900;
const ALTO_ESCENARIO  = 500;

// Física de la llama
const GRAVEDAD = 1800;   // px/s²: cuánto aumenta la velocidad de caída por segundo
const IMPULSO  = -500;   // px/s: velocidad al saltar (negativo = hacia arriba)

// Velocidad del mundo: es la ÚNICA fuente de velocidad.
// Cactus, ítems y las 4 capas del parallax se mueven a partir de este valor.
const VELOCIDAD_MUNDO = 180;   // px/s
const DT_MAX = 0.05;           // tope de dt (s): evita saltos enormes al volver a la pestaña
// Llama (tienen que coincidir con el CSS de #personaje)
const X_PERSONAJE     = 150;
const ANCHO_PERSONAJE = 100;
const ALTO_PERSONAJE  = 80;
const Y_INICIAL       = 200;
// Hitbox de la llama: píxeles que se le restan a cada lado de la imagen.
const HITBOX = { izq: 25, der: 25, arriba: 22, abajo: 22 };
// Cactus
const ANCHO_TUBERIA      = 80;
const MARGEN_TUBERIA     = 28;   // se resta a cada lado: la imagen tiene aire transparente
const HUECO_INICIAL      = 220;  // alto del hueco de la primera tubería
const HUECO_MIN          = 130;  // el hueco nunca baja de este valor
const REDUCCION          = 8;    // cuánto se achica el hueco por cada tubería nueva
const SEPARACION_INICIAL = 400;  // distancia hasta la primera tubería
const SEPARACION_MIN     = 300;  // distancia mínima entre tuberías (después es al azar)
const SEPARACION_MAX     = 500;  // distancia máxima entre tuberías
const MARGEN_VERTICAL    = 40;   // el hueco y los ítems nunca quedan pegados al techo o al piso
// Cartas y cóndores (tamaño en pantalla: tienen que coincidir con el CSS)
const TAM = {
  carta:  { w: 50,  h: 60 },
  condor: { w: 75, h: 74 },
};
const PROB_CARTA       = 0.5;  // probabilidad de que aparezca una carta
const VEL_EXTRA_CONDOR = 60;   // el cóndor vuela hacia la llama más rápido que el mundo
const PUNTOS_TUBERIA   = 1;    // puntos por cada cactus superado
const PUNTOS_CARTA     = 5;    // puntos por cada carta
const PUNTOS_PARA_CONDOR = 5;  // a partir de cuántos puntos aparecen cóndores
// Efecto del cóndor: NO termina el juego. Acelera el mundo unos segundos.
const FACTOR_VELOCIDAD_CONDOR = 1.4;   // el mundo va 1,4 veces más rápido
const DURACION_EFECTO         = 3;     // segundos
// Meta del juego
const VIDAS_INICIALES = 3;
const PUNTOS_PARA_GANAR = 20;
// Cuánto tarda en aparecer el cartel de fin cuando la llama explota (ms)
const DEMORA_CARTEL = 700;
// Modo debug: dibuja la caja de colisión de la llama (amarilla)
const DEBUG = false;

// 2. ELEMENTOS DEL DOM
const escenario   = document.getElementById("escenario");
const personaje   = document.getElementById("personaje");      // contenedor que se mueve con transform
const sprite      = document.getElementById("llama-sprite");   // dibujo de la llama: acá van las animaciones
const elPuntaje   = document.getElementById("puntaje");
const elVidas     = document.getElementById("vidas");
const elEfecto    = document.getElementById("efecto");
const cartelFin   = document.getElementById("cartel-fin");
const tituloFin   = cartelFin.querySelector("h2");
const textoFinal  = document.getElementById("texto-final");
const menuInicio  = document.getElementById("menu-inicio-runner");
const btnComenzar = document.getElementById("btn-comenzar");
// Parallax: 4 capas. "factor" es qué fracción de la velocidad del mundo se mueve cada una.
// La capa 1 es la más lejana (más lenta) y la 4 (el suelo) va igual que los cactus.
// "offset" guarda cuánto avanzó y "tile" es el ancho real de la imagen (se calcula al precargar).
const capas = [
  { el: document.querySelector(".capa1"), factor: 0.1, offset: 0, tile: ANCHO_ESCENARIO },
  { el: document.querySelector(".capa2"), factor: 0.3, offset: 0, tile: ANCHO_ESCENARIO },
  { el: document.querySelector(".capa3"), factor: 0.6, offset: 0, tile: ANCHO_ESCENARIO },
  { el: document.querySelector(".capa4"), factor: 1.0, offset: 0, tile: ANCHO_ESCENARIO },
];
// Caja de debug de la llama
const cajaDebug = document.createElement("div");
cajaDebug.style.cssText = "position:absolute; left:0; top:0; z-index:60; pointer-events:none; border:2px solid yellow; box-sizing:border-box;";
if (DEBUG) {
  escenario.appendChild(cajaDebug);
  escenario.classList.add("debug");
}

// 3. ESTADO DEL JUEGO (los datos viven acá; el DOM solo los muestra)
let jugando = false;           // el loop solo corre si es true
let empezo = false;            // false = la llama espera quieta el primer impulso
let ultimoTiempo = 0;          // tiempo del frame anterior (para calcular dt)

const llama = { y: Y_INICIAL, velY: 0 };   // posición y velocidad vertical (px, px/s)

let puntos = 0;
let tiempoEfecto = 0;          // segundos que le quedan al efecto del cóndor
let vidas = VIDAS_INICIALES;
let tuberia = [];              // cactus en pantalla
let items = [];                // cartas y cóndores en pantalla
let hueco = HUECO_INICIAL;     // alto del hueco de la próxima tubería
let distanciaDesdeUltima = 0;  // distancia recorrida desde la última tubería
let separacionActual = SEPARACION_INICIAL;
let ultimoTextoEfecto = "";

// 4. UTILIDADES

// Número entero al azar entre min (incluido) y max (excluido)
function aleatorio(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

// Velocidad actual del mundo (sube mientras dura el efecto del cóndor)
function velocidadMundo() {
  return VELOCIDAD_MUNDO * (tiempoEfecto > 0 ? FACTOR_VELOCIDAD_CONDOR : 1);
}

// 5. LA LLAMA
// Cambia la animación CSS de la llama: "volando", "aleteando" o "explotando".
// (La clase "corriendo" NO se toca acá: indica que la partida ya empezó.)
function setEstado(clase) {
  sprite.classList.remove("volando", "aleteando", "explotando");
  void sprite.offsetWidth;   // fuerza al navegador a reiniciar la animación (si no, no se repite)
  sprite.classList.add(clase);
}

// Cuando termina la animación de impulso, vuelve a "volando"
sprite.addEventListener("animationend", (e) => {
  if (e.animationName === "aletear") setEstado("volando");
});

// Impulso: pisa la velocidad (no la suma), así todos los saltos son iguales
function saltar() {
  if (!jugando) return;
  if (!empezo) {
    empezo = true;                    // el primer impulso pone el mundo en marcha
    sprite.classList.add("corriendo");
  }
  llama.velY = IMPULSO;
  setEstado("aleteando");
}

// 6. CACTUS (TUBERÍAS)
// Crea una tubería: son DOS divs (cactus de arriba y de abajo) con un hueco en el medio.
// Solo se fija el alto acá; la posición la pone dibujar() con transform.
function crearTuberia() {
  // Altura del hueco al azar -> las tuberías no están alineadas (req. 5c)
  const yHueco = aleatorio(MARGEN_VERTICAL, ALTO_ESCENARIO - hueco - MARGEN_VERTICAL);
  const yAbajo = yHueco + hueco;

  const elArriba = document.createElement("div");
  elArriba.className = "tuberia";
  elArriba.style.height = yHueco + "px";

  const elAbajo = document.createElement("div");
  elAbajo.className = "tuberia";
  elAbajo.style.height = (ALTO_ESCENARIO - yAbajo) + "px";

  escenario.appendChild(elArriba);
  escenario.appendChild(elAbajo);
  tuberia.push({ x: ANCHO_ESCENARIO, yHueco, hueco, yAbajo, elArriba, elAbajo, contada: false, golpeada: false });
  // El hueco se achica con cada tubería, hasta un mínimo (req. 5b)
  hueco = Math.max(HUECO_MIN, hueco - REDUCCION);
}

// 7. CARTAS Y CÓNDORES (elementos animados con spritesheet)
// Crea una carta (suma puntos) o un cóndor (acelera el mundo), centrado en xCentro.
function crearItem(xCentro) {
  let tipo;
  if (Math.random() < PROB_CARTA) tipo = "carta";
  else if (puntos >= PUNTOS_PARA_CONDOR) tipo = "condor";
  else return;
  const { w, h } = TAM[tipo];
  const yItem = aleatorio(MARGEN_VERTICAL, ALTO_ESCENARIO - h - MARGEN_VERTICAL);
  const el = document.createElement("div");
  el.className = "item " + tipo;   // la clase define el spritesheet y la animación en el CSS
  escenario.appendChild(el);
  items.push({ tipo, x: xCentro - w / 2, y: yItem, w, h, el });
}
// Se borra del arreglo Y del DOM
function quitarItem(i) {
  items[i].el.remove();
  items.splice(i, 1);
}

// 8. COLISIONES (rectángulos, "AABB")
// Hay choque si los rectángulos se superponen en X y en Y a la vez.
function cajaLlama() {
  return {
    izq:    X_PERSONAJE + HITBOX.izq,
    der:    X_PERSONAJE + ANCHO_PERSONAJE - HITBOX.der,
    arriba: llama.y + HITBOX.arriba,
    abajo:  llama.y + ALTO_PERSONAJE - HITBOX.abajo,
  };
}
// Cactus: choca si coincide en X con la tubería y NO está completamente dentro del hueco
function colisionaTuberia(t) {
  const c = cajaLlama();
  const izqT = t.x + MARGEN_TUBERIA;
  const derT = t.x + ANCHO_TUBERIA - MARGEN_TUBERIA;
  const coincideEnX = c.der > izqT && c.izq < derT;
  const estaEnElHueco = c.arriba > t.yHueco && c.abajo < t.yAbajo;
  return coincideEnX && !estaEnElHueco;
}
// Carta o cóndor: choca si los dos rectángulos se superponen
function chocaConItem(it) {
  const c = cajaLlama();
  const m = it.tipo === "condor" ? 10 : 5;   // margen por lado
  return c.der > it.x + m && c.izq < it.x + it.w - m &&
         c.abajo > it.y + m && c.arriba < it.y + it.h - m;
}

// 9. PUNTAJE, VIDAS Y EFECTO DEL CÓNDOR
function mostrarPuntaje() {
  elPuntaje.textContent = "Puntaje: " + puntos + " / " + PUNTOS_PARA_GANAR;
}
function sumarPuntos(cantidad) {
  puntos += cantidad;
  mostrarPuntaje();
  if (puntos >= PUNTOS_PARA_GANAR) terminar(true);   // llegó a la meta: gana
}
function mostrarVidas() {
  elVidas.textContent = "♥".repeat(vidas) + "♡".repeat(VIDAS_INICIALES - vidas);
}
function perderVida() {
  vidas--;
  mostrarVidas();
  if (vidas <= 0) {
    terminar(false);
  } else {
    // parpadeo: la animación "golpe" está en #personaje (no en el sprite)
    personaje.classList.remove("golpeada");
    void personaje.offsetWidth;   // fuerza el reinicio
    personaje.classList.add("golpeada");
  }
}
personaje.addEventListener("animationend", (e) => {
  if (e.animationName === "golpe") personaje.classList.remove("golpeada");
});

// 10. LÓGICA DE CADA FRAME
// dt = segundos que pasaron desde el frame anterior.
// Multiplicar todo por dt hace que la velocidad sea la misma en cualquier monitor.
function actualizar(dt) {
  if (!empezo) return;            // la llama espera quieta hasta el primer impulso

  // --- Efecto del cóndor: cuenta regresiva ---
  if (tiempoEfecto > 0) tiempoEfecto = Math.max(0, tiempoEfecto - dt);
  const vel = velocidadMundo();   // todo lo que se mueve en X usa esta misma velocidad

  // --- Física de la llama ---
  // La gravedad cambia la VELOCIDAD, y la velocidad cambia la POSICIÓN.
  llama.velY += GRAVEDAD * dt;
  llama.y += llama.velY * dt;
  if (llama.y < 0) { llama.y = 0; llama.velY = 0; }                 // techo: se frena
  if (llama.y > ALTO_ESCENARIO - ALTO_PERSONAJE) {                  // piso: se frena (no pierde)
    llama.y = ALTO_ESCENARIO - ALTO_PERSONAJE;
    llama.velY = 0;
  }

  // --- Parallax: cada capa avanza una fracción de la velocidad del mundo ---
  for (const capa of capas) {
    capa.offset += vel * capa.factor * dt;
  }

  // --- Generar tuberías: cuando se recorrió la distancia, aparece una nueva ---
  // Se genera por DISTANCIA (no por cantidad de frames), y la separación
  // cambia al azar cada vez (req. 5a).
  distanciaDesdeUltima += vel * dt;
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
    t.x -= vel * dt;
    if (!t.golpeada && colisionaTuberia(t)) {
      t.golpeada = true;
      perderVida();
    }
    // Suma 1 punto cuando la llama pasó completamente la tubería
    if (!t.contada && t.x + ANCHO_TUBERIA < X_PERSONAJE) {
      t.contada = true;
      if (!t.golpeada) sumarPuntos(PUNTOS_TUBERIA);
    }
    // Se borra del DOM y del arreglo al salir por la izquierda
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
    it.x -= (vel + extra) * dt;
    if (chocaConItem(it)) {
      if (it.tipo === "carta") {
        sumarPuntos(PUNTOS_CARTA);           // la carta suma puntos
      } else {
        tiempoEfecto = DURACION_EFECTO;      // el cóndor acelera el mundo, pero NO termina el juego
        perderVida();
      }
      quitarItem(i);
    } else if (it.x + it.w < 0) {
      quitarItem(i);                         // salió de pantalla: se borra del DOM y del arreglo
    }
  }
}

// 11. DIBUJO
// actualizar() cambia los DATOS; dibujar() los muestra en pantalla.
// Todo se mueve con transform: translate (no con top/left).
function dibujar() {
  personaje.style.transform = `translate(${X_PERSONAJE}px, ${llama.y}px)`;

  // Parallax: el "% tile" hace que la imagen se repita sin cortes (loop infinito)
  for (const capa of capas) {
    capa.el.style.transform = `translateX(${-(capa.offset % capa.tile)}px)`;
  }

  for (const t of tuberia) {
    t.elArriba.style.transform = `translate(${t.x}px, 0px) scaleY(-1)`;   // el de arriba es el mismo dibujo dado vuelta
    t.elAbajo.style.transform  = `translate(${t.x}px, ${t.yAbajo}px)`;
  }

  for (const it of items) {
    const volteo = it.tipo === "condor" ? " scaleX(-1)" : "";            // el cóndor mira a la izquierda
    it.el.style.transform = `translate(${it.x}px, ${it.y}px)${volteo}`;
  }

  // Cartel de arriba a la derecha (solo se toca el DOM cuando el texto cambia)
  let texto = "";
  if (tiempoEfecto > 0) texto = "¡Cóndor! Más rápido " + tiempoEfecto.toFixed(1) + " s";
  else if (jugando && !empezo) texto = "Espacio o click para empezar";
  if (texto !== ultimoTextoEfecto) {
    elEfecto.textContent = texto;
    ultimoTextoEfecto = texto;
  }

  if (DEBUG) {
    const c = cajaLlama();
    cajaDebug.style.transform = `translate(${c.izq}px, ${c.arriba}px)`;
    cajaDebug.style.width  = (c.der - c.izq) + "px";
    cajaDebug.style.height = (c.abajo - c.arriba) + "px";
  }
}

// 12. GAME LOOP (el único del juego)
// requestAnimationFrame llama a loop() justo antes de cada redibujado de pantalla
// y le pasa el tiempo actual.
function loop(tiempo) {
  if (!jugando) return;                                                    // si terminó, se corta el loop
  const dt = Math.max(0, Math.min((tiempo - ultimoTiempo) / 1000, DT_MAX)); // tope de dt
  ultimoTiempo = tiempo;
  actualizar(dt);
  dibujar();
  requestAnimationFrame(loop);                                             // pide el siguiente frame
}

// 13. INICIO, FIN Y REINICIO

// Deja todo en el estado inicial y arranca el loop (se usa para "Comenzar" y "Jugar de nuevo")
function reiniciar() {
  empezo = false;
  sprite.classList.remove("corriendo");
  personaje.classList.remove("golpeada");

  for (const t of tuberia) {
    t.elArriba.remove();
    t.elAbajo.remove();
  }
  tuberia = [];
  for (let i = items.length - 1; i >= 0; i--) quitarItem(i);

  llama.y = Y_INICIAL;
  llama.velY = 0;
  hueco = HUECO_INICIAL;
  distanciaDesdeUltima = 0;
  separacionActual = SEPARACION_INICIAL;

  for (const capa of capas) capa.offset = 0;

  puntos = 0;
  vidas = VIDAS_INICIALES;
  tiempoEfecto = 0;
  mostrarPuntaje();
  mostrarVidas();

  cartelFin.style.display = "none";
  setEstado("volando");
  jugando = true;
  dibujar();
  ultimoTiempo = performance.now();
  requestAnimationFrame(loop);
}

// Fin de partida: gano = true si llegó a la meta, false si perdió
function terminar(gano) {
  if (!jugando) return;          // evita que se llame dos veces en el mismo frame
  jugando = false;               // esto corta el loop

  tituloFin.textContent = gano ? "¡Ganaste!" : "¡La llama chocó, quedaste sin vidas!";
  textoFinal.textContent = gano
    ? "¡Felicitaciones! Llegaste a la meta. Puntaje: " + puntos
    : "¡No te rindas! Conseguiste " + puntos + " puntos. ¡Volvé a intentarlo!";

  if (gano) {
    cartelFin.style.display = "block";
  } else {
    // El loop ya se cortó, así que la explosión la hace solo el CSS.
    // El cartel espera un momento para que se alcance a ver.
    setEstado("explotando");
    setTimeout(() => {
      if (!jugando) cartelFin.style.display = "block";
    }, DEMORA_CARTEL);
  }
}

// 14. EVENTOS Y PRECARGA
// Barra espaciadora = impulso. Una sola vez por pulsación (e.repeat ignora la tecla mantenida).
// Solo bloquea la tecla mientras se juega, así se puede escribir en los comentarios y el buscador.
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && jugando) {
    e.preventDefault();
    if (!e.repeat) saltar();
  }
});

// Click dentro del escenario = impulso (mousedown ocurre una sola vez por click)
escenario.addEventListener("mousedown", saltar);

btnComenzar.addEventListener("click", () => {
  menuInicio.style.display = "none";
  reiniciar();
});
document.getElementById("btn-reintentar").addEventListener("click", reiniciar);

// Precarga: espera a que todas las imágenes estén cargadas antes de dejar empezar,
// así los spritesheets no aparecen "a medias".
function precargarImagenes(nombres) {
  return Promise.all(nombres.map((nombre) => new Promise((resolve) => {
    const img = new Image();
    img.onload  = () => resolve({ nombre, img });
    img.onerror = () => { console.warn("No se pudo cargar " + nombre); resolve({ nombre, img: null }); };
    img.src = RUTA_IMG + nombre;
  })));
}

// Pantalla inicial
mostrarPuntaje();
mostrarVidas();
dibujar();

btnComenzar.disabled = true;
btnComenzar.textContent = "Cargando...";

precargarImagenes(IMAGENES).then((resultados) => {
  // Con el tamaño real de cada capa, se arma el ancho para repetirla sin cortes
  for (const { nombre, img } of resultados) {
    const m = /^capa(\d)\.png$/.exec(nombre);
    if (!m || !img) continue;
    const capa = capas[Number(m[1]) - 1];
    capa.tile = img.naturalWidth * ALTO_ESCENARIO / img.naturalHeight;   // ancho de la imagen ya escalada al alto del escenario
    capa.el.style.width = (ANCHO_ESCENARIO + capa.tile) + "px";
  }
  btnComenzar.disabled = false;
  btnComenzar.textContent = "Comenzar";
});
})();
