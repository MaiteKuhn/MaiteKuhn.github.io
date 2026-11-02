import { ModeloPeg } from "./model.js";
import { VistaPeg } from "./view.js";

export class ControladorPeg {
  constructor(canvas, imagenes, nombreFicha = "ficha1") {
    this.modelo = new ModeloPeg(nombreFicha);              // Lógica del juego
    this.vista = new VistaPeg(canvas, nombreFicha);        // Vista del juego
    this.seleccionada = null;                              // Ficha actualmente seleccionada
    this.movimientos = 0;                                  // Contador de movimientos realizados
    this.intervalo = null;                                 // Temporizador activo

    // Variables para drag and drop
    this.arrastrando = false;
    this.mouseX = 0;
    this.mouseY = 0;
    this.loopArrastreID = null;

    this.configurarEventos();                              // Vincula eventos del usuario
    this.vista.esperarImagenes(() => {
      this.vista.dibujarTablero(this.modelo.tablero);      // Dibuja el tablero inicial
    });
  }

  // 🧠 Configura los eventos del usuario
  configurarEventos() {
    const canvas = this.vista.canvas;

    // 👉 Mousedown: selecciona ficha y comienza arrastre
    canvas.addEventListener("mousedown", e => {
      const posicion = this.obtenerPosicion(e);
      if (this.modelo.tablero[posicion.y][posicion.x] === 1) {
        this.seleccionada = posicion;
        this.arrastrando = true;

        // 🖱️ Guarda posición inicial del mouse
        const rect = canvas.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;

        // 🎯 Calcula movimientos válidos desde la ficha seleccionada
        const sugerencias = this.modelo.obtenerMovimientosValidos(posicion.x, posicion.y)
          .filter(mov => this.modelo.tablero[mov.y][mov.x] === 0);

        // 💡 Muestra los hints visuales
        this.vista.animarHints(sugerencias);

        // 🖼️ Dibuja la ficha flotante en la posición inicial
        this.vista.dibujarTablero(this.modelo.tablero, this.seleccionada);
        this.vista.dibujarFicha(this.mouseX, this.mouseY, this.vista.casillaSize / 2.5, 1.2, true);

        // 🔁 Inicia bucle de render para el arrastre
        const dibujarArrastre = () => {
          if (!this.arrastrando || !this.seleccionada || !this.vista.imagenCargada) return;

          this.vista.dibujarTablero(this.modelo.tablero, this.seleccionada);
          this.vista.dibujarFicha(this.mouseX, this.mouseY, this.vista.casillaSize / 2.5, 1.2, true);

          this.loopArrastreID = requestAnimationFrame(dibujarArrastre);
        };

        dibujarArrastre(); // Primer frame del arrastre
      }
    });

    // 👉 Mousemove: actualiza posición del arrastre
    canvas.addEventListener("mousemove", e => {
      if (!this.arrastrando || !this.seleccionada || !this.vista.imagenCargada) return;

      const rect = canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });

    // 👉 Mouseup: intenta mover ficha y limpia hints si corresponde
    canvas.addEventListener("mouseup", e => {
      if (!this.seleccionada) return;
      this.arrastrando = false;

      // 🧹 Detiene el bucle de arrastre
      if (this.loopArrastreID) {
        cancelAnimationFrame(this.loopArrastreID);
        this.loopArrastreID = null;
      }

      const destino = this.obtenerPosicion(e);
      const movimientoValido = this.modelo.moverFicha(this.seleccionada, destino);

      if (movimientoValido) {
        // 🧼 Cancela animación de hints si la ficha se movió
        if (this.vista.animacionHintsID) {
          cancelAnimationFrame(this.vista.animacionHintsID);
          this.vista.animacionHintsID = null;
        }

        // 🎬 Ejecuta animación de movimiento
        this.vista.animarMovimiento(this.seleccionada, destino, this.modelo.tablero, () => {
          this.movimientos++;
          this.vista.dibujarTablero(this.modelo.tablero);

          // 🏁 Verifica si el juego terminó
          if (this.modelo.estaTerminado()) {
            const tiempo = Math.floor((Date.now() - this.inicioTiempo) / 1000);
            const restantes = this.modelo.contarFichas();
            const mensaje = restantes === 1
              ? `¡Victoria!\nMovimientos: ${this.movimientos}\nTiempo: ${tiempo}s`
              : `Sin movimientos.\nMovimientos: ${this.movimientos}\nTiempo: ${tiempo}s`;
            this.vista.mostrarFin(mensaje);
          }
        },false,true);
      } else {
        // ❌ Movimiento inválido → animación de rebote
        this.vista.animarMovimiento(destino, this.seleccionada, this.modelo.tablero, () => {
          this.vista.dibujarTablero(this.modelo.tablero);
        }, true, false);
      }

      this.seleccionada = null;
    });

    // 🔁 Botón reiniciar
    document.getElementById("reiniciar").addEventListener("click", () => {
      this.iniciarJuego();
    });
  }

  // 📍 Convierte la posición del mouse en coordenadas del tablero
  obtenerPosicion(e) {
    const casillaSize = this.vista.canvas.width / 7;
    const rect = this.vista.canvas.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - rect.left) / casillaSize),
      y: Math.floor((e.clientY - rect.top) / casillaSize)
    };
  }

  // ⏱️ Inicia el temporizador del juego
  iniciarTemporizador() {
    if (this.intervalo) clearInterval(this.intervalo);
    this.inicioTiempo = Date.now();
    document.getElementById("timer").textContent = `Tiempo: 0s`;

    this.intervalo = setInterval(() => {
      const transcurrido = Math.floor((Date.now() - this.inicioTiempo) / 1000);
      document.getElementById("timer").textContent = `Tiempo: ${transcurrido}s`;
    }, 1000);
  }

  // 🔄 Reinicia el juego
  iniciarJuego(nombreFicha) {
    this.nombreFicha = nombreFicha;
    this.modelo = new ModeloPeg(this.nombreFicha);
    this.vista.nombreFicha = this.nombreFicha;
    window.modelo = this.modelo;
    this.movimientos = 0;
    this.seleccionada = null;
    this.vista.ocultarFin();
    this.iniciarTemporizador();
    this.vista.esperarImagenes(() => {
      this.vista.dibujarTablero(this.modelo.tablero);
    });
  }
}