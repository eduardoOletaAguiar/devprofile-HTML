const API_BASE_URL = "http://ec2-3-17-67-188.us-east-2.compute.amazonaws.com:3000";

/* ═══════════════════════════════════════
    SECTION 1: CORE COMMUNICATION
═══════════════════════════════════════ */

async function coreFetch(endpoint, method = 'GET', body = null) {
    const config = {
        method,
        headers: { 'Content-Type': 'application/json' }
    };
    if (body) config.body = JSON.stringify(body);

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();
        
        if (!response.ok) {
            coreErrorHandler(response.status, data);
            return null;
        }
        return data;
    } catch (err) {
        uiRenderError({
            code: "Error",
            title: "Sin conexión",
            desc: "No se pudo contactar con el servidor AWS. Verifica que PM2 esté corriendo.",
            color: "#cc4747",
            bg: "rgba(204,71,71,0.1)"
        });
        return null;
    }
}

function coreErrorHandler(status, data) {
    const errorMsg = data?.error || "Error desconocido";
    const btnRef = document.getElementById("btn-actualizar");

    if (status === 429) {
        if (btnRef) {
            let cooldown = data?.retry_after_seconds ?? 3600;
            btnRef.disabled = true;
            btnRef.style.cursor = "not-allowed";
            btnRef.style.opacity = "0.6";
            
            const clock = setInterval(() => {
                cooldown--;
                if (cooldown <= 0) {
                    clearInterval(clock);
                    btnRef.disabled = false;
                    btnRef.style.cursor = "pointer";
                    btnRef.style.opacity = "1";
                    btnRef.textContent = "Actualizar Datos";
                } else {
                    const mins = Math.floor(cooldown / 60);
                    const secs = cooldown % 60;
                    btnRef.textContent = `Reintentar en ${mins}m ${secs}s`;
                }
            }, 1000);
        }
        return;
    }

    const userRef = document.getElementById("username")?.value || "usuario";
    if (status === 404) {
        uiRenderError({
            code: "404",
            title: "No encontrado",
            desc: `GitHub no reconoce a <strong>@${userRef}</strong>. Revisa la ortografía.`,
            color: "#cc8f30",
            bg: "rgba(204,143,48,0.1)"
        });
    } else if (status === 500) {
        const isPokeErr = errorMsg.includes("pokeapi");
        uiRenderError({
            code: "500",
            title: isPokeErr ? "Error de Pokémon" : "Error de Servidor",
            desc: isPokeErr ? "Perfil encontrado, pero falló PokeAPI." : `Error interno: ${errorMsg}`,
            color: "#cc4747",
            bg: "rgba(204,71,71,0.1)"
        });
    } else {
        uiRenderError({
            code: status, title: "Error inesperado", desc: errorMsg, color: "#cc4747", bg: "rgba(204,71,71,0.1)"
        });
    }
}

/* ═══════════════════════════════════════
    SECTION 2: UI RENDERING
═══════════════════════════════════════ */

function uiRenderError({ code, title, desc, color, bg }) {
    const view = document.getElementById("cuadrocont");
    if (!view) return;
    view.innerHTML = `
        <div class="card" style="border: 2px solid ${color}; background: ${bg}; text-align: center; gap: 8px;">
            <span style="font-size:48px; color:${color}; font-weight:bold; text-shadow: 3px 3px 0 rgba(0,0,0,0.3);">${code}</span>
            <p style="font-size:20px; color:#e8eaf2; margin:0;">${title}</p>
            <p style="font-size:14px; color:#8890a8; margin:0; max-width:360px; line-height:1.7;">${desc}</p>
        </div>`;
}

function uiBuildPreviewHTML(d) {
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

function uiBuildRowHTML(d) {
    const rowId = `row-${d.github_user.replace(/\s+/g, '-')}`;
    return `
        <div class="card" id="${rowId}" style="flex-direction: row; display: flex; justify-content: flex-start; align-items: center; width: 768px; padding: 12px 20px; gap: 15px; transition: all 0.3s ease;">
            <div style="display: flex; align-items: center; gap: 15px;">
                <img src="${d.avatar_url}" onerror="this.src='https://github.com/identicons/${d.github_user}.png'" 
                     style="width:45px; height:45px; border-radius:50%; border:1px solid #4792cc;">
                <div style="display: flex; flex-direction: column;">
                    <p style="margin:0; font-size:22px; font-weight: bold; line-height: 1.2;">${d.name || d.github_user}</p>
                    <p style="margin:0; font-size:14px; color:#8890a8;">@${d.github_user}</p>
                </div>
            </div>
            <div style="margin-left: auto; display: flex; gap: 10px;" id="actions-${rowId}">
                <button class="btn1" style="width: 100px; font-size: 16px;" onclick="window.location.href='verPerfil.html?user=${d.github_user}'">Entrar</button>
                <button class="btn2" style="width: 100px; font-size: 16px;" onclick="logicConfirmDelete('${d.github_user}', '${rowId}')">Eliminar</button>
            </div>
        </div>`;
}

function uiBuildAuditHTML(l) {
    const typeColor = { CREATE: "#3aab6b", UPDATE: "#4792cc", DELETE: "#cc4747" };
    const typeLabel = {
        CREATE: `Nuevo perfil creado para <strong>@${l.resource}</strong>.`,
        UPDATE: `Perfil de <strong>@${l.resource}</strong> actualizado.`,
        DELETE: `Registro de <strong>@${l.resource}</strong> eliminado.`
    };
    return `
        <div class="card" style="border-left: 6px solid ${typeColor[l.event] || '#000000'}; align-items: flex-start; gap: 8px; width: 768px; margin-bottom: 15px; display: flex; flex-direction: column;">
            <div style="display: flex; justify-content: space-between; width: 100%;">
                <span style="color: ${typeColor[l.event]}; font-weight: bold; font-size: 25px;">${l.event}</span>
                <span style="color: #000000; font-size: 20px;">${logicFormatDate(l.timestamp)}</span>
            </div>
            <p style="margin:0; font-size:25px; color: #000000;">${typeLabel[l.event] || 'Evento registrado.'}</p>
        </div>`;
}

function uiRenderDetail(d, view) {
    const frame = document.createElement("div");
    frame.className = "card";
    frame.style.cssText = "width:752px; gap:30px; display:flex; flex-direction:row; align-items:center; padding:30px;";

    frame.innerHTML = `
        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; padding-right: 20px;">
            <img src="${d.avatar_url}" style="width:140px; height:140px; border-radius:50%; border:3px solid #4792cc; margin-bottom:15px;">
            <h2 style="margin:0; font-size:35px; text-align:center;">${d.name || d.github_user}</h2>
            <p style="color:#8890a8; margin:0; font-size:18px;">@${d.github_user}</p>
            <p style="font-size:18px; color:#8890a8; text-align:center; margin-top:15px; line-height:1.4;">${d.bio || "Sin biografía"}</p>
        </div>
        <div style="flex: 1.5; display: flex; flex-direction: column; gap: 20px;">
            <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:12px; width:100%; text-align:center;">
                <div style="background:#31364b; border-radius:6px; padding:15px; font-size:22px;">${d.followers}<br><small style="font-size:14px; color:#8890a8;">Seguidores</small></div>
                <div style="background:#31364b; border-radius:6px; padding:15px; font-size:22px;">${d.following}<br><small style="font-size:14px; color:#8890a8;">Siguiendo</small></div>
                <div style="background:#31364b; border-radius:6px; padding:15px; font-size:22px;">${d.public_repos}<br><small style="font-size:14px; color:#8890a8;">Repos</small></div>
            </div>
            <div style="background:#31364b; border-radius:6px; padding:15px; display:flex; align-items:center; justify-content:space-between;">
                <div style="text-align:left;">
                    <p style="margin:0; font-size:20px; color:#8890a8;">Lenguaje: <span style="color:#4792cc; font-weight:bold;">${d.language}</span></p>
                    <p style="margin:5px 0 0; font-size:20px; color:#8890a8;">Pokémon: <span style="text-transform:capitalize; color:#fff; font-weight:bold;">${d.pokemon}</span></p>
                </div>
                <img src="${d.pokemon_img}" style="width:120px; height:120px; image-rendering:pixelated;">
            </div>
            <div style="width: 100%; display: flex; flex-direction: column; gap: 10px; margin-top:10px;">
                <button id="btn-actualizar" class="btn1" style="width:100%; height:45px; font-size:18px;">Actualizar Datos</button>
            </div>
        </div>`;

    view.innerHTML = "";
    view.appendChild(frame);
    document.getElementById("btn-actualizar").onclick = () => logicUpdateProfile(d.github_user);
}

/* ═══════════════════════════════════════
    SECTION 3: LOGIC & EVENTS
═══════════════════════════════════════ */

async function logicUpdateProfile(user) {
    const btn = document.getElementById("btn-actualizar");
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = "Actualizando...";

    const res = await coreFetch("/profiles/" + user, 'PUT');
    if (res) uiRenderDetail(res, document.getElementById("cuadrocont"));
}

function logicConfirmDelete(user, rowId) {
    const target = document.getElementById(rowId);
    if (!target) return;
    const cacheImg = target.querySelector('img').src;
    const cacheName = target.querySelector('p').textContent;
    target.style.opacity = "0";
    
    setTimeout(() => {
        target.style.borderColor = "#cc4747";
        target.style.background = "rgba(204, 71, 71, 0.1)";
        target.style.flexDirection = "column";
        target.style.padding = "20px";
        target.innerHTML = `
            <div style="text-align: center; width: 100%;">
                <p style="margin: 0; color: #e8eaf2; font-size: 18px;">¿Eliminar a <strong>@${user}</strong>?</p>
                <p style="margin: 5px 0 15px; color: #8890a8; font-size: 13px;">Esta acción borrará el perfil permanentemente del almacén.</p>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button class="btn1" style="background: #cc4747; border: none; width: 120px;" onclick="logicExecuteDelete('${user}', '${rowId}')">Sí, borrar</button>
                    <button class="btn2" style="width: 120px;" onclick="logicCancelDelete('${user}', '${rowId}', '${cacheImg}', '${cacheName}')">Cancelar</button>
                </div>
            </div>`;
        target.style.opacity = "1";
    }, 200);
}

function logicCancelDelete(user, rowId, img, name) {
    const target = document.getElementById(rowId);
    if (!target) return;
    target.style.opacity = "0";
    
    setTimeout(() => {
        target.style.borderColor = ""; 
        target.style.background = "";
        target.style.flexDirection = "row";
        target.style.padding = "12px 20px";
        target.style.alignItems = "center";
        target.style.justifyContent = "flex-start";
        target.style.display = "flex";
        target.innerHTML = `
            <div style="display: flex; align-items: center; gap: 15px;">
                <img src="${img}" onerror="this.src='https://github.com/identicons/${user}.png'" style="width:45px; height:45px; border-radius:50%; border:1px solid #4792cc;">
                <div style="display: flex; flex-direction: column;">
                    <p style="margin:0; font-size:22px; font-weight: bold; line-height: 1.2;">${name}</p>
                    <p style="margin:0; font-size:14px; color:#8890a8;">@${user}</p>
                </div>
            </div>
            <div style="margin-left: auto; display: flex; gap: 10px;" id="actions-${rowId}">
                <button class="btn1" style="width: 100px; font-size: 16px;" onclick="window.location.href='verPerfil.html?user=${user}'">Entrar</button>
                <button class="btn2" style="width: 100px; font-size: 16px;" onclick="logicConfirmDelete('${user}', '${rowId}')">Eliminar</button>
            </div>`;
        target.style.opacity = "1";
    }, 200);
}

async function logicExecuteDelete(user, rowId) {
    const res = await coreFetch("/profiles/" + user, 'DELETE');
    if (res) {
        const target = document.getElementById(rowId);
        target.style.transform = "translateX(100px)";
        target.style.opacity = "0";
        setTimeout(() => target.remove(), 300);
    }
}

/* ═══════════════════════════════════════
    SECTION 4: DATA LOADING
═══════════════════════════════════════ */

async function logicSubmit() {
    const input = document.getElementById("username");
    const val = input?.value.trim();
    const view = document.getElementById("cuadrocont");
    const btn = document.getElementById("submitBtn");
    if (!val || !view) return;

    view.innerHTML = "<div class='card' style='color:#8890a8;'>Verificando disponibilidad...</div>";
    btn.disabled = true;

    try {
        const list = await coreFetch('/profiles');
        if (list && list.some(p => p.github_user.toLowerCase() === val.toLowerCase())) {
            uiRenderError({
                code: "Aviso",
                title: "Ya registrado",
                desc: `El perfil de <strong>@${val}</strong> ya está en el almacén.`,
                color: "#4792cc",
                bg: "#4792cc1a"
            });
            return;
        }
        const res = await coreFetch('/profiles', 'POST', { username: val });
        if (res) {
            view.innerHTML = uiBuildPreviewHTML(res);
            input.value = "";
        }
    } finally {
        btn.disabled = false;
        btn.textContent = "Agregar";
    }
}

async function logicLoadStorage() {
    const view = document.getElementById("cuadrocont");
    if (!view) return;
    view.innerHTML = "<p style='color:#8890a8; text-align:center;'>Abriendo archivos...</p>";

    const res = await coreFetch('/profiles');
    if (!res) return;
    view.innerHTML = "";
    view.style.display = "flex";
    view.style.flexDirection = "column";
    view.style.gap = "12px";

    res.forEach(d => {
        const wrap = document.createElement("div");
        wrap.innerHTML = uiBuildRowHTML(d);
        view.appendChild(wrap.firstElementChild);
    });
}

async function logicLoadAudit() {
    const view = document.getElementById("cuadrocont");
    if (!view) return;
    view.innerHTML = "<p style='color:#8890a8; text-align:center;'>Consultando logs...</p>";

    const res = await coreFetch('/audit');
    if (!res) return;
    view.innerHTML = "";
    res.reverse().forEach(l => {
        const wrap = document.createElement("div");
        wrap.innerHTML = uiBuildAuditHTML(l);
        view.appendChild(wrap.firstElementChild);
    });
}

async function logicLoadDetail() {
    const view = document.getElementById("cuadrocont");
    const query = new URLSearchParams(window.location.search);
    const user = query.get("user");
    if (!user || !view) return;

    view.innerHTML = "<p style='color:#8890a8; text-align:center;'>Cargando datos detallados...</p>";
    const res = await coreFetch("/profiles/" + user);
    if (res) uiRenderDetail(res, view);
}

/* ═══════════════════════════════════════
    SECTION 5: FILTERS & ROUTER
═══════════════════════════════════════ */

function logicFilterProfiles() {
    const key = document.getElementById("usernamebuscar").value.toLowerCase().trim();
    const view = document.getElementById("cuadrocont");
    const rows = view.querySelectorAll(".card");
    rows.forEach(r => {
        r.style.display = r.textContent.toLowerCase().includes(key) ? "flex" : "none";
    });
}

function logicFilterAudit() {
    const key = document.getElementById("buscarAuditBtn").value.toLowerCase().trim();
    const view = document.getElementById("cuadrocont");
    const rows = view.querySelectorAll("#cuadrocont > .card");
    rows.forEach(r => {
        r.style.display = r.textContent.toLowerCase().includes(key) ? "flex" : "none";
    });
}

function logicFormatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
}

window.onload = function() {
    const url = window.location.pathname;
    if (url.includes("almacen.html")) {
        logicLoadStorage();
        document.getElementById("usernamebuscar")?.addEventListener("input", logicFilterProfiles);
    } 
    else if (url.includes("audit.html")) {
        logicLoadAudit();
        document.getElementById("buscarAuditBtn")?.addEventListener("input", logicFilterAudit);
    } 
    else if (url.includes("verPerfil.html")) {
        logicLoadDetail();
    }
    document.getElementById("submitBtn")?.addEventListener("click", logicSubmit);
    document.getElementById("username")?.addEventListener("keydown", (e) => { if(e.key === "Enter") logicSubmit(); });
};