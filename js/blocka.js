// === Configuración ===
const FILTERS = ['grayscale', 'brightness', 'invert'];
const FILTER_COMBOS = [
  'grayscale brightness',
  'invert brightness',
  'grayscale invert'
];

const TOTAL_IMAGES = 8;
const imgPath = (i) => `assets/img-blocka/blocka/img${i}.jpeg`;

// === Clase principal del juego ===
class PuzzleGame {
  constructor(gridSize = 2, level = 1) {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');
    this.image = null;
    this.pieces = [];
    this.gridSize = gridSize;
    this.level = level;
    this.isPlaying = false;
    this.startTime = 0;
    this.timerInterval = null;
    this.gapActivo = true;
    this.ayuditaUsada = false;

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onContextMenu = (e) => e.preventDefault();
    this.initEvents();
  }

  // Quita los listeners del canvas (evita que se acumulen al crear juegos nuevos)
  destroy() {
    clearInterval(this.timerInterval);
    this.isPlaying = false;
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
  }

  loadImage(index = null) {
    const i = index || Math.floor(Math.random() * TOTAL_IMAGES) + 1;
    this.image = new Image();
    this.image.onload = () => {
      this.createPieces();
      this.start();
      this.drawPieces();
    };
    this.image.onerror = () => {
      console.error(`No se pudo cargar la imagen: ${this.image.src}`);
    };
    this.image.src = imgPath(i);
  }

  createPieces() {
    this.pieces = [];
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        let filter = 'grayscale';
        if (this.level === 2) {
          filter = FILTERS[Math.floor(Math.random() * FILTERS.length)];
        } else if (this.level >= 3) {
          const all = [...FILTERS, ...FILTER_COMBOS];
          filter = all[Math.floor(Math.random() * all.length)];
        }
        this.pieces.push({
          row,
          col,
          rotation: [0, 90, 180, 270][Math.floor(Math.random() * 4)],
          filter,
          fija: false,
          tile: null,
          tileFilter: null
        });
      }
    }
  }

  // Genera (una sola vez) la imagen de la pieza con su filtro aplicado
  buildTile(p, size) {
    const tile = document.createElement('canvas');
    tile.width = size;
    tile.height = size;
    const tctx = tile.getContext('2d');

    tctx.drawImage(
      this.image,
      p.col * (this.image.width / this.gridSize),
      p.row * (this.image.height / this.gridSize),
      this.image.width / this.gridSize,
      this.image.height / this.gridSize,
      0, 0, size, size
    );

    const imageData = tctx.getImageData(0, 0, size, size);
    this.applyFilter(imageData, p.filter);
    tctx.putImageData(imageData, 0, 0);
    return tile;
  }

  drawPieces() {
    const pieceSize = this.canvas.width / this.gridSize;
    const gap = this.gapActivo ? 4 : 0;
    const inner = pieceSize - gap;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.pieces.forEach((p) => {
      if (!p.tile || p.tileFilter !== p.filter) {
        p.tile = this.buildTile(p, Math.floor(pieceSize));
        p.tileFilter = p.filter;
      }

      this.ctx.save();
      this.ctx.translate(
        p.col * pieceSize + pieceSize / 2,
        p.row * pieceSize + pieceSize / 2
      );
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.drawImage(p.tile, -inner / 2, -inner / 2, inner, inner);
      this.ctx.restore();
    });
  }

  applyFilter(imageData, filter) {
    const data = imageData.data;
    const filters = filter.split(' '); // permite combos

    filters.forEach((f) => {
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
            data[i] *= 0.3;
            data[i + 1] *= 0.3;
            data[i + 2] *= 0.3;
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
    // Corrige la posición si el canvas está escalado por CSS
    const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    const pieceSize = this.canvas.width / this.gridSize;
    const col = Math.floor(x / pieceSize);
    const row = Math.floor(y / pieceSize);

    const piece = this.pieces.find((p) => p.row === row && p.col === col);
    if (!piece || piece.fija) return;

    if (e.button === 0) this.animateRotation(piece, -90);
    if (e.button === 2) this.animateRotation(piece, 90);
  }

  usarAyudita() {
    if (!this.isPlaying || this.ayuditaUsada) return;

    const candidatas = this.pieces.filter((p) => !p.fija && p.rotation % 360 !== 0);
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

  volverAlMenu() {
    this.destroy();
    document.getElementById('successMessage').style.display = 'none';
    document.getElementById('defeatMessage').style.display = 'none';
    document.getElementById('recordMessage').style.display = 'none';
    document.getElementById('ayuditaBtn').style.display = 'none';
    document.getElementById('menuBtn').style.display = 'none';
    document.getElementById('restartBtn').style.display = 'none';
    document.getElementById('previewContainer').innerHTML = '';

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    document.getElementById('timer').textContent = '00:00';
    document.getElementById('level-info').textContent = 'Nivel - | Récord: --';
    document.getElementById('startScreen').style.display = 'flex';
  }

  reiniciarJuego() {
    clearInterval(this.timerInterval);
    this.isPlaying = false;
    this.loadImage(); // imagen nueva al azar (start() se llama en el onload)
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

      piece.rotation = end % 360;
      if (piece.rotation < 0) piece.rotation += 360;
      this.drawPieces();
      piece.isAnimating = false;

      if (piece.rotation % 360 === 0) {
        this.canvas.classList.add('correct');
        setTimeout(() => this.canvas.classList.remove('correct'), 500);
      }
      this.checkWin();
    };
    requestAnimationFrame(animate);
  }

  checkWin() {
    if (!this.isPlaying) return;
    const allCorrect = this.pieces.every((p) => p.fija || p.rotation % 360 === 0);
    if (!allCorrect) return;

    clearInterval(this.timerInterval);
    this.isPlaying = false;
    this.gapActivo = false;
    this.pieces.forEach((p) => (p.filter = 'none'));

    // Muestra la imagen completa
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);

    // Animación de victoria
    this.canvas.classList.add('win-effect');
    setTimeout(() => this.canvas.classList.remove('win-effect'), 1200);

    document.getElementById('successMessage').style.display = 'block';

    // Confeti (requiere la librería canvas-confetti en el HTML)
    if (typeof confetti === 'function') {
      const end = Date.now() + 1500;
      (function frame() {
        confetti({ particleCount: 7, angle: 60, spread: 70, origin: { x: 0, y: 0.5 } });
        confetti({ particleCount: 7, angle: 120, spread: 70, origin: { x: 1, y: 0.5 } });
        if (Date.now() < end) requestAnimationFrame(frame);
      })();
    }

    // Récord
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const recordKey = `record_level_${this.level}`;
    const prevRecord = localStorage.getItem(recordKey);
    if (!prevRecord || elapsed < parseInt(prevRecord)) {
      localStorage.setItem(recordKey, elapsed);
      const recordMsg = document.getElementById('recordMessage');
      recordMsg.style.display = 'block';
      recordMsg.textContent = `¡Nuevo récord en nivel ${this.level}: ${elapsed} segundos!`;
    }
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

    const recordKey = `record_level_${this.level}`;
    const best = localStorage.getItem(recordKey);
    const info = document.getElementById('level-info');
    if (info) {
      info.textContent = best
        ? `Nivel ${this.level} | Récord: ${best}s`
        : `Nivel ${this.level} | Récord: --`;
    }

    let totalTime = 120;
    if (this.level === 2) totalTime = 90;
    if (this.level >= 3) totalTime = 60;

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

// === Inicialización de la interfaz ===
document.addEventListener('DOMContentLoaded', () => {
  const startGameBtn = document.getElementById('startGameBtn');
  const nextLevelBtn = document.getElementById('nextLevelBtn');
  const retryBtn = document.getElementById('retryBtn');
  const startScreen = document.getElementById('startScreen');
  const ayuditaBtn = document.getElementById('ayuditaBtn');
  const menuBtn = document.getElementById('menuBtn');
  const restartBtn = document.getElementById('restartBtn');
  const previewContainer = document.getElementById('previewContainer');

  let selectedGridSize = 4;
  let game = null;
  let level = 1;

  // Crea un juego nuevo (destruyendo el anterior)
  function newGame(gridSize, lvl, imageIndex = null) {
    if (game) game.destroy();
    game = new PuzzleGame(gridSize, lvl);
    game.loadImage(imageIndex);
  }

  // Selector de tamaño
  const sizeButtons = document.querySelectorAll('#pieceButtons button');
  sizeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedGridSize = parseInt(btn.dataset.size);
      sizeButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
  if (sizeButtons[0]) sizeButtons[0].classList.add('active');

  function showMenu() {
    startScreen.style.display = 'flex';
    previewContainer.innerHTML = '';
    document.getElementById('recordMessage').style.display = 'none';
    const ctx = document.getElementById('gameCanvas').getContext('2d');
    ctx.clearRect(0, 0, 500, 500);
    document.getElementById('timer').textContent = '00:00';
    document.getElementById('level-info').textContent = 'Nivel - | Récord: --';
    startGameBtn.style.display = 'block';
  }

  function mostrarPreview(callback) {
    previewContainer.innerHTML = '';
    previewContainer.style.display = 'flex';
    previewContainer.style.opacity = '1';

    const selectedIndex = Math.floor(Math.random() * TOTAL_IMAGES) + 1;

    for (let i = 1; i <= TOTAL_IMAGES; i++) {
      const img = document.createElement('img');
      img.src = imgPath(i);
      previewContainer.appendChild(img);

      if (i === selectedIndex) {
        setTimeout(() => {
          img.style.transform = 'scale(1.2)';
          img.style.borderColor = '#00FF00';
        }, 500);
      }
    }

    setTimeout(() => {
      previewContainer.style.opacity = '0';
      previewContainer.style.display = 'none';
      callback(selectedIndex);
    }, 2000);
  }

  // Botón "Ayudita"
  ayuditaBtn.addEventListener('click', () => {
    if (game && !game.ayuditaUsada) {
      game.usarAyudita();
      ayuditaBtn.disabled = true;
    }
  });

  // Botones "Menú" y "Reiniciar" (los de la barra de juego)
  menuBtn.addEventListener('click', () => {
    if (game) game.volverAlMenu();
  });

  restartBtn.addEventListener('click', () => {
    if (game) game.reiniciarJuego();
  });

  // Botón "Comenzar"
  startGameBtn.addEventListener('click', () => {
    startGameBtn.disabled = true; // evita doble clic durante la preview
    level = 1;

    mostrarPreview((selectedIndex) => {
      newGame(selectedGridSize, level, selectedIndex);
      startGameBtn.disabled = false;
      startScreen.style.display = 'none';
      ayuditaBtn.style.display = 'block';
      menuBtn.style.display = 'block';
      restartBtn.style.display = 'block';
    });
  });

  // Botón "Siguiente nivel"
  nextLevelBtn.addEventListener('click', () => {
    level++;
    document.getElementById('successMessage').style.display = 'none';
    document.getElementById('recordMessage').style.display = 'none';

    if (level > 3) {
      level = 1;
      if (game) game.destroy();
      ayuditaBtn.style.display = 'none';
      menuBtn.style.display = 'none';
      restartBtn.style.display = 'none';
      showMenu();
      return;
    }
    newGame(selectedGridSize, level);
  });

  // Botón "Reintentar"
  retryBtn.addEventListener('click', () => {
    document.getElementById('defeatMessage').style.display = 'none';
    newGame(selectedGridSize, level);
  });

  // Botones "Menú" de los mensajes de victoria/derrota
  document.querySelectorAll('.goToMenuBtn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (game) game.destroy();
      document.getElementById('successMessage').style.display = 'none';
      document.getElementById('defeatMessage').style.display = 'none';
      ayuditaBtn.style.display = 'none';
      menuBtn.style.display = 'none';
      restartBtn.style.display = 'none';
      showMenu();
    });
  });
});

// === Input de comentarios (solo si existen en la página) ===
const input = document.querySelector('.input-coment');
const boton = document.querySelector('.btn-comentar');
const divInput = document.querySelector('.input-con-boton');

if (input && boton && divInput) {
  input.addEventListener('click', () => {
    boton.style.display = 'block';
    divInput.style.height = '100px';
  });
  boton.addEventListener('click', () => {
    boton.style.display = 'none';
    divInput.style.height = '50px';
    input.value = '';
  });
}
