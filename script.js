// =================================================================
// 1. CONFIGURAÇÕES E DADOS SENSÍVEIS (ADM)
// =================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDxAit93bJOJ1uuxaEcTsin9f3PlhKW_sY",
    authDomain: "bananas-koki.firebaseapp.com",
    projectId: "bananas-koki", 
    appId: "1:40465389507:web:17157871a1ebb6e4f24f76"
    // databaseURL não é necessário para o Firestore
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); // Inicializa o Firestore

// CHAVE SECRETA DO ADM - ESSENCIAL PARA A SEGURANÇA!
const ADMIN_SECRET_KEY = "czk1lWJTQMexNzCb6jpsn5YXH9j1"; 
const ADMIN_MODE_KEY = 'bananaskoki_admin_mode';

let siteData = {};

// Dados iniciais (Fallback) - Adaptado para a estrutura do Firestore
const INITIAL_SETTINGS_DOC = {
    siteName: "BANANAS KOKI - Painel ADM",
    whatsapp: "5511999999999",
    instagram: "@bananaskoki",
    bgUrl: "https://res.cloudinary.com/dbyxore1h/image/upload/v1678896000/default-banana-bg.jpg"
};

const INITIAL_CATEGORIES = [
    { key: "prata", name: "Banana Prata", products: [{ id: "p1", name: "Prata Premium (Kg)", price: 6.50, imgUrl: "https://res.cloudinary.com/dbyxore1h/image/upload/v1678896001/prata.jpg" }] },
    { key: "nanica", name: "Banana Nanica", products: [{ id: "n1", name: "Nanica Fresca (Dúzia)", price: 8.90, imgUrl: "https://res.cloudinary.com/dbyxore1h/image/upload/v1678896002/nanica.jpg" }] },
    { key: "terra", name: "Banana da Terra", products: [{ id: "t1", name: "Terra (Unidade)", price: 2.50, imgUrl: "https://res.cloudinary.com/dbyxore1h/image/upload/v1678896003/terra.jpg" }] }
];


// =================================================================
// 2. LÓGICA DE ACESSO E RENDERIZAÇÃO ADM (Mapeamento de Dados)
// =================================================================

function checkAdminAccess() {
    const urlParams = new URLSearchParams(window.location.search);
    const uidFromUrl = urlParams.get('uid');

    if (uidFromUrl === ADMIN_SECRET_KEY || sessionStorage.getItem(ADMIN_MODE_KEY) === 'true') {
        sessionStorage.setItem(ADMIN_MODE_KEY, 'true'); 
        loadDataAndRenderAdmin(); 
    } else {
        document.getElementById('admin-container').innerHTML = `
            <div class="access-message">
                <h2 style="color: #d9534f;">ACESSO NEGADO</h2>
                <p style="margin-top: 10px; color: #c0c0e0;">Este painel é exclusivo para o cliente. Para acessar, adicione <b>?uid=${ADMIN_SECRET_KEY}</b> ao final da URL.</p>
            </div>
        `;
    }
}

function renderAdminPanel() {
    // Mapeamento dos dados do Firestore para um formato fácil de usar
    const settings = siteData.settings || INITIAL_SETTINGS_DOC;
    const categoriesMap = siteData.categories || {};
    
    const adminContainer = document.getElementById('admin-container');

    let categoryEditListHTML = '';
    const categoryKeys = Object.keys(categoriesMap);

    categoryKeys.forEach(catKey => {
        const category = categoriesMap[catKey];
        categoryEditListHTML += `
            <li class="category-edit-item" data-key="${catKey}">
                <input type="text" id="cat-name-${catKey}" value="${category.name}" placeholder="Nome da Categoria">
                <button class="admin-button btn-save-category" onclick="saveCategory('${catKey}')">Salvar Nome</button>
            </li>
        `;
    });

    // Acessa o produto de exemplo 'p1' dentro da categoria 'prata'
    const prataCategory = categoriesMap['prata'] || { products: { p1: { price: 0, imgUrl: '' } } };
    const prataProduct = (prataCategory.products && prataCategory.products.p1) || { price: 0, imgUrl: '' };

    const adminHTML = `
        <h2 class="admin-header">Painel de Administração Único - BANANAS KOKI</h2>

        <button class="admin-button btn-exit" onclick="exitAdminMode()">Sair do ADM</button>
        <p style="color: #90d4ff; margin-bottom: 20px; font-weight: 500;">Alterações refletem no site principal em tempo real.</p>

        <div class="admin-section">
            <h3>1. Configurações Gerais do Site</h3>
            <form id="general-settings-form" class="admin-form">
                <label for="admin-site-name">Nome do Site:</label>
                <input type="text" id="admin-site-name" value="${settings.siteName}">
                <label for="admin-whatsapp">WhatsApp (apenas números, ex: 5511987654321):</label>
                <input type="text" id="admin-whatsapp" value="${settings.whatsapp}">
                <label for="admin-instagram">Instagram (ex: @bananaskoki):</label>
                <input type="text" id="admin-instagram" value="${settings.instagram}">
                <label for="admin-bg-url">URL Foto de Fundo (Cloudinary):</label>
                <input type="url" id="admin-bg-url" value="${settings.bgUrl}">
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
                <input type="number" step="0.01" id="admin-prata-price" value="${prataProduct.price}">
                <label for="admin-prata-img">URL da Imagem da Prata (Cloudinary):</label>
                <input type="url" id="admin-prata-img" value="${prataProduct.imgUrl}">
                <button type="button" class="admin-button" onclick="saveProductPrice('prata', 'p1')">Salvar Preço e Imagem da Prata</button>
            </form>
        </div>
    `;

    adminContainer.innerHTML = adminHTML;
    document.title = "ADM - " + settings.siteName;
}

function exitAdminMode() {
    sessionStorage.removeItem(ADMIN_MODE_KEY);
    window.location.href = window.location.pathname; 
}


// =================================================================
// 3. FUNÇÕES DE PERSISTÊNCIA (FIRESTORE COM CHAVE SECRETA)
// =================================================================

/**
 * Salva as configurações gerais na coleção 'settings' (doc: 'site_config').
 * Inclui o adminKey no payload para passar nas regras de segurança.
 */
function saveGeneralSettings() {
    const newSettings = {
        siteName: document.getElementById('admin-site-name').value,
        whatsapp: document.getElementById('admin-whatsapp').value,
        instagram: document.getElementById('admin-instagram').value,
        bgUrl: document.getElementById('admin-bg-url').value,
        adminKey: ADMIN_SECRET_KEY // CHAVE SECRETA INJETADA
    };

    db.collection('settings').doc('site_config').set(newSettings)
        .then(() => alert("Configurações gerais salvas com sucesso!"))
        .catch((error) => console.error("Erro ao salvar:", error));
}

/**
 * Salva o nome de uma categoria.
 * Inclui o adminKey no payload para passar nas regras de segurança.
 */
function saveCategory(catKey) {
    const newName = document.getElementById(`cat-name-${catKey}`).value;

    const updatePayload = {
        name: newName,
        adminKey: ADMIN_SECRET_KEY // CHAVE SECRETA INJETADA
    };

    db.collection('categories').doc(catKey).update(updatePayload)
        .then(() => alert(`Nome da categoria '${catKey}' salvo com sucesso!`))
        .catch((error) => console.error("Erro ao salvar:", error));
}

/**
 * Salva o preço e imagem de um produto.
 * Como o produto está numa subcoleção, o adminKey deve ser injetado diretamente no produto.
 */
function saveProductPrice(catKey, prodKey) {
    const newPrice = parseFloat(document.getElementById(`admin-${catKey}-price`).value);
    const newImgUrl = document.getElementById(`admin-${catKey}-img`).value;

    if (isNaN(newPrice)) return alert("Preço inválido.");

    const productUpdate = {
        price: newPrice,
        imgUrl: newImgUrl,
        adminKey: ADMIN_SECRET_KEY // CHAVE SECRETA INJETADA
    };

    db.collection('categories').doc(catKey).collection('products').doc(prodKey).update(productUpdate)
    .then(() => alert(`Produto '${prodKey}' (Categoria ${catKey}) atualizado com sucesso!`))
    .catch((error) => console.error("Erro ao salvar:", error));
}


// =================================================================
// 4. INICIALIZAÇÃO ADM (LEITURA DO FIRESTORE)
// =================================================================

/**
 * Carrega todos os dados do Firestore: 
 * - Documento 'site_config' da coleção 'settings'.
 * - Todos os documentos da coleção 'categories' e suas subcoleções 'products'.
 */
async function loadDataAndRenderAdmin() {
    try {
        const data = {
            settings: {},
            categories: {}
        };

        // 1. Carregar Configurações Gerais
        const settingsDoc = await db.collection('settings').doc('site_config').get();
        if (settingsDoc.exists) {
            data.settings = settingsDoc.data();
        } else {
            // Se não existir, inicializa e salva a primeira vez (sem adminKey na leitura)
            await db.collection('settings').doc('site_config').set(INITIAL_SETTINGS_DOC);
            data.settings = INITIAL_SETTINGS_DOC;
        }

        // 2. Carregar Categorias
        const categoriesSnapshot = await db.collection('categories').get();
        
        if (categoriesSnapshot.empty) {
            // Se a coleção de categorias estiver vazia, inicializa
            for (const cat of INITIAL_CATEGORIES) {
                // Salva a categoria principal
                await db.collection('categories').doc(cat.key).set({ name: cat.name });
                // Salva os produtos na subcoleção
                for (const prod of cat.products) {
                    await db.collection('categories').doc(cat.key).collection('products').doc(prod.id).set(prod);
                }
            }
        }
        
        // Recarrega as categorias após possível inicialização (ou carrega as existentes)
        const currentCategoriesSnapshot = await db.collection('categories').get();
        
        for (const doc of currentCategoriesSnapshot.docs) {
            const categoryKey = doc.id;
            const categoryData = doc.data();
            data.categories[categoryKey] = { ...categoryData, products: {} };

            // Carregar Produtos da Subcoleção
            const productsSnapshot = await db.collection('categories').doc(categoryKey).collection('products').get();
            productsSnapshot.forEach(prodDoc => {
                data.categories[categoryKey].products[prodDoc.id] = prodDoc.data();
            });
        }

        siteData = data;
        renderAdminPanel();

    } catch (error) {
        console.error("Erro ao carregar dados do Firestore:", error);
        document.getElementById('admin-container').innerHTML = `<h1>Erro de Conexão com o Banco de Dados. Detalhes: ${error.message}</h1>`;
    }
}


// Inicia a checagem de acesso ao carregar a página
checkAdminAccess();
