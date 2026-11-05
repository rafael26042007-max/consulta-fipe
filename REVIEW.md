# Code review — consulta-fipe

Revisão do commit `47d97d9` (`index.html`, `fipeApi.js`, `style.css`).
Estilo guiado: cada ponto tem a **localização**, o **problema** e uma **dica** — a correção fica com você. Se travar em algum, é só pedir a solução.

## O que já está bom

- `buscarNaApi` centraliza o `fetch` + checagem de `response.ok` — boa abstração.
- Uso correto de `try / catch / finally` para o loading sempre sumir.
- `event.preventDefault()` no submit e `trim()` no código.
- Tratamento do `anoModelo === 32000` como "Zero KM" — detalhe que muita gente esquece.
- Comentários por bloco e nomes em português consistentes.

## Tabela de problemas

| # | Gravidade | Onde | Problema | Dica |
|---|-----------|------|----------|------|
| 1 | 🔴 Alta | `fipeApi.js` L75 (`renderResultado`) | Se a API devolver uma lista **vazia** com status 200, `veiculos[0]` é `undefined` e o usuário vê um erro técnico em inglês ("Cannot read properties of undefined"). | O que acontece se você chamar `renderResultado([])`? Onde faz mais sentido verificar isso? |
| 2 | 🔴 Alta | `fipeApi.js` L34-40 + L61 | Toda falha vira "Código FIPE não encontrado": erro 500, limite de requisições (429) e até **sem internet** (o `fetch` lança `TypeError: Failed to fetch`, que aparece em inglês na tela). | Olhe o `response.status`. E pense: qual erro o `fetch` lança quando a rede cai — ele passa pelo seu `if (!response.ok)`? |
| 3 | 🟠 Média | `fipeApi.js` L56 | O texto digitado entra direto no caminho da URL. Algo como `../marcas/v1/carros` faz o app chamar **outro endpoint**. | Pesquise `encodeURIComponent`. Bônus: dá para validar o formato `000000-0` com uma regex *antes* de gastar uma requisição? |
| 4 | 🟠 Média | `fipeApi.js` L79-83 e L92-98 | Dados da API vão para `innerHTML` via template string. Hoje a API é confiável, mas é o padrão que abre brecha para XSS quando a fonte muda. | Você já usa `textContent` em `carregarModelos`. Dá para montar o card do mesmo jeito? |
| 5 | 🟠 Média | `fipeApi.js` L149-170 (`carregarModelos`) e L126-144 (`carregarMarcas`) | **Condição de corrida**: trocar de marca (ou de tipo) rápido dispara várias requisições; elas podem chegar fora de ordem e a lista mistura modelos de marcas diferentes ou mostra marcas do tipo errado. | Depois do `await`, a marca selecionada ainda é a mesma que pediu os dados? Como você saberia? (Pesquise também `AbortController`.) |
| 6 | 🟡 Baixa | `fipeApi.js` L20-29 + L153 | Loading e botão são **compartilhados**: buscar modelos trava o botão "Consultar", e se as duas buscas rodam juntas, a que termina primeiro esconde o spinner da outra. O spinner também aparece longe da lista de modelos. | Quantas operações podem estar "carregando" ao mesmo tempo? Um único `display` dá conta disso? |
| 7 | 🟡 Baixa | `fipeApi.js` L150-153 | `carregarModelos` não limpa `status`; um erro antigo da consulta de preço continua na tela. E o erro de modelos aparece lá em cima, perto do formulário. | Quem é "dono" de cada mensagem de erro? |
| 8 | 🟡 Funcional | Seção "Não sabe o código?" | A seção promete ajudar quem não sabe o código, mas a lista mostra só o **nome** do modelo — o usuário continua sem o código FIPE. | Veja o que o endpoint `/veiculos/v1` realmente retorna. Se não trouxer o código, como o usuário chegaria nele? (Talvez mudar o texto da seção já resolva.) |
| 9 | 🟡 Baixa | `fipeApi.js` L111 | `slice(0, 12)` assume que a API devolve os meses do mais novo para o mais antigo. | Confirme a ordem na resposta real — e se um dia mudar? |
| 10 | ⚪ Acessibilidade | `index.html` L35, L41 | Leitor de tela não anuncia o loading nem os erros. | Pesquise `aria-live` e `role="alert"`. |
| 11 | ⚪ Detalhe | `index.html` L14 | `target="_blank"` sem `rel="noopener"`. | Navegadores modernos já tratam, mas é boa prática deixar explícito. |
| 12 | ⚪ Repo | raiz | O último commit removeu o README. | Um README curto (o que faz, como rodar, API usada) ajuda muito no portfólio. |

## Perguntas para pensar

1. Se você fosse testar este app manualmente, quais **3 entradas** usaria para tentar quebrá-lo?
2. Os itens 5 e 6 têm a mesma raiz. Qual é?
3. O que mudaria no item 4 se, em vez da BrasilAPI, os dados viessem de um formulário de outro usuário?

## Ordem sugerida de correção

1 → 2 → 3 (robustez básica) · 5 → 6 → 7 (estado da tela) · 4 · 8 · resto.
