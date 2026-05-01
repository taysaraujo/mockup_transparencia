/**
 * parseFuncionalProgramatica.js
 *
 * Utilitário para extrair os segmentos da string `funcionalprogramatica`
 * seguindo a máscara oficial do TCE-MS:
 *
 * Posição (0-based) | Tamanho | Segmento
 * ─────────────────────────────────────────────────────
 * [0  : 7]          │ 7 dígitos │ Institucional / Esfera
 * [7  : 9]          │ 2 dígitos │ Função
 * [9  : 12]         │ 3 dígitos │ Subfunção
 * [12 : 16]         │ 4 dígitos │ Programa
 * [16 : 20]         │ 4 dígitos │ Ação
 * [20 : 24]         │ 4 dígitos │ Subtítulo / Localizador
 *
 * Exemplo: "100310101032000220110001"
 *   → Institucional : "1003101"
 *   → Função        : "01"  (Legislativa)
 *   → Subfunção     : "032" (Controle Externo)
 *   → Programa      : "0022"
 *   → Ação          : "0110"  → "2.011 - Atividade..."
 *   → Subtítulo     : "0001"
 */

import funcoes     from '../data/funcoes.json';
import subfuncoes  from '../data/subfuncoes.json';
import fontes      from '../data/fontesRecursos.json';

/**
 * Extrai e resolve todos os segmentos da funcional programática.
 *
 * @param {string} fp - String bruta do campo `funcionalprogramatica`
 * @returns {object} Objeto com todos os segmentos resolvidos
 */
export function parseFuncionalProgramatica(fp) {
  if (!fp || fp.length < 20) {
    return {
      institucional: fp ?? '',
      funcaoCodigo: '',
      funcaoDescricao: '',
      subfuncaoCodigo: '',
      subfuncaoDescricao: '',
      programaCodigo: '',
      acaoCodigo: '',
      subtituloCodigo: '',
      funcao: '',
      subfuncao: '',
      programa: '',
      projetoAtividade: '',
    };
  }

  const institucional   = fp.substring(0, 7);
  const funcaoCod       = fp.substring(7, 9);
  const subfuncaoCod    = fp.substring(9, 12);
  const programaCod     = fp.substring(12, 16);
  const acaoCod         = fp.substring(16, 20);
  const subtituloCod    = fp.substring(20, 24);

  const funcaoDesc    = funcoes[funcaoCod]    ?? `Função ${funcaoCod}`;
  const subfuncaoDesc = subfuncoes[subfuncaoCod] ?? `Subfunção ${subfuncaoCod}`;

  return {
    // Segmentos brutos
    institucional,
    funcaoCodigo:    funcaoCod,
    subfuncaoCodigo: subfuncaoCod,
    programaCodigo:  programaCod,
    acaoCodigo:      acaoCod,
    subtituloCodigo: subtituloCod,

    // Strings formatadas para exibição (código + descrição)
    funcao:           `${funcaoCod} - ${funcaoDesc}`,
    subfuncao:        `${subfuncaoCod} - ${subfuncaoDesc}`,
    programa:         programaCod, // sem de-para; exibir código até ter tabela
    projetoAtividade: acaoCod,     // idem
  };
}

/**
 * Resolve a descrição de uma fonte de recursos.
 *
 * @param {string} codigo - Valor bruto de `fonterecursocodigo` (ex: "150000001")
 * @returns {string} Descrição formatada (ex: "150000001 - Recursos Não Vinculados de Impostos")
 */
export function parseFonteRecurso(codigo) {
  if (!codigo) return '-';
  const desc = fontes[codigo];
  return desc ? `${codigo} - ${desc}` : codigo;
}

/**
 * Resolve o nome da Unidade Gestora pelo código.
 * Tabela hardcoded com as UGs presentes nos dados do TCE-MS.
 *
 * @param {string|number} ugcodigo
 * @returns {string}
 */
const UGS = {
  '30101': 'TRIBUNAL DE CONTAS',
  '30901': 'FUNDO ESP DE DESENV MODERN E APERF DO TC MS',
};

export function parseUnidadeGestora(ugcodigo) {
  const cod = String(ugcodigo);
  const nome = UGS[cod] ?? `UG ${cod}`;
  return `${cod} - ${nome}`;
}

/**
 * Deriva a fase de execução de um empenho cruzando as três tabelas.
 *
 * @param {string} nrodocumento - ID do empenho
 * @param {string[]} nroempenhosLiquidacoes - Conjunto de nroempenho das liquidações
 * @param {string[]} nroempenhoPagamentos   - Conjunto de nroempenho dos pagamentos
 * @returns {'Empenhado'|'Liquidado'|'Pago'}
 */
export function derivarFase(nrodocumento, nroempenhosLiquidacoes, nroempenhoPagamentos) {
  if (nroempenhoPagamentos.includes(nrodocumento)) return 'Pago';
  if (nroempenhosLiquidacoes.includes(nrodocumento)) return 'Liquidado';
  return 'Empenhado';
}

/**
 * Tabela de mapeamento extensível: prefixo do nrodocumento → tipo de pagamento.
 *
 * Para adicionar novos tipos, basta inserir uma entrada neste objeto.
 * A ordem importa: prefixos mais específicos (ex: 'DPG') devem vir antes
 * dos mais curtos que possam ser substrings (ex: 'OB' não conflita, mas atenção).
 *
 * Campos de cada entrada:
 *   tipo:     código canônico do tipo (usado internamente e em filtros)
 *   descricao: descrição legível para exibição no layout
 *
 * ⚙️ EXTENSÃO: adicione novos prefixos conforme surgem nos dados reais.
 *    Grau de confiança atual: 🟡 Média — confirmado OB/DPG/RT nos CSVs de 2026.
 */
export const PREFIXOS_TIPO_PAGAMENTO = {
  'OB':  { tipo: 'OB',   descricao: 'Ordem Bancária' },
  'DPG': { tipo: 'DPG',  descricao: 'Devolução / Pagamento' },
  'RT':  { tipo: 'RT',   descricao: 'Retenção' },
  'NS':  { tipo: 'NS',   descricao: 'Nota de Sistema' },       // Reservado — confirmar
  'GP':  { tipo: 'GP',   descricao: 'Guia de Pagamento' },     // Reservado — confirmar
};

/**
 * Deriva o tipo e a descrição de um documento de pagamento a partir do prefixo
 * do nrodocumento, usando a tabela PREFIXOS_TIPO_PAGAMENTO.
 *
 * Sempre preserva o nrodocumento original para rastreabilidade completa.
 *
 * @param {string} nrodocumento - Ex: "2026OB00943", "2026DPG00025", "2026RT000233"
 * @returns {{ tipo: string, descricao: string, nrodocumentoOriginal: string }}
 */
export function derivarTipoPagamento(nrodocumento) {
  const resultado = {
    tipo: 'OUTRO',
    descricao: 'Tipo não identificado',
    nrodocumentoOriginal: nrodocumento ?? '',
  };

  if (!nrodocumento) return resultado;

  const upper = nrodocumento.toUpperCase();

  // Testa cada prefixo registrado na tabela (prefixos mais longos primeiro para evitar falso positivo)
  const prefixosOrdenados = Object.keys(PREFIXOS_TIPO_PAGAMENTO)
    .sort((a, b) => b.length - a.length);

  for (const prefixo of prefixosOrdenados) {
    if (upper.includes(prefixo)) {
      return { ...PREFIXOS_TIPO_PAGAMENTO[prefixo], nrodocumentoOriginal: nrodocumento };
    }
  }

  return resultado;
}

/**
 * Formata uma data ISO (YYYY-MM-DD) para o padrão brasileiro (DD/MM/YYYY).
 *
 * @param {string} isoDate
 * @returns {string}
 */
export function formatarData(isoDate) {
  if (!isoDate) return '-';
  const [ano, mes, dia] = isoDate.split('-');
  return `${dia}/${mes}/${ano}`;
}

/**
 * Formata um valor numérico como moeda BRL.
 *
 * @param {number} valor
 * @returns {string} Ex: "1.270,20"
 */
export function formatarMoeda(valor) {
  return Number(valor).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
