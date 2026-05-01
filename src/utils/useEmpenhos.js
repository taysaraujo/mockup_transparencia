/**
 * useEmpenhos.js   —   Hook React: orquestrador do pipeline completo
 *
 * Fluxo:
 *   CSVs brutos
 *     → Camada 1 (csvReader):    texto → objetos raw
 *     → Camada 2 (normalizador): raw → normalizado (tipos corretos)
 *     → Camada 3 (mapeador):     normalizado → modelo canônico (com fases e totais)
 *     → Camada 4 (adaptador):    canônico → formato App.jsx
 *
 * Uso no App.jsx:
 *   const { empenhos, classificacaoHierarquica, loading, error } = useEmpenhos();
 */

import { useState, useEffect } from 'react';
import { parseCSVText } from './csvReader.js';
import { normalizarEmpenho, normalizarLiquidacao, normalizarPagamento } from './normalizador.js';
import { construirModeloCanônico } from './mapeador.js';
import { adaptarTodosParaApp } from './adaptador.js';

// Caminhos dos CSVs relativos à raiz do projeto (servidos como assets estáticos pelo Vite)
const CSV_EMPENHO    = '/data/empenho_150420261447.csv';
const CSV_LIQUIDACAO = '/data/liquidacao_150420261448.csv';
const CSV_PAGAMENTO  = '/data/pagamento_150420261449.csv';

/**
 * Carrega um CSV via fetch e retorna o texto bruto.
 * @param {string} path
 * @returns {Promise<string>}
 */
async function fetchCSV(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Falha ao carregar ${path}: ${res.status} ${res.statusText}`);
  // Força UTF-8 independente do header HTTP
  const buffer = await res.arrayBuffer();
  return new TextDecoder('utf-8').decode(buffer);
}

/**
 * Constrói a árvore hierárquica de classificação orçamentária
 * a partir dos empenhos do modelo canônico.
 *
 * Estrutura: Categoria → Grupo → Modalidade → Elemento
 * Valores: soma agregada de empenhado/liquidado/pago em cada nível.
 *
 * @param {object[]} modelosCanonicos - Saída do construirModeloCanônico()
 * @returns {object[]} Árvore compatível com hierarchicalClassification do App.jsx
 */
function construirHierarquiaClassificacao(modelosCanonicos) {
  // Mapa aninhado: categoria → grupo → modalidade → elemento
  const arvore = new Map();

  for (const emp of modelosCanonicos) {
    const { categoria, grupo, modalidade, elemento } = emp.classificacao;
    const totais = emp.totais ?? { empenhado: 0, liquidado: 0, pago: 0 };

    // Nível 1: Categoria
    if (!arvore.has(categoria.codigo)) {
      arvore.set(categoria.codigo, {
        id: categoria.codigo,
        codigo: `${categoria.codigo}000000000`,
        descricao: categoria.descricao,
        nivel: 'Categoria Econômica',
        valores: { empenhado: 0, liquidado: 0, pago: 0 },
        _grupos: new Map(),
      });
    }
    const cat = arvore.get(categoria.codigo);
    cat.valores.empenhado += totais.empenhado;
    cat.valores.liquidado += totais.liquidado;
    cat.valores.pago      += totais.pago;

    // Nível 2: Grupo
    const grupoKey = `${categoria.codigo}-${grupo.codigo}`;
    if (!cat._grupos.has(grupoKey)) {
      cat._grupos.set(grupoKey, {
        id: grupo.codigo,
        codigo: `${grupo.codigo}00000000`,
        descricao: grupo.descricao,
        nivel: 'Grupo de Natureza da Despesa (GND)',
        valores: { empenhado: 0, liquidado: 0, pago: 0 },
        _modalidades: new Map(),
      });
    }
    const grp = cat._grupos.get(grupoKey);
    grp.valores.empenhado += totais.empenhado;
    grp.valores.liquidado += totais.liquidado;
    grp.valores.pago      += totais.pago;

    // Nível 3: Modalidade de Aplicação
    const modKey = `${grupoKey}-${modalidade.codigo}`;
    if (!grp._modalidades.has(modKey)) {
      grp._modalidades.set(modKey, {
        id: modalidade.codigo,
        codigo: `${modalidade.codigo}000000`,
        descricao: modalidade.descricao,
        nivel: 'Modalidade de Aplicação',
        valores: { empenhado: 0, liquidado: 0, pago: 0 },
        _elementos: new Map(),
      });
    }
    const mod = grp._modalidades.get(modKey);
    mod.valores.empenhado += totais.empenhado;
    mod.valores.liquidado += totais.liquidado;
    mod.valores.pago      += totais.pago;

    // Nível 4: Elemento de Despesa
    if (!mod._elementos.has(elemento.codigo)) {
      mod._elementos.set(elemento.codigo, {
        id: elemento.codigo,
        codigo: `${elemento.codigo}0000`,
        descricao: elemento.descricao,
        nivel: 'Elemento de Despesa',
        valores: { empenhado: 0, liquidado: 0, pago: 0 },
      });
    }
    const elem = mod._elementos.get(elemento.codigo);
    elem.valores.empenhado += totais.empenhado;
    elem.valores.liquidado += totais.liquidado;
    elem.valores.pago      += totais.pago;
  }

  // Converte mapas em arrays (removendo campos auxiliares _*)
  return Array.from(arvore.values()).map(cat => ({
    ...cat,
    children: Array.from(cat._grupos.values()).map(grp => ({
      ...grp,
      children: Array.from(grp._modalidades.values()).map(mod => ({
        ...mod,
        children: Array.from(mod._elementos.values()),
        _elementos: undefined,
      })),
      _modalidades: undefined,
    })),
    _grupos: undefined,
  }));
}

/**
 * Hook React que carrega e processa os três CSVs.
 *
 * @returns {{
 *   empenhos: object[],               — formato App.jsx completo
 *   classificacaoHierarquica: object[], — árvore para drill-down
 *   totaisGlobais: object,             — KPIs globais
 *   totaisPorUGReais: object,          — Totais separados por Unidade Gestora
 *   loading: boolean,
 *   error: string|null
 * }}
 */
export function useEmpenhos() {
  const [empenhos, setEmpenhos] = useState([]);
  const [classificacaoHierarquica, setClassificacaoHierarquica] = useState([]);
  const [totaisGlobais, setTotaisGlobais] = useState({
    empenhado: '0,00', liquidado: '0,00', pago: '0,00'
  });
  const [totaisPorUGReais, setTotaisPorUGReais] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function carregar() {
      try {
        setLoading(true);
        setError(null);

        // ── Camada 1: Leitura bruta ──────────────────────────────────────
        const [textoEmpenho, textoLiquidacao, textoPagamento] = await Promise.all([
          fetchCSV(CSV_EMPENHO),
          fetchCSV(CSV_LIQUIDACAO),
          fetchCSV(CSV_PAGAMENTO),
        ]);

        const rawEmpenhos    = parseCSVText(textoEmpenho);
        const rawLiquidacoes = parseCSVText(textoLiquidacao);
        const rawPagamentos  = parseCSVText(textoPagamento);

        // ── Camada 2: Normalização ───────────────────────────────────────
        const normsEmpenho    = rawEmpenhos.map(normalizarEmpenho);
        const normsLiquidacao = rawLiquidacoes.map(normalizarLiquidacao);
        const normsPagamento  = rawPagamentos.map(normalizarPagamento);

        // ── Camada 3: Modelo canônico ────────────────────────────────────
        let modelosCanonicos = construirModeloCanônico(
          normsEmpenho,
          normsLiquidacao,
          normsPagamento
        );

        // ── Filtro de Amostra (Remoção de Anomalias de Meses Seguintes) ──
        // Como o TCE-MS fatura muito em janeiro, as amostras de meses seguintes 
        // trazem estornos/negativados isolados. Vamos manter apenas consistentes:
        // Regra: Empenho > 0 e Empenho >= Liquidado >= Pago.
        modelosCanonicos = modelosCanonicos.filter(emp => {
          const empTotal = emp.totais?.empenhado ?? 0;
          const liqTotal = emp.totais?.liquidado ?? 0;
          const pagTotal = emp.totais?.pago ?? 0;
          
          if (empTotal <= 0) return false;
          if (empTotal < liqTotal) return false;
          if (liqTotal < pagTotal) return false;
          
          return true;
        });

        // ── Camada 4: Adaptação para App.jsx ─────────────────────────────
        const empenhosApp = adaptarTodosParaApp(modelosCanonicos);

        // ── Hierarquia de classificação ──────────────────────────────────
        const hierarquia = construirHierarquiaClassificacao(modelosCanonicos);

        // ── Totais globais (KPIs) ────────────────────────────────────────
        const somarKPI = (campo) =>
          modelosCanonicos.reduce((acc, e) => acc + (e.totais?.[campo] ?? 0), 0);

        const globais = {
          empenhado: somarKPI('empenhado').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          liquidado: somarKPI('liquidado').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          pago:      somarKPI('pago').toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        };

        // ── Totais por UG (Listagem manual) ──────────────────────────────
        const ugsTotais = {};
        modelosCanonicos.forEach(e => {
            const ug = e.ugCodigo || 'Outros';
            if (!ugsTotais[ug]) ugsTotais[ug] = { empenhado: 0, liquidado: 0, pago: 0 };
            ugsTotais[ug].empenhado += e.totais?.empenhado ?? 0;
            ugsTotais[ug].liquidado += e.totais?.liquidado ?? 0;
            ugsTotais[ug].pago      += e.totais?.pago ?? 0;
        });
        
        const ugGlobaisFmt = {};
        for(const [ug, tf] of Object.entries(ugsTotais)) {
           ugGlobaisFmt[ug] = {
               empenhado: tf.empenhado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
               liquidado: tf.liquidado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
               pago: tf.pago.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
           };
        }

        if (!cancelled) {
          setEmpenhos(empenhosApp);
          setClassificacaoHierarquica(hierarquia);
          setTotaisGlobais(globais);
          setTotaisPorUGReais(ugGlobaisFmt);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[useEmpenhos] Erro ao carregar dados:', err);
          setError(err.message ?? 'Erro desconhecido ao carregar os dados.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    carregar();
    return () => { cancelled = true; };
  }, []);

  return { empenhos, classificacaoHierarquica, totaisGlobais, totaisPorUGReais, loading, error };
}
