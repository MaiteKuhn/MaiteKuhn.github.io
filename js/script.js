const barra = document.querySelector(".barra-carga");
const porcentaje = document.querySelector(".porcentaje");

let progreso = 0;

const carga = setInterval(() => {

    progreso++;

    barra.style.width = progreso + "%";
    porcentaje.textContent = progreso + "%";

    if (progreso >= 100) {
        clearInterval(carga);
    }

}, 50);

const carruseles = document.querySelectorAll(".carrusel");

carruseles.forEach(carrusel => {

    const juegos = carrusel.querySelector(".juegos");
    const izquierda = carrusel.querySelector(".izquierda");
    const derecha = carrusel.querySelector(".derecha");

    derecha.addEventListener("click", () => {
        juegos.scrollBy({
            left: 300,
            behavior: "smooth"
        });
        const cards = juegos.querySelectorAll(".juego");

        cards.forEach(card => {
        card.classList.remove("rebotando");

        void card.offsetWidth;

        card.classList.add("rebotando");
    });

    });

    izquierda.addEventListener("click", () => {
        juegos.scrollBy({
            left: -300,
            behavior: "smooth"
        });
        const cards = juegos.querySelectorAll(".juego");

        cards.forEach(card => {
        card.classList.remove("rebotando");

        void card.offsetWidth;

        card.classList.add("rebotando");
    });
    });

});
const menuBtn = document.querySelector(".menu-btn");
const menu = document.querySelector(".menu");

menuBtn.addEventListener("click", () => {
    menu.classList.toggle("menu-abierto");
});

const btnCategorias = document.querySelector(".btn-categorias");
const submenu = document.querySelector(".submenu");

btnCategorias.addEventListener("click", (event) => {
    event.preventDefault();
    submenu.classList.toggle("submenu-abierto");
});


//API 

const contenedores = document.querySelectorAll('.carrusel .juegos');
const contenedorRecomendados = document.querySelector('.juegos-recomendados .juegos');

fetch('https://vj.interfaces.jima.com.ar/api/v2')
  .then(response => response.json())
  .then(games => {
    if(contenedores.length > 0){
    contenedores.forEach((contenedor,index) => {
        const inicio = index * 8;
        const fin = inicio + 8;
        
        const grupoJuego = games.slice(inicio, fin);

        grupoJuego.forEach(game => {
           const tarjeta = crearTarjetaJuego(game);
          contenedor.appendChild(tarjeta);
        });
      });
    }
    if (contenedorRecomendados) {
      const juegosRecomendados = games.slice(0, 7);

      juegosRecomendados.forEach(game => {
        const tarjeta = crearTarjetaJuego(game);
        contenedorRecomendados.appendChild(tarjeta);
      });
    }

  })
  .catch(error => {
    console.error('Error al obtener los juegos:', error);
  });
function crearTarjetaJuego(game) {
  const tarjeta = document.createElement('article');
  tarjeta.classList.add('juego');

  const esOferta = Math.random() < 0.2;
  const esPago = Math.random() < 0.4;

  if (esOferta || esPago) {
tarjeta.innerHTML = `
  ${esOferta ? '<span class="badge-oferta">OFERTA 30% OFF</span>' : ''}
  <img src="${game.background_image_low_res}" alt="${game.name}">
  <div class="info-card">
      <div class="info-texto">
        <p>${game.name}</p>
        <p class="descripcion-hover">${game.description}</p>
        <span class="likes">🤍 1.5k 🛒 +30k</span>
      </div>
      <div class="info-precio">
        
        <button class="btn-carrito">
          <span class="texto-carrito">Agregar al carrito</span>
          <div class="contenido-agregado">
            <svg class="icono-carrito" viewBox="0 0 24 24">
              <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.89-2-2-2z"/>
            </svg>
          </div>
        </button>

        <span class="precio-actual">$10.000 ARS</span>
        ${esOferta ? '<span class="precio-viejo">$13.000 ARS</span>' : ''}
      </div>
  </div>
`;
    const btnCarrito = tarjeta.querySelector('.btn-carrito');

if (btnCarrito) {
  btnCarrito.addEventListener('click', () => {
    btnCarrito.classList.toggle('activo');
  });
}
  } else {
    tarjeta.innerHTML = `
      <img src="${game.background_image_low_res}" alt="${game.name}">
      <div class="info-card">
          <div class="info-texto">
            <p>${game.name}</p>
            <p class="descripcion-hover">${game.description}</p>
            <span class="likes">🤍 ${game.rating}k</span>
          </div>
            <!-- Botón de acción -->
        <button class="btn-card">
          <span class="texto-jugar">Jugar</span>
          
          <div class="contenido-play">
            <svg class="icono-play" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </button>
          </div>
    `;
      const boton = tarjeta.querySelector('.btn-card');
    
    // 2. Le asignamos el evento antes de retornar
    if (boton) {
      boton.addEventListener('click', () => {
        boton.classList.toggle('activo'); // toggle permite activar y desactivar
      });
    }
  }

  // 3. Finalmente retornamos la tarjeta terminada
  return tarjeta;
  }

 

const imagenes = [
    'assets/img/pegsolitaire (2).jpg',
    'assets/img/images (10).jpg',
    'assets/img/banner-robox.jpeg'
];

let i = 0;

const banner3d = document.querySelector('.banner-3d');
const frente = document.getElementById('banner-frente');
const atras = document.getElementById('banner-atras');
const dots = document.querySelectorAll('.dot');

function cambiarFoto(nuevoIndice, direccion) {

    i = nuevoIndice;

    // La imagen que viene se pone atrás
    atras.src = imagenes[i];

    // Sacamos cualquier animación anterior
    banner3d.classList.remove('girar-derecha', 'girar-izquierda');

    // Forzamos que el navegador reinicie la animación
    void banner3d.offsetWidth;

    // Giramos según la dirección
    if (direccion === 'derecha') {
        banner3d.classList.add('girar-derecha');
    } else {
        banner3d.classList.add('girar-izquierda');
    }

    // Cambiamos el punto
    dots.forEach(dot => dot.classList.remove('activo'));
    dots[i].classList.add('activo');

    // Cuando termina el giro, dejamos la nueva imagen adelante
    setTimeout(() => {
        frente.src = imagenes[i];

        banner3d.classList.remove('girar-derecha', 'girar-izquierda');

        frente.style.transform = 'rotateY(0deg)';
        atras.style.transform = 'rotateY(180deg)';
    }, 800);
}

// SIGUIENTE
document.getElementById('banner-next').addEventListener('click', () => {
    i++;
    if (i >= imagenes.length) {
        i = 0;
    }
    cambiarFoto(i, 'derecha');
});

// ANTERIOR
document.getElementById('banner-prev').addEventListener('click', () => {
    i--;
    if (i < 0) {
        i = imagenes.length - 1;
    }
    cambiarFoto(i, 'izquierda');
});
