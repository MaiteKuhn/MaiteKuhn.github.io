export class VistaPeg {
  constructor(canvas, nombreFicha = "ficha1") {
    this.nombreFicha = nombreFicha;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.casillaSize = canvas.width / 7;
    this.animacionHintsID = null;
    this.fondoCanvas = new Image();
    this.fondoCanvas.src = "img/tablero.png";

    // Imagen por defecto (no se usa para fichas aleatorias, pero puede servir para fallback)
    this.imagenFicha = document.getElementById("ficha-img");
    this.imagenCargada = this.imagenFicha.complete && this.imagenFicha.naturalWidth > 0;
    this.imagenFicha.onload = () => {
      this.imagenCargada = true;
    };

    // Precargar imágenes de fichas aleatorias
    this.imagenesPrecargadas = {};
    for (let i = 1; i <= 4; i++) {
      const nombre = `ficha${i}`;
      const img = new Image();
      img.src = `img/${nombre}.png`;
      this.imagenesPrecargadas[nombre] = img;
    }
    // Fondo del canvas
    this.fondoCanvas = new Image();
    this.fondoCanvas.src = "img/tablero.png";
  }

  // Dibuja el tablero y las fichas
  dibujarTablero(estadoTablero, fichaSeleccionada = null) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 🖼️ Dibujar fondo del canvas
    if (this.fondoCanvas.complete) {
      this.ctx.drawImage(this.fondoCanvas, 0, 0, this.canvas.width, this.canvas.height);
    } else {
      this.fondoCanvas.onload = () => {
        this.ctx.drawImage(this.fondoCanvas, 0, 0, this.canvas.width, this.canvas.height);
      };
    }

    for (let y = 0; y < estadoTablero.length; y++) {
      for (let x = 0; x < estadoTablero[y].length; x++) {
        const celda = estadoTablero[y][x];
        const posX = x * this.casillaSize;
        const posY = y * this.casillaSize;

        if (celda === -1) continue;

        // 💡 Dibujar borde si esta casilla es sugerida
        // 💡 Dibujar hint visual si esta casilla es sugerida
        if (window.controlador?.sugerenciasActivas) {
          const esSugerida = window.controlador.sugerenciasActivas.some(m => m.x === x && m.y === y);
          if (esSugerida) {
            this.ctx.save();

            // Fondo sutil
            this.ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
            this.ctx.fillRect(posX, posY, this.casillaSize, this.casillaSize);

            // Borde visible
            this.ctx.strokeStyle = "#00ffff";
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(posX + 1, posY + 1, this.casillaSize - 2, this.casillaSize - 2);

            // Circulito blanco
            this.ctx.fillStyle = "#ffffff";
            this.ctx.beginPath();
            this.ctx.arc(
              posX + this.casillaSize / 2,
              posY + this.casillaSize / 2,
              this.casillaSize / 7,
              0,
              Math.PI * 2
            );
            this.ctx.fill();

            this.ctx.restore();
          }
        }
        // 🎲 Dibujar ficha si está presente y no es la seleccionada
        if (celda === 1 && !(fichaSeleccionada?.x === x && fichaSeleccionada?.y === y)) {
          const nombre = window.modelo?.imagenesFichas?.[y]?.[x];
          const img = this.imagenesPrecargadas[nombre];

          if (img && img.complete) {
            this.ctx.drawImage(
              img,
              posX + this.casillaSize / 2 - this.casillaSize / 2.5,
              posY + this.casillaSize / 2 - this.casillaSize / 2.5,
              this.casillaSize / 1.25,
              this.casillaSize / 1.25
            );
          }
        }
      }
    }
  }

  
  // Muestra sugerencias como círculos blancos
  mostrarSugerencias(movimientos) {
    movimientos.forEach(mov => {
      const posX = mov.x * this.casillaSize;
      const posY = mov.y * this.casillaSize;

      this.ctx.save();

      // 🔲 Fondo semitransparente para destacar la casilla
      this.ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
      this.ctx.fillRect(posX, posY, this.casillaSize, this.casillaSize);

      // 🔳 Borde visible con alto contraste
      this.ctx.strokeStyle = "#00ffff"; // color cian brillante
      this.ctx.lineWidth = 3;
      this.ctx.strokeRect(posX + 1.5, posY + 1.5, this.casillaSize - 3, this.casillaSize - 3);

      this.ctx.restore();
    });
  }


  // Muestra mensaje de fin de juego
  mostrarFin(mensaje) {
    const overlay = document.getElementById("overlay");
    const mensajeFinal = document.getElementById("mensaje-final");
    mensajeFinal.innerText = mensaje;
    overlay.style.display = "flex";
  }

  // Oculta el mensaje de fin de juego
  ocultarFin() {
    document.getElementById("overlay").style.display = "none";
  }

  dibujarFicha(x, y, radio, scale = 1, shadow = false, nombre = null) {
    const size = radio * 2 * scale;
    this.ctx.save();
    if (shadow) {
      this.ctx.shadowColor = "rgba(0,0,0,0.5)";
      this.ctx.shadowBlur = 15;
    }

    const img = nombre
      ? this.imagenesPrecargadas[nombre]
      : this.imagenesPrecargadas[this.nombreFicha] || this.imagenFicha;
    if (img && img.complete) {
      this.ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
    }

    this.ctx.restore();
  }

  esperarImagenes(callback) {
    const todas = [
      this.fondoCanvas,
      ...Object.values(this.imagenesPrecargadas)
    ];

    const pendientes = todas.filter(img => !img.complete || img.naturalWidth === 0);

    if (pendientes.length === 0) {
      callback();
    } else {
      let cargadas = 0;
      pendientes.forEach(img => {
        img.onload = () => {
          cargadas++;
          if (cargadas === pendientes.length) {
            callback();
          }
        };
      });
    }
  }

animarMovimiento(origen, destino, tablero, callback, rebote = false) {
  // Coordenadas del destino (la ficha ya está ahí en el modelo)
  const endX = destino.x * this.casillaSize + this.casillaSize / 2;
  const endY = destino.y * this.casillaSize + this.casillaSize / 2;

  const duracion = 400;
  const inicio = performance.now();

  const easeOutBounce = (t) => {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  };

  const animar = (tiempo) => {
    const t = Math.min((tiempo - inicio) / duracion, 1);
    const progreso = rebote ? easeOutBounce(t) : t;

    // 🔧 Dibujar tablero completo (ya actualizado con ficha en destino)
    this.dibujarTablero(tablero);

    // 🔧 Animar efecto visual en destino (ej: rebote/escala)
    const scale = 1 + 0.2 * (1 - progreso); // efecto de caída/rebote
    this.dibujarFicha(endX, endY, this.casillaSize / 2.5, scale, true);

    if (t < 1) {
      requestAnimationFrame(animar);
    } else {
      callback?.();
    }
  };

  requestAnimationFrame(animar);
} 
animarHints(movimientos) {
  if (this.animacionHintsID) cancelAnimationFrame(this.animacionHintsID);

let frame = 0;
const maxFrames = 60;

const animar = () => {
  this.dibujarTablero(window.modelo.tablero, window.controlador?.seleccionada);

  const scale = 1 + 0.2 * Math.sin(frame / 10);
  movimientos.forEach(mov => {
    const x = mov.x * this.casillaSize + this.casillaSize / 2;
    const y = mov.y * this.casillaSize + this.casillaSize / 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, (this.casillaSize / 7) * scale, 0, Math.PI * 2);
    this.ctx.fillStyle = "#fff";
    this.ctx.fill();
  });

  frame++;
  if (frame < maxFrames) {
    this.animacionHintsID = requestAnimationFrame(animar);
  } else {
    this.animacionHintsID = null;
  }
};

this.animacionHintsID = requestAnimationFrame(animar);
}
}
