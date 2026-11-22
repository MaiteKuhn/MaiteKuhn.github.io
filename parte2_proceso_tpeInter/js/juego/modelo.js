export class ModeloPeg {
  constructor(nombreFicha = "ficha1") {
    this.tamano = 7;
    this.nombreFicha = nombreFicha;
    this.tablero = this.inicializarTablero();
    this.imagenesFichas = this.generarImagenesFichas(nombreFicha);
  }

  inicializarTablero() {
    return [
      [-1, -1, 1, 1, 1, -1, -1],
      [-1, -1, 1, 1, 1, -1, -1],
      [ 1,  1, 1, 1, 1,  1,  1],
      [ 1,  1, 1, 0, 1,  1,  1],
      [ 1,  1, 1, 1, 1,  1,  1],
      [-1, -1, 1, 1, 1, -1, -1],
      [-1, -1, 1, 1, 1, -1, -1]
    ];
  }

  // Valor de una casilla; si está fuera del tablero devuelve -1
  celda(x, y) {
    return this.estaDentro(x, y) ? this.tablero[y][x] : -1;
  }

  // Devuelve los movimientos válidos desde una posición
  obtenerMovimientosValidos(x, y) {
    const movimientos = [];
    if (this.celda(x, y) !== 1) return movimientos;

    const direcciones = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 }
    ];

    for (const { dx, dy } of direcciones) {
      const medioX = x + dx;
      const medioY = y + dy;
      const destinoX = x + dx * 2;
      const destinoY = y + dy * 2;

      if (this.celda(medioX, medioY) === 1 && this.celda(destinoX, destinoY) === 0) {
        movimientos.push({ x: destinoX, y: destinoY });
      }
    }
    return movimientos;
  }

  generarImagenesFichas(nombreFicha) {
    return this.tablero.map(fila => fila.map(c => (c === 1 ? nombreFicha : null)));
  }

  // Ejecuta el movimiento si es válido
  moverFicha(origen, destino) {
    const validos = this.obtenerMovimientosValidos(origen.x, origen.y);
    const esValido = validos.some(m => m.x === destino.x && m.y === destino.y);
    if (!esValido) return false;

    const medioX = (origen.x + destino.x) / 2;
    const medioY = (origen.y + destino.y) / 2;

    this.tablero[destino.y][destino.x] = 1;
    this.tablero[origen.y][origen.x] = 0;
    this.tablero[medioY][medioX] = 0;

    this.imagenesFichas[destino.y][destino.x] = this.imagenesFichas[origen.y][origen.x];
    this.imagenesFichas[origen.y][origen.x] = null;
    this.imagenesFichas[medioY][medioX] = null;
    return true;
  }

  estaTerminado() {
    for (let y = 0; y < this.tamano; y++) {
      for (let x = 0; x < this.tamano; x++) {
        if (this.obtenerMovimientosValidos(x, y).length > 0) return false;
      }
    }
    return true;
  }

  contarFichas() {
    let total = 0;
    for (const fila of this.tablero) {
      for (const c of fila) if (c === 1) total++;
    }
    return total;
  }

  estaDentro(x, y) {
    return x >= 0 && x < this.tamano && y >= 0 && y < this.tamano;
  }

  resetear() {
    this.tablero = this.inicializarTablero();
    this.imagenesFichas = this.generarImagenesFichas(this.nombreFicha);
  }
}