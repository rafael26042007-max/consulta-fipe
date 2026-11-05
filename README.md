# 🚗 Consulta Tabela FIPE

Página web que consulta o preço de veículos na **Tabela FIPE** usando a [BrasilAPI](https://brasilapi.com.br/).
Feita com HTML, CSS e JavaScript puro, sem frameworks e sem dependências.

## Funcionalidades

- **Consultar preço pelo código FIPE** (ex.: `001004-9`), com opção de escolher o mês de referência.
- **Explorar marcas e modelos** por tipo de veículo (carros, motos ou caminhões), para quem não sabe o código.
- **Indicador de carregamento** (spinner) enquanto a API responde.
- **Mensagens de erro** amigáveis quando o código não existe ou a API falha.

## Como rodar

Não precisa instalar nada:

1. Clone o repositório:
   ```bash
   git clone https://github.com/rafael26042007-max/consulta-fipe.git
   ```
2. Abra o `index.html` no navegador (ou use a extensão **Live Server** do VS Code).

## Estrutura

```
consulta-fipe/
├── index.html   # Estrutura da página: formulário, loading, resultado e explorador
├── style.css    # Visual: cards, spinner, classe .oculto
└── fipeApi.js   # Toda a lógica: requisições à API e montagem da tela
```

## Endpoints da BrasilAPI usados

| Endpoint | Para quê |
|---|---|
| `GET /api/fipe/preco/v1/{codigoFipe}?tabela_referencia={codigo}` | Preço de um veículo pelo código FIPE |
| `GET /api/fipe/tabelas/v1` | Lista de meses de referência |
| `GET /api/fipe/marcas/v1/{tipoVeiculo}` | Marcas de um tipo de veículo |
| `GET /api/fipe/veiculos/v1/{tipoVeiculo}/{codigoMarca}` | Modelos de uma marca |

---

## Explicação do JavaScript (`fipeApi.js`)

O arquivo é dividido em blocos, separados por comentários `// ===== ... =====`.

### 1. Configuração e elementos da tela

```js
const BASE_URL = "https://brasilapi.com.br/api/fipe";
const formFipe = document.getElementById("formFipe");
// ...
```

- `BASE_URL` guarda o endereço base da API, para não repetir a URL em todo lugar.
- Os `document.getElementById(...)` buscam os elementos do HTML **uma vez só**. Eles ficam guardados em constantes e são reaproveitados pelas funções.

### 2. `mostrarLoading(texto)` e `esconderLoading()`

Controlam o indicador de processamento.

- **`mostrarLoading`** troca o texto do spinner, remove a classe `oculto` (o spinner aparece) e desativa o botão **Consultar** (`disabled = true`). Assim o usuário não dispara várias requisições clicando repetidas vezes.
- **`esconderLoading`** faz o contrário: esconde o spinner e reativa o botão.

### 3. `buscarNaApi(url, mensagemErro)`: função genérica de requisição

```js
async function buscarNaApi(url, mensagemErro) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(mensagemErro);
    }
    return await response.json();
}
```

É a base de todas as outras funções.

- É **`async`**: pode usar `await` e sempre devolve uma **Promise**.
- **`fetch(url)`** faz a requisição HTTP. O `await` espera a resposta **sem travar a página**.
- **`response.ok`** é `true` quando o status está entre 200 e 299. Se não estiver (404, 500…), a função **lança um erro** (`throw`) com a mensagem recebida, e esse erro é capturado pelo `catch` de quem chamou.
- **`response.json()`** converte o corpo da resposta em objeto/array JavaScript.

Como a lógica de fetch e de verificação fica num lugar só, as outras funções só precisam passar a URL e a mensagem de erro.

### 4. `consultarPreco(event)`

Roda quando o formulário é enviado (evento `submit`).

1. **`event.preventDefault()`** impede o comportamento padrão do formulário, que é recarregar a página.
2. Lê o código digitado (`.trim()` tira espaços das pontas) e o mês escolhido.
3. Limpa a mensagem de erro e o resultado anterior, depois mostra o loading.
4. Monta a URL com *template string* (`` `${...}` ``) e só adiciona `?tabela_referencia=` se algum mês foi escolhido.
5. Usa **`try / catch / finally`**:
   - `try`: chama `buscarNaApi` e depois `renderResultado`.
   - `catch`: se algo der errado, mostra `error.message` na tela.
   - `finally`: roda **sempre**, com sucesso ou com erro, e esconde o loading.

### 5. `renderResultado(veiculos)`

Monta o resultado na tela. A API devolve um **array** com um item para cada ano-modelo daquele código.

- Usa o **primeiro item** para criar o card de título (marca, modelo, código FIPE e mês de referência).
- Com **`forEach`**, cria um card de preço para cada ano-modelo, mostrando ano, combustível e valor.
- A FIPE usa o ano **`32000`** para representar veículos **Zero KM**, então o código troca esse número pelo texto `"Zero KM"` com um **operador ternário** (`condição ? seVerdadeiro : seFalso`).
- Cada card é criado com `document.createElement("div")` e adicionado à página com `appendChild`.

### 6. `carregarTabelas()`

Busca os **meses de referência** e preenche o `<select>` de mês.

- **`slice(0, 12)`** pega só os 12 meses mais recentes, para a lista não ficar gigante.
- Para cada mês cria um `<option>`: o `value` é o código da tabela e o texto é o nome do mês.
- Se der erro, ele vai só para o `console.error`. Isso não é crítico, porque sem essa lista a consulta continua funcionando com a opção "Mais recente".

### 7. `carregarMarcas()`

Busca as **marcas** do tipo de veículo selecionado (carros, motos ou caminhões).

- Mostra "Carregando marcas..." no `<select>` enquanto espera.
- Limpa a lista de modelos, porque ela pertencia à marca anterior.
- Cria um `<option>` para cada marca: o `value` é o código da marca e o texto é o nome.
- Se der erro, a própria mensagem aparece dentro do `<select>`.

### 8. `carregarModelos()`

Busca os **modelos** da marca escolhida e mostra numa lista (`<ul>`).

- **`if (!selectMarca.value) return;`** é um *early return*: se nenhuma marca foi escolhida, a função para ali mesmo.
- Cria um `<li>` para cada modelo.
- Usa o mesmo padrão `try / catch / finally` com loading.

### 9. Eventos e inicialização

```js
formFipe.addEventListener("submit", consultarPreco);
selectTipo.addEventListener("change", carregarMarcas);
selectMarca.addEventListener("change", carregarModelos);

carregarTabelas();
carregarMarcas();
```

- **`addEventListener`** liga cada função a um evento:
  - enviar o formulário → `consultarPreco`
  - trocar o tipo de veículo → `carregarMarcas`
  - trocar a marca → `carregarModelos`
- As duas últimas linhas rodam assim que a página abre, carregando os meses e as marcas de carros (o tipo padrão).

## Fluxo resumido

```
Usuário digita o código e clica em "Consultar"
        │
        ▼
consultarPreco ──► mostrarLoading
        │
        ▼
buscarNaApi (fetch + verificação + JSON)
        │
   ┌────┴────┐
 deu certo  deu erro
   │          │
renderResultado  mostra mensagem no #status
   └────┬────┘
        ▼
  esconderLoading (finally)
```

## Tecnologias e conceitos

- HTML5, CSS3, JavaScript (ES6+)
- `fetch` + `async/await` para requisições assíncronas
- Tratamento de erros com `try / catch / finally` e `throw new Error`
- Manipulação do DOM: `getElementById`, `createElement`, `appendChild`, `classList`
- Eventos com `addEventListener`
- Métodos de array: `forEach`, `slice`

## Créditos

Dados fornecidos pela [BrasilAPI](https://brasilapi.com.br/).
Projeto desenvolvido por **Rafael** ([@rafael26042007-max](https://github.com/rafael26042007-max)).
