// =================================================================
// 1. CONFIGURAÇÕES E DADOS SENSÍVEIS (ADM)
// =================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDxAit93bJOJ1uuxaEcTsin9f3PlhKW_sY",
    authDomain: "bananas-koki.firebaseapp.com",
    projectId: "bananas-koki", 
    appId: "1:40465389507:web:17157871a1ebb6e4f24f76",
    storageBucket: "bananas-koki.appspot.com" // Adicionado para o Storage
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore(); // Inicializa o Firestore
const storage = firebase.storage(); // NOVO: Inicializa o Storage

const ADMIN_SECRET_KEY = "czk1lWJTQMexNzCb6jpsn5YXH9j1"; 
const ADMIN_MODE_KEY = 'bananaskoki_admin_mode';

let siteData = {};
let currentProductCategoryKey = null; // Categoria atualmente sendo gerenciada

// ... (Restante dos dados iniciais INITIAL_SETTINGS_DOC e INITIAL_CATEGORIES) ...
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
// 2. LÓGICA DE ACESSO E RENDERIZAÇÃO ADM
// =================================================================

function checkAdminAccess() {
    // ... (Mantém a lógica de verificação de acesso)
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
    const settings = siteData.settings || INITIAL_SETTINGS_DOC;
    const categoriesMap = siteData.categories || {};
    const adminContainer = document.getElementById('admin-container');
    const categoryKeys = Object.keys(categoriesMap);

    let categoryEditListHTML = '';
    let categoryOptionsHTML = categoryKeys.map(key => `<option value="${key}">${categoriesMap[key].name}</option>`).join('');


    categoryKeys.forEach(catKey => {
        const category = categoriesMap[catKey];
        categoryEditListHTML += `
            <li class="category-edit-item" data-key="${catKey}">
                <input type="text" id="cat-name-${catKey}" value="${category.name}" placeholder="Nome da Categoria">
                <button class="admin-button btn-save-category" onclick="saveCategory('${catKey}')">Salvar Nome</button>
            </li>
        `;
    });

    const adminHTML = `
        <h2 class="admin-header">Painel de Administração - BANANAS KOKI</h2>

        <button class="admin-button btn-exit" onclick="exitAdminMode()">Sair do ADM</button>
        <p style="color: #90d4ff; margin-bottom: 20px; font-weight: 500;">Alterações refletem no site principal em tempo real.</p>

        <div class="admin-section">
            <h3>1. Configurações Gerais do Site</h3>
            <form id="general-settings-form" class="admin-form">
                <label for="admin-site-name">Nome do Site:</label>
                <input type="text" id="admin-site-name" value="${settings.siteName}">
                <label for="admin-whatsapp">WhatsApp (apenas números):</label>
                <input type="text" id="admin-whatsapp" value="${settings.whatsapp}">
                <label for="admin-instagram">Instagram (ex: @bananaskoki):</label>
                <input type="text" id="admin-instagram" value="${settings.instagram}">
                <label for="admin-bg-url">URL Foto de Fundo:</label>
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
            <h3>3. Gerenciamento de Produtos (Adicionar, Editar e Excluir)</h3>
            
            <label for="category-select">Selecione a Categoria para Gerenciar:</label>
            <select id="category-select" onchange="renderProductManagement(this.value)">
                <option value="">-- Selecione uma Categoria --</option>
                ${categoryOptionsHTML}
            </select>

            <div id="product-management-area" style="margin-top: 20px;">
                </div>
        </div>
    `;

    adminContainer.innerHTML = adminHTML;
    document.title = "ADM - " + settings.siteName;
}

/**
 * Renderiza a área de gerenciamento de produtos para a categoria selecionada.
 * @param {string} catKey - A chave da categoria.
 */
function renderProductManagement(catKey) {
    currentProductCategoryKey = catKey;
    const managementArea = document.getElementById('product-management-area');
    
    if (!catKey || !siteData.categories[catKey]) {
        managementArea.innerHTML = '';
        return;
    }

    const category = siteData.categories[catKey];
    const products = Object.values(category.products || {});

    let tableRowsHTML = '';
    products.forEach(prod => {
        tableRowsHTML += `
            <tr>
                <td><img src="${prod.imgUrl || 'placeholder.jpg'}" alt="${prod.name}"></td>
                <td>${prod.name}</td>
                <td>R$ ${prod.price ? prod.price.toFixed(2).replace('.', ',') : '0,00'}</td>
                <td>
                    <button class="admin-button btn-save-category" onclick="openModal('${catKey}', '${prod.id}')">Editar</button>
                    <button class="admin-button btn-delete-product" onclick="deleteProduct('${catKey}', '${prod.id}', '${prod.imgUrl || ''}')">Excluir</button>
                </td>
            </tr>
        `;
    });

    managementArea.innerHTML = `
        <button class="admin-button btn-add-product" onclick="openModal('${catKey}')">Adicionar Novo Produto</button>
        
        <table class="product-table">
            <thead>
                <tr>
                    <th>Foto</th>
                    <th>Nome</th>
                    <th>Preço</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
                ${tableRowsHTML}
            </tbody>
        </table>
    `;
}

// =================================================================
// 3. FUNÇÕES DE MODAL/CRUD (NOVO)
// =================================================================

/**
 * Abre o modal para adicionar ou editar um produto.
 * @param {string} catKey - Chave da categoria.
 * @param {string} [prodId] - ID do produto (opcional, para edição).
 */
function openModal(catKey, prodId = null) {
    const modal = document.getElementById('product-modal');
    const title = document.getElementById('modal-title');
    const currentImgUrlSpan = document.getElementById('current-img-url');
    const form = document.getElementById('product-form');

    // Limpa o formulário e inputs de arquivo
    form.reset();
    document.getElementById('modal-category-key').value = catKey;
    document.getElementById('modal-product-id').value = prodId;
    document.getElementById('product-image-file').value = ''; // Limpa o input file

    if (prodId) {
        title.innerText = "Editar Produto";
        const product = siteData.categories[catKey].products[prodId];
        if (product) {
            document.getElementById('product-name').value = product.name || '';
            document.getElementById('product-price').value = product.price || 0;
            currentImgUrlSpan.innerText = product.imgUrl ? product.imgUrl.substring(0, 50) + '...' : 'N/A';
        }
    } else {
        title.innerText = "Adicionar Novo Produto";
        currentImgUrlSpan.innerText = 'N/A';
    }

    modal.style.display = "block";
}

function closeModal() {
    document.getElementById('product-modal').style.display = "none";
}


// =================================================================
// 4. FUNÇÕES DE PERSISTÊNCIA (FIRESTORE E STORAGE COM CHAVE SECRETA)
// =================================================================

/**
 * Funções saveGeneralSettings e saveCategory não mudam (apenas Firestore)
 */

// ... (Função saveGeneralSettings) ...
function saveGeneralSettings() {
    const newSettings = {
        siteName: document.getElementById('admin-site-name').value,
        whatsapp: document.getElementById('admin-whatsapp').value,
        instagram: document.getElementById('admin-instagram').value,
        bgUrl: document.getElementById('admin-bg-url').value,
        adminKey: ADMIN_SECRET_KEY 
    };

    db.collection('settings').doc('site_config').set(newSettings)
        .then(() => alert("Configurações gerais salvas com sucesso!"))
        .catch((error) => console.error("Erro ao salvar:", error));
}
// ... (Função saveCategory) ...
function saveCategory(catKey) {
    const newName = document.getElementById(`cat-name-${catKey}`).value;

    const updatePayload = {
        name: newName,
        adminKey: ADMIN_SECRET_KEY
    };

    db.collection('categories').doc(catKey).update(updatePayload)
        .then(() => alert(`Nome da categoria '${catKey}' salvo com sucesso!`))
        .catch((error) => console.error("Erro ao salvar:", error));
}


/**
 * Salva o produto (Adicionar ou Editar), gerenciando o upload da imagem no Storage.
 */
async function saveProduct() {
    const catKey = document.getElementById('modal-category-key').value;
    const prodId = document.getElementById('modal-product-id').value || db.collection('placeholder').doc().id; // Novo ID ou ID existente
    const fileInput = document.getElementById('product-image-file');
    
    // Dados do produto
    const productName = document.getElementById('product-name').value;
    const productPrice = parseFloat(document.getElementById('product-price').value);

    if (!productName || isNaN(productPrice)) {
        alert("Por favor, preencha o nome e o preço corretamente.");
        return;
    }
    
    let imgUrl = siteData.categories[catKey]?.products[prodId]?.imgUrl || ''; // URL atual
    let needsUpdate = false;

    // 1. UPLOAD DE ARQUIVO (SE UM NOVO ARQUIVO FOI SELECIONADO)
    if (fileInput.files.length > 0) {
        alert("Iniciando upload da imagem...");
        const file = fileInput.files[0];
        const storageRef = storage.ref(`products/${catKey}/${prodId}_${file.name}`);
        
        try {
            const snapshot = await storageRef.put(file);
            imgUrl = await snapshot.ref.getDownloadURL(); // Obtém a URL pública
            needsUpdate = true;
            alert("Upload concluído! URL da imagem obtida.");
        } catch (error) {
            console.error("Erro no upload para o Storage:", error);
            alert("Erro ao enviar a imagem. Verifique as Regras do Firebase Storage.");
            return;
        }
    }
    
    // 2. SALVAR/ATUALIZAR DADOS NO FIRESTORE
    const productPayload = {
        id: prodId,
        name: productName,
        price: productPrice,
        imgUrl: imgUrl,
        adminKey: ADMIN_SECRET_KEY // CHAVE SECRETA INJETADA
    };

    try {
        await db.collection('categories').doc(catKey).collection('products').doc(prodId).set(productPayload);
        
        alert("Produto salvo no Firestore com sucesso!");
        closeModal();
        // Recarrega todos os dados para atualizar o painel
        await loadDataAndRenderAdmin();
        // Renderiza a seção atual novamente
        renderProductManagement(catKey);

    } catch (error) {
        console.error("Erro ao salvar produto no Firestore:", error);
        alert("Erro ao salvar o produto no Firestore. Detalhes no console.");
    }
}


/**
 * Remove o produto do Firestore e a imagem (se houver) do Storage.
 * @param {string} catKey - Chave da categoria.
 * @param {string} prodId - ID do produto.
 * @param {string} imgUrl - URL da imagem para exclusão.
 */
async function deleteProduct(catKey, prodId, imgUrl) {
    if (!confirm(`Tem certeza que deseja EXCLUIR o produto ID: ${prodId} da categoria ${catKey}?`)) {
        return;
    }

    try {
        // A regra de segurança do Firestore permite a exclusão se adminKey estiver presente no payload,
        // mas para a exclusão do produto, apenas a regra de user/uid é validada.
        // Como estamos usando a adminKey na escrita, a exclusão por ID é a mais segura.

        // 1. EXCLUIR O DOCUMENTO NO FIRESTORE
        await db.collection('categories').doc(catKey).collection('products').doc(prodId).delete();
        
        alert(`Produto '${prodId}' excluído do Firestore.`);

        // 2. EXCLUIR A IMAGEM NO STORAGE (OPCIONAL, MAS PROFISSIONAL)
        // OBS: Excluir do Storage é complexo, pois precisamos do nome original do arquivo.
        // A maneira mais segura é deletar pelo 'path' (products/key/id_filename).
        // Se a URL do Storage for fornecida (https://firebasestorage.googleapis.com/.../products%2Fprata%2F...):
        
        if (imgUrl && imgUrl.includes("firebasestorage")) {
            // Tenta obter a referência de Storage a partir da URL
            const imageRef = storage.refFromURL(imgUrl);
            await imageRef.delete().then(() => {
                alert("Arquivo de imagem excluído do Storage.");
            }).catch(e => {
                console.warn("Aviso: Imagem não encontrada no Storage ou erro ao excluir (pode ser URL externa).", e);
            });
        }
        
        // 3. ATUALIZAÇÃO DA TELA
        await loadDataAndRenderAdmin();
        renderProductManagement(catKey);

    } catch (error) {
        console.error("Erro ao excluir o produto:", error);
        alert("Erro ao excluir. Verifique se as Regras de Segurança do Firestore estão corretas para 'delete'.");
    }
}


// =================================================================
// 5. INICIALIZAÇÃO ADM (LEITURA DO FIRESTORE)
// =================================================================

/**
 * Mantém a função de inicialização (loadDataAndRenderAdmin) exatamente como está,
 * pois a leitura dos dados não muda.
 */
async function loadDataAndRenderAdmin() {
    // ... (Mantém a lógica de carregamento do Firestore) ...
    try {
        const data = { settings: {}, categories: {} };

        // 1. Carregar Configurações Gerais
        const settingsDoc = await db.collection('settings').doc('site_config').get();
        if (settingsDoc.exists) {
            data.settings = settingsDoc.data();
        } else {
            await db.collection('settings').doc('site_config').set(INITIAL_SETTINGS_DOC);
            data.settings = INITIAL_SETTINGS_DOC;
        }

        // 2. Carregar Categorias e Produtos
        const categoriesSnapshot = await db.collection('categories').get();
        
        if (categoriesSnapshot.empty) {
            // Inicializa dados se vazio
            for (const cat of INITIAL_CATEGORIES) {
                await db.collection('categories').doc(cat.key).set({ name: cat.name });
                for (const prod of cat.products) {
                    await db.collection('categories').doc(cat.key).collection('products').doc(prod.id).set(prod);
                }
            }
        }
        
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

        // Se uma categoria estava selecionada, renderiza a gestão de produtos novamente
        if (currentProductCategoryKey) {
            document.getElementById('category-select').value = currentProductCategoryKey;
            renderProductManagement(currentProductCategoryKey);
        }

    } catch (error) {
        console.error("Erro ao carregar dados do Firestore:", error);
        document.getElementById('admin-container').innerHTML = `<h1>Erro de Conexão com o Banco de Dados. Detalhes: ${error.message}</h1>`;
    }
}


// Inicia a checagem de acesso ao carregar a página
checkAdminAccess();
