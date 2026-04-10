let username = document.getElementById("username");
let submitBtn = document.getElementById("submitBtn");
let cuadrocont = document.getElementById("cuadrocont");
let usernamebuscar = document.getElementById("usernamebuscar");
let buscarBtn = document.getElementById("buscarBtn");
let verBtn =document.getElementById("VerBtn");

var usuarios = [];

submitBtn.addEventListener("click", () => enviarDatos());
verBtn.addEventListener("click", () => ordenar());
buscarBtn.addEventListener("click", () => buscarUsuario());

function ordenar(){
    for(let usuarios=0; usuarios=!"";usuarios++){
        let card = document.createElement("div");
        card.classList.add("card");

        let img = document.createElement("img");
        img.src = `https://github.com/${nombre}.png`;

        let p = document.createElement("p");
        p.textContent = nombre;


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

    }
}

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
        location.href = 'verPerfil.html';
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








function buscarUsuario() {
   
}