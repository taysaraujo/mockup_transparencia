/**
 * normalizador.js   —   Camada 2: Normalização dos campos brutos
 *
 * Responsabilidade: receber um registro CSV bruto (strings) e produzir
 * um objeto normalizado com tipos corretos, sem referência ao modelo do layout.
 *
 * Esta camada NÃO conhece o App.jsx. Ela apenas:
 *   - Converte tipos (string → number, string → boolean, string → Date)
 *   - Limpa espaços, caracteres de controle e ruídos
 *   - Resolve campos vazios para null (nunca undefined)
 *   - Mantém rastreabilidade: cada campo normalizad tem seu campo de origem documentado
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RASTREABILIDADE  (campo_origem → campo_normalizado)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * EMPENHO CSV:
 *   ugcodigo                    → ug_codigo              (string)
 *   nrodocumento               → id_documento           (string) — PK do empenho
 *   dataemissao                → data_emissao           (string ISO)
 *   categoria_despesa_codigo   → categoria_codigo       (string)
 *   categoria_despesa          → categoria_descricao    (string)
 *   grupo_despesa_codigo       → grupo_codigo           (string)
 *   grupo_despesa              → grupo_descricao        (string)
 *   modalidade_despesa_codigo  → modalidade_codigo      (string)
 *   modalidade_despesa         → modalidade_descricao   (string)
 *   elemento_despesa_codigo    → elemento_codigo        (string)
 *   elemento_despesa           → elemento_descricao     (string)
 *   nroprocesso                → nro_processo           (string|null)
 *   funcionalprogramatica      → funcional_programatica (string)
 *   fonterecursocodigo         → fonte_codigo           (string)
 *   especificacao              → especificacao          (string)
 *   credoridentificacao        → credor_identificacao   (string)
 *   licitacao                  → licitacao_modalidade   (string)
 *   valordespesa               → valor_despesa          (number) — negativo = anulação
 *   item_despesa_codigo        → item_codigo            (string)
 *   item_despesa               → item_descricao         (string)
 *   estorno                    → is_estorno             (boolean)
 *   origem                     → origem                 (string|null)
 *   procedimento_licitatorio   → procedimento_licitatorio (string|null) — só em empenho/pagamento
 *
 * LIQUIDAÇÃO CSV (mesmos acima, exceto):
 *   nroempenho                 → id_empenho_ref         (string) — FK → empenho.id_documento
 *   nrodocumento               → id_documento           (string) — PK da liquidação
 *   [sem procedimento_licitatorio]
 *
 * PAGAMENTO CSV (mesmos do empenho, exceto ordem diferente de colunas):
 *   nrodocumento               → id_documento           (string) — PK do pagamento
 *   nroempenho                 → id_empenho_ref         (string) — FK → empenho.id_documento
 *   procedimento_licitatorio   → procedimento_licitatorio (string|null)
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Remove ruídos comuns: espaços extras, tabs, aspas residuais.
 * @param {string} val
 * @returns {string}
 */
function limpar(val) {
  if (val == null) return '';
  return String(val)
    .replace(/\t+/g, ' ')       // tabs → espaço
    .replace(/"{2,}/g, '"')     // aspas duplas extras
    .replace(/^"+|"+$/g, '')    // aspas nas bordas
    .trim();
}

/**
 * Converte string para número seguro. Trata vírgula como decimal se necessário.
 * Retorna null em vez de NaN para campos ausentes.
 * @param {string} val
 * @returns {number|null}
 */
function toNumber(val) {
  const s = limpar(val);
  if (!s) return null;
  // CSV usa ponto como separador decimal (confirmado nas amostras)
  const n = parseFloat(s.replace(',', '.'));
  return isNaN(n) ? null : n;
}

/**
 * Converte campo "S"/"N"/"" para boolean.
 * Confirmado nas amostras: campo `estorno` usa "N" e presumidamente "S".
 * @param {string} val
 * @returns {boolean}
 */
function toBoolean(val) {
  return limpar(val).toUpperCase() === 'S';
}

/**
 * Retorna null para strings vazias; mantém string limpa caso contrário.
 * @param {string} val
 * @returns {string|null}
 */
function orNull(val) {
  const s = limpar(val);
  return s === '' ? null : s;
}

// ─── Normalizadores por tabela ─────────────────────────────────────────────

/**
 * Normaliza um registro bruto da tabela EMPENHO.
 *
 * @param {Record<string, string>} raw
 * @returns {NormEmpenho}
 */
export function normalizarEmpenho(raw) {
  return {
    // Identificação e período
    ug_codigo:             limpar(raw.ugcodigo),
    id_documento:          limpar(raw.nrodocumento),       // PK
    data_emissao:          orNull(raw.dataemissao),        // formato ISO: YYYY-MM-DD

    // Classificação orçamentária — natureza da despesa
    categoria_codigo:      limpar(raw.categoria_despesa_codigo),
    categoria_descricao:   limpar(raw.categoria_despesa),
    grupo_codigo:          limpar(raw.grupo_despesa_codigo),
    grupo_descricao:       limpar(raw.grupo_despesa),
    modalidade_codigo:     limpar(raw.modalidade_despesa_codigo),
    modalidade_descricao:  limpar(raw.modalidade_despesa),
    elemento_codigo:       limpar(raw.elemento_despesa_codigo),
    elemento_descricao:    limpar(raw.elemento_despesa),
    item_codigo:           limpar(raw.item_despesa_codigo),
    item_descricao:        limpar(raw.item_despesa),

    // Funcional programática e fonte
    funcional_programatica: orNull(raw.funcionalprogramatica),
    fonte_codigo:           orNull(raw.fonterecursocodigo),

    // Processo e objeto
    nro_processo:           orNull(raw.nroprocesso),
    especificacao:          limpar(raw.especificacao),   // objeto/histórico do empenho

    // Credor
    credor_identificacao:   orNull(raw.credoridentificacao), // CPF ou CNPJ

    // Modalidade de licitação
    // ⚠️ INFERÊNCIA: campo `licitacao` contém a modalidade (ex: "PREGÃO", "DISPENSA")
    //    e `procedimento_licitatorio` contém o número do certame.
    //    São campos distintos — NÃO são equivalentes.
    //    Grau de confiança: 🟢 Alta (confirmado nas amostras)
    licitacao_modalidade:     limpar(raw.licitacao),
    procedimento_licitatorio: orNull(raw.procedimento_licitatorio),

    // Valor
    // ⚠️ REGRA DE NEGÓCIO: valores negativos representam anulações/reduções de empenho.
    //    NÃO devem ser descartados — participam do saldo líquido.
    valor_despesa:  toNumber(raw.valordespesa),

    // Controle
    is_estorno:  toBoolean(raw.estorno),
    origem:      orNull(raw.origem),
  };
}

/**
 * Normaliza um registro bruto da tabela LIQUIDAÇÃO.
 *
 * Observação semântica: a liquidação atesta que o bem/serviço foi entregue.
 * O campo `especificacao` nos dados brutos contém literalmente "LIQUIDACAO" —
 * portanto é um campo operacional do sistema e NÃO deve ser usado como histórico.
 *
 * @param {Record<string, string>} raw
 * @returns {NormLiquidacao}
 */
export function normalizarLiquidacao(raw) {
  return {
    // Chaves
    ug_codigo:       limpar(raw.ugcodigo),
    id_empenho_ref:  limpar(raw.nroempenho),    // FK → empenho.id_documento
    id_documento:    limpar(raw.nrodocumento),  // PK da liquidação

    data_emissao:    orNull(raw.dataemissao),

    // Classificação (redundante com empenho — usada apenas para validação cruzada)
    categoria_codigo:     limpar(raw.categoria_despesa_codigo),
    grupo_codigo:         limpar(raw.grupo_despesa_codigo),
    modalidade_codigo:    limpar(raw.modalidade_despesa_codigo),
    elemento_codigo:      limpar(raw.elemento_despesa_codigo),
    elemento_descricao:   limpar(raw.elemento_despesa),
    item_codigo:          limpar(raw.item_despesa_codigo),
    item_descricao:       limpar(raw.item_despesa),

    // Processo (pode estar preenchido com processo da liquidação — diferente do empenho)
    nro_processo:      orNull(raw.nroprocesso),
    fonte_codigo:      orNull(raw.fonterecursocodigo),

    credor_identificacao: orNull(raw.credoridentificacao),
    licitacao_modalidade: limpar(raw.licitacao),

    // ⚠️ `especificacao` na liquidação = sempre "LIQUIDACAO" — sem valor informativo.
    //    Ignorado intencionalmente na camada de mapeamento.
    // especificacao: omitido

    valor_despesa: toNumber(raw.valordespesa),
    is_estorno:    toBoolean(raw.estorno),
    origem:        orNull(raw.origem),
  };
}

/**
 * Normaliza um registro bruto da tabela PAGAMENTO.
 *
 * Observação semântica: o pagamento representa o desembolso financeiro efetivo.
 * O campo `especificacao` contém "PAGAMENTO" — também sem valor informativo.
 * O tipo de pagamento (OB/DPG/RT) é derivado do prefixo do `nrodocumento`.
 *
 * @param {Record<string, string>} raw
 * @returns {NormPagamento}
 */
export function normalizarPagamento(raw) {
  return {
    // Chaves
    ug_codigo:       limpar(raw.ugcodigo),
    id_documento:    limpar(raw.nrodocumento),  // PK do pagamento
    id_empenho_ref:  limpar(raw.nroempenho),    // FK → empenho.id_documento

    data_emissao:    orNull(raw.dataemissao),

    // Classificação (redundante)
    categoria_codigo:     limpar(raw.categoria_despesa_codigo),
    grupo_codigo:         limpar(raw.grupo_despesa_codigo),
    modalidade_codigo:    limpar(raw.modalidade_despesa_codigo),
    elemento_codigo:      limpar(raw.elemento_despesa_codigo),
    elemento_descricao:   limpar(raw.elemento_despesa),
    item_codigo:          limpar(raw.item_despesa_codigo),
    item_descricao:       limpar(raw.item_despesa),

    fonte_codigo:      orNull(raw.fonterecursocodigo),
    nro_processo:      orNull(raw.nroprocesso),
    credor_identificacao: orNull(raw.credoridentificacao),
    licitacao_modalidade: limpar(raw.licitacao),

    // Detalhamento licitatório presente em pagamentos
    procedimento_licitatorio: orNull(raw.procedimento_licitatorio),

    valor_despesa: toNumber(raw.valordespesa),
    is_estorno:    toBoolean(raw.estorno),
    origem:        orNull(raw.origem),
  };
}
