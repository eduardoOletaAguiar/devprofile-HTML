const API_BASE_URL = "http://ec2-3-17-67-188.us-east-2.compute.amazonaws.com:3000";

/* ═══════════════════════════════════════
   1. NÚCLEO DE COMUNICACIÓN (FETCH & ERRORS)
═══════════════════════════════════════ */

async function fetchAPI(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body !== null) options.body = JSON.stringify(body);

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
        const result = await response.json();
        
        if (!response.ok) {
            handleError(response.status, result);
            return null;
        }
        return result;
    } catch (error) {
        showErrorCard({
            code: "Error",
            title: "Sin conexión",
            desc: "No se pudo contactar con el servidor AWS. Verifica que PM2 esté corriendo.",
            color: "#cc4747",
            bg: "rgba(204,71,71,0.1)"
        });
        return null;
    }
}

async function actualizarPerfil(username) {
    const btn = document.getElementById("btn-actualizar");
    if (!btn) return;

    btn.disabled = true;
    btn.textContent = "Actualizando...";

    const res = await fetchAPI("/profiles/" + username, 'PUT');

    if (res) {
        // ÉXITO: Go devolvió el JSON del perfil actualizado
        const contenedor = document.getElementById("cuadrocont");
        renderDetalle(res, contenedor);
    } 
}

function handleError(status, result) {
    const msg = result?.error || "Error desconocido";
    const btnAct = document.getElementById("btn-actualizar");

    if (status === 429) {
        // En lugar de mostrar card, bloqueamos el botón directamente
        if (btnAct) {
            let remaining = result?.retry_after_seconds ?? 3600;
            btnAct.disabled = true;
            btnAct.style.cursor = "not-allowed";
            btnAct.style.opacity = "0.6"; // Feedback visual de desactivado
            
            const timer = setInterval(() => {
                remaining--;
                if (remaining <= 0) {
                    clearInterval(timer);
                    btnAct.disabled = false;
                    btnAct.style.cursor = "pointer";
                    btnAct.style.opacity = "1";
                    btnAct.textContent = "Actualizar Datos";
                } else {
                    // Calculamos minutos y segundos para que sea legible
                    const m = Math.floor(remaining / 60);
                    const s = remaining % 60;
                    btnAct.textContent = `Reintentar en ${m}m ${s}s`;
                }
            }, 1000);
        }
        return; // Salimos para que NO se ejecute showErrorCard
    }

    // Los demás errores (404, 500, etc.) siguen usando la tarjeta
    const inputUser = document.getElementById("username")?.value || "usuario";
    if (status === 404) {
        showErrorCard({
            code: "404",
            title: "No encontrado",
            desc: `GitHub no reconoce a <strong>@${inputUser}</strong>. Revisa la ortografía.`,
            color: "#cc8f30",
            bg: "rgba(204,143,48,0.1)"
        });
    } else if (status === 500) {
        const esPokeAPI = msg.includes("pokeapi");
        showErrorCard({
            code: "500",
            title: esPokeAPI ? "Error de Pokémon" : "Error de Servidor",
            desc: esPokeAPI ? "Perfil encontrado, pero falló PokeAPI." : `Error interno: ${msg}`,
            color: "#cc4747",
            bg: "rgba(204,71,71,0.1)"
        });
    } else {
        showErrorCard({
            code: status, title: "Error inesperado", desc: msg, color: "#cc4747", bg: "rgba(204,71,71,0.1)"
        });
    }
}

function showErrorCard({ code, title, desc, color, bg }) {
    const cont = document.getElementById("cuadrocont");
    if (!cont) return;
    cont.innerHTML = `
        <div class="card" style="border: 2px solid ${color}; background: ${bg}; text-align: center; gap: 8px;">
            <span style="font-size:48px; color:${color}; font-weight:bold; text-shadow: 3px 3px 0 rgba(0,0,0,0.3);">${code}</span>
            <p style="font-size:20px; color:#e8eaf2; margin:0;">${title}</p>
            <p style="font-size:14px; color:#8890a8; margin:0; max-width:360px; line-height:1.7;">${desc}</p>
        </div>`;
}

/* ═══════════════════════════════════════
   2. GENERADORES DE INTERFAZ
═══════════════════════════════════════ */

function buildCardHTML(d) {

    return `
        <div class="card" style="text-align: center; gap: 10px;">
            <img src="${d.avatar_url}" onerror="this.src='https://github.com/identicons/${d.github_user}.png'"
                 style="width:80px; height:80px; border-radius:50%; border:2px solid #4792cc;">
            <div>
                <p style="font-size:18px; margin:0;">${d.name || d.github_user}</p>
                <p style="font-size:13px; color:#4792cc; margin:0;">@${d.github_user}</p>
            </div>
            <button class="btn1" onclick="window.location.href='verPerfil.html?user=${d.github_user}'">Ver perfil</button>
        </div>`;
}
function buildRowHTML(d) {
    const idRow = `row-${d.github_user.replace(/\s+/g, '-')}`;
    return `
        <div class="card" id="${idRow}" style="flex-direction: row; display: flex; justify-content: flex-start; align-items: center; width: 768px; padding: 12px 20px; gap: 15px; transition: all 0.3s ease;">
            
            <div style="display: flex; align-items: center; gap: 15px;">
                <img src="${d.avatar_url}" onerror="this.src='https://github.com/identicons/${d.github_user}.png'" 
                     style="width:45px; height:45px; border-radius:50%; border:1px solid #4792cc;">
                <div style="display: flex; flex-direction: column;">
                    <p style="margin:0; font-size:22px; font-weight: bold; line-height: 1.2;">${d.name || d.github_user}</p>
                    <p style="margin:0; font-size:14px; color:#8890a8;">@${d.github_user}</p>
                </div>
            </div>

            <div style="margin-left: auto; display: flex; gap: 10px;" id="actions-${idRow}">
                <button class="btn1" style="width: 100px; font-size: 16px;" onclick="window.location.href='verPerfil.html?user=${d.github_user}'">Entrar</button>
                <button class="btn2" style="width: 100px; font-size: 16px;" onclick="confirmarEliminacion('${d.github_user}', '${idRow}')">Eliminar</button>
            </div>
        </div>`;
}

function buildAuditCard(l) {
    const colores = { CREATE: "#3aab6b", UPDATE: "#4792cc", DELETE: "#cc4747" };
    const descripciones = {
        CREATE: `Nuevo perfil creado para <strong>@${l.resource}</strong>.`,
        UPDATE: `Perfil de <strong>@${l.resource}</strong> actualizado.`,
        DELETE: `Registro de <strong>@${l.resource}</strong> eliminado.`
    };
    return `
        <div class="card" style="border-left: 6px solid ${colores[l.event] || '#000000'}; align-items: flex-start; gap: 8px; width: 768px; margin-bottom: 15px; display: flex; flex-direction: column;">
            <div style="display: flex; justify-content: space-between; width: 100%;">
                <span style="color: ${colores[l.event]}; font-weight: bold; font-size: 25px;">${l.event}</span>
                <span style="color: #000000; font-size: 20px;">${formatFecha(l.timestamp)}</span>
            </div>
            <p style="margin:0; font-size:25px; color: #000000;">${descripciones[l.event] || 'Evento registrado.'}</p>
        </div>`;
}

/* ═══════════════════════════════════════
   3. LÓGICA DE ELIMINACIÓN (TRANSICIÓN A CARD)
═══════════════════════════════════════ */

function confirmarEliminacion(username, rowId) {
    const row = document.getElementById(rowId);
    if (!row) return;

    // Guardamos los datos para poder reconstruir la fila si cancela
    // Buscamos la imagen y el nombre actual antes de borrar
    const currentImg = row.querySelector('img').src;
    const currentName = row.querySelector('p').textContent;

    row.style.opacity = "0";
    
    setTimeout(() => {
        row.style.borderColor = "#cc4747";
        row.style.background = "rgba(204, 71, 71, 0.1)";
        row.style.flexDirection = "column";
        row.style.padding = "20px";
        
        row.innerHTML = `
            <div style="text-align: center; width: 100%;">
                <p style="margin: 0; color: #e8eaf2; font-size: 18px;">¿Eliminar a <strong>@${username}</strong>?</p>
                <p style="margin: 5px 0 15px; color: #8890a8; font-size: 13px;">Esta acción borrará el perfil permanentemente del almacén.</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="btn1" style="background: #cc4747; border: none; width: 120px;" onclick="ejecutarEliminado('${username}', '${rowId}')">Sí, borrar</button>
                    <button class="btn2" style="width: 120px;" onclick="cancelarEliminacion('${username}', '${rowId}', '${currentImg}', '${currentName}')">Cancelar</button>
                </div>
            </div>
        `;
        row.style.opacity = "1";
    }, 200);
}

function cancelarEliminacion(username, rowId, img, name) {
    const row = document.getElementById(rowId);
    if (!row) return;

    row.style.opacity = "0";
    
    setTimeout(() => {
        // Reseteo de estilos para volver a ser barra horizontal
        row.style.borderColor = ""; 
        row.style.background = "";
        row.style.flexDirection = "row";
        row.style.padding = "12px 20px";
        row.style.alignItems = "center";
        row.style.justifyContent = "flex-start";
        row.style.display = "flex";
        
        row.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <img src="${img}" onerror="this.src='https://github.com/identicons/${username}.png'" 
                     style="width:45px; height:45px; border-radius:50%; border:1px solid #4792cc;">
                <div style="display: flex; flex-direction: column;">
                    <p style="margin:0; font-size:22px; font-weight: bold; line-height: 1.2;">${name}</p>
                    <p style="margin:0; font-size:14px; color:#8890a8;">@${username}</p>
                </div>
            </div>

            <div style="margin-left: auto; display: flex; gap: 10px;" id="actions-${rowId}">
                <button class="btn1" style="width: 100px; font-size: 16px;" onclick="window.location.href='verPerfil.html?user=${username}'">Entrar</button>
                <button class="btn2" style="width: 100px; font-size: 16px;" onclick="confirmarEliminacion('${username}', '${rowId}')">Eliminar</button>
            </div>
        `;
        row.style.opacity = "1";
    }, 200);
}

async function ejecutarEliminado(username, rowId) {
    const res = await fetchAPI("/profiles/" + username, 'DELETE');
    if (res) {
        const row = document.getElementById(rowId);
        row.style.transform = "translateX(100px)";
        row.style.opacity = "0";
        setTimeout(() => row.remove(), 300);
    }
}

/* ═══════════════════════════════════════
   4. FUNCIONES DE CARGA Y RENDER
═══════════════════════════════════════ */

async function enviarDatos() {
    const input = document.getElementById("username");
    const nombre = input?.value.trim();
    const cont = document.getElementById("cuadrocont");
    const btn = document.getElementById("submitBtn");
    if (!nombre || !cont) return;

    cont.innerHTML = "<div class='card' style='color:#8890a8;'>Verificando disponibilidad...</div>";
    btn.disabled = true;

    try {
        const existentes = await fetchAPI('/profiles');
        if (existentes && existentes.some(p => p.github_user.toLowerCase() === nombre.toLowerCase())) {
            showErrorCard({
                code: "Aviso",
                title: "Ya registrado",
                desc: `El perfil de <strong>@${nombre}</strong> ya está en el almacén.`,
                color: "#4792cc",
                bg: "#4792cc1a"
            });
            return;
        }

        const res = await fetchAPI('/profiles', 'POST', { username: nombre });
        if (res) {
            cont.innerHTML = buildCardHTML(res);
            input.value = "";
        }
    } finally {
        btn.disabled = false;
        btn.textContent = "Agregar";
    }
}

async function cargarAlmacen() {
    const cont = document.getElementById("cuadrocont");
    if (!cont) return;
    cont.innerHTML = "<p style='color:#8890a8; text-align:center;'>Abriendo archivos...</p>";

    const res = await fetchAPI('/profiles');
    if (!res) return;
    cont.innerHTML = "";
    cont.style.display = "flex";
    cont.style.flexDirection = "column";
    cont.style.gap = "12px";

    res.forEach(d => {
        const wrap = document.createElement("div");
        wrap.innerHTML = buildRowHTML(d);
        cont.appendChild(wrap.firstElementChild);
    });
}

async function cargarAudit() {
    const cont = document.getElementById("cuadrocont");
    if (!cont) return;
    cont.innerHTML = "<p style='color:#8890a8; text-align:center;'>Consultando logs...</p>";

    const res = await fetchAPI('/audit');
    if (!res) return;
    cont.innerHTML = "";
    res.reverse().forEach(l => {
        const wrap = document.createElement("div");
        wrap.innerHTML = buildAuditCard(l);
        cont.appendChild(wrap.firstElementChild);
    });
}

async function cargarDetallePerfil() {
    const cont = document.getElementById("cuadrocont");
    const params = new URLSearchParams(window.location.search);
    const user = params.get("user");
    if (!user || !cont) return;

    cont.innerHTML = "<p style='color:#8890a8; text-align:center;'>Cargando datos detallados...</p>";
    const res = await fetchAPI("/profiles/" + user);
    if (res) renderDetalle(res, cont);
}

function renderDetalle(d, contenedor) {
    const card = document.createElement("div");
    card.className = "card";
    card.style.cssText = "width:460px; gap:10px; display:flex; flex-direction:column; align-items:center;";

    card.innerHTML = `
        <img src="${d.avatar_url}" style="width:120px; height:120px; border-radius:50%; border:3px solid #4792cc;">
        <h2 style="margin:0; font-size:35px;">${d.name || d.github_user}</h2>
        <p style="color:#8890a8; margin:0;">@${d.github_user}</p>
        <p style="font-size:20px; color:#8890a8; text-align:center;">${d.bio || "Sin biografía"}</p>
        <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px; width:100%; text-align:center;">
            <div style="background:#31364b; border-radius:6px; padding:10px; font-size:25px;">${d.followers}<br><small>Seguidores</small></div>
            <div style="background:#31364b; border-radius:6px; padding:10px; font-size:25px;">${d.following}<br><small>Siguiendo</small></div>
            <div style="background:#31364b; border-radius:6px; padding:10px; font-size:25px;">${d.public_repos}<br><small>Repos</small></div>
        </div>
        <div style="background:#31364b; border-radius:6px; padding:12px; width:100%; display:flex; align-items:center; justify-content:space-between;">
            <div style="text-align:left;">
                <p style="margin:0; font-size:25px; color:#8890a8;">Lenguaje: <span style="color:#4792cc;">${d.language}</span></p>
                <p style="margin:0; font-size:25px; color:#8890a8;">Pokémon: <span style="text-transform:capitalize; color:#fff;">${d.pokemon}</span></p>
            </div>
            <img src="${d.pokemon_img}" style="width:150px; height:150px; image-rendering:pixelated;">
        </div>
        
        <div style="width: 100%; display: flex; flex-direction: column; gap: 8px;">
            <button id="btn-actualizar" class="btn1" style="width:100%;">Actualizar Datos</button>
            <button class="btn2" onclick="location.href='almacen.html'" style="width:100%;">Volver al Almacén</button>
        </div>
    `;

    contenedor.innerHTML = "";
    contenedor.appendChild(card);

    // Asignar el evento al botón recién creado
    document.getElementById("btn-actualizar").onclick = () => actualizarPerfil(d.github_user);
}

/* ═══════════════════════════════════════
   5. ROUTER & HELPERS
═══════════════════════════════════════ */

function formatFecha(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

window.onload = function() {
    const path = window.location.pathname;
    const inputBusqueda = document.getElementById("usernamebuscar");
    const inputBusquedaAudit = document.getElementById("buscarAuditBtn");
    if (path.includes("almacen.html")) cargarAlmacen();
    else if (path.includes("audit.html")) cargarAudit();
    else if (path.includes("verPerfil.html")) cargarDetallePerfil();

    inputBusqueda?.addEventListener("input", filtrarPerfiles);
    
    inputBusquedaAudit?.addEventListener("input", filtrarAuditoria);
    
    document.getElementById("auditBtn")?.addEventListener("click", cargarAudit);
    document.getElementById("submitBtn")?.addEventListener("click", enviarDatos);
    document.getElementById("username")?.addEventListener("keydown", (e) => { if(e.key === "Enter") enviarDatos(); });
};

function filtrarPerfiles() {
    const busqueda = document.getElementById("usernamebuscar").value.toLowerCase().trim();
    const contenedor = document.getElementById("cuadrocont");
    const filas = contenedor.querySelectorAll(".card"); // Busca todas las barras/cards

    filas.forEach(fila => {
        const texto = fila.textContent.toLowerCase();
        
        if (texto.includes(busqueda)) {
            fila.style.display = "flex";
        } else {
            fila.style.display = "none";
        }
    });
}

function filtrarAuditoria() {
    const input = document.getElementById("buscarAuditBtn"); 
    if (!input) return;
    
    const busqueda = input.value.toLowerCase().trim();
    const contenedor = document.getElementById("cuadrocont");
    const filas = contenedor.querySelectorAll("#cuadrocont > .card");

    filas.forEach(fila => {
        // Obtenemos todo el texto de la card para una búsqueda global (Evento, Usuario, IP)
        const textoCompleto = fila.textContent.toLowerCase();

        if (textoCompleto.includes(busqueda)) {
            // Al mostrar, solo cambiamos el display. 
            // NO tocamos width ni flexDirection aquí para que use los del estilo original
            fila.style.display = "flex";
        } else {
            fila.style.display = "none";
        }
    });
}