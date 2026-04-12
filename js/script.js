const API_BASE_URL = "http://ec2-3-17-67-188.us-east-2.compute.amazonaws.com:3000";

/* ═══════════════════════════════════════
   FETCH GENÉRICO
   El backend Go responde así:
   - Éxito: el objeto directo (sin wrapper success/data)
   - Error: { "error": "mensaje" }
   - 429:   { "error": "too_soon", "retry_after_seconds": N }
═══════════════════════════════════════ */
async function fetchAPI(endpoint, method = 'GET', body = null) {
    const options = {
        method,
        headers: { 
            'Content-Type': 'application/json'
            // No añadas más headers por ahora para evitar problemas de CORS
        }
    };

    if (body !== null) {
    // Si mandamos { username: nombre }, esto lo convierte en '{"username":"nombre"}'
        options.body = JSON.stringify(body);
    }

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
            code: "Sin conexión",
            title: "Servidor no responde",
            desc: "El servidor AWS no está disponible. Verifica que PM2 esté corriendo y que el Security Group permita el puerto 8080.",
            color: "#cc4747",
            bg: "rgba(204,71,71,0.1)"
        });
        return null;
    }
}

/* ═══════════════════════════════════════
   MANEJO DE ERRORES
   Go manda: { "error": "mensaje" }
   429 manda: { "error": "too_soon", "retry_after_seconds": N }
═══════════════════════════════════════ */
function handleError(status, result) {
    const msg = result?.error || "Error desconocido";

    if (status === 400) {
        showErrorCard({
            code: "400",
            title: "Datos inválidos",
            desc: msg,
            color: "#cc8f30",
            bg: "rgba(204,143,48,0.1)"
        });

    } else if (status === 404) {
        showErrorCard({
            code: "404",
            title: "No encontrado",
            desc: msg,
            color: "#4792cc",
            bg: "rgba(71,146,204,0.1)"
        });

    } else if (status === 429) {
        // Go manda { "error": "too_soon", "retry_after_seconds": N }
        const secs = result?.retry_after_seconds ?? "?";
        const mins = Math.ceil(secs / 60);
        showErrorCard({
            code: "429",
            title: "Demasiado pronto",
            desc: "Este perfil fue actualizado hace poco.<br>Reintenta en <strong>" + mins + " min</strong> (" + secs + "s restantes).",
            color: "#8890a8",
            bg: "rgba(136,144,168,0.1)"
        });

    } else if (status === 500) {
        showErrorCard({
            code: "500",
            title: "Error del servidor",
            desc: msg,
            color: "#cc4747",
            bg: "rgba(204,71,71,0.1)"
        });
    }
}

function showErrorCard({ emoji, code, title, desc, color, bg }) {
    const cont = document.getElementById("cuadrocont");
    if (!cont) return;
    const card = document.createElement("div");
    card.className = "card";
    card.style.cssText = "border: 2px solid " + color + "; background: " + bg + "; gap: 8px; align-items: center; text-align: center;";
    card.innerHTML =
        "<span style='font-size:48px; color:" + color + "; text-shadow: 3px 3px 0 rgba(0,0,0,0.3);'>" + code + "</span>" +
        "<p style='font-size:20px; color:#e8eaf2; margin:0;'>" + title + "</p>" +
        "<p style='font-size:14px; color:#8890a8; margin:0; max-width:360px; line-height:1.7;'>" + desc + "</p>";
    cont.innerHTML = "";
    cont.appendChild(card);
}

/* ═══════════════════════════════════════
   INDEX.HTML — POST DIRECTO A LA API
   Go decodifica el body como string puro:
   json.NewDecoder(r.Body).Decode(&username)
   → hay que mandar "torvalds" no {"username":"torvalds"}
═══════════════════════════════════════ */
async function enviarDatos() {
    const usernameInput = document.getElementById("username");
    const nombre = usernameInput?.value.trim();
    const cuadrocont = document.getElementById("cuadrocont");
    const submitBtn = document.getElementById("submitBtn");

    if (!nombre || !cuadrocont) return;

    cuadrocont.innerHTML = "";
    const loading = document.createElement("div");
    loading.className = "card";
    loading.style.cssText = "color:#8890a8; font-size:16px; align-items:center;";
    loading.textContent = "Buscando en GitHub...";
    cuadrocont.appendChild(loading);
    submitBtn.disabled = true;
    submitBtn.textContent = "...";

    // Go espera el username como JSON string puro: "torvalds"
    const res = await fetchAPI('/profiles', 'POST', { username: nombre });

    submitBtn.disabled = false;
    submitBtn.textContent = "Agregar";

    if (!res) return; // handleError ya mostró la card de error

    // Go responde con el Profile directo (sin wrapper)
    // { id, github_user, name, avatar_url, bio, followers, ... }
    cuadrocont.innerHTML = buildCardHTML(res, false);
    cuadrocont.querySelector("#btn-ver").addEventListener("click", function() {
        window.location.href = "verPerfil.html?user=" + res.github_user;
    });

    usernameInput.value = "";
}

/* ═══════════════════════════════════════
   ALMACEN.HTML — LISTAR Y BUSCAR
   Go responde con array directo: [{...}, {...}]
═══════════════════════════════════════ */
async function cargarAlmacen() {
    const contenedor = document.getElementById("cuadrocont");
    if (!contenedor) return;

    contenedor.innerHTML = "<p style='color:#8890a8; text-align:center; padding:20px;'>Cargando perfiles...</p>";

    const res = await fetchAPI('/profiles');
    if (!res) return;

    // Go devuelve array directo, no { success, data: [] }
    const perfiles = Array.isArray(res) ? res : [];

    if (!perfiles.length) {
        contenedor.innerHTML = "<p style='color:#8890a8; text-align:center; padding:20px;'>No hay perfiles guardados aún.</p>";
        return;
    }

    contenedor.innerHTML = "";
    perfiles.forEach(function(d) {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = buildCardHTML(d, true);
        const card = wrapper.firstElementChild;

        card.querySelector("#btn-ver").addEventListener("click", function() {
            window.location.href = "verPerfil.html?user=" + d.github_user;
        });
        card.querySelector("#btn-eliminar").addEventListener("click", function() {
            eliminarPerfil(d.github_user);
        });

        contenedor.appendChild(card);
    });
}

function buscarUsuario() {
    const val = document.getElementById("usernamebuscar")?.value.trim();
    if (val) window.location.href = "verPerfil.html?user=" + encodeURIComponent(val);
}

/* ═══════════════════════════════════════
   VERPERFIL.HTML — DETALLE COMPLETO
   Go responde con el Profile directo
═══════════════════════════════════════ */
async function cargarDetallePerfil() {
    const contenedor = document.getElementById("cuadrocont");
    const params = new URLSearchParams(window.location.search);
    const username = params.get("user");

    if (!username || !contenedor) return;

    contenedor.innerHTML = "<p style='color:#8890a8; text-align:center; padding:20px;'>Cargando perfil...</p>";

    const res = await fetchAPI("/profiles/" + username);
    if (!res) return;

    renderDetalle(res, contenedor);
}

function renderDetalle(d, contenedor) {
    const card = document.createElement("div");
    card.className = "card";
    card.style.cssText = "width:460px; gap:10px; display:flex; flex-direction:column; align-items:center;";

    card.innerHTML =
        "<img src='" + (d.avatar_url || "https://github.com/identicons/" + d.github_user + ".png") + "'" +
        "     alt='Avatar' style='width:120px; height:120px; border-radius:50%; border:3px solid #4792cc;'" +
        "     onerror=\"this.src='https://github.com/identicons/" + d.github_user + ".png'\">" +
        "<h2 style='font-size:26px; margin:0;'>" + (d.name || d.github_user) + "</h2>" +
        "<p style='color:#8890a8; font-size:14px; margin:0;'>@" + d.github_user + "</p>" +
        "<p style='font-size:14px; color:#c8cadc; text-align:center; max-width:380px;'>" + (d.bio || "Sin biografía") + "</p>" +

        "<div style='display:grid; grid-template-columns:repeat(3,1fr); gap:8px; width:100%; text-align:center;'>" +
            "<div style='background:#31364b; border-radius:6px; padding:10px;'>" +
                "<div style='font-size:22px;'>" + d.followers + "</div>" +
                "<div style='font-size:11px; color:#8890a8;'>Seguidores</div>" +
            "</div>" +
            "<div style='background:#31364b; border-radius:6px; padding:10px;'>" +
                "<div style='font-size:22px;'>" + d.following + "</div>" +
                "<div style='font-size:11px; color:#8890a8;'>Siguiendo</div>" +
            "</div>" +
            "<div style='background:#31364b; border-radius:6px; padding:10px;'>" +
                "<div style='font-size:22px;'>" + d.public_repos + "</div>" +
                "<div style='font-size:11px; color:#8890a8;'>Repos</div>" +
            "</div>" +
        "</div>" +

        "<div style='background:#31364b; border-radius:6px; padding:12px; width:100%; display:flex; align-items:center; justify-content:space-between;'>" +
            "<div>" +
                "<p style='margin:0; font-size:13px; color:#8890a8;'>Lenguaje principal</p>" +
                "<p style='margin:0; font-size:18px; color:#4792cc;'>" + (d.language || "N/A") + "</p>" +
                "<p style='margin:4px 0 0; font-size:13px; color:#8890a8;'>Pokémon asignado</p>" +
                "<p style='margin:0; font-size:18px; text-transform:capitalize;'>" + (d.pokemon || "—") + "</p>" +
            "</div>" +
            "<img src='" + (d.pokemon_img || "") + "' alt='" + (d.pokemon || "") + "'" +
            "     style='width:80px; height:80px; image-rendering:pixelated;'" +
            "     onerror=\"this.style.display='none'\">" +
        "</div>" +

        "<div style='width:100%; font-size:12px; color:#8890a8; display:flex; justify-content:space-between; padding:0 4px;'>" +
            "<span>Creado: " + formatFecha(d.created_at) + "</span>" +
            "<span>Actualizado: " + formatFecha(d.updated_at) + "</span>" +
        "</div>" +

        "<div style='display:grid; gap:8px; width:100%;'>" +
            "<button class='btn1' id='btn-actualizar'>Actualizar Datos (TTL 1h)</button>" +
            "<button class='btn2' id='btn-eliminar'>Eliminar Perfil</button>" +
            "<button class='btn2' onclick=\"location.href='almacen.html'\" style='background:#3a3f52; border-color:#555a6f;'>← Volver al Almacén</button>" +
        "</div>";

    contenedor.innerHTML = "";
    contenedor.appendChild(card);

    card.querySelector("#btn-actualizar").addEventListener("click", function() { actualizarPerfil(d.github_user); });
    card.querySelector("#btn-eliminar").addEventListener("click", function() { eliminarPerfil(d.github_user); });
}

async function actualizarPerfil(username) {
    const btn = document.getElementById("btn-actualizar");
    if (btn) { btn.textContent = "Actualizando..."; btn.disabled = true; }

    // PUT no lleva body
    const res = await fetchAPI("/profiles/" + username, 'PUT');

    if (res) {
        const contenedor = document.getElementById("cuadrocont");
        renderDetalle(res, contenedor);
        const fb = document.createElement("p");
        fb.textContent = "✔ Datos actualizados correctamente";
        fb.style.cssText = "color:#3aab6b; text-align:center; font-size:14px; margin-top:8px;";
        contenedor.querySelector(".card").appendChild(fb);
        setTimeout(function() { fb.remove(); }, 3000);
    }
}

async function eliminarPerfil(username) {
    if (!confirm("¿Eliminar el perfil de " + username + "? Esta acción no se puede deshacer.")) return;

    const res = await fetchAPI("/profiles/" + username, 'DELETE');
    if (res) {
        // Go responde: { "message": "profile deleted successfully" }
        alert(res.message || "Perfil eliminado correctamente.");
        window.location.href = 'almacen.html';
    }
}

/* ═══════════════════════════════════════
   AUDIT LOG
═══════════════════════════════════════ */
async function cargarAudit() {
    const contenedor = document.getElementById("cuadrocont");
    if (!contenedor) return;

    contenedor.innerHTML = "<p style='color:#8890a8; text-align:center; padding:20px;'>Cargando auditoría...</p>";

    const res = await fetchAPI('/audit');
    if (!res) return;

    const logs = Array.isArray(res) ? res : [];

    if (!logs.length) {
        contenedor.innerHTML = "<p style='color:#8890a8; text-align:center; padding:20px;'>Sin movimientos registrados aún.</p>";
        return;
    }

    const colores = { CREATE: "#3aab6b", UPDATE: "#4792cc", DELETE: "#cc4747" };

    contenedor.innerHTML = "";
    logs.forEach(function(l) {
        const color = colores[l.event] || "#8890a8";
        const card = document.createElement("div");
        card.className = "card";
        card.style.cssText = "flex-direction:row; justify-content:space-between; align-items:center; gap:12px; padding:12px 16px;";
        card.innerHTML =
            "<span style='font-size:14px; font-weight:bold; color:" + color + "; min-width:64px;'>" + l.event + "</span>" +
            "<span style='font-size:16px; flex:1;'>@" + l.resource + "</span>" +
            "<span style='font-size:12px; color:#8890a8; font-family:monospace;'>" + l.author_ip + "</span>" +
            "<span style='font-size:12px; color:#8890a8; min-width:140px; text-align:right;'>" + formatFecha(l.timestamp) + "</span>";
        contenedor.appendChild(card);
    });
}

/* ═══════════════════════════════════════
   HELPERS
═══════════════════════════════════════ */
function buildCardHTML(d, conEliminar) {
    const elimBtn = conEliminar ? "<button class='btn2' id='btn-eliminar'>Eliminar</button>" : "";
    return "<div class='card'>" +
        "<img src='" + (d.avatar_url || "https://github.com/identicons/" + d.github_user + ".png") + "'" +
        "     alt='" + d.github_user + "'" +
        "     onerror=\"this.src='https://github.com/identicons/" + d.github_user + ".png'\"" +
        "     style='width:80px; height:80px; border-radius:50%; border:2px solid #4792cc;'>" +
        "<p style='font-size:20px; margin:4px 0;'>" + (d.name || d.github_user) + "</p>" +
        "<p style='font-size:13px; color:#4792cc; margin:0;'>@" + d.github_user + "</p>" +
        "<small style='color:#8890a8; text-transform:capitalize;'>Pokémon: " + (d.pokemon || "—") + "</small>" +
        "<small style='color:#8890a8;'>Lenguaje: " + (d.language || "N/A") + "</small>" +
        "<div style='display:flex; gap:8px; justify-content:center; margin-top:8px; flex-wrap:wrap;'>" +
            "<button class='btn1' id='btn-ver'>Ver perfil</button>" +
            elimBtn +
        "</div>" +
        "</div>";
}

function formatFecha(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}

/* ═══════════════════════════════════════
   ROUTER
═══════════════════════════════════════ */
window.onload = function() {
    const path = window.location.pathname;

    if (path.includes("almacen.html")) {
        cargarAlmacen();
    } else if (path.includes("verPerfil.html") || path.includes("verperfil.html")) {
        cargarDetallePerfil();
    } else if (path.includes("audit.html")) {
        cargarAudit();
    }

    document.getElementById("submitBtn")
        ?.addEventListener("click", enviarDatos);

    document.getElementById("username")
        ?.addEventListener("keydown", function(e) { if (e.key === "Enter") enviarDatos(); });

    document.getElementById("buscarBtn")
        ?.addEventListener("click", buscarUsuario);

    document.getElementById("usernamebuscar")
        ?.addEventListener("keydown", function(e) { if (e.key === "Enter") buscarUsuario(); });
};