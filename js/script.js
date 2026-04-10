let username = document.getElementById("username");
let submitBtn = document.getElementById("submitBtn");
let cuadrocont = document.getElementById("cuadrocont");
let usernamebuscar = document.getElementById("usernamebuscar");
let buscarBtn = document.getElementById("buscarBtn");

var usuarios = [];

submitBtn.addEventListener("click", () => enviarDatos());
buscarBtn.addEventListener("click", () => buscarUsuario());


function enviarDatos() {
    let nombre = username.value.trim();

    if (nombre === "") return;

    let card = document.createElement("div");
    card.classList.add("card");

    let img = document.createElement("img");
    img.src = `https://github.com/${nombre}.png`;

    let p = document.createElement("p");
    p.textContent = nombre;

    let btnAceptar = document.createElement("button");
    btnAceptar.textContent = "Aceptar";
    btnAceptar.classList.add("btn1");
    btnAceptar.addEventListener("click", () => {
        usuarios.push(nombre);
        card.remove();
    });

    let btnCancelar = document.createElement("button");
    btnCancelar.textContent = "Cancelar";
    btnCancelar.classList.add("btn2");
    btnCancelar.addEventListener("click", () => {
        card.remove();
    });

    card.appendChild(img);
    card.appendChild(p);
    card.appendChild(btnAceptar);
    card.appendChild(btnCancelar);

    cuadrocont.appendChild(card);

    username.value = "";
}








function enviarDatos22() {
    let nombre = username.value.trim();

    if (nombre === "") return;

    // Contenedor principal
    let card = document.createElement("div");
    card.classList.add("card");

    // Imagen
    let img = document.createElement("img");
    img.src = `https://github.com/${nombre}.png`;

    // Nombre
    let p = document.createElement("p");
    p.textContent = nombre;

    // Botón Aceptar
    let btnAceptar = document.createElement("button");
    btnAceptar.textContent = "Aceptar";
    btnAceptar.classList.add("btn1");
    btnAceptar.addEventListener("click", () => {
        usuarios.push(nombre);
        card.remove();
    });


    // Botón Cancelar
    let btnCancelar = document.createElement("button");
    btnCancelar.textContent = "Cancelar";
    btnCancelar.classList.add("btn2");
    btnCancelar.addEventListener("click", () => {
        card.remove();
    });

    // Armar la card
    card.appendChild(img);
    card.appendChild(p);
    card.appendChild(btnAceptar);
    card.appendChild(btnCancelar);

    cuadrocont.appendChild(card);

    username.value = "";
}