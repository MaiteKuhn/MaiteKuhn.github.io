//Loader inicio
const barra = document.querySelector(".barra-carga");
const porcentaje = document.querySelector(".porcentaje");

let progreso = 0;

const carga = setInterval(() => { //para saber qué intervalo cancelar

    progreso++;

    barra.style.width = progreso + "%"; //la barra se va llenando visualmente.
    porcentaje.textContent = progreso + "%"; //Actualiza el texto para mostrar el número actual del porc

    if (progreso >= 100) {
        clearInterval(carga);
    }

}, 50);

//Movimiento carruseles
const carruseles = document.querySelectorAll(".carrusel");

    carruseles.forEach(carrusel => {
    const juegos = carrusel.querySelector(".juegos");
    const izquierda = carrusel.querySelector(".izquierda");
    const derecha = carrusel.querySelector(".derecha");

    function mover(distancia) {
        juegos.scrollBy({ left: distancia, 
                          behavior: "smooth" //no movimiento brusco 
        });

        juegos.querySelectorAll(".juego").forEach(card => {
            card.classList.remove("rebotando");
            void card.offsetWidth;
            card.classList.add("rebotando");
        });
    }
    derecha.addEventListener("click", () => mover(300));
    izquierda.addEventListener("click", () => mover(-300));
});

//Menu
const menuBtn = document.querySelector(".menu-btn");
const menu = document.querySelector(".menu");

menuBtn.addEventListener("click", () => {
    menu.classList.toggle("menu-abierto"); 
});

//Subcategorias
const btnCategorias = document.querySelector(".btn-categorias");
const submenu = document.querySelector(".submenu");

btnCategorias.addEventListener("click", (event) => {
    event.preventDefault(); //Cancela el comportamiento por defecto del elemento, asi solo cierra y abre
    submenu.classList.toggle("submenu-abierto");
});


//API 

const contenedores = document.querySelectorAll('.carrusel .juegos');
const contenedorRecomendados = document.querySelector('.juegos-recomendados .juegos');

fetch('https://vj.interfaces.jima.com.ar/api/v2') //hace una petición a la URL y devuelve una promesa
  .then(response => response.json())              // convierte a JSON, obtiene array objetos
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
    if (contenedorRecomendados) { //evita errores en páginas que no tienen esta sección
      const juegosRecomendados = games.slice(0, 7);

      juegosRecomendados.forEach(game => {
        const tarjeta = crearTarjetaJuego(game);
        contenedorRecomendados.appendChild(tarjeta);
      });
    }

  })
  .catch(error => {
    console.error('Error al obtener los juegos:', error);
  });function crearTarjetaJuego(game) {
  const tarjeta = document.createElement('article');
  tarjeta.classList.add('juego');

  const esOferta = Math.random() < 0.2;
  const esPago = Math.random() < 0.4;

  // HTML base adaptable a Desktop y Mobile
  if (esOferta || esPago) {
    tarjeta.classList.add('es-pago');
    tarjeta.innerHTML = `
      ${esOferta ? '<span class="Insignia-oferta">OFERTA 30% OFF</span>' : ''}
      
      <!-- Contenedor de Imagen + Insignia Flotante para Mobile -->
      <div class="icon-container">
        <img src="${game.background_image_low_res}" alt="${game.name}">
        <div class="Insignia-pago">
          <svg viewBox="0 0 24 24">
            <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.89-2-2-2z"/>
          </svg>
        </div>
      </div>

      <!-- Título exclusivo para Mobile (debajo de la foto) -->
      <p class="titulo-mobile">${game.name}</p>

      <!-- Panel extendido para Desktop -->
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

    tarjeta.querySelector('.btn-carrito')?.addEventListener('click', (e) => {
      e.currentTarget.classList.toggle('activo');
    });

  } else {
    tarjeta.classList.add('es-gratis');
    tarjeta.innerHTML = `
      <!-- Contenedor de Imagen para Mobile -->
      <div class="icon-container">
        <img src="${game.background_image_low_res}" alt="${game.name}">
      </div>

      <!-- Título exclusivo para Mobile (debajo de la foto) -->
      <p class="titulo-mobile">${game.name}</p>

      <!-- Panel extendido para Desktop -->
      <div class="info-card">
        <div class="info-texto">
          <p>${game.name}</p>
          <p class="descripcion-hover">${game.description}</p>
          <span class="likes">🤍 ${game.rating}k</span>
        </div>
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

    tarjeta.querySelector('.btn-card')?.addEventListener('click', (e) => {
      e.currentTarget.classList.toggle('activo');
    });
  }

  return tarjeta;
}
const imagenes = [
    'assets/img/pegsolitaire (2).jpg',
    'assets/img/images (10).jpg',
    'assets/img/banner-robox.jpeg'
];

let i = 0;


//Banner home
const banner3d = document.querySelector('.banner-3d');
const frente = document.getElementById('banner-frente');
const atras = document.getElementById('banner-atras');
const puntos = document.querySelectorAll('.punto');

function cambiarFoto(nuevoIndice, direccion) {

    i = nuevoIndice;
    atras.src = imagenes[i]; // La imagen que viene se pone atrás
    banner3d.classList.remove('girar-derecha', 'girar-izquierda');   // Sacamos cualquier animación anterior
    void banner3d.offsetWidth;  // Forzamos que reinicie la animación

    if (direccion === 'derecha') {
        banner3d.classList.add('girar-derecha');
    } else {
        banner3d.classList.add('girar-izquierda');
    }

    // Cambiamos el punto
    puntos.forEach(punto => punto.classList.remove('activo'));
    puntos[i].classList.add('activo');

    setTimeout(() => {    //ejecuta el código una sola vez
        frente.src = imagenes[i];  //img nueva a la cara de adelante
        banner3d.classList.remove('girar-derecha', 'girar-izquierda');
        frente.style.transform = 'rotateY(0deg)';  //reinician las rotaciones de ambas caras
        atras.style.transform = 'rotateY(180deg)';
    }, 800);
}

document.getElementById('banner-next').addEventListener('click', () => {
    i++;
    if (i >= imagenes.length) {
        i = 0;
    }
    cambiarFoto(i, 'derecha');
});

document.getElementById('banner-prev').addEventListener('click', () => {
    i--;
    if (i < 0) {
        i = imagenes.length - 1;
    }
    cambiarFoto(i, 'izquierda');
});
document.addEventListener('DOMContentLoaded', () => {
  const menuBtn = document.querySelector('.menu-btn');
  const menu = document.querySelector('.menu');
  const superposicion = document.querySelector('.superposicion');
  const submenu = document.querySelector('.submenu');
  // Función para cerrar el menú lateral y superposicion
  const cerrarMenu = () => {
    menu?.classList.remove('active', 'menu-abierto');
    superposicion?.classList.remove('active');
    document.querySelectorAll('.desplegable-item').forEach(item => item.classList.remove('active'));
  };
  // Abrir / Cerrar Menú Hamburguesa
  menuBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const activo = menu.classList.toggle('active');
    menu.classList.toggle('menu-abierto', activo);
    superposicion?.classList.toggle('active', activo);
  });
  // Cerrar al hacer click en el superposicion
  superposicion?.addEventListener('click', cerrarMenu);
  // Escuchador global para categorías, enlaces y desplegable
  document.addEventListener('click', (e) => {
    // 1. Alternar Submenú Categorías
    if (e.target.closest('.btn-categorias')) {
      e.preventDefault();
      submenu?.classList.toggle('submenu-abierto');
      return;
    }
    // 2. Clic en botones de acción / Perfil de usuario (Mobile)
    const navBtn = e.target.closest('.nav-btn');
    if (navBtn) {
      e.stopPropagation();
      const parent = navBtn.closest('.desplegable-item');
      if (parent) {
        const estadoActual = parent.classList.contains('active');
        document.querySelectorAll('.desplegable-item').forEach(item => item.classList.remove('active'));
        parent.classList.toggle('active', !estadoActual);
      }
      return;
    }
    // 3. Cerrar el menú si se toca un enlace navegación estándar
    if (e.target.closest('.menu a:not(.btn-categorias)')) {
      cerrarMenu();
      return;
    }
    // 4. Clic fuera de los desplegable para cerrarlos
    if (!e.target.closest('.desplegable-item')) {
      document.querySelectorAll('.desplegable-item').forEach(item => item.classList.remove('active'));
    }
  });
});