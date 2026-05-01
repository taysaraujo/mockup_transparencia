import React, { useState, useMemo, useEffect } from 'react';
import { useEmpenhos } from './utils/useEmpenhos.js';
import {
  Search, Download, Filter, FileText, ChevronLeft,
  BarChart2, PieChart, CheckCircle, Clock, File, Eye, List, ArrowUpDown, ChevronRight, ChevronUp, ChevronDown, X,
  FileSpreadsheet, FileJson
} from 'lucide-react';

const formatCurrency = (val) => {
  return val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const Accordion = ({ title, defaultExpanded = true, children }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div className="bg-white border border-slate-200 rounded shadow-sm overflow-hidden mb-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center p-5 bg-white hover:bg-slate-50 transition-colors focus:outline-none"
      >
        {expanded ? <ChevronUp size={20} className="text-slate-800 mr-3" /> : <ChevronDown size={20} className="text-slate-800 mr-3" />}
        <h3 className="font-bold text-slate-800 uppercase tracking-wide text-sm">{title}</h3>
      </button>
      {expanded && (
        <div className="p-6 border-t border-slate-100">
          {children}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedEmpenho, setSelectedEmpenho] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Paginação da Listagem
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filtros Globais (KPIs e Drilldown)
  const [kpiFilter, setKpiFilter] = useState('Todas');
  const [ugFilter, setUgFilter] = useState('Todas');
  const [classificacaoFilter, setClassificacaoFilter] = useState('Todas');

  // Estado de Expansão da Tabela Hierárquica (inicia recolhido)
  const [expandedNodes, setExpandedNodes] = useState([]);

  // --- NOVOS: Estados da Barra Lateral ---
  const [anoFilter, setAnoFilter] = useState('2026');
  const [dataInicio, setDataInicio] = useState('2026-01-01');
  const [dataFim, setDataFim] = useState('2026-12-31');
  const [empenhoText, setEmpenhoText] = useState('');
  const [credorText, setCredorText] = useState('');
  const [valorText, setValorText] = useState('');
  const [descricaoText, setDescricaoText] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('Todas');
  const [grupoFilter, setGrupoFilter] = useState('Todas');
  const [elementoFilter, setElementoFilter] = useState('Todas');

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Mock Data Empenhos
  const mockEmpenhos = [
    {
      id: '2026NE000100',
      data: '12/01/2026',
      ug: '30101',
      // [D1] classificacao: objeto hierárquico explícito
      classificacao: { categoriaId: '3', grupoId: '31', modalidadeId: '3190', elementoId: '319011' },
      credor: '00.000.000/0001-00',
      funcao: '04 - Administração',
      fase: 'Pago',
      saldoStatus: 'positivo',
      valor: 'R$ 2.103.909,65',
      objeto: 'Empenho Orçamentário - REFERENTE A VENCIMENTOS E SALÁRIOS...',
      processo: '10001/2026',
      // [D3] licitação separada
      licitacaoModalidade: 'INEXIGIBILIDADE',
      procedimentoLicitatorio: null,
      valores: { empenhado: '2.103.909,65', liquidado: '2.103.909,65', pago: '1.581.192,89', aPagar: '522.716,76' },
      programatica: {
        codigo: '04.122.0001.2.001.3.1.90.11.01.00',
        unidade: '30101 - TCE-MS PRINCIPAL',
        funcao: '04 - Administração',
        subfuncao: '122 - Administração Geral',
        programa: '0001 - GESTÃO ADMINISTRATIVA',
        projetoAtividade: '2001 - Manutenção dos Serviços Administrativos',
        fonte: '15000000 - Recursos Não Vinculados de Impostos',
        categoria: '3 - DESPESAS CORRENTES',
        gnd: '1 - PESSOAL E ENCARGOS SOCIAIS',
        modalidade: '90 - APLICAÇÕES DIRETAS',
        elemento: '11 - VENCIMENTOS E VANTAGENS FIXAS',
        itemDespesa: '3.1.90.11.01 - Folha de Pagamento Servidores'
      },
      empenhos: [
        { data: '12/01/2026', documento: '2026NE000100', ug: '30101', modalidade: 'APLICAÇÕES DIRETAS', elemento: '319011 - VENCIMENTOS E VANTAGENS FIXAS', cpfCnpj: '00.000.000/0001-00', favorecido: '00.000.000/0001-00', valor: 2103909.65 }
      ],
      liquidacoes: [
        { data: '20/01/2026', documento: '2026LQ000050', ug: '30101', modalidade: 'APLICAÇÕES DIRETAS', elemento: '319011 - VENCIMENTOS E VANTAGENS FIXAS', cpfCnpj: '00.000.000/0001-00', favorecido: '00.000.000/0001-00', valor: 2103909.65 }
      ],
      pagamentos: [
        { data: '25/01/2026', documento: '2026OB000045', ug: '30101', modalidade: 'APLICAÇÕES DIRETAS', elemento: '319011 - VENCIMENTOS E VANTAGENS FIXAS', cpfCnpj: '00.000.000/0001-00', favorecido: '00.000.000/0001-00', valor: 1581192.89 }
      ]
    },
    {
      id: '2026NE000123',
      data: '27/01/2026',
      ug: '30101',
      classificacao: { categoriaId: '3', grupoId: '33', modalidadeId: '3390', elementoId: '339039' },
      credor: '38.972.498/0001-27',
      funcao: '04 - Administração',
      fase: 'Empenhado',
      saldoStatus: 'positivo',
      valor: 'R$ 1.270,20',
      objeto: 'Empenho Orçamentário - Aquisição de Equipamento de...',
      processo: '12345/2026',
      licitacaoModalidade: 'PREGÃO',
      procedimentoLicitatorio: 'Pregão Eletrônico Nº 12/2026',
      valores: { empenhado: '1.270,20', liquidado: '0,00', pago: '0,00', aPagar: '1.270,20' },
      programatica: {
        codigo: '04.122.0001.2.001.3.3.90.39.00.00',
        unidade: '30101 - TCE-MS PRINCIPAL',
        funcao: '04 - Administração',
        subfuncao: '122 - Administração Geral',
        programa: '0001 - GESTÃO ADMINISTRATIVA',
        projetoAtividade: '2001 - Manutenção dos Serviços Administrativos',
        fonte: '250 - Convênios',
        categoria: '3 - Corrente',
        gnd: '3 - Outras Despesas Correntes',
        modalidade: '90 - Aplicação Direta',
        elemento: '39 - Serviços PJ',
        itemDespesa: '3.3.90.39.97 - Serviço de TI com recurso de convênio'
      },
      empenhos: [
        { data: '27/01/2026', documento: '2026NE000123', ug: '30101', modalidade: 'APLICAÇÕES DIRETAS', elemento: '339039 - OUTROS SERVIÇOS DE TERCEIROS - PJ', cpfCnpj: '38.972.498/0001-27', favorecido: '38.972.498/0001-27', valor: 1270.20 }
      ],
      liquidacoes: [],
      pagamentos: []
    },
    {
      id: '2026NE000125',
      data: '30/01/2026',
      ug: '30901',
      classificacao: { categoriaId: '3', grupoId: '33', modalidadeId: '3390', elementoId: '339030' },
      credor: '000.092.000-00',
      funcao: '04 - Administração',
      fase: 'Pago',
      saldoStatus: 'positivo',
      valor: 'R$ 1.621,00',
      objeto: 'Empenho Orçamentário - REFERENTE AO PROGRAMA FAMIL...',
      processo: '12510/2026',
      licitacaoModalidade: 'DISPENSA',
      procedimentoLicitatorio: 'Dispensa de Licitação Nº 03/2026',
      valores: { empenhado: '1.621,00', liquidado: '1.621,00', pago: '1.621,00', aPagar: '0,00' },
      programatica: {
        codigo: '01.001.01.031.0001.2.001.3.3.90.30.00.00',
        unidade: '30901 - FUNDO ESP DE DESENV MODERN',
        funcao: '04 - Administração',
        subfuncao: '122 - Administração Geral',
        programa: '0001 - PROCESSO LEGISLATIVO',
        projetoAtividade: '2001 - Manter o Legislativo',
        fonte: '1001 - Recursos do Tesouro (Descentralizados)',
        categoria: '3 - DESPESAS CORRENTES',
        gnd: '3 - OUTRAS DESPESAS CORRENTES',
        modalidade: '90 - APLICAÇÕES DIRETAS',
        elemento: '30 - MATERIAL DE CONSUMO',
        itemDespesa: '3.3.90.30.01 - Gasolina Comum'
      },
      empenhos: [
        { data: '30/01/2026', documento: '2026NE000125', ug: '30901', modalidade: 'APLICAÇÕES DIRETAS', elemento: '339030 - MATERIAL DE CONSUMO', cpfCnpj: '000.092.000-00', favorecido: '000.092.000-00', valor: 1621.00 }
      ],
      liquidacoes: [
        { data: '05/02/2026', documento: '2026LQ000336', ug: '30901', modalidade: 'APLICAÇÕES DIRETAS', elemento: '339030 - MATERIAL DE CONSUMO', cpfCnpj: '000.092.000-00', favorecido: '000.092.000-00', valor: 1621.00 }
      ],
      pagamentos: [
        { data: '10/02/2026', documento: '2026OB000450', ug: '30901', modalidade: 'APLICAÇÕES DIRETAS', elemento: '339030 - MATERIAL DE CONSUMO', cpfCnpj: '000.092.000-00', favorecido: '000.092.000-00', valor: 1621.00 }
      ]
    },
    {
      id: '2026NE000405',
      data: '15/02/2026',
      ug: '30101',
      classificacao: { categoriaId: '3', grupoId: '33', modalidadeId: '3390', elementoId: '339040' },
      credor: 'Distribuidora Nacional',
      funcao: '04 - Administração',
      fase: 'Empenhado',
      saldoStatus: 'positivo',
      valor: 'R$ 3.500,00',
      objeto: 'Empenho Orçamentário - REFERENTE A PRESTAÇÃO DE SERVIÇOS DE MANUTENÇÃO...',
      processo: '04500/2026',
      licitacaoModalidade: 'PREGÃO',
      procedimentoLicitatorio: 'Pregão Eletrônico Nº 10/2026',
      valores: { empenhado: '3.500,00', liquidado: '0,00', pago: '0,00', aPagar: '3.500,00' },
      programatica: {
        codigo: '04.122.0001.2.001.3.3.90.40.00.00',
        unidade: '30101 - TCE-MS PRINCIPAL',
        funcao: '04 - Administração',
        subfuncao: '122 - Administração Geral',
        programa: '0001 - GESTÃO ADMINISTRATIVA',
        projetoAtividade: '2001 - Manutenção dos Serviços Administrativos',
        fonte: '15000000 - Recursos Não Vinculados de Impostos',
        categoria: '3 - DESPESAS CORRENTES',
        gnd: '3 - OUTRAS DESPESAS CORRENTES',
        modalidade: '90 - APLICAÇÕES DIRETAS',
        elemento: '40 - SERVIÇOS DE TI',
        itemDespesa: '3.3.90.40.01 - Manutenção de Software'
      },
      empenhos: [
        { data: '15/02/2026', documento: '2026NE000405', ug: '30101', modalidade: 'PREGÃO', elemento: '339040 - SERVIÇOS DE TI', cpfCnpj: '01.234.567/0001-89', favorecido: 'Distribuidora Nacional', historico: 'Empenho Orçamentário - REFERENTE A PRESTAÇÃO DE SERVIÇOS DE MANUTENÇÃO...', valor: 5000.00 },
        { data: '18/02/2026', documento: '2026NE000405', ug: '30101', modalidade: 'PREGÃO', elemento: '339040 - SERVIÇOS DE TI', cpfCnpj: '01.234.567/0001-89', favorecido: 'Distribuidora Nacional', historico: 'Anulação Parcial de Empenho - Ajuste e Redução de quantitativo contratual', valor: -1500.00 }
      ],
      liquidacoes: [],
      pagamentos: []
    }
  ];


  // ── Dados reais via hook (lê os CSVs de /public/data) ─────────────────
  const {
    empenhos: empenhosReais,
    classificacaoHierarquica,
    totaisGlobais,
    totaisPorUGReais,
    loading: dadosLoading,
    error: dadosError,
  } = useEmpenhos();

  // Fonte de dados: se tiver dados reais do hook, use-os; senão, mock.
  const mockAnulacao = mockEmpenhos.find(e => e.id === '2026NE000405');
  const empenhosToUse = empenhosReais.length > 0 ? [mockAnulacao, ...empenhosReais] : mockEmpenhos;

  // -- Opções do filtro baseadas na carga de dados atual --
  const optionsCategoria = useMemo(() => {
    const s = new Set();
    empenhosToUse.forEach(e => {
      if (e.programatica?.categoria && e.classificacao?.categoriaId) s.add(e.programatica.categoria);
    });
    return ["Todas", ...Array.from(s).sort()];
  }, [empenhosToUse]);

  const optionsGrupo = useMemo(() => {
    const s = new Set();
    empenhosToUse.forEach(e => {
      if (e.programatica?.gnd && e.classificacao?.grupoId) s.add(e.programatica.gnd);
    });
    return ["Todas", ...Array.from(s).sort()];
  }, [empenhosToUse]);

  const optionsElemento = useMemo(() => {
    const s = new Set();
    empenhosToUse.forEach(e => {
      if (e.programatica?.elemento && e.classificacao?.elementoId) s.add(e.programatica.elemento);
    });
    return ["Todas", ...Array.from(s).sort()];
  }, [empenhosToUse]);

  // Classificação hierárquica: dados reais quando disponíveis, fallback estático
  const hierarchicalClassification = classificacaoHierarquica?.length > 0
    ? classificacaoHierarquica
    : [
    {
      id: '3', codigo: '3000000000', descricao: 'DESPESAS CORRENTES', nivel: 'Categoria Econômica',
      valores: { empenhado: 12450000.00, liquidado: 8321000.00, pago: 7950000.00 },
      children: [
        {
          id: '31', codigo: '3100000000', descricao: 'PESSOAL E ENCARGOS SOCIAIS', nivel: 'Grupo de Natureza da Despesa (GND)',
          valores: { empenhado: 2539724.09, liquidado: 2539724.09, pago: 1811295.68 },
          children: [
            {
              id: '3190', codigo: '3190000000', descricao: 'APLICAÇÕES DIRETAS', nivel: 'Modalidade de Aplicação',
              valores: { empenhado: 2539724.09, liquidado: 2539724.09, pago: 1811295.68 },
              children: [
                {
                  id: '319011', codigo: '3190110000', descricao: 'VENCIMENTOS E VANTAGENS FIXAS - PESSOAL CIVIL', nivel: 'Elemento de Despesa',
                  valores: { empenhado: 2103909.65, liquidado: 2103909.65, pago: 1581192.89 }
                },
                {
                  id: '319013', codigo: '3190130000', descricao: 'OBRIGAÇÕES PATRONAIS', nivel: 'Elemento de Despesa',
                  valores: { empenhado: 435814.44, liquidado: 435814.44, pago: 230102.79 }
                }
              ]
            }
          ]
        },
        {
          id: '33', codigo: '3300000000', descricao: 'OUTRAS DESPESAS CORRENTES', nivel: 'Grupo de Natureza da Despesa (GND)',
          valores: { empenhado: 9910275.91, liquidado: 5781275.91, pago: 6138704.32 },
          children: [
            {
              id: '3390', codigo: '3390000000', descricao: 'APLICAÇÕES DIRETAS', nivel: 'Modalidade de Aplicação',
              valores: { empenhado: 9910275.91, liquidado: 5781275.91, pago: 6138704.32 },
              children: [
                {
                  id: '339030', codigo: '3390300000', descricao: 'MATERIAL DE CONSUMO', nivel: 'Elemento de Despesa',
                  valores: { empenhado: 1234135.11, liquidado: 288704.52, pago: 284158.82 }
                },
                {
                  id: '339039', codigo: '3390390000', descricao: 'OUTROS SERVIÇOS DE TERCEIROS - PESSOA JURÍDICA', nivel: 'Elemento de Despesa',
                  valores: { empenhado: 8676140.80, liquidado: 5492571.39, pago: 5854545.50 }
                }
              ]
            }
          ]
        }
      ]
    }
  ];

  // Função para planificar a árvore de acordo com os nós expandidos
  const flattenTree = (nodes, expandedIds, depth = 0) => {
    let result = [];
    nodes.forEach(node => {
      result.push({ ...node, depth });
      if (expandedIds.includes(node.id) && node.children) {
        result = result.concat(flattenTree(node.children, expandedIds, depth + 1));
      }
    });
    return result;
  };

  const flattenedClassification = flattenTree(hierarchicalClassification, expandedNodes);

  // Filtra a tabela de empenhos combinando TODOS os filtros
  const filteredEmpenhos = empenhosToUse.filter(emp => {
    // Filtros de KPIs, Tabelas e Drill-down
    const matchFase = (() => {
      if (kpiFilter === 'Todas' || kpiFilter === 'Empenhado') return true;
      if (kpiFilter === 'Liquidado') return emp.liquidacoes && emp.liquidacoes.length > 0;
      if (kpiFilter === 'Pago') return emp.pagamentos && emp.pagamentos.length > 0;
      return true;
    })();
    const matchUg = ugFilter === 'Todas' || emp.ug === ugFilter;
    // [D1] Filtro de classificação hierárquico com correspondência EXATA por nível.
    // Cada nível é testado independentemente — sem startsWith ambíguo.
    // classificacaoFilter contém o id do nó selecionado (ex: '3', '33', '3390', '339014')
    const matchClassificacao = classificacaoFilter === 'Todas' || (
      emp.classificacao?.categoriaId  === classificacaoFilter ||
      emp.classificacao?.grupoId      === classificacaoFilter ||
      emp.classificacao?.modalidadeId === classificacaoFilter ||
      emp.classificacao?.elementoId   === classificacaoFilter
    );

    // Filtros da Barra Lateral: Período
    const empDateParts = emp.data.split('/');
    const empDate = new Date(`${empDateParts[2]}-${empDateParts[1]}-${empDateParts[0]}T00:00:00`);
    const start = new Date(`${dataInicio}T00:00:00`);
    const end = new Date(`${dataFim}T23:59:59`);
    const matchDate = empDate >= start && empDate <= end;

    // Filtros da Barra Lateral: Texto
    const matchEmpenhoText = empenhoText === '' || emp.id.toLowerCase().includes(empenhoText.toLowerCase());
    const matchCredorText = credorText === '' || emp.credor.toLowerCase().includes(credorText.toLowerCase());
    const matchValorText = valorText === '' || emp.valor.toLowerCase().includes(valorText.toLowerCase());
    const matchDescricaoText = descricaoText === '' || emp.objeto.toLowerCase().includes(descricaoText.toLowerCase());

    // Filtros da Barra Lateral: Combos Funcional Programática
    const matchCategoria = categoriaFilter === 'Todas' || emp.classificacao?.categoriaId === categoriaFilter.split(' - ')[0];
    const matchGrupo = grupoFilter === 'Todas' || emp.classificacao?.grupoId === grupoFilter.split(' - ')[0];
    const matchElemento = elementoFilter === 'Todas' || emp.classificacao?.elementoId === elementoFilter.split(' - ')[0];

    return matchFase && matchUg && matchClassificacao && matchDate &&
      matchEmpenhoText && matchCredorText && matchValorText && matchDescricaoText &&
      matchCategoria && matchGrupo && matchElemento;
  });

  // Sempre reiniciar a página quando qualquer filtro alterar
  useEffect(() => {
    setCurrentPage(1);
  }, [kpiFilter, ugFilter, classificacaoFilter, anoFilter, dataInicio, dataFim, empenhoText, credorText, valorText, descricaoText, categoriaFilter, grupoFilter, elementoFilter]);

  const totalFiltered = filteredEmpenhos.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEmpenhos = filteredEmpenhos.slice(startIndex, startIndex + itemsPerPage);

  // Função auxiliar para buscar totais do nó selecionado na árvore
  const findNodeInTree = (nodes, id) => {
    for (let node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = findNodeInTree(node.children, id);
        if (found) return found;
      }
    }
    return null;
  };

  // Totais para KPIs: de dados reais quando disponíveis
  const totaisPorUG = useMemo(() => {
    if (totaisPorUGReais && Object.keys(totaisPorUGReais).length > 0) {
      return {
        'Todas': { empenhado: totaisGlobais.empenhado, liquidado: totaisGlobais.liquidado, pago: totaisGlobais.pago },
        ...totaisPorUGReais
      };
    }
    return {
      'Todas': { empenhado: totaisGlobais.empenhado, liquidado: totaisGlobais.liquidado, pago: totaisGlobais.pago },
    };
  }, [totaisPorUGReais, totaisGlobais]);

  let totaisAtuais = totaisPorUG['Todas'] ?? { empenhado: '0,00', liquidado: '0,00', pago: '0,00' };
  let activeClassNode = null;

  if (classificacaoFilter !== 'Todas') {
    activeClassNode = findNodeInTree(hierarchicalClassification, classificacaoFilter);
    if (activeClassNode) {
      totaisAtuais = {
        empenhado: formatCurrency(activeClassNode.valores.empenhado),
        liquidado: formatCurrency(activeClassNode.valores.liquidado),
        pago: formatCurrency(activeClassNode.valores.pago)
      };
    }
  } else if (ugFilter !== 'Todas') {
    totaisAtuais = totaisPorUG[ugFilter] ?? totaisPorUG['Todas'];
  }

  const handleDetalhar = (empenho) => {
    setSelectedEmpenho(empenho);
    setCurrentView('detalhe');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLimparFiltros = () => {
    // Reseta filtros globais
    setKpiFilter('Todas');
    setUgFilter('Todas');
    setClassificacaoFilter('Todas');

    // Reseta filtros da barra lateral
    setAnoFilter('2026');
    setDataInicio('2026-01-01');
    setDataFim('2026-12-31');
    setEmpenhoText('');
    setCredorText('');
    setValorText('');
    setDescricaoText('');
    setCategoriaFilter('Todas');
    setGrupoFilter('Todas');
    setElementoFilter('Todas');

    showToast('Todos os filtros foram limpos.');
  };

  const handleRowClick = (item) => {
    // Toggle de expansão do accordion
    if (expandedNodes.includes(item.id)) {
      setExpandedNodes(expandedNodes.filter(id => id !== item.id));
    } else {
      setExpandedNodes([...expandedNodes, item.id]);
    }

    // Aplica o filtro selecionado (ou desmarca se já estava selecionado)
    setClassificacaoFilter(classificacaoFilter === item.id ? 'Todas' : item.id);
  };

  const renderTabelaFase = (titulo, dados, extraClass = "mb-12 last:mb-0") => {
    if (!dados || dados.length === 0) return null;
    const total = dados.reduce((acc, curr) => acc + curr.valor, 0);

    return (
      <div className={extraClass}>
        {titulo && <h3 className="text-2xl font-bold text-slate-500 mb-6">{titulo}</h3>}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="text-slate-600 border-b border-slate-300">
                <th className="pb-2 font-bold">Data</th>
                <th className="pb-2 font-bold">Documento</th>
                <th className="pb-2 font-bold">CPF/CNPJ</th>
                <th className="pb-2 font-bold">Favorecido</th>
                <th className="pb-2 font-bold min-w-[200px]">Histórico</th>
                <th className="pb-2 font-bold text-right w-32">Valor</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((linha, idx) => (
                <tr key={idx} className="even:bg-slate-50 text-slate-500">
                  <td className="py-4 pr-4">{linha.data}</td>
                  <td className="py-4 pr-4">{linha.documento}</td>
                  <td className="py-4 pr-4">{linha.cpfCnpj || '-'}</td>
                  <td className="py-4 pr-4 max-w-[150px] truncate" title={linha.favorecido}>{linha.favorecido}</td>
                  <td className="py-4 pr-4 max-w-[200px] xl:max-w-[300px] truncate leading-tight" title={linha.historico}>{linha.historico}</td>
                  <td className="py-4">
                    <div className="flex justify-between w-full gap-4">
                      <span>R$</span>
                      <span>{formatCurrency(linha.valor)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end mt-2">
          <div className="flex items-center gap-6 text-slate-500">
            <span className="text-sm font-bold text-slate-600 uppercase tracking-wider">Total:</span>
            <div className="w-32 flex justify-between border-t-2 border-slate-600 pt-2 text-base">
              <span>R$</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const FilterInput = ({ label, type = "text", placeholder, options, value, onChange }) => (
    <div className="relative border border-slate-300 rounded pt-3 pb-2 px-3 bg-white focus-within:border-[#0097B2] focus-within:ring-1 focus-within:ring-[#0097B2] transition-colors">
      <label className="absolute -top-2.5 left-2 bg-white px-1 text-xs text-slate-500 z-10">
        {label}
      </label>
      {type === "select" ? (
        <select
          value={value}
          onChange={onChange}
          className="w-full text-sm text-slate-700 bg-transparent outline-none appearance-none cursor-pointer"
        >
          {options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
        </select>
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="w-full text-sm text-slate-700 bg-transparent outline-none placeholder-slate-400"
        />
      )}
    </div>
  );

  // Relaciona a seleção do combo de Unidade Gestora com o filtro global
  const ugOptions = ["Todas", "30101 - TRIBUNAL DE CONTAS", "30901 - FUNDO ESP DE DESENV MODERN E APERF DO TC MS"];
  const ugSelectValue = ugFilter === '30101' ? ugOptions[1] : ugFilter === '30901' ? ugOptions[2] : ugOptions[0];
  const handleUgChange = (e) => {
    const val = e.target.value;
    if (val.startsWith('30101')) setUgFilter('30101');
    else if (val.startsWith('30901')) setUgFilter('30901');
    else setUgFilter('Todas');
  };

  // Verifica se a data compreende exatamente o início e o fim de um ano
  const syncAnoIfStandard = (startStr, endStr) => {
    if (!startStr || !endStr) return;
    const sYear = startStr.substring(0, 4);
    const eYear = endStr.substring(0, 4);
    if (startStr === `${sYear}-01-01` && endStr === `${sYear}-12-31` && sYear === eYear) {
      if (["2026", "2025", "2024", "2023", "2022"].includes(sYear)) {
        setAnoFilter(sYear);
      }
    }
  };

  const handleDataInicioChange = (e) => {
    const val = e.target.value;
    setDataInicio(val);
    syncAnoIfStandard(val, dataFim);
  };

  const handleDataFimChange = (e) => {
    const val = e.target.value;
    setDataFim(val);
    syncAnoIfStandard(dataInicio, val);
  };

  // Atualiza o período (data início e data fim) automaticamente ao mudar o ano pelo dropdown
  const handleAnoChange = (e) => {
    const selectedYear = e.target.value;
    setAnoFilter(selectedYear);
    setDataInicio(`${selectedYear}-01-01`);
    setDataFim(`${selectedYear}-12-31`);
  };

  // Lógica de visibilidade do campo Ano: só exibe se o período for 01/01 a 31/12 de um mesmo ano
  const startYear = dataInicio ? dataInicio.substring(0, 4) : '';
  const endYear = dataFim ? dataFim.substring(0, 4) : '';
  const isStandardYear = dataInicio === `${startYear}-01-01` && dataFim === `${startYear}-12-31` && startYear === endYear;

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans">

      {/* Header Institucional Global */}
      <header className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Portal de Transparência</h1>
            <p className="text-xs text-slate-300">Tribunal de Contas do Estado de Mato Grosso do Sul</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-4 text-sm items-center">
            <button className="bg-slate-800 hover:bg-slate-700 px-3 py-1 rounded transition-colors focus:ring-2 focus:ring-white">
              Acessibilidade
            </button>
          </div>
        </div>
      </header>

      {toastMessage && (
        <div className="fixed bottom-4 right-4 bg-slate-800 text-white px-4 py-2 rounded shadow-lg z-50 flex items-center gap-2 animate-bounce">
          <CheckCircle size={18} className="text-green-400" /> {toastMessage}
        </div>
      )}

      {/* Content Area */}
      <main className="max-w-[1400px] mx-auto p-4 py-8">

        {/* --- DASHBOARD --- */}
        {currentView === 'dashboard' && (
          <div className="space-y-8">

            {/* Título e Navegação iguais à imagem */}
            <div className="mb-4">
              <div className="text-sm text-slate-500 mb-2">Home / Despesas</div>
              <h2 className="text-4xl font-medium text-[#007B9E] border-b-[3px] border-[#007B9E] pb-2 inline-block w-full">
                Despesas
              </h2>
              <div className="text-right text-xs text-slate-500 mt-2">
                Dados atualizados em: 14/04/2026
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">

              {/* Barra Lateral: Filtros Agrupados */}
              <div className="w-full lg:w-1/4 flex-shrink-0">
                <form id="filtros-form" onSubmit={(e) => e.preventDefault()} className="bg-white p-5 rounded border border-slate-200 shadow-sm sticky top-24">
                  <h3 className="text-sm font-semibold text-[#007B9E] uppercase tracking-wider mb-5 flex items-center gap-2">
                    <Filter size={18} /> Filtros da Pesquisa
                  </h3>

                  <div className="space-y-4">
                    {/* Exibe o Filtro de Ano apenas se for um período de ano padrão */}
                    {isStandardYear && (
                      <FilterInput
                        label="Ano" type="select" options={["2026", "2025", "2024", "2023", "2022"]}
                        value={anoFilter} onChange={handleAnoChange}
                      />
                    )}

                    <div className="relative border border-slate-300 rounded pt-3 pb-2 px-2 bg-white focus-within:border-[#0097B2] focus-within:ring-1 focus-within:ring-[#0097B2] transition-colors">
                      <label className="absolute -top-2.5 left-2 bg-white px-1 text-xs text-slate-500 z-10">
                        Período
                      </label>
                      <div className="flex items-center justify-between gap-1">
                        <input type="date" value={dataInicio} onChange={handleDataInicioChange} className="flex-1 min-w-0 text-xs text-slate-700 bg-transparent outline-none cursor-pointer tracking-tighter sm:tracking-normal" />
                        <span className="text-slate-400 text-xs font-medium">a</span>
                        <input type="date" value={dataFim} onChange={handleDataFimChange} className="flex-1 min-w-0 text-xs text-slate-700 bg-transparent outline-none cursor-pointer tracking-tighter sm:tracking-normal" />
                      </div>
                    </div>

                    <FilterInput
                      label="Categoria Econômica" type="select" options={optionsCategoria}
                      value={categoriaFilter} onChange={e => setCategoriaFilter(e.target.value)}
                    />

                    <FilterInput
                      label="Grupo de Natureza da Despesa" type="select" options={optionsGrupo}
                      value={grupoFilter} onChange={e => setGrupoFilter(e.target.value)}
                    />

                    <FilterInput
                      label="Elemento de Despesa" type="select" options={optionsElemento}
                      value={elementoFilter} onChange={e => setElementoFilter(e.target.value)}
                    />

                    <FilterInput label="Empenho" placeholder="Ex: 2026NE..." value={empenhoText} onChange={e => setEmpenhoText(e.target.value)} />
                    <FilterInput label="Favorecido" placeholder="Buscar nome, cpf ou cnpj" value={credorText} onChange={e => setCredorText(e.target.value)} />
                    <FilterInput label="Valor" placeholder="Ex: 1.250,00" value={valorText} onChange={e => setValorText(e.target.value)} />
                    <FilterInput label="Descrição" placeholder="Palavras-chave" value={descricaoText} onChange={e => setDescricaoText(e.target.value)} />
                  </div>

                  <div className="mt-6 flex flex-col xl:flex-row gap-3 pt-5 border-t border-slate-100">
                    <button type="button" onClick={() => showToast('Pesquisa atualizada!')} className="w-full xl:w-1/2 flex items-center justify-center gap-2 bg-[#0097B2] hover:bg-[#007B9E] text-white px-3 py-2.5 rounded text-sm font-medium transition-colors">
                      <Search size={16} /> Pesquisar
                    </button>
                    <button type="button" onClick={handleLimparFiltros} className="w-full xl:w-1/2 flex items-center justify-center gap-2 border border-slate-300 text-slate-600 bg-white hover:bg-slate-50 px-3 py-2.5 rounded text-sm font-medium transition-colors">
                      <X size={16} /> Limpar
                    </button>
                  </div>
                </form>
              </div>

              {/* Conteúdo Principal */}
              <div className="w-full lg:w-3/4 space-y-8">

                {/* KPIs Interativos com Valores Exatos */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div
                    onClick={() => setKpiFilter(kpiFilter === 'Empenhado' ? 'Todas' : 'Empenhado')}
                    className={`bg-white p-5 rounded border cursor-pointer transition-all flex flex-col justify-center ${kpiFilter === 'Empenhado' ? 'ring-2 ring-slate-400 shadow-md bg-slate-50' : 'border-slate-200 hover:border-slate-300 shadow-sm'}`}
                  >
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Empenhado</p>
                    <p className="text-xl font-light text-[#007B9E] truncate" title={`R$ ${totaisAtuais.empenhado}`}>R$ {totaisAtuais.empenhado}</p>
                    <p className="text-xs text-slate-400 mt-1">Reserva de dotação</p>
                  </div>

                  <div
                    onClick={() => setKpiFilter(kpiFilter === 'Liquidado' ? 'Todas' : 'Liquidado')}
                    className={`bg-white p-5 rounded border cursor-pointer transition-all flex flex-col justify-center ${kpiFilter === 'Liquidado' ? 'ring-2 ring-blue-400 shadow-md bg-blue-50' : 'border-slate-200 hover:border-slate-300 shadow-sm'}`}
                  >
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Liquidado</p>
                    <p className="text-xl font-light text-blue-600 truncate" title={`R$ ${totaisAtuais.liquidado}`}>R$ {totaisAtuais.liquidado}</p>
                    <p className="text-xs text-slate-400 mt-1">Bens/serviços atestados</p>
                  </div>

                  <div
                    onClick={() => setKpiFilter(kpiFilter === 'Pago' ? 'Todas' : 'Pago')}
                    className={`bg-white p-5 rounded border cursor-pointer transition-all flex flex-col justify-center ${kpiFilter === 'Pago' ? 'ring-2 ring-green-400 shadow-md bg-green-50' : 'border-slate-200 hover:border-slate-300 shadow-sm'}`}
                  >
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Pago</p>
                    <p className="text-xl font-light text-green-600 truncate" title={`R$ ${totaisAtuais.pago}`}>R$ {totaisAtuais.pago}</p>
                    <p className="text-xs text-slate-400 mt-1">Recursos repassados</p>
                  </div>
                </div>

                {/* Tabela de Resumo Consolidado (Classificação da Unidade Gestora) */}
                <div className="mt-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 px-1 gap-2">
                    <h3 className="text-sm font-semibold text-[#007B9E] uppercase tracking-wider flex items-center gap-2">
                      Classificação da Unidade Orçamentária
                    </h3>
                    
                    {/* Ícones de Exportação LAI (Movidos para cá) */}
                    <div className="flex justify-end items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium mr-2 uppercase tracking-wider">Exportar:</span>
                      <button onClick={() => showToast('Iniciando download do CSV...')} className="flex items-center justify-center w-9 h-9 bg-white border border-slate-200 text-slate-500 rounded hover:bg-[#0097B2] hover:text-white hover:border-[#0097B2] transition-colors shadow-sm" title="Exportar CSV">
                        <FileText size={18} />
                      </button>
                      <button onClick={() => showToast('Iniciando download do XLSX...')} className="flex items-center justify-center w-9 h-9 bg-white border border-slate-200 text-slate-500 rounded hover:bg-[#0097B2] hover:text-white hover:border-[#0097B2] transition-colors shadow-sm" title="Exportar XLSX">
                        <FileSpreadsheet size={18} />
                      </button>
                      <button onClick={() => showToast('Iniciando download do JSON...')} className="flex items-center justify-center w-9 h-9 bg-white border border-slate-200 text-slate-500 rounded hover:bg-[#0097B2] hover:text-white hover:border-[#0097B2] transition-colors shadow-sm" title="Exportar JSON">
                        <FileJson size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                          <tr className="text-slate-600 border-b border-slate-300">
                            <th className="p-4 font-bold">Código</th>
                            <th className="p-4 font-bold">Descrição</th>
                            <th className="p-4 font-bold text-right">Empenhado</th>
                            <th className="p-4 font-bold text-right">Liquidado</th>
                            <th className="p-4 font-bold text-right">Pago</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600">
                          <tr
                            onClick={() => setUgFilter(ugFilter === '30101' ? 'Todas' : '30101')}
                            className={`cursor-pointer transition-colors ${ugFilter === '30101' ? 'bg-[#E0F4F8] border-l-4 border-[#0097B2]' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}
                            title="Clique para filtrar a listagem abaixo"
                          >
                            <td className="p-4">30101</td>
                            <td className="p-4 font-medium">TRIBUNAL DE CONTAS</td>
                            <td className="p-4 text-right">{totaisPorUG['30101']?.empenhado ?? '0,00'}</td>
                            <td className="p-4 text-right">{totaisPorUG['30101']?.liquidado ?? '0,00'}</td>
                            <td className="p-4 text-right">{totaisPorUG['30101']?.pago ?? '0,00'}</td>
                          </tr>
                          <tr
                            onClick={() => setUgFilter(ugFilter === '30901' ? 'Todas' : '30901')}
                            className={`cursor-pointer transition-colors ${ugFilter === '30901' ? 'bg-[#E0F4F8] border-l-4 border-[#0097B2]' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}
                            title="Clique para filtrar a listagem abaixo"
                          >
                            <td className="p-4">30901</td>
                            <td className="p-4 font-medium">FUNDO ESP DE DESENV MODERN E APERF DO TC MS</td>
                            <td className="p-4 text-right">{totaisPorUG['30901']?.empenhado ?? '0,00'}</td>
                            <td className="p-4 text-right">{totaisPorUG['30901']?.liquidado ?? '0,00'}</td>
                            <td className="p-4 text-right">{totaisPorUG['30901']?.pago ?? '0,00'}</td>
                          </tr>
                        </tbody>
                        <tfoot className="bg-slate-100 border-t border-slate-300 text-slate-700">
                          <tr>
                            <td className="p-4"></td>
                            <td className="p-4 font-bold text-right uppercase tracking-wider pr-8">Total</td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => { setKpiFilter('Empenhado'); setUgFilter('Todas'); }}
                                className="font-bold text-[#0097B2] hover:text-[#007B9E] hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-[#0097B2] rounded px-1"
                              >
                                {totaisGlobais.empenhado}
                              </button>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => { setKpiFilter('Liquidado'); setUgFilter('Todas'); }}
                                className="font-bold text-[#0097B2] hover:text-[#007B9E] hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-[#0097B2] rounded px-1"
                              >
                                {totaisGlobais.liquidado}
                              </button>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => { setKpiFilter('Pago'); setUgFilter('Todas'); }}
                                className="font-bold text-[#0097B2] hover:text-[#007B9E] hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-[#0097B2] rounded px-1"
                              >
                                {totaisGlobais.pago}
                              </button>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Tabela de Classificação Orçamentária (Hierárquica / Drill-down) */}
                <div className="mt-8">
                  <h3 className="text-sm font-semibold text-[#007B9E] uppercase tracking-wider mb-4 px-1 flex items-center gap-2">
                    Classificação Orçamentária (Níveis de Despesa)
                  </h3>
                  <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                          <tr className="text-slate-600 border-b border-slate-300">
                            <th className="p-4 font-bold">Código</th>
                            <th className="p-4 font-bold">Descrição</th>
                            <th className="p-4 font-bold text-right">Empenhado</th>
                            <th className="p-4 font-bold text-right">Liquidado</th>
                            <th className="p-4 font-bold text-right">Pago</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600">
                          {flattenedClassification.map((item) => (
                            <tr
                              key={item.id}
                              onClick={() => handleRowClick(item)}
                              className={`cursor-pointer transition-colors group ${classificacaoFilter === item.id ? 'bg-[#E0F4F8] border-l-4 border-[#0097B2]' : 'hover:bg-slate-50 border-l-4 border-transparent'}`}
                              title="Clique para expandir/recolher e filtrar o dashboard"
                            >
                              <td className="p-4 flex items-center gap-2" style={{ paddingLeft: `${(item.depth * 1.5) + 1}rem` }}>
                                {item.children ? (
                                  <ChevronRight size={16} className={`text-slate-400 transition-transform ${expandedNodes.includes(item.id) ? 'rotate-90 text-[#0097B2]' : ''}`} />
                                ) : (
                                  <div className="w-4 h-4 flex justify-center items-center"><div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div></div>
                                )}
                                <span className="text-slate-700">{item.codigo}</span>
                              </td>
                              <td className="p-4 py-3">
                                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider leading-tight mb-0.5">{item.nivel}</span>
                                <p className="text-slate-700 text-sm leading-tight">{item.descricao}</p>
                              </td>
                              <td className="p-4 text-right text-slate-600">{formatCurrency(item.valores.empenhado)}</td>
                              <td className="p-4 text-right text-slate-600">{formatCurrency(item.valores.liquidado)}</td>
                              <td className="p-4 text-right text-slate-600">{formatCurrency(item.valores.pago)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Tabela de Empenhos (Listagem Detalhada) */}
                <div className="mt-8">
                  <h3 className="text-sm font-semibold text-[#007B9E] uppercase tracking-wider mb-4 px-1 flex items-center gap-2 flex-wrap">
                    Listagem Detalhada por Empenho
                    {ugFilter !== 'Todas' && (
                      <span className="inline-flex items-center gap-1.5 bg-[#E0F4F8] text-[#007B9E] text-xs pl-2 pr-1.5 py-1 rounded font-medium border border-[#BCE4EC] normal-case tracking-normal shadow-sm">
                        UO: {ugFilter}
                        <button
                          onClick={() => setUgFilter('Todas')}
                          className="hover:bg-[#BCE4EC] text-[#007B9E] hover:text-[#005A75] rounded-full p-0.5 transition-colors focus:outline-none"
                          title="Remover filtro"
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>
                      </span>
                    )}
                    {classificacaoFilter !== 'Todas' && activeClassNode && (
                      <span className="inline-flex items-center gap-1.5 bg-[#E0F4F8] text-[#007B9E] text-xs pl-2 pr-1.5 py-1 rounded font-medium border border-[#BCE4EC] normal-case tracking-normal shadow-sm">
                        Classificação: {activeClassNode.descricao}
                        <button
                          onClick={() => setClassificacaoFilter('Todas')}
                          className="hover:bg-[#BCE4EC] text-[#007B9E] hover:text-[#005A75] rounded-full p-0.5 transition-colors focus:outline-none"
                          title="Remover filtro"
                        >
                          <X size={12} strokeWidth={2.5} />
                        </button>
                      </span>
                    )}
                  </h3>
                  <div className="overflow-x-auto bg-white rounded border border-slate-200 shadow-sm">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead>
                        <tr className="text-slate-600 border-b border-slate-300">
                          <th className="p-4 font-bold cursor-pointer hover:text-slate-800 group">
                            <div className="flex items-center gap-1">Empenho <ArrowUpDown size={14} className="opacity-50 group-hover:opacity-100" /></div>
                          </th>
                          <th className="p-4 font-bold cursor-pointer hover:text-slate-800 group">
                            <div className="flex items-center gap-1">Data <ArrowUpDown size={14} className="opacity-50 group-hover:opacity-100" /></div>
                          </th>
                          <th className="p-4 font-bold cursor-pointer hover:text-slate-800 group">
                            <div className="flex items-center gap-1">Fornecedor <ArrowUpDown size={14} className="opacity-50 group-hover:opacity-100" /></div>
                          </th>
                          <th className="p-4 font-bold cursor-pointer hover:text-slate-800 group">
                            <div className="flex items-center gap-1">Histórico <ArrowUpDown size={14} className="opacity-50 group-hover:opacity-100" /></div>
                          </th>
                          <th className="p-4 font-bold text-right">Empenhado</th>
                          <th className="p-4 font-bold text-right">Liquidado</th>
                          <th className="p-4 font-bold text-right">Pago</th>
                          <th className="p-4 font-bold text-right">A Pagar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedEmpenhos.length > 0 ? (
                          paginatedEmpenhos.map((emp) => (
                            <tr
                              key={emp.id}
                              onClick={() => handleDetalhar(emp)}
                              className="hover:bg-slate-50 transition-colors text-slate-600 group cursor-pointer"
                              title="Ver detalhes"
                            >
                              <td className="p-4">
                                <div className="flex flex-col gap-1">
                                  <span className="text-[#0097B2] font-medium hover:underline">
                                    {emp.id}
                                  </span>
                                  {/* [D4] Badge de saldo — sempre visível, nunca ocultar */}
                                  {emp.saldoStatus === 'anulado' && (
                                    <span className="inline-flex w-fit items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-red-100 text-red-700 border border-red-200">Anulado</span>
                                  )}
                                  {emp.saldoStatus === 'negativo' && (
                                    <span className="inline-flex w-fit items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-orange-100 text-orange-700 border border-orange-200">Saldo Negativo</span>
                                  )}
                                  {emp.saldoStatus === 'zerado' && (
                                    <span className="inline-flex w-fit items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500 border border-slate-200">Sem Saldo</span>
                                  )}
                                </div>
                              </td>
                              <td className="p-4">{emp.data}</td>
                              <td className="p-4 max-w-[180px] lg:max-w-[220px] whitespace-normal leading-tight text-xs" title={emp.credor}>{emp.credor}</td>
                              <td className="p-4 max-w-[180px] lg:max-w-[220px] truncate text-xs" title={emp.objeto}>{emp.objeto}</td>
                              <td className="p-4 text-right">{emp.valores.empenhado}</td>
                              <td className="p-4 text-right">{emp.valores.liquidado}</td>
                              <td className="p-4 text-right">{emp.valores.pago}</td>
                              <td className="p-4 text-right text-slate-600">{emp.valores.aPagar}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="8" className="p-8 text-center text-slate-500">
                              Nenhum dado encontrado ou a pesquisa não retornou resultados válidos.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginação Suave - Estilo TCE-MS */}
                  <div className="py-4 flex flex-col sm:flex-row justify-between items-center sm:items-start text-sm text-slate-500 mt-2 gap-4">
                    <div className="flex items-center gap-2">
                      <div className="border border-slate-300 rounded overflow-hidden">
                        <select 
                          value={itemsPerPage} 
                          onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                          className="px-2 py-1 bg-white text-slate-600 outline-none cursor-pointer text-sm"
                        >
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                      <span className="hidden sm:inline">registros por página</span>
                      <span className="hidden lg:inline ml-4">
                        {totalFiltered === 0 ? 0 : startIndex + 1} a {Math.min(startIndex + itemsPerPage, totalFiltered)} de {totalFiltered} registro(s) no total
                      </span>
                    </div>

                    <div className="flex bg-white rounded border border-slate-200 shadow-sm overflow-hidden text-[#0097B2]">
                      <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="px-3 py-1.5 border-r border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">««</button>
                      <button onClick={() => setCurrentPage(c => Math.max(1, c - 1))} disabled={currentPage === 1} className="px-3 py-1.5 border-r border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">«</button>
                      
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let start = Math.max(1, currentPage - 2);
                        if (start + 4 > totalPages) start = Math.max(1, totalPages - 4);
                        const p = start + i;
                        if (p > totalPages) return null;
                        return (
                          <button key={p} onClick={() => setCurrentPage(p)} className={`px-3 py-1.5 border-r border-slate-200 hover:bg-slate-50 ${currentPage === p ? 'bg-[#0097B2] text-white hover:bg-[#0097B2]' : ''}`}>
                            {p}
                          </button>
                        );
                      })}

                      <button onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 border-r border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">»</button>
                      <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="px-3 py-1.5 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed">»»</button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* --- DETALHE DO EMPENHO --- */}
        {currentView === 'detalhe' && selectedEmpenho && (
          <div className="space-y-6">

            <button
              onClick={() => setCurrentView('dashboard')}
              className="text-[#0097B2] hover:text-[#007B9E] flex items-center gap-1 text-sm font-medium mb-4 transition-colors"
            >
              <ChevronLeft size={16} /> Voltar para o Painel
            </button>

            {/* Valores em Destaque */}
            <div className="bg-white p-8 rounded shadow-sm border border-slate-200">
              <div className={`grid grid-cols-1 ${selectedEmpenho.valores.aPagar ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-4 bg-slate-50 p-6 rounded border border-slate-100`}>
                <div className="text-center sm:border-r border-slate-200 pb-2 sm:pb-0 border-b sm:border-b-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Empenhado</p>
                  <p className="text-2xl font-light text-slate-800">R$ {selectedEmpenho.valores.empenhado}</p>
                </div>
                <div className="text-center sm:border-r border-slate-200 pb-2 sm:pb-0 border-b sm:border-b-0">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Liquidado</p>
                  <p className="text-2xl font-light text-blue-600">R$ {selectedEmpenho.valores.liquidado}</p>
                </div>
                <div className={`text-center ${selectedEmpenho.valores.aPagar ? 'sm:border-r border-slate-200 pb-2 sm:pb-0 border-b sm:border-b-0' : ''}`}>
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Pago</p>
                  <p className="text-2xl font-light text-green-600">R$ {selectedEmpenho.valores.pago}</p>
                </div>
                {selectedEmpenho.valores.aPagar && (
                  <div className="text-center">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">A Pagar</p>
                    <p className="text-2xl font-light text-slate-600">R$ {selectedEmpenho.valores.aPagar}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Accordions de Detalhamento */}
            <Accordion title="Dados Detalhados do Empenho" defaultExpanded={false}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">Nº do Empenho</p>
                  <p className="text-sm text-[#0097B2] font-medium">{selectedEmpenho.id}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">Data de Emissão</p>
                  <p className="text-sm text-slate-600">{selectedEmpenho.data}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">Valor</p>
                  <p className="text-sm text-slate-600">{selectedEmpenho.valor}</p>
                </div>
              </div>

              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">Detalhes Orçamentários</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-4 mb-8">
                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">Unidade Orçamentária</p>
                  <p className="text-sm text-slate-600">{selectedEmpenho.programatica?.unidade || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">Área de Atuação (Função)</p>
                  <p className="text-sm text-slate-600">{selectedEmpenho.programatica?.funcao || selectedEmpenho.funcao}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">Subfunção</p>
                  <p className="text-sm text-slate-600">{selectedEmpenho.programatica?.subfuncao || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">Programa</p>
                  <p className="text-sm text-slate-600">{selectedEmpenho.programatica?.programa || '-'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-semibold text-slate-800 mb-1">Ação / Projeto Atividade</p>
                  <p className="text-sm text-slate-600">{selectedEmpenho.programatica?.projetoAtividade || '-'}</p>
                </div>

                <div className="col-span-full border-t border-slate-100 pt-4 mt-2"></div>

                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">Categoria</p>
                  <p className="text-sm text-slate-600">{selectedEmpenho.programatica?.categoria || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">Grupo de Natureza da Despesa (GND)</p>
                  <p className="text-sm text-slate-600">{selectedEmpenho.programatica?.gnd || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">Modalidade</p>
                  <p className="text-sm text-slate-600">{selectedEmpenho.programatica?.modalidade || '-'}</p>
                </div>
                <div className="lg:col-span-2">
                  <p className="text-sm font-semibold text-slate-800 mb-1">Elemento</p>
                  <p className="text-sm text-slate-600">{selectedEmpenho.programatica?.elemento || '-'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-semibold text-slate-800 mb-1">Item de Despesa</p>
                  <p className="text-sm text-slate-600">{selectedEmpenho.programatica?.itemDespesa || '-'}</p>
                </div>
              </div>

              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-4 border-b pb-2">Detalhes Licitação / Contrato</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* [D3] Licitação separada em dois campos distintos */}
                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">Modalidade da Licitação</p>
                  <p className="text-sm text-slate-600">{selectedEmpenho.licitacaoModalidade || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">Nº do Procedimento Licitatório</p>
                  {selectedEmpenho.procedimentoLicitatorio ? (
                    <a href="#" className="text-sm text-[#0097B2] hover:text-[#007B9E] hover:underline transition-colors" title="Acessar Contrato Vigente">
                      {selectedEmpenho.procedimentoLicitatorio}
                    </a>
                  ) : (
                    <p className="text-sm text-slate-400">—</p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">Processo SEI</p>
                  <a href="#" className="text-sm text-[#0097B2] hover:text-[#007B9E] hover:underline transition-colors">
                    {selectedEmpenho.processo || '-'}
                  </a>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm font-semibold text-slate-800 mb-1">Histórico / Objeto</p>
                  <p className="text-sm text-slate-600 leading-relaxed">{selectedEmpenho.objeto}</p>
                </div>
              </div>
            </Accordion>

            <Accordion title="Dados do Favorecido" defaultExpanded={false}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">CPF/CNPJ</p>
                  <p className="text-sm text-slate-600">{selectedEmpenho.cpfCnpj}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">Nome do Favorecido</p>
                  <p className="text-sm text-slate-600">{selectedEmpenho.credor}</p>
                </div>
              </div>
            </Accordion>

            {/* Tabela de Empenhos Relacionados */}
            {selectedEmpenho.empenhos && selectedEmpenho.empenhos.length > 0 && (
              <Accordion title="Empenhos Relacionados" defaultExpanded={true}>
                <div className="overflow-hidden">
                  {renderTabelaFase(null, selectedEmpenho.empenhos, 'mb-0')}
                </div>
              </Accordion>
            )}

            {/* Fases Relacionadas (Liquidações) */}
            {selectedEmpenho.liquidacoes.length > 0 && (
              <Accordion title="Liquidações Relacionadas" defaultExpanded={true}>
                <div className="overflow-hidden">
                  {renderTabelaFase(null, selectedEmpenho.liquidacoes, 'mb-0')}
                </div>
              </Accordion>
            )}

            {/* Fases Relacionadas (Pagamentos) */}
            {selectedEmpenho.pagamentos.length > 0 && (
              <Accordion title="Pagamentos Relacionados" defaultExpanded={true}>
                <div className="overflow-hidden">
                  {renderTabelaFase(null, selectedEmpenho.pagamentos, 'mb-0')}
                </div>
              </Accordion>
            )}

          </div>
        )}

      </main>
    </div>
  );
}