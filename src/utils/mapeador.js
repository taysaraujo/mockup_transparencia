/**
 * mapeador.js   —   Camada 3: Mapeamento para modelo canônico
 *
 * Responsabilidade: recebe os registros normalizados das três tabelas e produz
 * uma coleção de objetos no "modelo canônico" — estrutura própria, independente
 * do layout, que representa fielmente a execução orçamentária.
 *
 * O modelo canônico é a fonte de verdade. A Camada 4 adapta este modelo
 * para o formato específico esperado pelo App.jsx.
 *
 * ─── Modelo Canônico ──────────────────────────────────────────────────────
 *
 * ModeloEmpenho {
 *   // Identidade
 *   id                    : string   — nrodocumento (ex: "2026NE000185")
 *   ugCodigo              : string   — código da unidade gestora
 *   dataEmissao           : string   — ISO date string
 *
 *   // Objeto e processo
 *   especificacao         : string   — texto livre do objeto do empenho
 *   nroProcesso           : string|null
 *
 *   // Credor (nome ausente nos dados — será integrado futuramente)
 *   credorId              : string   — CPF ou CNPJ bruto
 *
 *   // Execução licitatória
 *   licitacaoModalidade   : string   — ex: "PREGÃO", "DISPENSA", "NÃO APLICA"
 *   procedimentoLicitatorio: string|null
 *
 *   // Financeiro
 *   valorEmpenhado        : number   — soma líquida de todos os registros do empenho
 *                                      (inclui anulações negativas)
 *   isEstorno             : boolean  — true se o registro principal é anulação
 *
 *   // Classificação orçamentária
 *   classificacao {
 *     categoria  { codigo, descricao }
 *     grupo      { codigo, descricao }
 *     modalidade { codigo, descricao }   // modalidade de aplicação, não de licitação
 *     elemento   { codigo, descricao }
 *     item       { codigo, descricao }
 *     fonteCodigo: string
 *     funcionalProgramatica: string      // string completa; segmentos extraídos na camada 4
 *   }
 *
 *   // Fases relacionadas
 *   liquidacoes  : ModeloLiquidacao[]
 *   pagamentos   : ModeloPagamento[]
 *
 *   // Totais calculados (derivados, nunca vindos direto do CSV)
 *   totais {
 *     empenhado  : number   — soma líquida de empenho + reforços/anulações
 *     liquidado  : number   — soma de todas as liquidações vinculadas
 *     pago       : number   — soma de todos os pagamentos vinculados
 *     aPagar     : number   — empenhado - pago
 *   }
 *
 *   // Fase de execução (derivada, nunca armazenada nos dados)
 *   // ⚠️ REGRA DE NEGÓCIO: fase = estágio MAIS AVANÇADO atingido
 *   //    Pago > Liquidado > Empenhado
 *   fase         : 'Empenhado' | 'Liquidado' | 'Pago'
 * }
 *
 * ModeloLiquidacao {
 *   idDocumento         : string
 *   idEmpenhoRef        : string   — FK → ModeloEmpenho.id
 *   dataEmissao         : string
 *   ugCodigo            : string
 *   valorLiquidado      : number
 *   isEstorno           : boolean
 *   elemento            : { codigo, descricao }
 *   item                : { codigo, descricao }
 *   credorId            : string|null
 *   licitacaoModalidade : string
 * }
 *
 * ModeloPagamento {
 *   idDocumento            : string
 *   idEmpenhoRef           : string   — FK → ModeloEmpenho.id
 *   dataEmissao            : string
 *   ugCodigo               : string
 *   valorPago              : number
 *   tipoPagamento          : 'OB' | 'DPG' | 'RT' | 'OUTRO'  — derivado do id
 *   isEstorno              : boolean
 *   elemento               : { codigo, descricao }
 *   item                   : { codigo, descricao }
 *   credorId               : string|null
 *   licitacaoModalidade    : string
 *   procedimentoLicitatorio: string|null
 * }
 * ─────────────────────────────────────────────────────────────────────────
 */

import { derivarTipoPagamento } from './parseFuncionalProgramatica.js';

// ─── Helpers internos ─────────────────────────────────────────────────────

/**
 * Soma segura de um array de números, ignorando nulls.
 * @param {(number|null)[]} values
 * @returns {number}
 */
function somarValores(values) {
  return values.reduce((acc, v) => acc + (v ?? 0), 0);
}

/**
 * Deriva a fase de execução de um empenho.
 * REGRA: a fase é o estágio mais avançado atingido.
 * Um empenho com pagamentos é "Pago" mesmo que haja saldo a pagar.
 *
 * @param {boolean} temPagamentos
 * @param {boolean} temLiquidacoes
 * @returns {'Pago'|'Liquidado'|'Empenhado'}
 */
function derivarFase(temPagamentos, temLiquidacoes) {
  if (temPagamentos) return 'Pago';
  if (temLiquidacoes) return 'Liquidado';
  return 'Empenhado';
}

// ─── Mapeadores por entidade ──────────────────────────────────────────────

/**
 * Mapeia um NormEmpenho para o modelo canônico parcial (sem fases e totais).
 * As fases e totais são injetadas depois do agrupamento.
 *
 * @param {object} norm - Registro normalizado (Camada 2)
 * @returns {object} Empenho no modelo canônico (sem fases ainda)
 */
function mapearEmpenhoBase(norm) {
  return {
    id:           norm.id_documento,
    ugCodigo:     norm.ug_codigo,
    dataEmissao:  norm.data_emissao,

    especificacao:          norm.especificacao,
    nroProcesso:            norm.nro_processo,

    credorId:               norm.credor_identificacao,

    // ⚠️ INFERÊNCIA SEMÂNTICA:
    //    `licitacao_modalidade` = modalidade da disputa (PREGÃO, DISPENSA, INEXIGIBILIDADE, NÃO APLICA)
    //    `procedimento_licitatorio` = identificação do certame ("PREGÃO ELETRÔNICO Nº 38/2023/SAD.")
    //    São conceitualmente distintos: modalidade é classificação, procedimento é referência documental.
    //    Grau de confiança: 🟢 Alta
    licitacaoModalidade:    norm.licitacao_modalidade,
    procedimentoLicitatorio: norm.procedimento_licitatorio,

    valorEmpenhado: norm.valor_despesa,  // pode ser negativo (anulação)
    isEstorno:      norm.is_estorno,

    classificacao: {
      categoria:  { codigo: norm.categoria_codigo,  descricao: norm.categoria_descricao },
      grupo:      { codigo: norm.grupo_codigo,       descricao: norm.grupo_descricao },
      // ⚠️ NOTA: `modalidade_codigo` aqui é a modalidade de APLICAÇÃO (ex: "3390 - Aplicações Diretas")
      //    — DIFERENTE de `licitacao_modalidade` que é a modalidade de LICITAÇÃO.
      //    São campos com nomes parecidos mas semânticas completamente distintas.
      //    Grau de confiança: 🟢 Alta
      modalidade: { codigo: norm.modalidade_codigo,  descricao: norm.modalidade_descricao },
      elemento:   { codigo: norm.elemento_codigo,    descricao: norm.elemento_descricao },
      item:       { codigo: norm.item_codigo,         descricao: norm.item_descricao },
      fonteCodigo:            norm.fonte_codigo,
      funcionalProgramatica:  norm.funcional_programatica,

      // Chave hierárquica explícita para filtro preciso no drill-down.
      // Cada nível tem seu próprio campo — sem concatenação ambígua.
      // O filtro do App.jsx deve usar correspondência EXATA por nível, não startsWith.
      nivel: {
        categoriaId:  norm.categoria_codigo,   // ex: "3"
        grupoId:      norm.grupo_codigo,        // ex: "33"
        modalidadeId: norm.modalidade_codigo,   // ex: "3390"
        elementoId:   norm.elemento_codigo,     // ex: "339014"
      },
    },

    // Preenchidos na etapa de agrupamento:
    liquidacoes: [],
    pagamentos:  [],
    totais:      null,
    fase:        'Empenhado',
  };
}

/**
 * Mapeia um NormLiquidacao para o ModeloLiquidacao canônico.
 *
 * @param {object} norm
 * @returns {object}
 */
function mapearLiquidacao(norm) {
  return {
    idDocumento:     norm.id_documento,
    idEmpenhoRef:    norm.id_empenho_ref,
    dataEmissao:     norm.data_emissao,
    ugCodigo:        norm.ug_codigo,
    valorLiquidado:  norm.valor_despesa ?? 0,
    isEstorno:       norm.is_estorno,
    elemento:        { codigo: norm.elemento_codigo, descricao: norm.elemento_descricao },
    item:            { codigo: norm.item_codigo,     descricao: norm.item_descricao },
    credorId:        norm.credor_identificacao,
    licitacaoModalidade: norm.licitacao_modalidade,
    // nroProcesso da liquidação pode diferir do empenho (processo de liquidação separado)
    nroProcesso:     norm.nro_processo,
  };
}

/**
 * Mapeia um NormPagamento para o ModeloPagamento canônico.
 *
 * @param {object} norm
 * @returns {object}
 */
function mapearPagamento(norm) {
  return {
    idDocumento:     norm.id_documento,
    idEmpenhoRef:    norm.id_empenho_ref,
    dataEmissao:     norm.data_emissao,
    ugCodigo:        norm.ug_codigo,
    valorPago:       norm.valor_despesa ?? 0,

    // derivarTipoPagamento agora retorna o objeto completo:
    // { tipo, descricao, nrodocumentoOriginal } — garantindo rastreabilidade.
    tipoPagamento:   derivarTipoPagamento(norm.id_documento).tipo,
    tipoPagamentoDescricao: derivarTipoPagamento(norm.id_documento).descricao,

    isEstorno:       norm.is_estorno,
    elemento:        { codigo: norm.elemento_codigo, descricao: norm.elemento_descricao },
    item:            { codigo: norm.item_codigo,     descricao: norm.item_descricao },
    credorId:        norm.credor_identificacao,
    licitacaoModalidade:     norm.licitacao_modalidade,
    procedimentoLicitatorio: norm.procedimento_licitatorio,
  };
}

// ─── Agrupador principal ──────────────────────────────────────────────────

/**
 * Agrupa empenhos normalizados que possuem o mesmo nrodocumento
 * (caso de um empenho com reforços/anulações — múltiplas linhas no CSV).
 *
 * REGRA DE NEGÓCIO: o saldo líquido do empenho é a SOMA de todos os registros
 * com o mesmo id, incluindo os negativos (anulações).
 *
 * @param {object[]} normsEmpenho
 * @returns {Map<string, object>} mapa id → empenho base (sem fases)
 */
function agruparEmpenhos(normsEmpenho) {
  const mapa = new Map();

  for (const norm of normsEmpenho) {
    const id = norm.id_documento;
    if (!id) continue;

    if (!mapa.has(id)) {
      mapa.set(id, { ...mapearEmpenhoBase(norm), _somaValores: [] });
    }

    // Acumula todos os valores (positivos e negativos) para soma líquida posterior
    mapa.get(id)._somaValores.push(norm.valor_despesa ?? 0);
  }

  // Calcula soma líquida e remove campo auxiliar
  for (const [id, emp] of mapa) {
    emp.valorEmpenhado = somarValores(emp._somaValores);
    delete emp._somaValores;
  }

  return mapa;
}

// ─── Função principal exportada ───────────────────────────────────────────

/**
 * Constrói o modelo canônico completo a partir dos registros normalizados.
 *
 * @param {object[]} normsEmpenho   - Saída de normalizarEmpenho() para todos os registros
 * @param {object[]} normsLiquidacao
 * @param {object[]} normsPagamento
 * @returns {object[]} Array de ModeloEmpenho completo (com fases e totais)
 */
export function construirModeloCanônico(normsEmpenho, normsLiquidacao, normsPagamento) {
  // 1. Agrupa empenhos (resolve reforços e anulações)
  const empenhosMapa = agruparEmpenhos(normsEmpenho);

  // 2. Mapeia e vincula liquidações
  for (const norm of normsLiquidacao) {
    const liq = mapearLiquidacao(norm);
    const empenho = empenhosMapa.get(liq.idEmpenhoRef);

    if (empenho) {
      empenho.liquidacoes.push(liq);
    }
    // ⚠️ Liquidações sem empenho correspondente são ignoradas.
    //    Em produção, logar essas ocorrências para auditoria.
  }

  // 3. Mapeia e vincula pagamentos
  for (const norm of normsPagamento) {
    const pag = mapearPagamento(norm);
    const empenho = empenhosMapa.get(pag.idEmpenhoRef);

    if (empenho) {
      empenho.pagamentos.push(pag);
    }
  }

  // 4. Calcula totais e fase para cada empenho
  for (const [, emp] of empenhosMapa) {
    const totalLiquidado = somarValores(emp.liquidacoes.map(l => l.valorLiquidado));
    const totalPago      = somarValores(emp.pagamentos.map(p => p.valorPago));

    emp.totais = {
      empenhado:  emp.valorEmpenhado,
      liquidado:  totalLiquidado,
      pago:       totalPago,
      aPagar:     emp.valorEmpenhado - totalPago,
    };

    emp.fase = derivarFase(
      emp.pagamentos.length > 0,
      emp.liquidacoes.length > 0
    );
  }

  // 5. Retorna como array, ordenado por data de emissão (mais recente primeiro)
  return Array.from(empenhosMapa.values()).sort((a, b) => {
    if (!a.dataEmissao) return 1;
    if (!b.dataEmissao) return -1;
    return b.dataEmissao.localeCompare(a.dataEmissao);
  });
}
