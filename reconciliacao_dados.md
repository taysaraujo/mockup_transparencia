# Reconciliação: Layout (App.jsx) × Dados Reais (CSV)

## Estrutura de análise

Para cada campo do layout, a tabela indica:
- **Campo no layout** → nome exato usado no App.jsx
- **Campo(s) no CSV** → coluna(s) correspondente(s)
- **Transformação** → o que precisa ser feito para encaixar
- **Regra de negócio** → como o dado é interpretado/calculado
- **Confiança** → 🟢 Alta | 🟡 Média | 🔴 Lacuna

---

## 1. Entidade `Empenho` (objeto principal da listagem)

| Campo no layout | Campo(s) no CSV | Transformação | Regra de Negócio | Confiança |
|---|---|---|---|---|
| `id` | `nrodocumento` | Direto | Identificador único do empenho. Ex: `2026NE000185` | 🟢 Alta |
| `data` | `dataemissao` | Formatar: `YYYY-MM-DD` → `DD/MM/YYYY` | Data de emissão do empenho | 🟢 Alta |
| `ug` | `ugcodigo` | Converter para string (`30101`) | Código da unidade gestora | 🟢 Alta |
| `credor` | `credoridentificacao` + nome | **⚠️ Lacuna parcial**: CSV tem só CPF/CNPJ, sem o nome do credor separado | No mock, é `"CPF/CNPJ - Nome"`. O nome precisa vir de cadastro externo ou ser extraído da `especificacao` | 🟡 Média |
| `objeto` | `especificacao` | Direto | Texto livre descrevendo o objeto do empenho | 🟢 Alta |
| `processo` | `nroprocesso` | Direto | Número do processo SEI. Pode ser nulo em liquidações | 🟢 Alta |
| `origem` | `licitacao` + `procedimento_licitatorio` | Concatenar: `licitacao` é a modalidade (ex: `DISPENSA`), `procedimento_licitatorio` é o detalhamento (ex: `PREGÃO ELETRÔNICO Nº 38/2023/SAD.`) | No mock, `origem` mescla modalidade e número do certame | 🟡 Média |
| `valor` | `valordespesa` | Formatar como `"R$ X.XXX,XX"` | Valor bruto empenhado; negativos = anulação | 🟢 Alta |
| `fase` | **Derivado** | Calculado em runtime | Ver regra abaixo ↓ | 🟡 Média |
| `funcao` | `funcionalprogramatica` | Extrair posições 0-1 da string `"100310101032000220110001"` | Código de 2 dígitos da função. **Lacuna**: precisa de tabela de-para (código → descrição) | 🔴 Lacuna parcial |
| `classificacao` | `categoria_despesa_codigo` + `grupo_despesa_codigo` + `modalidade_despesa_codigo` + `elemento_despesa_codigo` + `item_despesa_codigo` | Concatenar os códigos: `"3" + "33" + "3390" + "339014" + "33901401"` → `"3339033901433901401"` | Usado para filtro de classificação. Formato exato depende da lógica `startsWith` no filtro | 🟡 Média |

### Regra de negócio: campo `fase`

O campo `fase` não existe nos CSVs. Deve ser **derivado cruzando as três tabelas**:

```
SE empenho.nrodocumento NÃO existe em pagamento.nroempenho E NÃO existe em liquidacao.nroempenho
  → fase = "Empenhado"

SE empenho.nrodocumento existe em liquidacao.nroempenho MAS NÃO em pagamento.nroempenho
  → fase = "Liquidado"

SE empenho.nrodocumento existe em pagamento.nroempenho
  → fase = "Pago"
```

> Atenção: um empenho pode ter liquidações e ainda estar parcialmente pago. Nesse caso, a fase deve ser "Pago" (fase mais avançada atingida).

---

## 2. Objeto `valores` (KPIs por empenho)

| Campo no layout | Fonte CSV | Transformação | Regra de Negócio | Confiança |
|---|---|---|---|---|
| `valores.empenhado` | `SUM(empenho.valordespesa)` onde `nrodocumento = X` | Somar todos os registros do empenho (incluindo anulações com valor negativo) | Um empenho pode ter mais de uma linha (suplementação/anulação). O saldo é a soma líquida | 🟢 Alta |
| `valores.liquidado` | `SUM(liquidacao.valordespesa)` onde `nroempenho = X` | Somar liquidações vinculadas | Idem — pode haver estornos de liquidação (negativos) | 🟢 Alta |
| `valores.pago` | `SUM(pagamento.valordespesa)` onde `nroempenho = X` | Somar pagamentos vinculados | Inclui OB, DPG, RT — todos com sinal | 🟢 Alta |
| `valores.aPagar` | Calculado | `empenhado - pago` | Saldo a desembolsar. Pode ser negativo em casos de pagamento maior que o empenhado (raro) | 🟢 Alta |

---

## 3. Objeto `programatica` (detalhe do empenho)

| Campo no layout | Campo(s) no CSV | Transformação | Regra de Negócio | Confiança |
|---|---|---|---|---|
| `programatica.codigo` | `funcionalprogramatica` | Direto | Código completo da ação orçamentária. Ex: `"100310101032000220110001"` | 🟢 Alta |
| `programatica.unidade` | `ugcodigo` | De-para: `30101` → `"30101 - TCE-MS PRINCIPAL"` | Nome completo da UG precisa de tabela auxiliar | 🟡 Média |
| `programatica.funcao` | `funcionalprogramatica`[7:9] (0-based) | `str.substring(7, 9)` | 2 dígitos da função. Ex: `"01"` → `"01 - Legislativa"`. De-para com tabela SIOP | 🟡 Média |
| `programatica.subfuncao` | `funcionalprogramatica`[9:12] | `str.substring(9, 12)` | 3 dígitos da subfunção. Ex: `"032"` → `"032 - Controle Externo"` | 🟡 Média |
| `programatica.programa` | `funcionalprogramatica`[12:16] | `str.substring(12, 16)` | 4 dígitos do programa. Ex: `"0022"` | 🟡 Média |
| `programatica.projetoAtividade` | `funcionalprogramatica`[16:20] | `str.substring(16, 20)` | 4 dígitos da ação. Ex: `"0110"` → `"2.011 - Atividade contínua..."` | 🟡 Média |
| `programatica.fonte` | `fonterecursocodigo` | De-para: `"150000001"` → `"15000000 - Recursos Não Vinculados de Impostos"` | Código da fonte de recursos. Precisa de tabela de-para | 🔴 Lacuna |
| `programatica.categoria` | `categoria_despesa_codigo` + `categoria_despesa` | Concatenar: `"3 - DESPESAS CORRENTES"` | Direto, já temos código e descrição no CSV | 🟢 Alta |
| `programatica.gnd` | `grupo_despesa_codigo` + `grupo_despesa` | Concatenar: `"33 - OUTRAS DESPESAS CORRENTES"` | No mock usa `gnd` com código de 1 dígito (ex: `"3"`). O CSV tem `"33"` (2 dígitos). Verificar se o filtro usa código curto ou longo | 🟡 Média |
| `programatica.modalidade` | `modalidade_despesa_codigo` + `modalidade_despesa` | Concatenar: `"3390 - APLICAÇÕES DIRETAS"` | CSV tem código de 4 dígitos; layout usa versão abreviada `"90"`. Mapear | 🟡 Média |
| `programatica.elemento` | `elemento_despesa_codigo` + `elemento_despesa` | Concatenar: `"339014 - DIÁRIAS - CIVIL"` | Direto | 🟢 Alta |
| `programatica.itemDespesa` | `item_despesa_codigo` + `item_despesa` | Concatenar: `"33901401 - DIÁRIAS NO ESTADO"` | Direto | 🟢 Alta |

---

## 4. Sub-arrays de fases (tabelas no detalhe do empenho)

### `empenhos[]` (array na tela de detalhe)

> No App.jsx, o detalhe exibe uma tabela "Empenhos Relacionados" que repete o próprio empenho mais eventuais aditivos.

| Campo no layout | Campo(s) no CSV | Transformação | Confiança |
|---|---|---|---|
| `data` | `empenho.dataemissao` | `YYYY-MM-DD` → `DD/MM/YYYY` | 🟢 Alta |
| `documento` | `empenho.nrodocumento` | Direto | 🟢 Alta |
| `ug` | `empenho.ugcodigo` | String | 🟢 Alta |
| `modalidade` | `empenho.modalidade_despesa` | Direto | 🟢 Alta |
| `elemento` | `empenho.elemento_despesa_codigo` + `elemento_despesa` | Concatenar com `" - "` | 🟢 Alta |
| `cpfCnpj` | `empenho.credoridentificacao` | Direto (mascarado para CPF) | 🟢 Alta |
| `favorecido` | `empenho.credoridentificacao` | **⚠️ Lacuna**: CSV não tem o nome, só o CPF/CNPJ | 🔴 Lacuna |
| `valor` | `empenho.valordespesa` | `parseFloat()` | 🟢 Alta |

### `liquidacoes[]`

| Campo no layout | Campo(s) no CSV | Transformação | Confiança |
|---|---|---|---|
| `data` | `liquidacao.dataemissao` | `YYYY-MM-DD` → `DD/MM/YYYY` | 🟢 Alta |
| `documento` | `liquidacao.nrodocumento` | Direto | 🟢 Alta |
| `ug` | `liquidacao.ugcodigo` | String | 🟢 Alta |
| `modalidade` | `liquidacao.modalidade_despesa` | Direto | 🟢 Alta |
| `elemento` | `liquidacao.elemento_despesa_codigo` + `elemento_despesa` | Concatenar | 🟢 Alta |
| `cpfCnpj` | `liquidacao.credoridentificacao` | Direto | 🟢 Alta |
| `favorecido` | **❌ Ausente** | Mesma lacuna do empenho | 🔴 Lacuna |
| `valor` | `liquidacao.valordespesa` | `parseFloat()` | 🟢 Alta |

### `pagamentos[]`

| Campo no layout | Campo(s) no CSV | Transformação | Confiança |
|---|---|---|---|
| `data` | `pagamento.dataemissao` | `YYYY-MM-DD` → `DD/MM/YYYY` | 🟢 Alta |
| `documento` | `pagamento.nrodocumento` | Direto | 🟢 Alta |
| `ug` | `pagamento.ugcodigo` | String | 🟢 Alta |
| `modalidade` | `pagamento.modalidade_despesa` | Direto | 🟢 Alta |
| `elemento` | `pagamento.elemento_despesa_codigo` + `elemento_despesa` | Concatenar | 🟢 Alta |
| `cpfCnpj` | `pagamento.credoridentificacao` | Direto | 🟢 Alta |
| `favorecido` | **❌ Ausente** | Mesma lacuna | 🔴 Lacuna |
| `valor` | `pagamento.valordespesa` | `parseFloat()` | 🟢 Alta |

---

## 5. Filtros da Barra Lateral

| Filtro no layout | Campo(s) no CSV | Estratégia | Confiança |
|---|---|---|---|
| **Ano** | `dataemissao` | Extrair ano: `dataemissao.substring(0,4)` | 🟢 Alta |
| **Período (data início/fim)** | `dataemissao` | Comparar `Date` após parse | 🟢 Alta |
| **Unidade Gestora** | `ugcodigo` | Comparar como string | 🟢 Alta |
| **Empenho** (busca texto) | `nrodocumento` | `includes()` case-insensitive | 🟢 Alta |
| **Favorecido/Credor** (busca texto) | `credoridentificacao` | `includes()` funciona para CPF/CNPJ. **Sem nome** | 🟡 Média |
| **Descrição** (busca texto) | `especificacao` | `includes()` case-insensitive | 🟢 Alta |
| **Função** | `funcionalprogramatica`[7:9] | `str.substring(7, 9)` + de-para (tabela SIOP) | 🟡 Média |
| **SubFunção** | `funcionalprogramatica`[9:12] | `str.substring(9, 12)` + de-para | 🟡 Média |
| **Categoria Econômica** | `categoria_despesa_codigo` | `startsWith(codigo)` | 🟢 Alta |
| **Grupo** | `grupo_despesa_codigo` | Comparar código | 🟢 Alta |
| **Elemento** | `elemento_despesa_codigo` | `startsWith(codigo)` | 🟢 Alta |

---

## 6. Tabela de Classificação Orçamentária (Hierárquica / Drill-down)

| Nível no layout | Campo(s) no CSV | Como derivar | Confiança |
|---|---|---|---|
| Categoria Econômica | `categoria_despesa_codigo` + `categoria_despesa` | GROUP BY nos registros de empenho | 🟢 Alta |
| GND (Grupo) | `grupo_despesa_codigo` + `grupo_despesa` | GROUP BY filho de categoria | 🟢 Alta |
| Modalidade de Aplicação | `modalidade_despesa_codigo` + `modalidade_despesa` | GROUP BY filho de grupo | 🟢 Alta |
| Elemento de Despesa | `elemento_despesa_codigo` + `elemento_despesa` | GROUP BY filho de modalidade | 🟢 Alta |
| Valores (empenhado/liquidado/pago) | Cross-join das três tabelas | Agregar SUM por nível | 🟢 Alta |

> A árvore hierárquica é 100% derivável dos dados reais, agrupando `empenho` por combinação de `categoria → grupo → modalidade → elemento`. O layout já modela exatamente essa hierarquia.

---

## 7. Lacunas: campos do layout SEM dado real disponível

| Campo no layout | Situação | Solução recomendada |
|---|---|---|
| `credor` / `favorecido` (nome) | CSV tem só CPF/CNPJ | ✅ **Decisão**: exibir CPF/CNPJ como está. Integração com cadastro externo posterior |
| `programatica.funcao` (descrição) | Código em `funcionalprogramatica`[7:9] | Incluir tabela de-para das 28 funções SIOP |
| `programatica.subfuncao` | `funcionalprogramatica`[9:12] | Incluir tabela de-para das subfunções SIOP |
| `programatica.programa` | `funcionalprogramatica`[12:16] | Tabela de-para ou exibir só o código |
| `programatica.projetoAtividade` | `funcionalprogramatica`[16:20] | Tabela de-para ou exibir só o código |
| `programatica.fonte` (descrição) | `fonterecursocodigo` | Incluir tabela auxiliar de fontes de recursos |
| ~~`programatica.subelemento`~~ | — | ✅ **Decisão**: **removido do layout** — campo inexistente nos CSVs |

---

## 8. Oportunidades: dados reais NÃO aproveitados no layout atual

| Campo no CSV | Tabela | Oportunidade |
|---|---|---|
| `estorno` | Empenho, Liquidação, Pagamento | Sinalizar visualmente empenhos com anulações (badge/tag vermelho) |
| `origem` | Empenho | Distinguir a origem do lançamento (manual, sistema, importação) |
| `procedimento_licitatorio` | Empenho, Pagamento | Exibir número do certame com link para pesquisa de contratos |
| `item_despesa_codigo` + `item_despesa` | Todos | Nível mais granular de classificação — poderia ser um 5º nível no drill-down |
| `tipo de pagamento` (derivado de `nrodocumento`) | Pagamento | Distinguir OB / DPG / RT na tabela de pagamentos — hoje todos aparecem iguais |
| `valordespesa < 0` | Todos | Identificar e destacar estornos financeiros no histórico de fases |

---

## 9. Resumo executivo

```
✅ Campos mapeados com alta confiança:  ~65%
⚠️  Campos com correspondência parcial:  ~15%
❌  Lacunas (dado ausente nos CSVs):      ~20%
```

### Ações necessárias antes da implementação

1. **Tabela de-para: Unidades Gestoras** (`ugcodigo` → nome completo) — pode ser hardcoded com os 2 UGs presentes nos dados
2. **Tabela de-para: Funções e Subfunções** — estrutura SIOP com ~28 funções e ~110 subfunções (arquivo auxiliar JSON)
3. **Tabela de-para: Fontes de Recursos** — mapeamento `fonterecursocodigo` → descrição
4. **Estratégia para nome do credor** — exibir só CPF/CNPJ mascarado ou integrar com cadastro externo
5. **Parsing do `funcionalprogramatica`** — definir o formato exato da string `"100310101032000220110001"` para extrair os segmentos corretamente
