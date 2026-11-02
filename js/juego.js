
document.addEventListener("DOMContentLoaded", () => {
  const botonCompartir = document.querySelector(".icon-pie-game-compartir");
  const menuCompartir = document.getElementById("menu-compartir");
  const botonCerrar = document.getElementById("cerrar");

  menuCompartir.style.display = "none";

  botonCompartir.addEventListener("click", () => {
    menuCompartir.style.display = "flex";
  });

  botonCerrar.addEventListener("click", () => {
    menuCompartir.style.display = "none";
  });

  document.addEventListener("click", (event) => {
    const isClickInsideCompartir = menuCompartir.contains(event.target) || botonCompartir.contains(event.target);
    if (!isClickInsideCompartir) {
      menuCompartir.style.display = "none";
    };
  });

});

document.addEventListener("DOMContentLoaded", () => {
  const botonControles = document.querySelector(".icon-pie-game-controles");
  const menuControles = document.getElementById("menu-controles");
  const botonCerrar = document.getElementById("cerrar-controles");

  menuControles.style.display = "none";

  botonControles.addEventListener("click", () => {
    menuControles.style.display = "flex";
  });

  botonCerrar.addEventListener("click", () => {
    menuControles.style.display = "none";
  });

  document.addEventListener("click", (event) => {
    const isClickInsideControles = menuControles.contains(event.target) || botonControles.contains(event.target);
    if (!isClickInsideControles) {
      menuControles.style.display = "none";
    }
  });

});

document.addEventListener("DOMContentLoaded", () => {
  const botonToggleRespuestas = document.querySelector(".scroll-resp-coment");
  const respuestasComent = document.getElementById("resp-coment-plus");

  respuestasComent.style.display = "none";

  botonToggleRespuestas.addEventListener("click", () => {
    if (respuestasComent.style.display === "none") {
      respuestasComent.style.display = "flex";
    } else {
      respuestasComent.style.display = "none";
    }
  });
})