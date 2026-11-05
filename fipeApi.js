const BASE_URL = "https://brasilapi.com.br/api/fipe";
const FORMATO_CODIGO = /^\d{6}-\d$/;

const formFipe = document.getElementById("formFipe");
const inputCodigo = document.getElementById("codigoFipe");
const selectTabela = document.getElementById("tabelaReferencia");
const btnConsultar = document.getElementById("btnConsultar");
const loading = document.getElementById("loading");
const status = document.getElementById("status");
const resultado = document.getElementById("resultado");
const selectTipo = document.getElementById("tipoVeiculo");
const selectMarca = document.getElementById("marca");
const loadingModelos = document.getElementById("loadingModelos");
const statusModelos = document.getElementById("statusModelos");
const listaModelos = document.getElementById("listaModelos");

let controladorMarcas = null;
let controladorModelos = null;


function mostrarLoadingConsulta() {
    loading.classList.remove("oculto");
    btnConsultar.disabled = true;
}

function esconderLoadingConsulta() {
    loading.classList.add("oculto");
    btnConsultar.disabled = false;
}


function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
}

function criarLinha(rotulo, valor) {
    const linha = document.createElement("p");
    linha.append(`${rotulo}: `, criarElemento("strong", "", valor));
    return linha;
}


async function buscarNaApi(url, mensagemNaoEncontrado, signal) {
    let response;
    try {
        response = await fetch(url, { signal });
    }
    catch (error) {
        if (error.name === "AbortError") throw error;
        throw new Error("Sem conexão com a internet ou a API está fora do ar. Tente novamente.");
    }

    if (response.status === 400 || response.status === 404) {
        throw new Error(mensagemNaoEncontrado);
    }
    if (response.status === 429) {
        throw new Error("Muitas consultas seguidas. Aguarde um pouco e tente de novo.");
    }
    if (!response.ok) {
        throw new Error("A API da FIPE está com problemas no momento. Tente novamente mais tarde.");
    }
    return response.json();
}


async function consultarPreco(event) {
    event.preventDefault();

    const codigo = inputCodigo.value.trim();
    const tabela = selectTabela.value;

    status.textContent = "";
    resultado.replaceChildren();

    if (!FORMATO_CODIGO.test(codigo)) {
        status.textContent = "Formato inválido. Use 6 números, hífen e 1 número (ex.: 001004-9).";
        return;
    }

    mostrarLoadingConsulta();
    try {
        let url = `${BASE_URL}/preco/v1/${encodeURIComponent(codigo)}`;
        if (tabela) {
            url += `?tabela_referencia=${encodeURIComponent(tabela)}`;
        }

        const veiculos = await buscarNaApi(url, "Código FIPE não encontrado para o mês escolhido.");
        if (!Array.isArray(veiculos) || veiculos.length === 0) {
            throw new Error("Nenhum preço encontrado para esse código.");
        }
        renderResultado(veiculos);
    }
    catch (error) {
        status.textContent = error.message;
    }
    finally {
        esconderLoadingConsulta();
    }
}

function renderResultado(veiculos) {
    const primeiro = veiculos[0];

    const titulo = criarElemento("div", "card");
    titulo.append(
        criarElemento("h2", "", `${primeiro.marca} — ${primeiro.modelo}`),
        criarLinha("Código FIPE", primeiro.codigoFipe),
        criarLinha("Referência", primeiro.mesReferencia)
    );
    resultado.appendChild(titulo);

    veiculos.forEach(v => {
        const ano = v.anoModelo === 32000 ? "Zero KM" : String(v.anoModelo);

        const info = criarElemento("div");
        info.append(
            criarElemento("span", "ano", ano),
            criarElemento("span", "combustivel", v.combustivel)
        );

        const item = criarElemento("div", "card preco");
        item.append(info, criarElemento("span", "valor", v.valor));
        resultado.appendChild(item);
    });
}


async function carregarTabelas() {
    try {
        const tabelas = await buscarNaApi(`${BASE_URL}/tabelas/v1`, "Meses de referência não encontrados.");

        [...tabelas]
            .sort((a, b) => b.codigo - a.codigo)
            .slice(0, 12)
            .forEach(t => selectTabela.appendChild(new Option(t.mes, t.codigo)));
    }
    catch (error) {
        console.error(error.message);
    }
}


async function carregarMarcas() {
    controladorMarcas?.abort();
    controladorModelos?.abort();
    controladorMarcas = new AbortController();
    const { signal } = controladorMarcas;

    selectMarca.disabled = true;
    selectMarca.replaceChildren(new Option("Carregando marcas...", ""));
    listaModelos.replaceChildren();
    statusModelos.textContent = "";
    loadingModelos.classList.add("oculto");

    try {
        const url = `${BASE_URL}/marcas/v1/${encodeURIComponent(selectTipo.value)}`;
        const marcas = await buscarNaApi(url, "Nenhuma marca encontrada para esse tipo de veículo.", signal);

        selectMarca.replaceChildren(
            new Option("Selecione uma marca", ""),
            ...marcas.map(m => new Option(m.nome, m.valor))
        );
        selectMarca.disabled = false;
    }
    catch (error) {
        if (error.name === "AbortError") return;
        selectMarca.replaceChildren(new Option("Erro ao carregar marcas", ""));
        statusModelos.textContent = error.message;
    }
}


async function carregarModelos() {
    controladorModelos?.abort();
    listaModelos.replaceChildren();
    statusModelos.textContent = "";
    loadingModelos.classList.add("oculto");

    if (!selectMarca.value) return;

    controladorModelos = new AbortController();
    const { signal } = controladorModelos;
    loadingModelos.classList.remove("oculto");

    try {
        const url = `${BASE_URL}/veiculos/v1/${encodeURIComponent(selectTipo.value)}/${encodeURIComponent(selectMarca.value)}`;
        const modelos = await buscarNaApi(url, "Nenhum modelo encontrado para essa marca.", signal);

        listaModelos.replaceChildren(...modelos.map(m => criarElemento("li", "", m.modelo)));
    }
    catch (error) {
        if (error.name === "AbortError") return;
        statusModelos.textContent = error.message;
    }
    finally {
        if (!signal.aborted) loadingModelos.classList.add("oculto");
    }
}


formFipe.addEventListener("submit", consultarPreco);
selectTipo.addEventListener("change", carregarMarcas);
selectMarca.addEventListener("change", carregarModelos);

carregarTabelas();
carregarMarcas();
