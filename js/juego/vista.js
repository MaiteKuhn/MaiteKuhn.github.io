export class VistaPeg {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.casillaSize = canvas.width / 7;

    // Precarga de las 4 fichas
    this.imagenes = {};
    for (let i = 1; i <= 4; i++) {
      const nombre = `ficha${i}`;
      const img = new Image();
      img.src = `assets/img/fichas/${nombre}.png`;
      this.imagenes[nombre] = img;
    }
  }

  // Devuelve una promesa que se resuelve cuando todas las imágenes cargaron (o fallaron)
  esperarImagenes() {
    const promesas = Object.values(this.imagenes).map(img => {
      if (img.complete) return Promise.resolve();
      return new Promise(resolve => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      });
    });
    return Promise.all(promesas);
  }

  centroCelda(c) {
    return {
      x: c.x * this.casillaSize + this.casillaSize / 2,
      y: c.y * this.casillaSize + this.casillaSize / 2
    };
  }

  // Dibuja todo el estado
  // opciones: seleccionada, hints, arrastre {x,y} en px, ocultar {x,y}
  dibujar(modelo, { seleccionada = null, hints = [], arrastre = null, ocultar = null } = {}) {
    const ctx = this.ctx;
    const s = this.casillaSize;
    const tablero = modelo.tablero;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Casillas y huecos
    for (let y = 0; y < tablero.length; y++) {
      for (let x = 0; x < tablero[y].length; x++) {
        if (tablero[y][x] === -1) continue;
        ctx.fillStyle = "#291765";
        ctx.fillRect(x * s + 2, y * s + 2, s - 4, s - 4);
        ctx.strokeStyle = "#43299e";
        ctx.lineWidth = 2;
        ctx.strokeRect(x * s + 2, y * s + 2, s - 4, s - 4);

        const c = this.centroCelda({ x, y });
        ctx.beginPath();
        ctx.arc(c.x, c.y, s * 0.36, 0, Math.PI * 2);
        ctx.fillStyle = "#12072b";
        ctx.fill();
      }
    }

    // Destinos posibles (latido suave)
    const pulso = 1 + 0.2 * Math.sin(performance.now() / 150);
    for (const h of hints) {
      ctx.fillStyle = "rgba(252, 168, 255, 0.15)";
      ctx.fillRect(h.x * s + 2, h.y * s + 2, s - 4, s - 4);
      const c = this.centroCelda(h);
      ctx.beginPath();
      ctx.arc(c.x, c.y, (s / 7) * pulso, 0, Math.PI * 2);
      ctx.fillStyle = "#fca8ff";
      ctx.fill();
    }

    // Fichas
    for (let y = 0; y < tablero.length; y++) {
      for (let x = 0; x < tablero[y].length; x++) {
        if (tablero[y][x] !== 1) continue;
        if (ocultar && ocultar.x === x && ocultar.y === y) continue;
        const esArrastrada = arrastre && seleccionada && seleccionada.x === x && seleccionada.y === y;
        if (esArrastrada) continue;

        const c = this.centroCelda({ x, y });
        this.dibujarFicha(c.x, c.y, modelo.imagenesFichas[y][x]);
      }
    }

    // Aro de la ficha seleccionada
    if (seleccionada && !arrastre) {
      const c = this.centroCelda(seleccionada);
      ctx.beginPath();
      ctx.arc(c.x, c.y, s * 0.44, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    }

    // Ficha que se está arrastrando, siempre arriba de todo
    if (arrastre && seleccionada) {
      const nombre = modelo.imagenesFichas[seleccionada.y][seleccionada.x];
      this.dibujarFicha(arrastre.x, arrastre.y, nombre, 1.2, true);
    }
  }

  dibujarFicha(x, y, nombre, escala = 1, sombra = false) {
    const ctx = this.ctx;
    const tam = this.casillaSize * 0.8 * escala;
    const img = this.imagenes[nombre];

    ctx.save();
    if (sombra) {
      ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
      ctx.shadowBlur = 15;
    }
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, x - tam / 2, y - tam / 2, tam, tam);
    } else {
      // Si la imagen no carga, se dibuja un círculo para que el juego siga andando
      ctx.beginPath();
      ctx.arc(x, y, tam * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = "#fca8ff";
      ctx.fill();
    }
    ctx.restore();
  }

  // Anima una ficha desde un punto (px) hasta otro. Con rebote=true hace efecto de rebote al llegar.
  animarFicha(modelo, { desde, hasta, nombre, ocultar }, rebote, callback) {
    const duracion = 350;
    const inicio = performance.now();

    const easeOut = t => 1 - Math.pow(1 - t, 3);
    const easeOutBounce = t => {
      const n1 = 7.5625, d1 = 2.75;
      if (t < 1 / d1) return n1 * t * t;
      if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
      if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
      return n1 * (t -= 2.625 / d1) * t + 0.984375;
    };

    const frame = ahora => {
      const t = Math.min((ahora - inicio) / duracion, 1);
      const p = rebote ? easeOutBounce(t) : easeOut(t);
      const x = desde.x + (hasta.x - desde.x) * p;
      const y = desde.y + (hasta.y - desde.y) * p;

      this.dibujar(modelo, { ocultar });
      this.dibujarFicha(x, y, nombre, 1.1, true);

      if (t < 1) requestAnimationFrame(frame);
      else callback?.();
    };
    requestAnimationFrame(frame);
  }

  mostrarFin(mensaje) {
    const overlay = document.getElementById("overlay");
    document.getElementById("mensaje-final").textContent = mensaje;
    overlay.style.display = "flex";
  }

  ocultarFin() {
    document.getElementById("overlay").style.display = "none";
  }
}
