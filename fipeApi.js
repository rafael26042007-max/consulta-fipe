const BASE_URL = "https://fipe.parallelum.com.br/api/v2";
const TOKEN = "";
const FORMATO_CODIGO = /^\d{6}-\d$/;
const TIPOS = ["cars", "motorcycles", "trucks"];
const ZERO_KM = 32000;

const selectReferencia = document.getElementById("referencia");

const selectTipo = document.getElementById("tipoVeiculo");
const selectMarca = document.getElementById("marca");
const inputFiltroModelo = document.getElementById("filtroModelo");
const selectModelo = document.getElementById("modelo");
const selectAno = document.getElementById("ano");
const loadingCarro = document.getElementById("loadingCarro");
const loadingCarroTexto = document.getElementById("loadingCarroTexto");
const statusCarro = document.getElementById("statusCarro");
const resultadoCarro = document.getElementById("resultadoCarro");

const formCodigo = document.getElementById("formCodigo");
const inputCodigo = document.getElementById("codigoFipe");
const btnConsultar = document.getElementById("btnConsultar");
const loadingCodigo = document.getElementById("loadingCodigo");
const statusCodigo = document.getElementById("statusCodigo");
const resultadoCodigo = document.getElementById("resultadoCodigo");

const controladores = {};
let modelosDaMarca = [];


class ErroApi extends Error {
    constructor(mensagem, status) {
        super(mensagem);
        this.status = status;
    }
}

function novoControlador(nome) {
    controladores[nome]?.abort();
    controladores[nome] = new AbortController();
    return controladores[nome].signal;
}

function cancelar(...nomes) {
    nomes.forEach(nome => controladores[nome]?.abort());
}

function foiCancelado(error) {
    return error.name === "AbortError";
}


function montarUrl(caminho) {
    const url = new URL(BASE_URL + caminho);
    if (selectReferencia.value) {
        url.searchParams.set("reference", selectReferencia.value);
    }
    return url;
}

async function buscarNaApi(caminho, signal) {
    const opcoes = { signal };
    if (TOKEN) opcoes.headers = { "X-Subscription-Token": TOKEN };

    let response;
    try {
        response = await fetch(montarUrl(caminho), opcoes);
    }
    catch (error) {
        if (foiCancelado(error)) throw error;
        throw new ErroApi("Sem conexão com a internet ou a API está fora do ar. Tente novamente.", 0);
    }

    if (response.status === 400 || response.status === 404) {
        throw new ErroApi("Nada encontrado na tabela FIPE para essa busca.", response.status);
    }
    if (response.status === 429) {
        throw new ErroApi("Limite diário de consultas da API atingido. Tente novamente amanhã.", 429);
    }
    if (!response.ok) {
        throw new ErroApi("A API da FIPE está com problemas no momento. Tente novamente mais tarde.", response.status);
    }
    return response.json();
}


function criarElemento(tag, classe, texto) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
}

function criarLinha(rotulo, valor) {
    const linha = criarElemento("p", "linha");
    linha.append(`${rotulo}: `, criarElemento("strong", "", valor));
    return linha;
}

function textoAno(anoModelo) {
    return anoModelo === ZERO_KM ? "Zero KM" : String(anoModelo);
}

function nomeDoAno(nome) {
    return nome.replace(/^32000\b/, "Zero KM");
}

function normalizar(texto) {
    return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function preencherSelect(select, primeiraOpcao, itens) {
    select.replaceChildren(
        new Option(primeiraOpcao, ""),
        ...itens.map(item => new Option(item.texto, item.valor))
    );
}

function resetarSelect(select, texto) {
    select.replaceChildren(new Option(texto, ""));
    select.disabled = true;
}

function mostrarLoading(elemento, ativo) {
    elemento.classList.toggle("oculto", !ativo);
}


function criarCardPreco(detalhe) {
    const card = criarElemento("div", "resultado-preco");
    card.append(
        criarElemento("p", "rotulo-valor", "Valor na tabela FIPE"),
        criarElemento("p", "valor-grande", detalhe.price),
        criarElemento("h3", "", `${detalhe.brand} — ${detalhe.model}`),
        criarLinha("Ano", textoAno(detalhe.modelYear)),
        criarLinha("Combustível", detalhe.fuel),
        criarLinha("Código FIPE", detalhe.codeFipe),
        criarLinha("Referência", detalhe.referenceMonth.trim())
    );
    return card;
}


async function carregarReferencias() {
    try {
        const referencias = await buscarNaApi("/references");
        [...referencias]
            .sort((a, b) => Number(b.code) - Number(a.code))
            .slice(0, 12)
            .forEach(r => selectReferencia.appendChild(new Option(r.month.trim(), r.code)));
    }
    catch (error) {
        console.error(error.message);
    }
}

function trocarReferencia() {
    resultadoCodigo.replaceChildren();
    statusCodigo.textContent = "";
    carregarMarcas();
}


async function carregarMarcas() {
    cancelar("modelos", "anos", "preco");
    const signal = novoControlador("marcas");

    resetarSelect(selectMarca, "Carregando marcas...");
    resetarSelect(selectModelo, "Escolha uma marca primeiro");
    resetarSelect(selectAno, "Escolha um modelo primeiro");
    inputFiltroModelo.value = "";
    inputFiltroModelo.disabled = true;
    modelosDaMarca = [];
    resultadoCarro.replaceChildren();
    statusCarro.textContent = "";
    mostrarLoading(loadingCarro, false);

    try {
        const marcas = await buscarNaApi(`/${selectTipo.value}/brands`, signal);
        preencherSelect(selectMarca, "Selecione a marca", marcas.map(m => ({ texto: m.name, valor: m.code })));
        selectMarca.disabled = false;
    }
    catch (error) {
        if (foiCancelado(error)) return;
        resetarSelect(selectMarca, "Erro ao carregar marcas");
        statusCarro.textContent = error.message;
    }
}


async function carregarModelos() {
    cancelar("anos", "preco");
    resetarSelect(selectModelo, "Carregando modelos...");
    resetarSelect(selectAno, "Escolha um modelo primeiro");
    inputFiltroModelo.value = "";
    inputFiltroModelo.disabled = true;
    modelosDaMarca = [];
    resultadoCarro.replaceChildren();
    statusCarro.textContent = "";

    if (!selectMarca.value) {
        cancelar("modelos");
        resetarSelect(selectModelo, "Escolha uma marca primeiro");
        mostrarLoading(loadingCarro, false);
        return;
    }

    const signal = novoControlador("modelos");
    loadingCarroTexto.textContent = "Buscando modelos...";
    mostrarLoading(loadingCarro, true);

    try {
        modelosDaMarca = await buscarNaApi(`/${selectTipo.value}/brands/${encodeURIComponent(selectMarca.value)}/models`, signal);
        inputFiltroModelo.disabled = false;
        selectModelo.disabled = false;
        filtrarModelos();
    }
    catch (error) {
        if (foiCancelado(error)) return;
        resetarSelect(selectModelo, "Erro ao carregar modelos");
        statusCarro.textContent = error.message;
    }
    finally {
        if (!signal.aborted) mostrarLoading(loadingCarro, false);
    }
}

function filtrarModelos() {
    const busca = normalizar(inputFiltroModelo.value.trim());
    const encontrados = modelosDaMarca.filter(m => normalizar(m.name).includes(busca));
    const selecionado = selectModelo.value;

    const primeiraOpcao = encontrados.length
        ? `Selecione o modelo (${encontrados.length} encontrados)`
        : "Nenhum modelo com esse nome";
    preencherSelect(selectModelo, primeiraOpcao, encontrados.map(m => ({ texto: m.name, valor: m.code })));

    if (encontrados.some(m => m.code === selecionado)) {
        selectModelo.value = selecionado;
    }
    else if (selecionado) {
        cancelar("anos", "preco");
        resetarSelect(selectAno, "Escolha um modelo primeiro");
        resultadoCarro.replaceChildren();
        mostrarLoading(loadingCarro, false);
    }
}


async function carregarAnos() {
    cancelar("preco");
    resetarSelect(selectAno, "Carregando anos...");
    resultadoCarro.replaceChildren();
    statusCarro.textContent = "";

    if (!selectModelo.value) {
        cancelar("anos");
        resetarSelect(selectAno, "Escolha um modelo primeiro");
        mostrarLoading(loadingCarro, false);
        return;
    }

    const signal = novoControlador("anos");
    loadingCarroTexto.textContent = "Buscando anos...";
    mostrarLoading(loadingCarro, true);

    try {
        const caminho = `/${selectTipo.value}/brands/${encodeURIComponent(selectMarca.value)}/models/${encodeURIComponent(selectModelo.value)}/years`;
        const anos = await buscarNaApi(caminho, signal);

        preencherSelect(selectAno, "Selecione o ano", anos.map(a => ({ texto: nomeDoAno(a.name), valor: a.code })));
        selectAno.disabled = false;

        if (anos.length === 1) {
            selectAno.value = anos[0].code;
        }
    }
    catch (error) {
        if (foiCancelado(error)) return;
        resetarSelect(selectAno, "Erro ao carregar anos");
        statusCarro.textContent = error.message;
    }
    finally {
        if (!signal.aborted) mostrarLoading(loadingCarro, false);
    }

    if (!signal.aborted && selectAno.value) {
        carregarPrecoCarro();
    }
}


async function carregarPrecoCarro() {
    resultadoCarro.replaceChildren();
    statusCarro.textContent = "";

    if (!selectAno.value) {
        cancelar("preco");
        mostrarLoading(loadingCarro, false);
        return;
    }

    const signal = novoControlador("preco");
    loadingCarroTexto.textContent = "Consultando o valor FIPE...";
    mostrarLoading(loadingCarro, true);

    try {
        const caminho = `/${selectTipo.value}/brands/${encodeURIComponent(selectMarca.value)}/models/${encodeURIComponent(selectModelo.value)}/years/${encodeURIComponent(selectAno.value)}`;
        const detalhe = await buscarNaApi(caminho, signal);
        resultadoCarro.appendChild(criarCardPreco(detalhe));
    }
    catch (error) {
        if (foiCancelado(error)) return;
        statusCarro.textContent = error.message;
    }
    finally {
        if (!signal.aborted) mostrarLoading(loadingCarro, false);
    }
}


async function descobrirTipoEAnos(codigo, signal) {
    for (const tipo of TIPOS) {
        try {
            const anos = await buscarNaApi(`/${tipo}/${encodeURIComponent(codigo)}/years`, signal);
            if (Array.isArray(anos) && anos.length > 0) {
                return { tipo, anos };
            }
        }
        catch (error) {
            if (error.status !== 404 && error.status !== 400) throw error;
        }
    }
    throw new ErroApi("Código FIPE não encontrado. Confira se digitou certo.", 404);
}

async function consultarCodigo(event) {
    event.preventDefault();

    const codigo = inputCodigo.value.trim();
    resultadoCodigo.replaceChildren();
    statusCodigo.textContent = "";

    if (!FORMATO_CODIGO.test(codigo)) {
        statusCodigo.textContent = "Formato inválido. Use 6 números, hífen e 1 número (ex.: 004278-1).";
        return;
    }

    const signal = novoControlador("codigo");
    btnConsultar.disabled = true;
    mostrarLoading(loadingCodigo, true);

    try {
        const { tipo, anos } = await descobrirTipoEAnos(codigo, signal);
        const detalhes = await Promise.all(
            anos.map(a => buscarNaApi(`/${tipo}/${encodeURIComponent(codigo)}/years/${encodeURIComponent(a.code)}`, signal))
        );
        renderResultadoCodigo(detalhes);
    }
    catch (error) {
        if (foiCancelado(error)) return;
        statusCodigo.textContent = error.message;
    }
    finally {
        if (!signal.aborted) {
            mostrarLoading(loadingCodigo, false);
            btnConsultar.disabled = false;
        }
    }
}

function renderResultadoCodigo(detalhes) {
    const primeiro = detalhes[0];

    const titulo = criarElemento("div", "resultado-titulo");
    titulo.append(
        criarElemento("h3", "", `${primeiro.brand} — ${primeiro.model}`),
        criarLinha("Código FIPE", primeiro.codeFipe),
        criarLinha("Referência", primeiro.referenceMonth.trim())
    );
    resultadoCodigo.appendChild(titulo);

    [...detalhes]
        .sort((a, b) => b.modelYear - a.modelYear)
        .forEach(d => {
            const info = criarElemento("div");
            info.append(
                criarElemento("span", "ano", textoAno(d.modelYear)),
                criarElemento("span", "combustivel", d.fuel)
            );

            const item = criarElemento("div", "preco");
            item.append(info, criarElemento("span", "valor", d.price));
            resultadoCodigo.appendChild(item);
        });
}


selectReferencia.addEventListener("change", trocarReferencia);
selectTipo.addEventListener("change", carregarMarcas);
selectMarca.addEventListener("change", carregarModelos);
inputFiltroModelo.addEventListener("input", filtrarModelos);
selectModelo.addEventListener("change", carregarAnos);
selectAno.addEventListener("change", carregarPrecoCarro);
formCodigo.addEventListener("submit", consultarCodigo);
inputCodigo.addEventListener("input", () => { statusCodigo.textContent = ""; });

carregarReferencias();
carregarMarcas();
