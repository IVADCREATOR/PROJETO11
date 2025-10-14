// =================================================================
// 1. CONFIGURAÇÕES E INICIALIZAÇÃO DO FIREBASE E DADOS
// =================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDxAit93bJOJ1uuxaEcTsin9f3PlhKW_sY",
    authDomain: "bananas-koki.firebaseapp.com",
    databaseURL: "https://bananas-koki-default-rtdb.firebaseio.com", 
    projectId: "bananas-koki", 
    appId: "1:40465389507:web:17157871a1ebb6e4f24f76"
};

firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// UID do cliente exclusivo para "restrição" de acesso
const EXCLUSIVE_CLIENT_UID = "czk1lWJTQMexNzCb6jpsn5YXH9j1"; 
const ADMIN_MODE_KEY = 'bananaskoki_admin_mode';

let siteData = {};

// Dados iniciais para configurar o banco se estiver vazio.
const FALLBACK_DATA = {
    settings: {
        siteName: "BANANAS KOKI - O Sabor da Sua Saúde",
        whatsapp: "5511999999999",
        instagram: "@bananaskoki",
        bgUrl: "https://res.cloudinary.com/dbyxore1h/image/upload/v1678896000/default-banana-bg.jpg"
    },
    categories: {
        prata: { name: "Banana Prata", products: { p1: { name: "Prata Premium (Kg)", price: 6.50, imgUrl: "https://res.cloudinary.com/dbyxore1h/image/upload/v1678896001/prata.jpg" } } },
        nanica: { name: "Banana Nanica", products: { n1: { name: "Nanica Fresca (Dúzia)", price: 8.90, imgUrl: "https://res.cloudinary.com/dbyxore1h/image/upload/v1678896002/nanica.jpg" } } },
        terra: { name: "Banana da Terra", products: { t1: { name: "Terra (Unidade)", price: 2.50, imgUrl: "https://res.cloudinary.com/dbyxore1h/image/upload/v1678896003/terra.jpg" } } }
    }
};

// =================================================================
// 2. LÓGICA DE ACESSO E RENDERIZAÇÃO ADM
// =================================================================

/**
 * Verifica se o usuário tem permissão para acessar o painel ADM (sem login).
 * Esta função é chamada ao iniciar o script.
 */
function checkAdminAccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const uidFromUrl = urlParams.get('uid');

    if (uidFromUrl === EXCLUSIVE_CLIENT_UID || sessionStorage.getItem(ADMIN_MODE_KEY) === 'true') {
        sessionStorage.setItem(ADMIN_MODE_KEY, 'true'); 
        loadDataAndRenderAdmin(); 
    } else {
        document.getElementById('admin-container').innerHTML = `
            <div class="access-message">
                <h2 style="color: #d9534f;">ACESSO NEGADO</h2>
                <p style="margin-top: 10px; color: #c0c0e0;">Este painel é exclusivo para o cliente. Para acessar, adicione <b>?uid=${EXCLUSIVE_CLIENT_UID}</b> ao final da URL.</p>
            </div>
        `;
    }
}

/**
 * Renderiza o Painel ADM e preenche os campos com os dados atuais.
 */
function renderAdminPanel() {
    const data = siteData;
    const adminContainer = document.getElementById('admin-container');

    let categoryEditListHTML = '';
    const categoryKeys = Object.keys(data.categories || {});

    // Geração da lista de categorias para edição
    categoryKeys.forEach(catKey => {
        const category = data.categories[catKey];
        categoryEditListHTML += `
            <li class="category-edit-item" data-key="${catKey}">
                <input type="text" id="cat-name-${catKey}" value="${category.name}" placeholder="Nome da Categoria">
                <button class="admin-button btn-save-category" onclick="saveCategory('${catKey}')">Salvar Nome</button>
            </li>
        `;
    });

    // Estrutura do Painel ADM com classes profissionais definidas no <style> do index.html
    const adminHTML = `
        <h2 class="admin-header">Painel de Administração Único - BANANAS KOKI</h2>

        <button class="admin-button btn-exit" onclick="exitAdminMode()">Sair do ADM</button>
        <p style="color: #90d4ff; margin-bottom: 20px; font-weight: 500;">Alterações refletem no site principal em tempo real.</p>

        <div class="admin-section">
            <h3>1. Configurações Gerais do Site</h3>
            <form id="general-settings-form" class="admin-form">
                <label for="admin-site-name">Nome do Site:</label>
                <input type="text" id="admin-site-name" value="${data.settings.siteName}">

                <label for="admin-whatsapp">WhatsApp (apenas números, ex: 5511987654321):</label>
                <input type="text" id="admin-whatsapp" value="${data.settings.whatsapp}">

                <label for="admin-instagram">Instagram (ex: @bananaskoki):</label>
                <input type="text" id="admin-instagram" value="${data.settings.instagram}">

                <label for="admin-bg-url">URL Foto de Fundo (Cloudinary):</label>
                <input type="url" id="admin-bg-url" value="${data.settings.bgUrl}">

                <button type="button" class="admin-button" onclick="saveGeneralSettings()">Salvar Configurações Gerais</button>
            </form>
        </div>

        <div class="admin-section">
            <h3>2. Edição de Nomes das Categorias</h3>
            <ul class="category-edit-list">
                ${categoryEditListHTML}
            </ul>
        </div>

        <div class="admin-section">
            <h3>3. Edição de Produtos (Banana Prata Premium)</h3>
            <form id="product-edit-form-prata" class="admin-form">
                <label for="admin-prata-price">Preço da Prata Premium (R$):</label>
                <input type="number" step="0.01" id="admin-prata-price" value="${data.categories.prata.products.p1.price}">
                <label for="admin-prata-img">URL da Imagem da Prata (Cloudinary):</label>
                <input type="url" id="admin-prata-img" value="${data.categories.prata.products.p1.imgUrl}">
                <button type="button" class="admin-button" onclick="saveProductPrice('prata', 'p1')">Salvar Preço e Imagem da Prata</button>
            </form>
        </div>
    `;

    adminContainer.innerHTML = adminHTML;
    document.title = "ADM - " + data.settings.siteName;
}

/**
 * Sai do modo ADM, limpando a sessão.
 */
function exitAdminMode() {
    sessionStorage.removeItem(ADMIN_MODE_KEY);
    window.location.href = window.location.pathname; 
}


// =================================================================
// 3. FUNÇÕES DE PERSISTÊNCIA (FIREBASE REALTIME DB)
// =================================================================

function saveGeneralSettings() {
    // Implementação das funções de salvar... (continua a mesma lógica)
    const newSettings = {
        siteName: document.getElementById('admin-site-name').value,
        whatsapp: document.getElementById('admin-whatsapp').value,
        instagram: document.getElementById('admin-instagram').value,
        bgUrl: document.getElementById('admin-bg-url').value
    };

    database.ref('settings').set(newSettings)
        .then(() => alert("Configurações gerais salvas com sucesso!"))
        .catch((error) => console.error("Erro ao salvar:", error));
}

function saveCategory(catKey) {
    const newName = document.getElementById(`cat-name-${catKey}`).value;

    database.ref(`categories/${catKey}/name`).set(newName)
        .then(() => alert(`Nome da categoria '${catKey}' salvo com sucesso!`))
        .catch((error) => console.error("Erro ao salvar:", error));
}

function saveProductPrice(catKey, prodKey) {
    const newPrice = parseFloat(document.getElementById(`admin-${catKey}-price`).value);
    const newImgUrl = document.getElementById(`admin-${catKey}-img`).value;

    if (isNaN(newPrice)) return alert("Preço inválido.");

    database.ref(`categories/${catKey}/products/${prodKey}/`).update({
        price: newPrice,
        imgUrl: newImgUrl
    })
    .then(() => alert(`Produto '${prodKey}' (Categoria ${catKey}) atualizado com sucesso!`))
    .catch((error) => console.error("Erro ao salvar:", error));
}


// =================================================================
// 4. INICIALIZAÇÃO
// =================================================================

function loadDataAndRenderAdmin() {
    // Listener para ler dados do Firebase em tempo real (para carregar/recarregar o painel)
    database.ref('/').on('value', (snapshot) => {
        const data = snapshot.val();
        
        if (data) {
            siteData = data;
            renderAdminPanel(); 
        } else {
            // Inicializa o banco de dados se estiver vazio
            database.ref('/').set(FALLBACK_DATA)
                .then(() => console.log("Dados iniciais configurados no Firebase."))
                .catch(e => console.error("Erro ao configurar dados iniciais:", e));
        }
    }, (error) => {
        console.error("Erro ao carregar dados do Firebase:", error);
        document.getElementById('admin-container').innerHTML = "<h1>Erro de Conexão com o Banco de Dados.</h1>";
    });
}

// Inicia a checagem de acesso ao carregar a página
checkAdminAccess();
