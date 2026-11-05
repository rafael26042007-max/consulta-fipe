// ===== CONFIGURAÇÃO =====
const BASE_URL = "https://brasilapi.com.br/api/fipe";

// ===== ELEMENTOS DA TELA =====
const formFipe = document.getElementById("formFipe");
const inputCodigo = document.getElementById("codigoFipe");
const selectTabela = document.getElementById("tabelaReferencia");
const btnConsultar = document.getElementById("btnConsultar");
const loading = document.getElementById("loading");
const loadingTexto = document.getElementById("loadingTexto");
const status = document.getElementById("status");
const resultado = document.getElementById("resultado");
const selectTipo = document.getElementById("tipoVeiculo");
const selectMarca = document.getElementById("marca");
const listaModelos = document.getElementById("listaModelos");


// ===== INDICADOR DE PROCESSAMENTO =====
// Mostra/esconde o spinner e trava o botão para evitar cliques repetidos
function mostrarLoading(texto) {
    loadingTexto.textContent = texto;
    loading.classList.remove("oculto");
    btnConsultar.disabled = true;
}

function esconderLoading() {
    loading.classList.add("oculto");
    btnConsultar.disabled = false;
}


// ===== FUNÇÃO GENÉRICA DE REQUISIÇÃO =====
// Faz o fetch, verifica se deu certo e devolve o JSON
async function buscarNaApi(url, mensagemErro) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(mensagemErro);
    }
    return await response.json();
}


// ===== 1. CONSULTAR PREÇO PELO CÓDIGO FIPE =====
// GET /fipe/preco/v1/{codigoFipe}?tabela_referencia={codigo}
async function consultarPreco(event) {
    event.preventDefault(); // impede o form de recarregar a página

    const codigo = inputCodigo.value.trim();
    const tabela = selectTabela.value;

    status.textContent = "";
    resultado.innerHTML = "";
    mostrarLoading("Consultando a tabela FIPE...");

    try {
        let url = `${BASE_URL}/preco/v1/${codigo}`;
        if (tabela) {
            url += `?tabela_referencia=${tabela}`;
        }

        const veiculos = await buscarNaApi(url, "Código FIPE não encontrado. Confira o formato (ex.: 001004-9).");
        renderResultado(veiculos);
    }
    catch (error) {
        status.textContent = error.message;
    }
    finally {
        // "finally" roda dando certo ou errado: o loading sempre some
        esconderLoading();
    }
}

// A API devolve uma lista: um item para cada ano-modelo daquele código
function renderResultado(veiculos) {
    const primeiro = veiculos[0];

    const titulo = document.createElement("div");
    titulo.className = "card";
    titulo.innerHTML = `
        <h2>${primeiro.marca} — ${primeiro.modelo}</h2>
        <p>Código FIPE: <strong>${primeiro.codigoFipe}</strong></p>
        <p>Referência: <strong>${primeiro.mesReferencia}</strong></p>
    `;
    resultado.appendChild(titulo);

    veiculos.forEach(v => {
        // A FIPE usa 32000 para indicar veículo "Zero KM"
        const ano = v.anoModelo === 32000 ? "Zero KM" : v.anoModelo;

        const item = document.createElement("div");
        item.className = "card preco";
        item.innerHTML = `
            <div>
                <span class="ano">${ano}</span>
                <span class="combustivel">${v.combustivel}</span>
            </div>
            <span class="valor">${v.valor}</span>
        `;
        resultado.appendChild(item);
    });
}


// ===== 2. TABELAS DE REFERÊNCIA (meses) =====
// GET /fipe/tabelas/v1
async function carregarTabelas() {
    try {
        const tabelas = await buscarNaApi(`${BASE_URL}/tabelas/v1`, "Erro ao carregar meses de referência");

        // Mostra só os 12 meses mais recentes para a lista não ficar gigante
        tabelas.slice(0, 12).forEach(t => {
            const option = document.createElement("option");
            option.value = t.codigo;
            option.textContent = t.mes;
            selectTabela.appendChild(option);
        });
    }
    catch (error) {
        console.error(error.message); // não é crítico: a consulta funciona sem isso
    }
}


// ===== 3. MARCAS POR TIPO DE VEÍCULO =====
// GET /fipe/marcas/v1/{tipoVeiculo}
async function carregarMarcas() {
    selectMarca.innerHTML = `<option value="">Carregando marcas...</option>`;
    listaModelos.innerHTML = "";

    try {
        const marcas = await buscarNaApi(`${BASE_URL}/marcas/v1/${selectTipo.value}`, "Erro ao carregar marcas");

        selectMarca.innerHTML = `<option value="">Selecione uma marca</option>`;
        marcas.forEach(m => {
            const option = document.createElement("option");
            option.value = m.valor; // código da marca
            option.textContent = m.nome;
            selectMarca.appendChild(option);
        });
    }
    catch (error) {
        selectMarca.innerHTML = `<option value="">${error.message}</option>`;
    }
}


// ===== 4. MODELOS DE UMA MARCA =====
// GET /fipe/veiculos/v1/{tipoVeiculo}/{codigoMarca}
async function carregarModelos() {
    listaModelos.innerHTML = "";
    if (!selectMarca.value) return;

    mostrarLoading("Buscando modelos...");
    try {
        const url = `${BASE_URL}/veiculos/v1/${selectTipo.value}/${selectMarca.value}`;
        const modelos = await buscarNaApi(url, "Erro ao carregar modelos");

        modelos.forEach(m => {
            const li = document.createElement("li");
            li.textContent = m.modelo;
            listaModelos.appendChild(li);
        });
    }
    catch (error) {
        status.textContent = error.message;
    }
    finally {
        esconderLoading();
    }
}


// ===== EVENTOS E INICIALIZAÇÃO =====
formFipe.addEventListener("submit", consultarPreco);
selectTipo.addEventListener("change", carregarMarcas);
selectMarca.addEventListener("change", carregarModelos);

carregarTabelas();
carregarMarcas();
