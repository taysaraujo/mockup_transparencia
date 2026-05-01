# Modelo Unificado de Despesas

## Diagnóstico das Redundâncias

Todas as três tabelas repetem os mesmos 14+ campos de contexto orçamentário e do credor em cada linha:

| Campo redundante | Presente em |
|---|---|
| `ugcodigo` | Empenho, Liquidação, Pagamento |
| `categoria_despesa_codigo` + `categoria_despesa` | Empenho, Liquidação, Pagamento |
| `grupo_despesa_codigo` + `grupo_despesa` | Empenho, Liquidação, Pagamento |
| `modalidade_despesa_codigo` + `modalidade_despesa` | Empenho, Liquidação, Pagamento |
| `elemento_despesa_codigo` + `elemento_despesa` | Empenho, Liquidação, Pagamento |
| `item_despesa_codigo` + `item_despesa` | Empenho, Liquidação, Pagamento |
| `nroprocesso` | Empenho, Liquidação, Pagamento |
| `funcionalprogramatica` | Empenho, Liquidação, Pagamento |
| `fonterecursocodigo` | Empenho, Liquidação, Pagamento |
| `credoridentificacao` | Empenho, Liquidação, Pagamento |
| `licitacao` | Empenho, Liquidação, Pagamento |
| `procedimento_licitatorio` | Empenho, Pagamento |
| `especificacao` | Empenho, Liquidação, Pagamento |
| `origem` | Empenho, Liquidação, Pagamento |

> [!CAUTION]
> Esses campos pertencem ao **Empenho**. Repeti-los na liquidação e pagamento é redundância pura — eles nunca mudam em relação ao empenho pai.

---

## Modelo Proposto: 4 Entidades Normalizadas

### Diagrama ER

```
ClassificacaoOrcamentaria ──────< Empenho >────── Liquidacao
          (1)                        (1)               (N)
                                      │
                                      └──────────── Pagamento
                                                       (N)
```

---

### Entidade 1 — `ClassificacaoOrcamentaria`

> Agrupa todos os campos de natureza de despesa que se repetem. Gerado a partir do empenho, pode ser reutilizado por lookup.

| Campo | Tipo | Observação |
|---|---|---|
| **`id`** | string (PK) | Hash ou concatenação dos códigos abaixo |
| `categoria_codigo` | string | Ex: `"3"` |
| `categoria_descricao` | string | Ex: `"DESPESAS CORRENTES"` |
| `grupo_codigo` | string | Ex: `"33"` |
| `grupo_descricao` | string | Ex: `"OUTRAS DESPESAS CORRENTES"` |
| `modalidade_codigo` | string | Ex: `"3390"` |
| `modalidade_descricao` | string | Ex: `"APLICAÇÕES DIRETAS"` |
| `elemento_codigo` | string | Ex: `"339014"` |
| `elemento_descricao` | string | Ex: `"DIÁRIAS - CIVIL"` |
| `item_codigo` | string | Ex: `"33901401"` |
| `item_descricao` | string | Ex: `"DIÁRIAS NO ESTADO"` |

**Chave natural candidata**: concatenação de `categoria_codigo + grupo_codigo + modalidade_codigo + elemento_codigo + item_codigo`.

---

### Entidade 2 — `Empenho`

> O registro raiz da despesa. Contém contexto orçamentário, credor, processo e valor empenhado.

| Campo | Tipo | Observação |
|---|---|---|
| **`nrodocumento`** | string (PK) | Ex: `"2026NE000185"` |
| `ugcodigo` | number | Código da unidade gestora |
| `dataemissao` | date | Data do empenho |
| `classificacao_id` | string (FK) | → `ClassificacaoOrcamentaria.id` |
| `nroprocesso` | string | Número do processo SEI |
| `funcionalprogramatica` | string | Código da ação orçamentária |
| `fonterecursocodigo` | string | Fonte de recursos |
| `especificacao` | string | Objeto/descrição do empenho |
| `credoridentificacao` | string | CPF/CNPJ do credor |
| `licitacao` | string | Modalidade de licitação |
| `procedimento_licitatorio` | string | Detalhamento do certame |
| `origem` | string | Origem do lançamento |
| `valordespesa` | number | Valor empenhado (negativo = anulação) |
| `estorno` | boolean | `true` se for anulação |

---

### Entidade 3 — `Liquidacao`

> Registro de liquidação vinculado ao empenho. Herda o contexto orçamentário via FK — **não repete os campos**.

| Campo | Tipo | Observação |
|---|---|---|
| **`nrodocumento`** | string (PK) | Ex: `"2026LQ000439"` |
| `nroempenho` | string (FK) | → `Empenho.nrodocumento` |
| `dataemissao` | date | Data da liquidação |
| `valordespesa` | number | Valor liquidado |
| `estorno` | boolean | `true` se for estorno |
| `origem` | string | Origem do lançamento |

> [!NOTE]
> Os campos `especificacao`, `nroprocesso`, `credoridentificacao` etc. são **omitidos** aqui pois são recuperados via join com o Empenho pai.

---

### Entidade 4 — `Pagamento`

> Registro de desembolso financeiro vinculado ao empenho. O tipo do pagamento é derivado do prefixo do `nrodocumento`.

| Campo | Tipo | Observação |
|---|---|---|
| **`nrodocumento`** | string (PK) | Ex: `"2026OB00943"` |
| `nroempenho` | string (FK) | → `Empenho.nrodocumento` |
| `dataemissao` | date | Data do pagamento |
| `valordespesa` | number | Valor pago |
| `tipo` | enum | Derivado do prefixo: `OB` \| `DPG` \| `RT` |
| `estorno` | boolean | `true` se for estorno |
| `origem` | string | Origem do lançamento |

> [!NOTE]
> O campo `tipo` **não existe nos CSVs** mas pode ser derivado automaticamente a partir do `nrodocumento` (`2026OB...` → `OB`, `2026DPG...` → `DPG`, `2026RT...` → `RT`), evitando lógica repetida no front-end.

---

## Comparativo de Colunas: Antes × Depois

| | Empenho | Liquidação | Pagamento | **Total** |
|---|---|---|---|---|
| **Antes** | 23 cols | 23 cols | 24 cols | **70 cols** |
| **Depois** | 14 cols | 6 cols | 7 cols + ClassOrç (10 cols) | **37 cols** |
| **Redução** | — | — | — | **~47%** |

---

## Representação como objetos JavaScript (para o React)

```js
// ClassificacaoOrcamentaria
{
  id: "3-33-3390-339014-33901401",
  categoria: { codigo: "3", descricao: "DESPESAS CORRENTES" },
  grupo: { codigo: "33", descricao: "OUTRAS DESPESAS CORRENTES" },
  modalidade: { codigo: "3390", descricao: "APLICAÇÕES DIRETAS" },
  elemento: { codigo: "339014", descricao: "DIÁRIAS - CIVIL" },
  item: { codigo: "33901401", descricao: "DIÁRIAS NO ESTADO" }
}

// Empenho
{
  nrodocumento: "2026NE000185",
  ugcodigo: 30101,
  dataemissao: "2026-02-10",
  classificacaoId: "3-33-3390-339014-33901401",
  nroprocesso: "030004882026",
  funcionalprogramatica: "100310101032000220110001",
  fonterecursocodigo: "150000001",
  especificacao: "Empenho para concessão de diárias...",
  credoridentificacao: "00272964158",
  licitacao: "NÃO APLICA",
  procedimento_licitatorio: null,
  origem: null,
  valordespesa: 697.5,
  estorno: false,

  // Referências resolvidas em runtime
  liquidacoes: [ /* Liquidacao[] */ ],
  pagamentos: [ /* Pagamento[] */ ]
}

// Liquidacao
{
  nrodocumento: "2026LQ000439",
  nroempenho: "2026NE000054",
  dataemissao: "2026-03-24",
  valordespesa: 327.35,
  estorno: false,
  origem: null
}

// Pagamento
{
  nrodocumento: "2026OB00943",
  nroempenho: "2026NE000051",
  dataemissao: "2026-04-06",
  valordespesa: 690.97,
  tipo: "OB",       // derivado do nrodocumento
  estorno: false,
  origem: null
}
```

---

## Decisões em aberto

> [!IMPORTANT]
> Antes de implementar, confirme as seguintes decisões:

1. **`ClassificacaoOrcamentaria` como entidade separada ou campo nested no Empenho?**
   - _Entidade separada_: economiza memória em datasets grandes, facilita lookup e agrupamento por natureza de despesa
   - _Nested_: mais simples para o front-end, sem joins
   
2. **`especificacao` em Liquidação e Pagamento**: nos CSVs o valor é sempre `"LIQUIDACAO"` / `"PAGAMENTO"` — pode ser descartado completamente?

3. **`nroprocesso` em Liquidação**: algumas linhas têm valor preenchido, outras não. Deve ser mantido como campo opcional na Liquidação?

4. **Quer que eu implemente o parser desses CSVs em JavaScript** para carregar esses dados já no modelo proposto dentro do projeto React/Vite?
