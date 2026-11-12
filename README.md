# 🚗 Consulta Tabela FIPE

Página web que mostra o **valor da Tabela FIPE** de carros, motos e caminhões usando a [API FIPE (Parallelum)](https://fipe.api.br/).
Feita com HTML, CSS e JavaScript puro, sem frameworks e sem dependências.

## Funcionalidades

- **Buscar pelo carro:** tipo de veículo → marca → modelo → ano → **valor FIPE**.
  - O modelo tem um campo de filtro (ex.: digite `gol` ou `onix 1.0`), que ignora maiúsculas e acentos.
  - Se o modelo só tiver um ano, o valor aparece sozinho.
- **Buscar pelo código FIPE** (ex.: `004278-1`): mostra o valor de todos os anos-modelo. A página descobre sozinha se o código é de carro, moto ou caminhão.
- **Mês de referência:** vale para as duas buscas (padrão: mais recente).
- **Loading** e **mensagens de erro** separados para cada busca: código inválido, não encontrado, sem internet, API fora do ar e limite diário atingido.
- Trocar de marca ou modelo rapidamente **cancela** a requisição anterior (`AbortController`), então a tela nunca mistura dados.

## Como rodar

Não precisa instalar nada:

1. Clone o repositório:
   ```bash
   git clone https://github.com/rafael26042007-max/consulta-fipe.git
   ```
2. Abra o `index.html` no navegador (ou use o Live Server / o servidor do IntelliJ).

## Estrutura

```
consulta-fipe/
├── index.html   # Mês de referência, busca pelo carro e busca pelo código
├── style.css    # Visual: cards, spinner, card de valor
└── fipeApi.js   # Toda a lógica: requisições à API e montagem da tela
```

## Endpoints usados (`https://fipe.parallelum.com.br/api/v2`)

| Endpoint | Para quê |
|---|---|
| `GET /references` | Meses de referência |
| `GET /{tipo}/brands` | Marcas (`tipo` = `cars`, `motorcycles` ou `trucks`) |
| `GET /{tipo}/brands/{marca}/models` | Modelos de uma marca |
| `GET /{tipo}/brands/{marca}/models/{modelo}/years` | Anos de um modelo |
| `GET /{tipo}/brands/{marca}/models/{modelo}/years/{ano}` | **Valor FIPE** do veículo |
| `GET /{tipo}/{codigoFipe}/years` | Anos de um código FIPE |
| `GET /{tipo}/{codigoFipe}/years/{ano}` | **Valor FIPE** pelo código |

Todos aceitam `?reference={codigo}` para escolher o mês.

## Como o `fipeApi.js` funciona

| Função | O que faz |
|---|---|
| `buscarNaApi(caminho, signal)` | Faz o `fetch`, adiciona o mês escolhido e transforma cada falha numa mensagem em português (sem internet, 404, 429, 5xx). |
| `novoControlador(nome)` / `cancelar(...)` | Cancelam a requisição anterior do mesmo tipo com `AbortController`. |
| `carregarReferencias()` | Preenche o select com os 12 meses mais recentes. |
| `carregarMarcas()` | Carrega as marcas do tipo escolhido e reseta modelo, ano e resultado. |
| `carregarModelos()` / `filtrarModelos()` | Carregam os modelos da marca e filtram a lista pelo texto digitado. |
| `carregarAnos()` | Carrega os anos do modelo; se houver só um, já busca o valor. |
| `carregarPrecoCarro()` | Busca o valor FIPE e mostra o card verde (`criarCardPreco`). |
| `descobrirTipoEAnos()` | Tenta o código FIPE em carros, motos e caminhões até achar. |
| `consultarCodigo()` / `renderResultadoCodigo()` | Validam o formato `000000-0`, buscam todos os anos e mostram a lista de valores. |

O HTML é sempre montado com `createElement` + `textContent` (nunca `innerHTML` com dados da API), e o ano `32000` da FIPE aparece como **Zero KM**.

## Limite da API

Sem cadastro, a API permite **500 consultas por dia**. Criando um token grátis em [fipe.api.br](https://fipe.api.br/register) o limite sobe para **1000 por dia**: basta colocar o token na constante `TOKEN` no topo do `fipeApi.js`.

## Tecnologias e conceitos

- HTML5, CSS3, JavaScript (ES6+)
- `fetch` + `async/await`, `AbortController`
- Tratamento de erros com `try / catch / finally` e classe de erro própria (`ErroApi`)
- Manipulação do DOM: `createElement`, `replaceChildren`, `classList`, `new Option`
- Acessibilidade: `role="status"`, `role="alert"`, `aria-live`

## Créditos

Dados fornecidos pela [API FIPE (Parallelum)](https://fipe.api.br/).
Projeto desenvolvido por **Rafael** ([@rafael26042007-max](https://github.com/rafael26042007-max)).
