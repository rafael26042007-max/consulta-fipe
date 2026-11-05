# 🚗 Consulta Tabela FIPE

Aplicação web que consulta o preço de veículos na Tabela FIPE usando a [BrasilAPI](https://brasilapi.com.br/).

## Funcionalidades

- Consulta de preço pelo **código FIPE** (todos os anos-modelo daquele código)
- Escolha do **mês de referência** da tabela
- Exploração de **marcas e modelos** por tipo de veículo
- **Indicador de carregamento** (spinner + botão desabilitado) durante as requisições

## Endpoints usados

| Endpoint | Uso |
|---|---|
| `GET /api/fipe/preco/v1/{codigoFipe}` | Preço do veículo |
| `GET /api/fipe/tabelas/v1` | Meses de referência |
| `GET /api/fipe/marcas/v1/{tipoVeiculo}` | Marcas |
| `GET /api/fipe/veiculos/v1/{tipoVeiculo}/{codigoMarca}` | Modelos da marca |

## Como rodar

Abra o `index.html` no navegador (ou use a extensão Live Server do VS Code).

Código para testar: `001004-9`

## Tecnologias

HTML, CSS e JavaScript puro (`fetch` + `async/await`).

Projeto de referência: [fabianooss/aula-javascript-request-api](https://github.com/fabianooss/aula-javascript-request-api)
