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
    });

    izquierda.addEventListener("click", () => {
        juegos.scrollBy({
            left: -300,
            behavior: "smooth"
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
            <span class="likes">🤍 1.5k 🛒 +30k</span>
          </div>
          <div class="info-precio">
            <button class="btn-carrito">Agregar al carrito</button>
            <span class="precio-actual">$10.000 ARS</span>
            ${esOferta ? '<span class="precio-viejo">$13.000 ARS</span>' : ''}
          </div>
      </div>
    `;
  } else {
    tarjeta.innerHTML = `
      <img src="${game.background_image_low_res}" alt="${game.name}">
      <div class="info-card">
          <div class="info-texto">
            <p>${game.name}</p>
            <span class="likes">🤍 ${game.rating}k</span>
          </div>
          <button class="btn">Jugar</button>
      </div>
    `;
  }

  return tarjeta;
}
  //banner
const imagenes = [
  'assets/img/pegsolitaire (2).jpg',
  'assets/img/images (10).jpg',
  'assets/img/banner-robox.jpeg' // Reemplaza por el nombre de tu 3ra imagen
];
let i =0;

const imgBanner = document.getElementById('banner-img');
const dots = document.querySelectorAll('.dot');

// 2. Función básica que cambia la foto y pinta el punto activo
function cambiarFoto(nuevoIndice) {
  i = nuevoIndice;
  imgBanner.src = imagenes[i];

  // Despintamos todos los puntos y pintamos solo el actual
  dots.forEach(dot => dot.classList.remove('activo'));
  dots[i].classList.add('activo');
}

// 3. Botón Siguiente
document.getElementById('banner-next').addEventListener('click', () => {
  i++;
  if (i >= imagenes.length) i = 0; // Si pasa de la última, vuelve a la primera
  cambiarFoto(i);
});

// 4. Botón Anterior
document.getElementById('banner-prev').addEventListener('click', () => {
  i--;
  if (i < 0) i = imagenes.length - 1; // Si baja de 0, va a la última
  cambiarFoto(i);
});