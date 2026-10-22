//  Configuración, que filtros hay

const FILTERS = ['grayscale', 'brightness', 'invert', 'blur'];

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
//tiempo maximo segun el nivel
const timeForLevel = (level) => (level === 1 ? 120 : level === 2 ? 90 : 60);

// sortea una img distinta de la anterior
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
//apaga el reloj y los eventos para que no se acumulen
  destroy() {
    clearInterval(this.timerInterval);
    this.isPlaying = false;
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('contextmenu', this.onContextMenu);
  }
//carga la img y arranca todo cuando esta lista
  loadImage(index) {
    this.imageIndex = index;
    this.image = new Image();
    //4.carga la img
    //onload no usa la img, es el aviso del navegador 
    this.image.onload = () => {
      //4.1 crea y mezzcla
      this.createPieces();
      //4.2 arranca el reloj
      this.start();
      //4.3 dibuja
      this.drawPieces();
    };
    this.image.onerror = () => {
      console.error(`No se pudo cargar la imagen: ${this.image.src}`);
    };
    this.image.src = imgPath(index);
  }
//recorta la img al centro para que no quede deforme
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
//crea las piezas, les da rotacion y filtro al azar
  createPieces() {
    this.pieces = [];
    // Nivel 1: grises 
    // Nivel 2: un solo filtro (brillo o negativo) para toda la imagen
    // Nivel 3: un filtro distinto al azar en cada pieza
    const levelFilter =
      this.level === 2
        ? ['blur', 'brightness'][Math.floor(Math.random() * 2)]
        : 'blur';

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
  //arma la img de cada pieza y le aplica filtro 
  //recorta la ft
  buildTile(p, size) {
    const tile = document.createElement('canvas');
    tile.width = size;
    tile.height = size;
    const tctx = tile.getContext('2d');

    const { sx, sy, sw, sh } = this.getSourceRect();
    const pw = sw / this.cols;
    const ph = sh / this.rows;

    tctx.drawImage(
      this.image, //la ft origina
      sx + p.col * pw, //donde empieza el recorte, mas cuantas columnas me corr
      sy + p.row * ph,// lo mismo con las filas 
      pw, //ancho del pedazo que copio
      ph, //alto del pedazo que copio
      //lo pego en el canvas auxiliar ocupandolo entero
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
//dibuja todas las piezas con su rotacion
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
//la matematica de los filtros (grises, negativo, brillo)
  applyFilter(imageData, filter) {
    const data = imageData.data;

    filter.split(' ').forEach((f) => {
      switch (f) {
        case 'grayscale':
          for (let i = 0; i < data.length; i += 4) {
            const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i+2];
            data[i] = data[i + 1] = data[i + 2] = gray;
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

        case 'blur':
        const K = 5; 
        const width = imageData.width;
        const height = imageData.height;
        const destino = this.ctx.createImageData(width, height); 
        const src = data, dst = destino.data;

        for (let rep=0; rep < 5 ; rep++) {
          for (let col=0 ; col < height; col++) {
            for (let fila=0; fila < width; fila++){
              let r=0, g=0, b=0, vec=0;
              for (let colVec= -K; colVec <= K ; colVec++) {
                for (let filaVec=-K; filaVec <= K ; filaVec++ ){
                  let vecinoCol =  col + colVec, vecinoFila = fila + filaVec;
                  if (vecinoCol < 0 || vecinoFila < 0 || vecinoCol >= height || vecinoFila >= width) continue;
                    let vecino = (vecinoFila + vecinoCol * width) *4; 
                    r+=src[vecino]; g+=src[vecino+1]; b+=src[vecino+2];
                    vec++; 
                }
              }
              
              const pixelNuevo = (fila + col * width) * 4 ;
              dst[pixelNuevo] = r / vec;
              dst[pixelNuevo + 1] = g / vec;
              dst[pixelNuevo + 2 ] = b / vec;
              dst[pixelNuevo + 3] = src[pixelNuevo+3];
            }
          }
        data.set(dst);
        }
        break;
       

        default:
          break;
      }
    });

    return imageData;
  }
//mousedown se dispara al apretar cualquier btn del mouse sobre el canvas
  initEvents() {
    this.canvas.addEventListener('contextmenu', this.onContextMenu);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
  }
//Se usa mousedown y no click porque click solo se dispara con el botón izquierdo. mousedown distingue los botones.
//si el juego no esta en curso se ignora el click
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
//fija una pieza y suma 5 seg
  usarAyudita() {
    //si el juego esta en curso y la ayudita no se uso todavia en este nivel
    if (!this.isPlaying || this.ayuditaUsada) return;
//busca la pieza que necesitan ayuda: no estan fijas, no esta girando y no estan ya bien ubicadas.si no hay ninguna no hace nada
    const candidatas = this.pieces.filter(
      (p) => !p.fija && !p.isAnimating && p.rotation % 360 !== 0
    );
    if (candidatas.length === 0) return;
//elige una al azar y la deja:
    const pieza = candidatas[Math.floor(Math.random() * candidatas.length)];
    pieza.rotation = 0;
    pieza.filter = 'none';
    pieza.fija = true;
//suma al tiempo final y 5 menos antes de perder por tiempo
    this.startTime -= 5000;
    //impide un segundo uso
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

  //decide si ganaste y muestra la imagen sin filtros
  checkWin() {
    if (!this.isPlaying) return;
    const allCorrect = this.pieces.every(
      (p) => !p.isAnimating && (p.fija || p.rotation % 360 === 0)
    );
    if (!allCorrect) return;
//se frena el reloj, se bloquean los clic y se apaga la separacion entre las piezas
    clearInterval(this.timerInterval);
    this.isPlaying = false;
    this.gapActivo = false;

//se borra el canvas y se dibuja la ft original completa y original
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

    // Confeti (solo se ejecuta si la libreria cargo)
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

  //indica el temporizador y limite de tiempop
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
//2.crea un objeto Puzzle Game( con la cant de piezas y el nivel)
  function newGame(pieces, lvl, imageIndex) {
    if (game) game.destroy();
    game = new PuzzleGame(pieces, lvl);
    lastImageIndex = imageIndex;
    //3.pide que cargue la img
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
