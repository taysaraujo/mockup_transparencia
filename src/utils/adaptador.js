/**
 * adaptador.js   —   Camada 4: Adaptação para o formato App.jsx
 *
 * Responsabilidade: recebe um ModeloEmpenho canônico (Camada 3) e produz
 * exatamente o objeto que o App.jsx espera em `mockEmpenhos`.
 *
 * Esta é a ÚNICA camada que conhece o App.jsx.
 * Se o layout mudar, apenas este arquivo precisa ser atualizado.
 *
 * ─── Decisões de design aplicadas ────────────────────────────────────────
 *
 * [D1] CLASSIFICAÇÃO HIERÁRQUICA EXPLÍCITA
 *    `classificacao` é um objeto com IDs por nível, NÃO uma string concatenada.
 *    O filtro do App.jsx deve fazer correspondência exata por nível:
 *      categoriaId === filtro  OU  grupoId === filtro  OU  ...
 *    Isso elimina falsos positivos do `startsWith` com prefixos ambíguos.
 *
 * [D2] TIPO DE PAGAMENTO EXTENSÍVEL
 *    Derivado da Camada 3 via PREFIXOS_TIPO_PAGAMENTO (tabela extensível).
 *    O nrodocumento original é sempre preservado em `_nrodocumentoOriginal`.
 *
 * [D3] LICITAÇÃO SEPARADA EM DOIS CAMPOS
 *    `licitacaoModalidade` = ex: "PREGÃO", "DISPENSA", "NÃO APLICA"
 *    `procedimentoLicitatorio` = ex: "PREGÃO ELETRÔNICO Nº 38/2023/SAD."
 *    O campo `origem` (que misturava os dois) foi REMOVIDO do modelo do App.jsx.
 *
 * [D4] SALDO VISÍVEL (NUNCA OCULTAR)
 *    Empenhos com saldo ≤ 0 são exibidos com badge de saldo.
 *    `saldoStatus`: 'positivo' | 'zerado' | 'negativo' | 'anulado'
 *    'anulado' = empenho com `isEstorno = true` (registro de anulação pura)
 *    'negativo' = saldo líquido < 0 após agrupamento de reforços/anulações
 *    'zerado'   = saldo líquido = 0 (totalmente anulado)
 *    'positivo' = saldo > 0 (estado normal)
 *
 * ─── Rastreabilidade Camada 3 → App.jsx ──────────────────────────────────
 *
 * ModeloEmpenho.id                         → AppEmpenho.id
 * ModeloEmpenho.dataEmissao                → AppEmpenho.data            (DD/MM/YYYY)
 * ModeloEmpenho.ugCodigo                   → AppEmpenho.ug
 * ModeloEmpenho.credorId                   → AppEmpenho.credor          (CPF/CNPJ bruto — decisão explícita)
 * ModeloEmpenho.especificacao              → AppEmpenho.objeto
 * ModeloEmpenho.nroProcesso                → AppEmpenho.processo        (número do processo SEI)
 * ModeloEmpenho.licitacaoModalidade        → AppEmpenho.licitacaoModalidade    [D3]
 * ModeloEmpenho.procedimentoLicitatorio    → AppEmpenho.procedimentoLicitatorio [D3]
 * ModeloEmpenho.fase                       → AppEmpenho.fase
 * ModeloEmpenho.valorEmpenhado             → AppEmpenho.valor           ("R$ X.XXX,XX")
 * ModeloEmpenho.classificacao.nivel        → AppEmpenho.classificacao   (objeto hierárquico [D1])
 * ModeloEmpenho.totais.*                   → AppEmpenho.valores.*
 * classificação.*                          → AppEmpenho.programatica.*
 * ModeloEmpenho.liquidacoes[]              → AppEmpenho.liquidacoes[]
 * ModeloEmpenho.pagamentos[]               → AppEmpenho.pagamentos[]
 * [o próprio empenho]                      → AppEmpenho.empenhos[]
 * derivado de totais.empenhado             → AppEmpenho.saldoStatus     [D4]
 * ─────────────────────────────────────────────────────────────────────────
 */

import {
  parseFuncionalProgramatica,
  parseFonteRecurso,
  parseUnidadeGestora,
  formatarData,
  formatarMoeda,
} from './parseFuncionalProgramatica.js';

// --- Mocks para Nomes de Favorecidos ---
const NOMES_PF = [
  "João da Silva", "Maria das Dores", "Carlos Eduardo Santos", "Ana Paula Ramos", 
  "Pedro Henrique Oliveira", "Fernanda Costa", "Roberto Almeida", "Juliana Mendes", 
  "Lucas Pereira", "Beatriz Lima"
];

const NOMES_PJ = [
  "Tech Solutions LTDA", "Construtora Horizonte S/A", "Comercial de Cimentos ME", 
  "Serviços de Limpeza Brilho", "Distribuidora Nacional", "Consultoria e Projetos Eireli", 
  "Papelaria Central", "Segurança Total Privada", "Clínica Saúde & Vida", 
  "Posto de Combustíveis Rápido"
];

function obterNomeFavorecido(credorId) {
  if (!credorId || credorId === '-') return '-';
  const digits = credorId.replace(/\D/g, '');
  if (digits.length > 11) {
    const hash = digits.length > 0 ? parseInt(digits.slice(-2), 10) : 0;
    return NOMES_PJ[hash % NOMES_PJ.length];
  } else {
    const hash = digits.length > 0 ? parseInt(digits.slice(-1), 10) : 0;
    return NOMES_PF[hash % NOMES_PF.length];
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Formata valor numérico sem prefixo "R$".
 * @param {number|null} valor
 * @returns {string}
 */
function fmtValor(valor) {
  return formatarMoeda(valor ?? 0);
}

/**
 * [D4] Deriva o status de saldo do empenho.
 * 'anulado'  = registro foi explicitamente marcado como estorno
 * 'negativo' = saldo líquido < 0 (anulações > valores positivos)
 * 'zerado'   = saldo exatamente zero (totalmente anulado)
 * 'positivo' = situação normal
 *
 * @param {number} saldo - totalEmpenhado (soma líquida)
 * @param {boolean} isEstorno - flag do registro base
 * @returns {'positivo'|'zerado'|'negativo'|'anulado'}
 */
function derivarSaldoStatus(saldo, isEstorno) {
  if (isEstorno) return 'anulado';
  if (saldo < 0)  return 'negativo';
  if (saldo === 0) return 'zerado';
  return 'positivo';
}

/**
 * Adapta uma entrada de fase (liquidação ou pagamento) para o formato
 * usado em `renderTabelaFase()` no App.jsx.
 *
 * Campos esperados:
 *   { data, documento, ug, modalidade, elemento, cpfCnpj, favorecido, valor }
 *
 * @param {object} fase - ModeloLiquidacao ou ModeloPagamento
 * @param {'liquidacao'|'pagamento'} tipo
 * @param {string} nomeFavorecido - Nome simulado (PF/PJ)
 * @param {string} historicoText - Texto do objeto (empenho) para replicar
 * @returns {object}
 */
function adaptarFase(fase, tipo, nomeFavorecido, historicoText) {
  const elemento = fase.elemento
    ? `${fase.elemento.codigo} - ${fase.elemento.descricao}`
    : '-';

  return {
    data:       formatarData(fase.dataEmissao),
    documento:  fase.idDocumento,
    ug:         fase.ugCodigo,
    modalidade: fase.licitacaoModalidade || '-',
    elemento,
    // [D decisão explícita do usuário]: exibir CPF/CNPJ como está e agora o Nome Mockado também
    cpfCnpj:    fase.credorId ?? '-',
    favorecido: nomeFavorecido,
    historico:  historicoText ?? '-',
    valor: tipo === 'liquidacao'
      ? (fase.valorLiquidado ?? 0)
      : (fase.valorPago      ?? 0),
  };
}

// ─── Adaptador principal ──────────────────────────────────────────────────

/**
 * Converte um ModeloEmpenho canônico para o formato exato do App.jsx.
 *
 * @param {object} empenho - ModeloEmpenho (saída da Camada 3)
 * @returns {object} Objeto compatível com mockEmpenhos do App.jsx
 */
export function adaptarParaApp(empenho) {
  const fp = parseFuncionalProgramatica(empenho.classificacao.funcionalProgramatica ?? '');
  const nivel = empenho.classificacao.nivel;

  // [D4] Status de saldo — sempre visível
  const saldoStatus = derivarSaldoStatus(
    empenho.totais?.empenhado ?? 0,
    empenho.isEstorno
  );

  const nomeCredorEmpenho = obterNomeFavorecido(empenho.credorId);

  // Linha do próprio empenho na tabela "Empenhos Relacionados"
  const linhaEmpenho = {
    data:       formatarData(empenho.dataEmissao),
    documento:  empenho.id,
    ug:         empenho.ugCodigo,
    modalidade: empenho.classificacao.modalidade.descricao,
    elemento:   `${empenho.classificacao.elemento.codigo} - ${empenho.classificacao.elemento.descricao}`,
    cpfCnpj:    empenho.credorId ?? '-',
    favorecido: nomeCredorEmpenho,
    historico:  empenho.especificacao ?? '-',
    valor:      empenho.valorEmpenhado ?? 0,
  };

  return {
    // ── Campos da listagem (dashboard) ──────────────────────────────────
    id:       empenho.id,
    data:     formatarData(empenho.dataEmissao),
    ug:       empenho.ugCodigo,
    cpfCnpj:  empenho.credorId ?? '-',
    credor:   nomeCredorEmpenho,
    objeto:   empenho.especificacao,
    processo: empenho.nroProcesso ?? '-',       // Nº do Processo SEI
    fase:     empenho.fase,
    valor:    `R$ ${fmtValor(empenho.valorEmpenhado)}`,

    // [D4] Badge de saldo — nunca ocultar empenhos com saldo ≤ 0
    saldoStatus,

    // [D1] Chave hierárquica para filtro preciso — sem concatenação ambígua
    // O filtro deve usar: nivel.categoriaId === filtro  OU  nivel.grupoId === filtro  OU  ...
    classificacao: {
      categoriaId:   nivel?.categoriaId   ?? '',
      grupoId:       nivel?.grupoId       ?? '',
      modalidadeId:  nivel?.modalidadeId  ?? '',
      elementoId:    nivel?.elementoId    ?? '',
    },

    // [D3] Licitação em dois campos distintos — NÃO misturar
    licitacaoModalidade:     empenho.licitacaoModalidade    ?? '-',
    procedimentoLicitatorio: (empenho.licitacaoModalidade === 'NÃO APLICA' || empenho.licitacaoModalidade === 'NAO APLICA') ? null : (empenho.procedimentoLicitatorio ?? null),

    // funcao no topo para compatibilidade com filtro funcaoFilter
    funcao: fp.funcao,

    // ── Valores consolidados (KPIs + colunas da tabela) ──────────────────
    valores: {
      empenhado: fmtValor(empenho.totais?.empenhado ?? 0),
      liquidado: fmtValor(empenho.totais?.liquidado ?? 0),
      pago:      fmtValor(empenho.totais?.pago      ?? 0),
      aPagar:    fmtValor(empenho.totais?.aPagar     ?? 0),
    },

    // ── Dados da programática (tela de detalhe, accordion) ───────────────
    programatica: {
      codigo:           empenho.classificacao.funcionalProgramatica ?? '-',
      unidade:          parseUnidadeGestora(empenho.ugCodigo),
      funcao:           fp.funcao,
      subfuncao:        fp.subfuncao,
      programa:         fp.programaCodigo,
      projetoAtividade: fp.acaoCodigo,
      fonte:            parseFonteRecurso(empenho.classificacao.fonteCodigo),
      categoria:        `${empenho.classificacao.categoria.codigo} - ${empenho.classificacao.categoria.descricao}`,
      gnd:              `${empenho.classificacao.grupo.codigo} - ${empenho.classificacao.grupo.descricao}`,
      modalidade:       `${empenho.classificacao.modalidade.codigo} - ${empenho.classificacao.modalidade.descricao}`,
      elemento:         `${empenho.classificacao.elemento.codigo} - ${empenho.classificacao.elemento.descricao}`,
      itemDespesa:      `${empenho.classificacao.item.codigo} - ${empenho.classificacao.item.descricao}`,
      // subelemento: REMOVIDO por instrução explícita do usuário
    },

    // ── Fases relacionadas (tabelas no detalhe) ──────────────────────────
    empenhos:    [linhaEmpenho],
    liquidacoes: empenho.liquidacoes.map(l => adaptarFase(l, 'liquidacao', obterNomeFavorecido(l.credorId), empenho.especificacao)),
    pagamentos:  empenho.pagamentos.map(p => adaptarFase(p, 'pagamento', obterNomeFavorecido(p.credorId), empenho.especificacao)),
  };
}

/**
 * Converte um array de ModeloEmpenho para o formato App.jsx.
 *
 * @param {object[]} modelos
 * @returns {object[]}
 */
export function adaptarTodosParaApp(modelos) {
  return modelos.map(adaptarParaApp);
}
