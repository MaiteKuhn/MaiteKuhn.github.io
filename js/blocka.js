// === Configuración de filtros ===
const FILTERS = [
  'grayscale',
  'brightness',
  'invert'
];

const FILTER_COMBOS = [
  'grayscale brightness',
  'invert brightness',
  'grayscale invert'
];

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

    //this.loadImage();
    this.initEvents();
  }

  loadImage(index = null) {
    const totalImages = 6;
    const randomI = index || Math.floor(Math.random() * totalImages) + 1;
    this.image = new Image();
    this.image.src = `assets/img-blocka/img${randomI}.jpeg`;
    this.image.onload = () => {
    this.createPieces();
    this.drawPieces();
    this.start(); 
  };
  }



  createPieces() {
    this.pieces = [];
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize; col++) {
        let filter = 'grayscale'; // ← valor por defecto
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
          fija: false
        });
      }
    }
  }

  drawPieces() {
  const pieceSize = this.canvas.width / this.gridSize;
  const gap = this.gapActivo ? 4 : 0;

  this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

  this.pieces.forEach(p => {
    this.ctx.save();
    this.ctx.translate(
      p.col * pieceSize + pieceSize / 2,
      p.row * pieceSize + pieceSize / 2
    );
    this.ctx.rotate((p.rotation * Math.PI) / 180);

    const offCanvas = document.createElement("canvas");
    offCanvas.width = pieceSize;
    offCanvas.height = pieceSize;
    const offCtx = offCanvas.getContext("2d");

    offCtx.drawImage(
      this.image,
      p.col * (this.image.width / this.gridSize),
      p.row * (this.image.height / this.gridSize),
      this.image.width / this.gridSize,
      this.image.height / this.gridSize,
      0, 0, pieceSize, pieceSize
    );

    let imageData = offCtx.getImageData(0, 0, pieceSize, pieceSize);
    imageData = this.applyFilter(imageData, p.filter);
    offCtx.putImageData(imageData, 0, 0);

    this.ctx.drawImage(
      offCanvas,
      -pieceSize / 2 + gap / 2,
      -pieceSize / 2 + gap / 2,
      pieceSize - gap,
      pieceSize - gap
    );

      this.ctx.restore();
    });
  }


  applyFilter(imageData, filter) {
  const data = imageData.data;
  const filters = filter.split(' '); // permite aplicar combos

  filters.forEach(f => {
    switch (f) {
      case "grayscale":
        for (let i = 0; i < data.length; i += 4) {
          const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
          data[i] = data[i + 1] = data[i + 2] = avg;
        }
        break;

        case "invert":
          for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];
            data[i + 1] = 255 - data[i + 1];
            data[i + 2] = 255 - data[i + 2];
          }
          break;

        case "brightness":
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
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());
    this.canvas.addEventListener('mousedown', e => {
      if (!this.isPlaying) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const pieceSize = this.canvas.width / this.gridSize;
      const col = Math.floor(x / pieceSize);
      const row = Math.floor(y / pieceSize);
      const piece = this.pieces.find(p => p.row === row && p.col === col);
      if (!piece) return;

      if (piece.fija) return;

      // Animación de rotación suave
      if (e.button === 0) this.animateRotation(piece, -90);
      if (e.button === 2) this.animateRotation(piece, 90);
    });
  }

  usarAyudita() {
    if (!this.isPlaying || this.ayuditaUsada) return;

    // Elegir una pieza al azar que no esté fija
    const candidatas = this.pieces.filter(p => !p.fija && p.rotation % 360 != 0);
    if (candidatas.length === 0) return;

    const pieza = candidatas[Math.floor(Math.random() * candidatas.length)];

    pieza.rotation = 0;
    pieza.filter = 'none';
    pieza.fija = true;

    // Sumar 5 segundos al tiempo de inicio
    this.startTime -= 5000;
    this.ayuditaUsada = true;

    this.drawPieces();
    this.checkWin();
  }

  volverAlMenu() {
    clearInterval(this.timerInterval);
    this.isPlaying = false;
    document.getElementById('successMessage').style.display = 'none';
    document.getElementById('defeatMessage').style.display = 'none';
    document.getElementById('ayuditaBtn').style.display = 'none';
    document.getElementById('menuBtn').style.display = 'none';
    document.getElementById('restartBtn').style.display = 'none';
    //  document.getElementById('previewContainer').style.display = 'none';

    const ctx = this.canvas.getContext('2d');
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    document.getElementById('timer').textContent = "00:00";
    document.getElementById('level-info').textContent = "Nivel - | Récord: --";
    document.getElementById('startScreen').style.display = 'flex';
  }

  reiniciarJuego() {
    clearInterval(this.timerInterval);
    this.isPlaying = false;
    this.loadImage(); // nueva img aleatoria
    this.start();
  }


  // Animación de rotación de piezas
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
      } else {
        piece.rotation = end % 360;
        if (piece.rotation < 0) piece.rotation += 360;
        this.drawPieces();
        piece.isAnimating = false;

        if (piece.rotation % 360 === 0) {
        this.canvas.classList.add("correct");
        setTimeout(() => this.canvas.classList.remove("correct"), 500);
        }
        this.checkWin();
      }
    };
    requestAnimationFrame(animate);
    
  } 

  checkWin() {
    const allCorrect = this.pieces.every(p => p.fija || p.rotation % 360 === 0);
    const duration = 1500; // 1,5 segundos
    const end = Date.now() + duration;
    if (!allCorrect) return;

    clearInterval(this.timerInterval);
    this.isPlaying = false;
    this.pieces.forEach(p => (p.filter = 'none'));
    this.gapActivo = false;
    this.drawPieces();
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.image, 0, 0, this.canvas.width, this.canvas.height);


    // Animación de victoria
    const canvas = this.canvas;
    canvas.classList.add('win-effect');
    setTimeout(() => canvas.classList.remove('win-effect'), 1200);

    document.getElementById('successMessage').style.display = 'block';
    const myConfetti = confetti.create(null, { resize: true, useWorker: true });

    (function frame() {
      myConfetti({
        particleCount: 7,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.5 }
      });
      myConfetti({
        particleCount: 7,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.5 }
    });

    if (Date.now() < end) {
        requestAnimationFrame(frame);
    }
    })();
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
    ayuditaBtn.disabled = false;
    this.startTime = Date.now();
    document.getElementById('successMessage').style.display = 'none';
    document.getElementById('defeatMessage').style.display = 'none';

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

    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - this.startTime) / 1000);

      if (elapsed >= totalTime) {
        clearInterval(this.timerInterval);
        this.isPlaying = false;

        const totalMin = Math.floor(totalTime / 60);
        const totalSec = String(totalTime % 60).padStart(2, '0');
        document.getElementById('timer').textContent = `${totalMin}:${totalSec} / ${totalMin}:${totalSec}`;

        // Animación de derrota
        this.canvas.classList.add('lose-effect');
        setTimeout(() => this.canvas.classList.remove('lose-effect'), 500);

        document.getElementById('defeatMessage').style.display = 'block';
        return;
      }

      const minutes = String(Math.floor(elapsed / 60)).padStart(1, '0');
      const seconds = String(elapsed % 60).padStart(2, '0');
      const totalMin = Math.floor(totalTime / 60);
      const totalSec = String(totalTime % 60).padStart(2, '0');

      document.getElementById('timer').textContent = `${minutes}:${seconds} / ${totalMin}:${totalSec}`;
    }, 1000);
  }
  }


// === Inicialización de la interfaz ===
document.addEventListener('DOMContentLoaded', () => {
  // Referencias a elementos del DOM
  const startGameBtn = document.getElementById('startGameBtn');
  const pieceSelect = document.getElementById('pieceSelect');
  const nextLevelBtn = document.getElementById('nextLevelBtn');
  const retryBtn = document.getElementById('retryBtn');
  const startScreen = document.getElementById('startScreen');
  const ayuditaBtn = document.getElementById('ayuditaBtn');
  const menuBtn = document.getElementById('menuBtn');
  const restartBtn = document.getElementById('restartBtn');

  let selectedGridSize = 2;


  let game = null;
  let level = 1;

  document.querySelectorAll('#pieceButtons button').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedGridSize = parseInt(btn.dataset.size);
      // Opcional: marcar el botón activo visualmente
      document.querySelectorAll('#pieceButtons button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Función para volver al menú inicial
  function showMenu() {
    startScreen.style.display = 'flex';
    document.getElementById('recordMessage').style.display = 'none';
    const ctx = document.getElementById('gameCanvas').getContext('2d');
    ctx.clearRect(0, 0, 500, 500);
    document.getElementById('timer').textContent = "00:00";
    document.getElementById('level-info').textContent = "Nivel - | Récord: --";
    startGameBtn.style.display = 'block';
  }

  // Botón "Ayudita"
  ayuditaBtn.addEventListener('click', () => {
    if (game && !game.ayuditaUsada) {
      game.usarAyudita();

      ayuditaBtn.disabled = true;
    }
  });

  // botones "volver menu" y "reiniciar"
  menuBtn.addEventListener('click', () => {
    if (game) game.volverAlMenu();
  });

  restartBtn.addEventListener('click', () => {
    if (game) game.reiniciarJuego();
  });


  // Botón "Comenzar" (overlay inicial)
  startGameBtn.addEventListener('click', () => {
    const gridSize = selectedGridSize;
    level = 1;

    mostrarPreview((selectedIndex) => {
      game = new PuzzleGame(gridSize, level);
      game.loadImage(selectedIndex);
      previewContainer.style.display = 'block';
      startScreen.style.display = 'none';
      ayuditaBtn.style.display = 'block';
      menuBtn.style.display = 'block';
      restartBtn.style.display = 'block';
    });
  });



  function mostrarPreview(callback) {
    const previewContainer = document.getElementById('previewContainer');
    previewContainer.innerHTML = '';
    previewContainer.style.opacity = '1';

    const totalImages = 6;
    const selectedIndex = Math.floor(Math.random() * totalImages) + 1;

    for (let i = 1; i <= totalImages; i++) {
      const img = document.createElement('img');
      img.src = `iconos-imagenes/blocka/blocka${i}.jpg`;
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
    callback(selectedIndex); // pasamos el índice elegido
  }, 2000);
}

  // Botón "Siguiente nivel"
  nextLevelBtn.addEventListener('click', () => {
    const gridSize = selectedGridSize;
    level++;
    if (level > 3){
      level = 1;
      document.getElementById('successMessage').style.display = 'none';
      ayuditaBtn.style.display = 'none';
      showMenu();
      return;
    }
    document.getElementById('recordMessage').style.display = 'none';
    game = new PuzzleGame(gridSize, level);
    game.loadImage(); // ← esto faltaba
    game.start();
    document.getElementById('successMessage').style.display = 'none';
  });


  // Botón "Reintentar"
  retryBtn.addEventListener('click', () => {
    const gridSize = selectedGridSize;
    game = new PuzzleGame(gridSize, level);
    game.loadImage(); // ← esto faltaba
    game.start();
    document.getElementById('defeatMessage').style.display = 'none';
  });


  // Botones "Menú" (hay dos, por eso usamos querySelectorAll)
  document.querySelectorAll('.goToMenuBtn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('successMessage').style.display = 'none';
      document.getElementById('defeatMessage').style.display = 'none';
      ayuditaBtn.style.display = 'none';
      menuBtn.style.display = 'none';
      restartBtn.style.display = 'none';

      showMenu();
    });
  });
});

const input = document.querySelector('.input-coment');
const boton = document.querySelector('.btn-comentar');
const divInput = document.querySelector('.input-con-boton');
input.addEventListener('click',() => {
  boton.style.display = 'block';
  divInput.style.height = '100px';

});
boton.addEventListener('click',() => {
  boton.style.display = 'none';
  divInput.style.height = '50px';
  input.value = '';
});