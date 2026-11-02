import { ModeloPeg } from "./modelo.js";
import { VistaPeg } from "./vista.js";

export class ControladorPeg {
  constructor(canvas) {
    canvas.width = 560;   // tamaño lógico; el CSS lo escala
    canvas.height = 560;

    this.canvas = canvas;
    this.nombreFicha = "ficha1";
    this.modelo = new ModeloPeg(this.nombreFicha);
    this.vista = new VistaPeg(canvas);

    this.seleccionada = null;   // {x, y}
    this.hints = [];            // destinos válidos de la ficha seleccionada
    this.arrastrando = false;
    this.animando = false;
    this.juegoActivo = false;
    this.mouse = { x: 0, y: 0 };
    this.loopID = null;

    this.movimientos = 0;
    this.intervalo = null;
    this.inicioTiempo = 0;

    this.configurarEventos();
  }

  // ---------- Coordenadas ----------
  // Convierte el evento a píxeles del canvas (tiene en cuenta que el CSS lo achica o agranda)
  posicionPixel(e) {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (this.canvas.width / r.width),
      y: (e.clientY - r.top) * (this.canvas.height / r.height)
    };
  }

  celdaDe(p) {
    const s = this.vista.casillaSize;
    return { x: Math.floor(p.x / s), y: Math.floor(p.y / s) };
  }

  // ---------- Eventos ----------
  configurarEventos() {
    const canvas = this.canvas;

    canvas.addEventListener("pointerdown", e => {
      if (!this.juegoActivo || this.animando) return;
      e.preventDefault();

      const p = this.posicionPixel(e);
      const c = this.celdaDe(p);

      // Click sobre un destino sugerido: mueve la ficha ya seleccionada
      if (this.seleccionada && !this.arrastrando &&
          this.hints.some(h => h.x === c.x && h.y === c.y)) {
        this.intentarMover(this.seleccionada, c, this.vista.centroCelda(this.seleccionada));
        return;
      }

      // Selecciona una ficha y empieza a arrastrar
      if (this.modelo.celda(c.x, c.y) === 1) {
        this.seleccionada = c;
        this.hints = this.modelo.obtenerMovimientosValidos(c.x, c.y);
        this.arrastrando = true;
        this.mouse = p;
        canvas.setPointerCapture(e.pointerId);
        this.iniciarLoop();
      } else {
        this.limpiarSeleccion();
      }
    });

    canvas.addEventListener("pointermove", e => {
      if (!this.arrastrando) return;
      this.mouse = this.posicionPixel(e);
    });

    canvas.addEventListener("pointerup", e => {
      if (!this.arrastrando || !this.seleccionada) return;
      this.arrastrando = false;

      const p = this.posicionPixel(e);
      const destino = this.celdaDe(p);
      const origen = this.seleccionada;

      // Si soltó en la misma casilla fue un click: queda seleccionada con sus destinos
      if (destino.x === origen.x && destino.y === origen.y) return;

      this.intentarMover(origen, destino, p);
    });

    canvas.addEventListener("pointercancel", () => this.limpiarSeleccion());
  }

  // ---------- Movimiento ----------
  intentarMover(origen, destino, desdePx) {
    this.animando = true;
    const nombre = this.modelo.imagenesFichas[origen.y][origen.x];
    const valido = this.modelo.moverFicha(origen, destino);

    this.seleccionada = null;
    this.hints = [];
    this.arrastrando = false;
    this.detenerLoop();

    if (valido) {
      this.movimientos++;
      this.vista.animarFicha(
        this.modelo,
        { desde: desdePx, hasta: this.vista.centroCelda(destino), nombre, ocultar: destino },
        false,
        () => {
          this.animando = false;
          this.renderizar();
          this.revisarFin();
        }
      );
    } else {
      // Movimiento inválido: la ficha vuelve a su lugar con rebote
      this.vista.animarFicha(
        this.modelo,
        { desde: desdePx, hasta: this.vista.centroCelda(origen), nombre, ocultar: origen },
        true,
        () => {
          this.animando = false;
          this.renderizar();
        }
      );
    }
  }

  revisarFin() {
    if (!this.modelo.estaTerminado()) return;

    const tiempo = Math.floor((Date.now() - this.inicioTiempo) / 1000);
    const restantes = this.modelo.contarFichas();
    this.detenerTemporizador();
    this.juegoActivo = false;

    const cierre = `Movimientos: ${this.movimientos}\nTiempo: ${tiempo}s`;
    const mensaje = restantes === 1
      ? `¡Lo lograste! Quedó una sola llama 🦙\n${cierre}`
      : `Sin más movimientos. Quedaron ${restantes} llamas.\n${cierre}`;
    this.vista.mostrarFin(mensaje);
  }

  // ---------- Dibujo ----------
  renderizar() {
    this.vista.dibujar(this.modelo, {
      seleccionada: this.seleccionada,
      hints: this.hints,
      arrastre: this.arrastrando ? this.mouse : null
    });
  }

  iniciarLoop() {
    if (this.loopID) return;
    const frame = () => {
      this.renderizar();
      this.loopID = this.seleccionada ? requestAnimationFrame(frame) : null;
    };
    this.loopID = requestAnimationFrame(frame);
  }

  detenerLoop() {
    if (this.loopID) cancelAnimationFrame(this.loopID);
    this.loopID = null;
  }

  limpiarSeleccion() {
    this.seleccionada = null;
    this.hints = [];
    this.arrastrando = false;
    this.detenerLoop();
    this.renderizar();
  }

  // ---------- Temporizador ----------
  iniciarTemporizador() {
    this.detenerTemporizador();
    this.inicioTiempo = Date.now();
    const timer = document.getElementById("timer");
    timer.textContent = "Tiempo: 0s";
    this.intervalo = setInterval(() => {
      const t = Math.floor((Date.now() - this.inicioTiempo) / 1000);
      timer.textContent = `Tiempo: ${t}s`;
    }, 1000);
  }

  detenerTemporizador() {
    if (this.intervalo) clearInterval(this.intervalo);
    this.intervalo = null;
  }

  // ---------- Flujo del juego ----------
  iniciarJuego(nombreFicha) {
    if (nombreFicha) this.nombreFicha = nombreFicha;
    this.modelo = new ModeloPeg(this.nombreFicha);
    this.movimientos = 0;
    this.animando = false;
    this.juegoActivo = true;
    this.limpiarSeleccion();
    this.vista.ocultarFin();
    this.iniciarTemporizador();
    this.vista.esperarImagenes().then(() => this.renderizar());
  }

  // Se usa al volver al menú
  detener() {
    this.juegoActivo = false;
    this.detenerTemporizador();
    this.limpiarSeleccion();
    this.vista.ocultarFin();
  }
}
