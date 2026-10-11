//  Configuración 
const FILTERS = ['grayscale', 'brightness', 'invert'];

//preguntar si se pone -0.3 (muy oscura) o el 1.3(aumenta el brillo)
const BRIGHTNESS_FACTOR = 0.3;

const TOTAL_IMAGES = 8;
const imgPath = (i) => `assets/img-blocka/blocka/img${i}.jpeg`;

//piwzas
const LAYOUTS = {
  4: { cols: 2, rows: 2 },
  6: { cols: 3, rows: 2 },
  8: { cols: 4, rows: 2 }
};
const PIECE_PX = 160;

const timeForLevel = (level) => (level === 1 ? 120 : level === 2 ? 90 : 60);

// Devuelve una imagen al azar di
function pickImageIndex(exclude = null) {
  let i;
  do {
    i = Math.floor(Math.random() * TOTAL_IMAGES) + 1;
  } while (i === exclude && TOTAL_IMAGES > 1);
  return i;
}

class PuzzleGame {
  constructor(pieceCount = 4, level = 1) {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    this.pieceCount = LAYOUTS[pieceCount] ? pieceCount : 4;
    const { cols, rows } = LAYOUTS[this.pieceCount];
    this.cols = cols;
    this.rows = rows;
    this.canvas.width = cols * PIECE_PX;
    this.canvas.height = rows * PIECE_PX;

    this.level = level;
    this.image = null;
    this.imageIndex = null;
    this.pieces = [];
    this.isPlaying = false;
    this.startTime = 0;
    this.timerInterval = null;
    this.gapActivo = true;
    this.ayuditaUsada = false;

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onContextMenu = (e) => e.preventDefault();
    this.initEvents();
  }

  destroy() {
    clearInterval(this.timerInterval);
    this.isPlaying = false;
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
  }

  loadImage(index) {
    this.imageIndex = index;
    this.image = new Image();
    this.image.onload = () => {
      this.createPieces();
      this.start();
      this.drawPieces();
    };
    this.image.onerror = () => {
      console.error(`No se pudo cargar la imagen: ${this.image.src}`);
    };
    this.image.src = imgPath(index);
  }

  getSourceRect() {
    const targetRatio = this.cols / this.rows;
    const imgRatio = this.image.width / this.image.height;
    let sw = this.image.width;
    let sh = this.image.height;
    if (imgRatio > targetRatio) sw = sh * targetRatio;
    else sh = sw / targetRatio;
    return {
      sx: (this.image.width - sw) / 2,
      sy: (this.image.height - sh) / 2,
      sw,
      sh
    };
  }

  createPieces() {
    this.pieces = [];

    // Nivel 1: grises | Nivel 2: un solo filtro (brillo o negativo) para toda la imagen
    // Nivel 3: un filtro distinto al azar en cada pieza
    const levelFilter =
      this.level === 2
        ? ['brightness', 'invert'][Math.floor(Math.random() * 2)]
        : 'grayscale';

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        let filter = levelFilter;
        if (this.level >= 3) {
          filter = FILTERS[Math.floor(Math.random() * FILTERS.length)];
        }
        this.pieces.push({
          row,
          col,
          rotation: [0, 90, 180, 270][Math.floor(Math.random() * 4)],
          filter,
          fija: false,
          isAnimating: false,
          tile: null,
          tileFilter: null
        });
      }
    }

    if (this.pieces.every((p) => p.rotation === 0)) {
      const p = this.pieces[Math.floor(Math.random() * this.pieces.length)];
      p.rotation = [90, 180, 270][Math.floor(Math.random() * 3)];
    }
  }

  buildTile(p, size) {
    const tile = document.createElement('canvas');
    tile.width = size;
    tile.height = size;
    const tctx = tile.getContext('2d');

    const { sx, sy, sw, sh } = this.getSourceRect();
    const pw = sw / this.cols;
    const ph = sh / this.rows;

    tctx.drawImage(
      this.image,
      sx + p.col * pw,
      sy + p.row * ph,
      pw,
      ph,
      0,
      0,
      size,
      size
    );

    if (p.filter && p.filter !== 'none') {
      const imageData = tctx.getImageData(0, 0, size, size);
      this.applyFilter(imageData, p.filter);
      tctx.putImageData(imageData, 0, 0);
    }
    return tile;
  }

  drawPieces() {
    const gap = this.gapActivo ? 4 : 0;
    const inner = PIECE_PX - gap;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.pieces.forEach((p) => {
      if (!p.tile || p.tileFilter !== p.filter) {
        p.tile = this.buildTile(p, PIECE_PX);
        p.tileFilter = p.filter;
      }

      this.ctx.save();
      this.ctx.translate(
        p.col * PIECE_PX + PIECE_PX / 2,
        p.row * PIECE_PX + PIECE_PX / 2
      );
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.drawImage(p.tile, -inner / 2, -inner / 2, inner, inner);
      this.ctx.restore();
    });
  }

  applyFilter(imageData, filter) {
    const data = imageData.data;

    filter.split(' ').forEach((f) => {
      switch (f) {
        case 'grayscale':
          for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = data[i + 1] = data[i + 2] = avg;
          }
          break;

        case 'invert':
          for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];
            data[i + 1] = 255 - data[i + 1];
            data[i + 2] = 255 - data[i + 2];
          }
          break;

        case 'brightness':
          for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, data[i] * BRIGHTNESS_FACTOR);
            data[i + 1] = Math.min(255, data[i + 1] * BRIGHTNESS_FACTOR);
            data[i + 2] = Math.min(255, data[i + 2] * BRIGHTNESS_FACTOR);
          }
          break;

        default:
          break;
      }
    });

    return imageData;
  }

  initEvents() {
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
  }

  onMouseDown(e) {
    if (!this.isPlaying) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    const col = Math.floor(x / PIECE_PX);
    const row = Math.floor(y / PIECE_PX);

    const piece = this.pieces.find((p) => p.row === row && p.col === col);
    if (!piece || piece.fija) return;

    if (e.button === 0) this.animateRotation(piece, -90); // izquierdo -> izquierda
    if (e.button === 2) this.animateRotation(piece, 90); // derecho -> derecha
  }

  usarAyudita() {
    if (!this.isPlaying || this.ayuditaUsada) return;

    const candidatas = this.pieces.filter(
      (p) => !p.fija && !p.isAnimating && p.rotation % 360 !== 0
    );
    if (candidatas.length === 0) return;

    const pieza = candidatas[Math.floor(Math.random() * candidatas.length)];
    pieza.rotation = 0;
    pieza.filter = 'none';
    pieza.fija = true;

    // Penalización de 5 segundos
    this.startTime -= 5000;
    this.ayuditaUsada = true;

    this.drawPieces();
    this.checkWin();
  }

  animateRotation(piece, delta) {
    if (piece.isAnimating) return;
    piece.isAnimating = true;
    const start = piece.rotation;
    const end = start + delta;
    const duration = 200;
    const startTime = performance.now();

    const animate = (time) => {
      const progress = Math.min((time - startTime) / duration, 1);
      piece.rotation = start + (end - start) * progress;
      this.drawPieces();

      if (progress < 1) {
        requestAnimationFrame(animate);
        return;
      }

      piece.rotation = ((end % 360) + 360) % 360;
      this.drawPieces();
      piece.isAnimating = false;

      if (piece.rotation === 0) {
        this.canvas.classList.add('correct');
        setTimeout(() => this.canvas.classList.remove('correct'), 500);
      }
      this.checkWin();
    };
    requestAnimationFrame(animate);
  }

  checkWin() {
    if (!this.isPlaying) return;
    const allCorrect = this.pieces.every(
      (p) => !p.isAnimating && (p.fija || p.rotation % 360 === 0)
    );
    if (!allCorrect) return;

    clearInterval(this.timerInterval);
    this.isPlaying = false;
    this.gapActivo = false;

    // Se quitan los filtros: imagen original en RGB, sin separación entre piezas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const { sx, sy, sw, sh } = this.getSourceRect();
    this.ctx.drawImage(
      this.image,
      sx, sy, sw, sh,
      0, 0, this.canvas.width, this.canvas.height
    );

    this.canvas.classList.add('win-effect');
    setTimeout(() => this.canvas.classList.remove('win-effect'), 1200);

    document.getElementById('successMessage').style.display = 'block';

    // Confeti 
    if (typeof confetti === 'function') {
      const end = Date.now() + 1500;
      (function frame() {
        confetti({ particleCount: 7, angle: 60, spread: 70, origin: { x: 0, y: 0.5 } });
        confetti({ particleCount: 7, angle: 120, spread: 70, origin: { x: 1, y: 0.5 } });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    }

    // Récord (por nivel y por cantidad de piezas, incluye penalización de ayudita)
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const recordKey = this.recordKey();
    const prevRecord = localStorage.getItem(recordKey);
    if (!prevRecord || elapsed < parseInt(prevRecord)) {
      localStorage.setItem(recordKey, elapsed);
      const recordMsg = document.getElementById('recordMessage');
      recordMsg.style.display = 'block';
      recordMsg.textContent = `¡Nuevo récord en nivel ${this.level}: ${elapsed} segundos!`;
    }
  }

  recordKey() {
    return `record_level_${this.level}_${this.pieceCount}`;
  }

  start() {
    this.isPlaying = true;
    this.ayuditaUsada = false;
    this.gapActivo = true;
    this.startTime = Date.now();

    document.getElementById('ayuditaBtn').disabled = false;
    document.getElementById('successMessage').style.display = 'none';
    document.getElementById('defeatMessage').style.display = 'none';
    document.getElementById('recordMessage').style.display = 'none';

    const best = localStorage.getItem(this.recordKey());
    const info = document.getElementById('level-info');
    if (info) {
      info.textContent = best
        ? `Nivel ${this.level} | Récord: ${best}s`
        : `Nivel ${this.level} | Récord: --`;
    }

    const totalTime = timeForLevel(this.level);
    const totalMin = Math.floor(totalTime / 60);
    const totalSec = String(totalTime % 60).padStart(2, '0');
    const timerEl = document.getElementById('timer');
    timerEl.textContent = `0:00 / ${totalMin}:${totalSec}`;

    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);

      if (elapsed >= totalTime) {
        clearInterval(this.timerInterval);
        this.isPlaying = false;
        timerEl.textContent = `${totalMin}:${totalSec} / ${totalMin}:${totalSec}`;

        this.canvas.classList.add('lose-effect');
        setTimeout(() => this.canvas.classList.remove('lose-effect'), 500);

        document.getElementById('defeatMessage').style.display = 'block';
        return;
      }

      const minutes = Math.floor(elapsed / 60);
      const seconds = String(elapsed % 60).padStart(2, '0');
      timerEl.textContent = `${minutes}:${seconds} / ${totalMin}:${totalSec}`;
    }, 1000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const startGameBtn = document.getElementById('startGameBtn');
  const nextLevelBtn = document.getElementById('nextLevelBtn');
  const retryBtn = document.getElementById('retryBtn');
  const startScreen = document.getElementById('startScreen');
  const ayuditaBtn = document.getElementById('ayuditaBtn');
  const menuBtn = document.getElementById('menuBtn');
  const restartBtn = document.getElementById('restartBtn');
  const previewContainer = document.getElementById('previewContainer');
  const canvas = document.getElementById('gameCanvas');

  let selectedPieces = 4; 
  let game = null;
  let level = 1;
  let lastImageIndex = null;

  function newGame(pieces, lvl, imageIndex) {
    if (game) game.destroy();
    game = new PuzzleGame(pieces, lvl);
    lastImageIndex = imageIndex;
    game.loadImage(imageIndex);
  }

  function showGameButtons(visible) {
    const display = visible ? 'block' : 'none';
    ayuditaBtn.style.display = display;
    menuBtn.style.display = display;
    restartBtn.style.display = display;
  }

  // Vuelve al menú principal desde cualquier lugar
  function showMenu() {
    if (game) game.destroy();
    document.getElementById('successMessage').style.display = 'none';
    document.getElementById('defeatMessage').style.display = 'none';
    document.getElementById('recordMessage').style.display = 'none';
    showGameButtons(false);

    previewContainer.innerHTML = '';
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    document.getElementById('timer').textContent = '00:00';
    document.getElementById('level-info').textContent = 'Nivel - | Récord: --';
    startGameBtn.disabled = false;
    startScreen.style.display = 'flex';
  }

  // Selector de cantidad de piezas (4, 6 u 8)
  const sizeButtons = document.querySelectorAll('#pieceButtons button');
  sizeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedPieces = parseInt(btn.dataset.size);
      sizeButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  if (sizeButtons[0]) sizeButtons[0].classList.add('active');

  // Animación previa: se muestran todas las miniaturas y se resalta la elegida
  function mostrarPreview(callback) {
    previewContainer.innerHTML = '';
    previewContainer.style.display = 'flex';
    previewContainer.style.opacity = '1';

    const selectedIndex = pickImageIndex();

    for (let i = 1; i <= TOTAL_IMAGES; i++) {
      const img = document.createElement('img');
      img.src = imgPath(i);
      previewContainer.appendChild(img);

      if (i === selectedIndex) {
        setTimeout(() => {
          img.style.transform = 'scale(1.2)';
          img.style.borderColor = '#10b981';
        }, 500);
      }
    }

    setTimeout(() => {
      previewContainer.style.opacity = '0';
      previewContainer.style.display = 'none';
      callback(selectedIndex);
    }, 2000);
  }

  // Botón "Necesito ayuda"
  ayuditaBtn.addEventListener('click', () => {
    if (game && !game.ayuditaUsada) {
      game.usarAyudita();
      ayuditaBtn.disabled = true;
    }
  });

  // Botones "Menú" y "Reiniciar" de la barra de juego
  menuBtn.addEventListener('click', showMenu);

  restartBtn.addEventListener('click', () => {
    if (!game) return;
    newGame(selectedPieces, level, pickImageIndex(lastImageIndex));
  });

  // Botón "Comenzar"
  startGameBtn.addEventListener('click', () => {
    startGameBtn.disabled = true; 
    level = 1;

    mostrarPreview((selectedIndex) => {
      newGame(selectedPieces, level, selectedIndex);
      startGameBtn.disabled = false;
      startScreen.style.display = 'none';
      showGameButtons(true);
    });
  });

  // Botón "Siguiente" nivel (con otra imagen distinta a la anterior)
  nextLevelBtn.addEventListener('click', () => {
    level++;
    document.getElementById('successMessage').style.display = 'none';
    document.getElementById('recordMessage').style.display = 'none';

    if (level > 3) {
      level = 1;
      showMenu();
      return;
    }
    newGame(selectedPieces, level, pickImageIndex(lastImageIndex));
  });

  // Botón "Reintentar" (misma imagen, mismo nivel)
  retryBtn.addEventListener('click', () => {
    document.getElementById('defeatMessage').style.display = 'none';
    newGame(selectedPieces, level, lastImageIndex);
  });

  // Botones "Menú" de los mensajes de victoria/derrota
  document.querySelectorAll('.goToMenuBtn').forEach((btn) => {
    btn.addEventListener('click', () => {
      level = 1;
      showMenu();
    });
  });
});
