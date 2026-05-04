import React, { useState, useMemo, useEffect } from 'react';
import { useEmpenhos } from './utils/useEmpenhos.js';
import {
  Search, Download, Filter, FileText, ChevronLeft,
  BarChart2, PieChart, CheckCircle, Clock, File, Eye, List, ArrowUpDown, ChevronRight, ChevronUp, ChevronDown, X,
  FileSpreadsheet, FileJson
} from 'lucide-react';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [isDiariasExpanded, setIsDiariasExpanded] = useState(false);
  const [isRelatoriosExpanded, setIsRelatoriosExpanded] = useState(false);
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

  // Estado de Expansão da Tabela Hierárquica
  const [expandedNodes, setExpandedNodes] = useState([]);

  // Estados da Barra de Filtros
  const [anoFilter, setAnoFilter] = useState('2026');
  const [dataInicio, setDataInicio] = useState('2026-01-01');
  const [dataFim, setDataFim] = useState('2026-12-31');
  const [palavraChaveText, setPalavraChaveText] = useState('');

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
      classificacao: { categoriaId: '3', grupoId: '31', modalidadeId: '3190', elementoId: '319011' },
      credor: '00.000.000/0001-00',
      cpfCnpj: '00.000.000/0001-00',
      funcao: '04 - Administração',
      fase: 'Pago',
      saldoStatus: 'positivo',
      valor: 'R$ 2.103.909,65',
      objeto: 'Empenho Orçamentário - REFERENTE A VENCIMENTOS E SALÁRIOS...',
      processo: '10001/2026',
      licitacaoModalidade: 'INEXIGIBILIDADE',
      procedimentoLicitatorio: null,
      valores: { empenhado: '2.103.909,65', liquidado: '2.103.909,65', pago: '1.581.192,89', aPagar: '522.716,76' },
      programatica: {
        codigo: '04.122.0001.2.001.3.1.90.11.01.00',
        unidade: '30101 - TRIBUNAL DE CONTAS',
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
      cpfCnpj: '38.972.498/0001-27',
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
        unidade: '30101 - TRIBUNAL DE CONTAS',
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
      cpfCnpj: '000.092.000-00',
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
        unidade: '30901 - FUNDO ESP DE DESENV MODERN E APERF DO TC MS',
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
      cpfCnpj: '01.234.567/0001-89',
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
        unidade: '30101 - TRIBUNAL DE CONTAS',
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

  // Hook Data
  const {
    empenhos: empenhosReais,
    classificacaoHierarquica,
    totaisGlobais,
    totaisPorUGReais,
    loading: dadosLoading,
    error: dadosError,
  } = useEmpenhos();

  const mockAnulacao = mockEmpenhos.find(e => e.id === '2026NE000405');
  const empenhosToUse = empenhosReais && empenhosReais.length > 0 ? [mockAnulacao, ...empenhosReais] : mockEmpenhos;

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

  const filteredEmpenhos = empenhosToUse.filter(emp => {
    const matchFase = (() => {
      if (kpiFilter === 'Todas' || kpiFilter === 'Empenhado') return true;
      if (kpiFilter === 'Liquidado') return emp.liquidacoes && emp.liquidacoes.length > 0;
      if (kpiFilter === 'Pago') return emp.pagamentos && emp.pagamentos.length > 0;
      return true;
    })();
    const matchUg = ugFilter === 'Todas' || emp.ug === ugFilter;
    
    const matchClassificacao = classificacaoFilter === 'Todas' || (
      emp.classificacao?.categoriaId  === classificacaoFilter ||
      emp.classificacao?.grupoId      === classificacaoFilter ||
      emp.classificacao?.modalidadeId === classificacaoFilter ||
      emp.classificacao?.elementoId   === classificacaoFilter
    );

    const empDateParts = emp.data.split('/');
    const empDate = new Date(`${empDateParts[2]}-${empDateParts[1]}-${empDateParts[0]}T00:00:00`);
    const start = new Date(`${dataInicio}T00:00:00`);
    const end = new Date(`${dataFim}T23:59:59`);
    const matchDate = empDate >= start && empDate <= end;

    // MOTOR DE BUSCA TURBINADO:
    const termo = palavraChaveText.toLowerCase();
    
    const buscaNasFases = (fases) => {
      if (!fases) return false;
      return fases.some(f => 
        (f.documento && String(f.documento).toLowerCase().includes(termo)) ||
        (f.historico && String(f.historico).toLowerCase().includes(termo)) ||
        (f.cpfCnpj && String(f.cpfCnpj).toLowerCase().includes(termo)) ||
        (f.favorecido && String(f.favorecido).toLowerCase().includes(termo))
      );
    };

    const matchPalavraChave = termo === '' || [
      emp.id,
      emp.objeto,
      emp.credor,
      emp.cpfCnpj,
      emp.processo,
      emp.licitacaoModalidade,
      emp.procedimentoLicitatorio,
      emp.programatica?.codigo,
      emp.programatica?.unidade,
      emp.programatica?.funcao,
      emp.programatica?.subfuncao,
      emp.programatica?.programa,
      emp.programatica?.projetoAtividade,
      emp.programatica?.fonte,
      emp.programatica?.categoria,
      emp.programatica?.gnd,
      emp.programatica?.modalidade,
      emp.programatica?.elemento,
      emp.programatica?.itemDespesa
    ].some(field => field && String(field).toLowerCase().includes(termo)) || 
    buscaNasFases(emp.empenhos) || 
    buscaNasFases(emp.liquidacoes) || 
    buscaNasFases(emp.pagamentos);

    return matchFase && matchUg && matchClassificacao && matchDate && matchPalavraChave;
  });

  const baseClassification = classificacaoHierarquica?.length > 0 
    ? classificacaoHierarquica 
    : hierarchicalClassification;

  const dynamicClassification = useMemo(() => {
    const updateNodeValues = (nodes) => {
      return nodes.map(node => {
        const empenhosDoNo = filteredEmpenhos.filter(emp => 
          emp.classificacao?.categoriaId === node.id ||
          emp.classificacao?.grupoId === node.id ||
          emp.classificacao?.modalidadeId === node.id ||
          emp.classificacao?.elementoId === node.id
        );

        const novosValores = empenhosDoNo.reduce((acc, emp) => {
          const parse = (v) => typeof v === 'string' ? parseFloat(v.replace(/[^\d,-]/g, '').replace(',', '.')) : v;
          acc.empenhado += parse(emp.valores.empenhado || 0);
          acc.liquidado += parse(emp.valores.liquidado || 0);
          acc.pago += parse(emp.valores.pago || 0);
          return acc;
        }, { empenhado: 0, liquidado: 0, pago: 0 });

        const children = node.children ? updateNodeValues(node.children) : null;
        return { ...node, valores: novosValores, children };
      });
    };
    return updateNodeValues(baseClassification);
  }, [baseClassification, filteredEmpenhos]);

  const flattenedClassification = useMemo(() => {
    return flattenTree(dynamicClassification, expandedNodes);
  }, [dynamicClassification, expandedNodes]);

  useEffect(() => {
    setCurrentPage(1);
  }, [kpiFilter, ugFilter, classificacaoFilter, anoFilter, dataInicio, dataFim, palavraChaveText]);

  const totalFiltered = filteredEmpenhos.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEmpenhos = filteredEmpenhos.slice(startIndex, startIndex + itemsPerPage);

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

  const totaisPorUG = useMemo(() => {
    if (totaisPorUGReais && Object.keys(totaisPorUGReais).length > 0) {
      return {
        'Todas': { empenhado: totaisGlobais.empenhado, liquidado: totaisGlobais.liquidado, pago: totaisGlobais.pago },
        ...totaisPorUGReais
      };
    }
    return {
      'Todas': { empenhado: totaisGlobais?.empenhado || 0, liquidado: totaisGlobais?.liquidado || 0, pago: totaisGlobais?.pago || 0 },
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
    setKpiFilter('Todas');
    setUgFilter('Todas');
    setClassificacaoFilter('Todas');
    setAnoFilter('2026');
    setDataInicio('2026-01-01');
    setDataFim('2026-12-31');
    setPalavraChaveText('');
    showToast('Todos os filtros foram limpos.');
  };

  const handleRowClick = (node) => {
    if (node.children) {
      setExpandedNodes(prev => prev.includes(node.id) ? prev.filter(id => id !== node.id) : [...prev, node.id]);
    }
    setClassificacaoFilter(prev => prev === node.id ? 'Todas' : node.id);
  };

  const renderTabelaFase = (titulo, dados, extraClass = "") => {
    const total = dados.reduce((acc, curr) => acc + (typeof curr.valor === 'number' ? curr.valor : parseFloat(curr.valor.toString().replace(/\./g, '').replace(',', '.'))), 0);
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
                  <td className="py-4 pr-4 max-w-[200px] xl:max-w-[300px] truncate leading-tight" title={linha.historico}>{linha.historico || '-'}</td>
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
    <div className="relative border border-slate-300 rounded px-3 bg-white focus-within:border-[#0097B2] focus-within:ring-1 focus-within:ring-[#0097B2] transition-colors h-[36px] flex items-center">
      <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] text-slate-500 z-10 font-medium">
        {label}
      </label>
      {type === "select" ? (
        <select
          value={value}
          onChange={onChange}
          className="w-full text-sm text-slate-700 bg-transparent outline-none appearance-none cursor-pointer mt-0.5"
        >
          {options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
        </select>
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="w-full text-sm text-slate-700 bg-transparent outline-none placeholder-slate-400 mt-0.5"
        />
      )}
    </div>
  );

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

  const handleAnoChange = (e) => {
    const selectedYear = e.target.value;
    setAnoFilter(selectedYear);
    setDataInicio(`${selectedYear}-01-01`);
    setDataFim(`${selectedYear}-12-31`);
  };

  const startYear = dataInicio ? dataInicio.substring(0, 4) : '';
  const endYear = dataFim ? dataFim.substring(0, 4) : '';
  const isStandardYear = dataInicio === `${startYear}-01-01` && dataFim === `${startYear}-12-31` && startYear === endYear;

  // --- INÍCIO DAS FUNÇÕES DE EXPORTAÇÃO ---
  const exportParseCurrency = (val) => {
    if (typeof val === 'number') return val;
    if (!val) return 0;
    return parseFloat(val.toString().replace(/[^\d,-]/g, '').replace(',', '.'));
  };

  const loadLogo = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
    });
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    let ugLabel = "Todas";
    if (ugFilter === '30101') ugLabel = "30101 - TRIBUNAL DE CONTAS";
    if (ugFilter === '30901') ugLabel = "30901 - FUNDO ESP DE DESENV MODERN E APERF DO TC MS";

    let classLabel = "Todas";
    if (classificacaoFilter !== 'Todas' && activeClassNode) {
      classLabel = `${activeClassNode.codigo} - ${activeClassNode.descricao}`;
    }

    const palavraChaveLabel = palavraChaveText ? palavraChaveText : "Nenhuma";

    const resumoData = [
      ["TRIBUNAL DE CONTAS DO ESTADO DE MATO GROSSO DO SUL"],
      ["Relatório de Execução Orçamentária"],
      [`Período: ${dataInicio.split('-').reverse().join('/')} a ${dataFim.split('-').reverse().join('/')} | Ano: ${anoFilter}`],
      [`Filtros Ativos: UO: ${ugLabel} | Classificação: ${classLabel} | Busca: ${palavraChaveLabel}`],
      [],
      ["RESUMO POR UNIDADE ORÇAMENTÁRIA"],
      ["Código", "Unidade Orçamentária", "Empenhado (R$)", "Liquidado (R$)", "Pago (R$)"],
      ...Object.keys(totaisPorUG).filter(ug => ug !== 'Todas').map(ug => [
        ug, ug === '30101' ? 'TRIBUNAL DE CONTAS' : 'FUNDO ESP DE DESENV MODERN E APERF DO TC MS', 
        exportParseCurrency(totaisPorUG[ug].empenhado), exportParseCurrency(totaisPorUG[ug].liquidado), exportParseCurrency(totaisPorUG[ug].pago)
      ]),
      [],
      ["CLASSIFICAÇÃO ORÇAMENTÁRIA - NÍVEIS DE DESPESA"],
      ["Código", "Descrição", "Empenhado (R$)", "Liquidado (R$)", "Pago (R$)"],
      ...flattenedClassification.map(c => [
        c.id, `${c.nivel}: ${c.descricao}`, 
        exportParseCurrency(c.valores.empenhado), exportParseCurrency(c.valores.liquidado), exportParseCurrency(c.valores.pago)
      ])
    ];
    
    const ws1 = XLSX.utils.aoa_to_sheet(resumoData);
    XLSX.utils.book_append_sheet(wb, ws1, "Resumo Orçamentário");

    const empenhosData = [
      ["LISTAGEM DETALHADA DE EMPENHOS"],
      ["Nº Empenho", "Data", "Favorecido", "Finalidade", "Valor (R$)"],
      ...filteredEmpenhos.map(e => [
        e.id, e.data, e.credor, e.objeto, exportParseCurrency(e.valor)
      ])
    ];
    
    const ws2 = XLSX.utils.aoa_to_sheet(empenhosData);
    XLSX.utils.book_append_sheet(wb, ws2, "Listagem de Empenhos");

    XLSX.writeFile(wb, "Relatorio_Execucao_Orcamentaria_TCEMS.xlsx");
    showToast('Download do Excel concluído!');
  };

  const handleExportPDF = async () => {
    showToast('Preparando PDF, aguarde...');
    
    const doc = new jsPDF('l', 'pt', 'a4');

    let ugLabel = "Todas";
    if (ugFilter === '30101') ugLabel = "30101 - TRIBUNAL DE CONTAS";
    if (ugFilter === '30901') ugLabel = "30901 - FUNDO ESP DE DESENV MODERN E APERF DO TC MS";

    let classLabel = "Todas";
    if (classificacaoFilter !== 'Todas' && activeClassNode) {
      classLabel = `${activeClassNode.codigo} - ${activeClassNode.descricao}`;
    }

    const palavraChaveLabel = palavraChaveText ? palavraChaveText : "Nenhuma";
    const pageData1 = `Período: ${dataInicio.split('-').reverse().join('/')} a ${dataFim.split('-').reverse().join('/')} | Ano: ${anoFilter}`;
    const pageData2 = `Filtros Ativos -> UO: ${ugLabel} | Classificação: ${classLabel} | Busca: ${palavraChaveLabel}`;
    
    const logoImg = await loadLogo('/logo.png');
    let textStartX = 40; 

    if (logoImg) {
      const imgHeight = 35;
      const imgWidth = imgHeight * (logoImg.width / logoImg.height);
      doc.addImage(logoImg, 'PNG', 40, 30, imgWidth, imgHeight); 
      textStartX = 40 + imgWidth + 20; 
    } else {
      doc.setFontSize(16);
      doc.setTextColor(0, 123, 158);
      doc.text("TCE / MS", 40, 50);
      textStartX = 130;
    }

    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text("Relatório de Execução Orçamentária", textStartX, 45); 
    
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(pageData1, textStartX, 60);

    doc.setFontSize(8);
    doc.setTextColor(0, 123, 158);
    doc.text(pageData2, textStartX, 72);

    const ugsData = Object.keys(totaisPorUG).filter(ug => ug !== 'Todas').map(ug => [
      ug, ug === '30101' ? 'TRIBUNAL DE CONTAS' : 'FUNDO ESP DE DESENV MODERN E APERF DO TC MS', 
      exportParseCurrency(totaisPorUG[ug].empenhado).toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 
      exportParseCurrency(totaisPorUG[ug].liquidado).toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 
      exportParseCurrency(totaisPorUG[ug].pago).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
    ]);

    if (totaisPorUG['Todas']) {
      ugsData.push([
        '', 
        'TOTAL', 
        exportParseCurrency(totaisPorUG['Todas'].empenhado).toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 
        exportParseCurrency(totaisPorUG['Todas'].liquidado).toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 
        exportParseCurrency(totaisPorUG['Todas'].pago).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
      ]);
    }

    autoTable(doc, {
      startY: 105, 
      headStyles: { fillColor: [0, 123, 158] },
      styles: { fontSize: 8 },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      },
      willDrawCell: function(data) {
        if (data.row.index === ugsData.length - 1 && data.section === 'body') {
          doc.setFont(undefined, 'bold');
        }
      },
      head: [['Código', 'Unidade Orçamentária', 'Empenhado', 'Liquidado', 'Pago']],
      body: ugsData,
    });

    const finalY1 = doc.lastAutoTable.finalY || 150;

    autoTable(doc, {
      startY: finalY1 + 20,
      headStyles: { fillColor: [0, 123, 158] },
      styles: { fontSize: 8 },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      },
      head: [['Código', 'Descrição / Nível', 'Empenhado', 'Liquidado', 'Pago']],
      body: flattenedClassification.map(c => [
        c.id, `${c.nivel}: ${c.descricao}`, 
        exportParseCurrency(c.valores.empenhado).toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 
        exportParseCurrency(c.valores.liquidado).toLocaleString('pt-BR', { minimumFractionDigits: 2 }), 
        exportParseCurrency(c.valores.pago).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
      ]),
    });

    const finalY2 = doc.lastAutoTable.finalY || 200;

    doc.setFontSize(12);
    doc.setTextColor(0, 123, 158);
    doc.setFont(undefined, 'bold');
    doc.text("Listagem Detalhada de Empenhos", 40, finalY2 + 30);
    
    autoTable(doc, {
      startY: finalY2 + 40,
      headStyles: { fillColor: [0, 123, 158] },
      styles: { fontSize: 8 },
      columnStyles: {
        3: { cellWidth: 250 },
        4: { halign: 'right' }, 
        5: { halign: 'right' }, 
        6: { halign: 'right' }, 
        7: { halign: 'right' }
      },
      head: [['Empenho', 'Data', 'Fornecedor', 'Histórico', 'Empenhado', 'Liquidado', 'Pago', 'A Pagar']],
      body: filteredEmpenhos.map(e => [
        e.id, 
        e.data, 
        e.credor, 
        e.objeto, 
        e.valores.empenhado, 
        e.valores.liquidado, 
        e.valores.pago, 
        e.valores.aPagar
      ]),
    });

    doc.save("Relatorio_Execucao_Orcamentaria_TCEMS.pdf");
    showToast('Download do PDF concluído!');
  };
  // --- FIM DAS FUNÇÕES DE EXPORTAÇÃO ---

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
              <div className="w-full lg:w-1/5 flex-shrink-0">
                <nav className="bg-white rounded border border-slate-200 shadow-sm sticky top-24 overflow-hidden">
                  <ul className="py-2">
                    <li>
                      <button className="w-full text-left px-6 py-3 text-sm font-medium text-[#007B9E] bg-[#E0F4F8] border-l-4 border-[#007B9E]">
                        Empenhos, Liquidações e Pagamentos
                      </button>
                    </li>
                    <li>
                      <button className="w-full text-left px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 hover:text-[#007B9E] transition-colors">
                        Ordem Cronológica de Pagamentos
                      </button>
                    </li>
                    <li className="mt-1">
                      <button 
                        onClick={() => setIsDiariasExpanded(!isDiariasExpanded)}
                        className="w-full flex items-center justify-between px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                      >
                        Diárias
                        <ChevronRight size={16} className={`text-slate-400 transition-transform ${isDiariasExpanded ? 'rotate-90' : ''}`} />
                      </button>
                      {isDiariasExpanded && (
                        <ul className="pl-10 pr-4 pb-2 space-y-2 animate-in fade-in slide-in-from-top-1">
                          <li>
                            <button className="text-xs text-slate-500 hover:text-[#007B9E] transition-colors">
                              Informações
                            </button>
                          </li>
                          <li>
                            <button className="text-xs text-slate-500 hover:text-[#007B9E] transition-colors">
                              Tabela de Valores
                            </button>
                          </li>
                        </ul>
                      )}
                    </li>
                    <li>
                      <button className="w-full text-left px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors border-t border-slate-50">
                        Transferências Voluntárias Realizadas
                      </button>
                    </li>
                    <li className="border-t border-slate-50">
                      <button 
                        onClick={() => setIsRelatoriosExpanded(!isRelatoriosExpanded)}
                        className="w-full flex items-center justify-between px-6 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                      >
                        Relatórios Fiscais
                        <ChevronRight size={16} className={`text-slate-400 transition-transform ${isRelatoriosExpanded ? 'rotate-90' : ''}`} />
                      </button>
                      {isRelatoriosExpanded && (
                        <ul className="pl-10 pr-4 pb-3 space-y-2 animate-in fade-in slide-in-from-top-1">
                          <li>
                            <button className="text-xs text-slate-500 hover:text-[#007B9E] text-left leading-tight transition-colors">
                              Relatório de Gestão Fiscal - RGF
                            </button>
                          </li>
                          <li>
                            <button className="text-xs text-slate-500 hover:text-[#007B9E] text-left leading-tight transition-colors">
                              Relatório Resumido da Execução Orçamentária
                            </button>
                          </li>
                        </ul>
                      )}
                    </li>
                  </ul>
                </nav>
              </div>

              <div className="w-full lg:w-4/5 space-y-6">
                {/* Barra de Filtros Horizontal */}
                <div className="bg-white p-4 rounded border border-slate-200 shadow-sm mb-6">
                  {/* TEXTO ATUALIZADO SEM O ÍCONE */}
                  <div className="mb-3 text-[#007B9E] font-bold text-xs uppercase tracking-wider">
                    Filtros de Pesquisa
                  </div>
                  <div className="flex flex-col lg:flex-row items-end gap-4">
                    {isStandardYear && (
                      <div className="w-full lg:w-32 flex-shrink-0">
                        <FilterInput label="Ano" type="select" options={["2026", "2025", "2024", "2023", "2022"]} value={anoFilter} onChange={handleAnoChange} />
                      </div>
                    )}

                    <div className="w-full lg:w-64 flex-shrink-0 relative border border-slate-300 rounded px-2 bg-white focus-within:border-[#0097B2] focus-within:ring-1 focus-within:ring-[#0097B2] transition-colors h-[36px] flex items-center">
                      <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] text-slate-500 font-medium">Período (DD/MM/AAAA)</label>
                      <div className="flex items-center gap-1 w-full mt-0.5">
                        <div className="relative w-full flex items-center">
                          <span className="absolute left-0 pointer-events-none text-xs text-slate-700">
                            {dataInicio ? dataInicio.split('-').reverse().join('/') : ''}
                          </span>
                          <input 
                            type="date" 
                            value={dataInicio} 
                            onChange={handleDataInicioChange} 
                            className="w-full text-xs text-transparent outline-none bg-transparent z-10 cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer" 
                          />
                        </div>
                        <span className="text-slate-400">-</span>
                        <div className="relative w-full flex items-center">
                          <span className="absolute left-0 pointer-events-none text-xs text-slate-700">
                            {dataFim ? dataFim.split('-').reverse().join('/') : ''}
                          </span>
                          <input 
                            type="date" 
                            value={dataFim} 
                            onChange={handleDataFimChange} 
                            className="w-full text-xs text-transparent outline-none bg-transparent z-10 cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer" 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="w-full flex-grow">
                      <FilterInput 
                        label="Palavra-Chave do Empenho" 
                        placeholder="Busque por qualquer dado do empenho." 
                        value={palavraChaveText} 
                        onChange={e => setPalavraChaveText(e.target.value)} 
                      />
                    </div>
                    
                    <div className="w-full lg:w-auto flex justify-end gap-2 flex-shrink-0">
                      <button onClick={handleLimparFiltros} className="flex items-center justify-center gap-2 px-4 h-[36px] text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 border border-slate-300 rounded transition-colors shadow-sm">
                        <X size={14} /> Limpar
                      </button>
                      <button onClick={() => showToast('Pesquisa atualizada!')} className="flex items-center justify-center gap-2 bg-[#0097B2] hover:bg-[#007B9E] text-white px-5 h-[36px] rounded text-xs font-bold transition-colors shadow-sm border border-transparent">
                        <Search size={14} /> Aplicar Filtro
                      </button>
                    </div>
                  </div>
                </div>

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

                {/* Tabela de Resumo Consolidado */}
                <div className="mt-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-4 px-1 gap-2">
                    <h3 className="text-sm font-semibold text-[#007B9E] uppercase tracking-wider flex items-center gap-2">
                      Unidade Orçamentária
                    </h3>
                    <div className="flex gap-2">
                      <button 
                        onClick={handleExportPDF}
                        className="p-1.5 text-slate-400 hover:text-[#007B9E] hover:bg-[#E0F4F8] rounded transition-colors" 
                        title="Exportar PDF"
                      >
                        <FileText size={16} />
                      </button>
                      <button 
                        onClick={handleExportExcel}
                        className="p-1.5 text-slate-400 hover:text-[#007B9E] hover:bg-[#E0F4F8] rounded transition-colors" 
                        title="Exportar Excel"
                      >
                        <Download size={16} />
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
                                {totaisGlobais?.empenhado || '0,00'}
                              </button>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => { setKpiFilter('Liquidado'); setUgFilter('Todas'); }}
                                className="font-bold text-[#0097B2] hover:text-[#007B9E] hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-[#0097B2] rounded px-1"
                              >
                                {totaisGlobais?.liquidado || '0,00'}
                              </button>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => { setKpiFilter('Pago'); setUgFilter('Todas'); }}
                                className="font-bold text-[#0097B2] hover:text-[#007B9E] hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-[#0097B2] rounded px-1"
                              >
                                {totaisGlobais?.pago || '0,00'}
                              </button>
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Tabela de Classificação Orçamentária */}
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

                  {/* Paginação */}
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

            <div className="bg-white p-8 rounded shadow-sm border border-slate-200">
              <div className={`grid grid-cols-1 ${selectedEmpenho.valores.aPagar ? 'sm:grid-cols-4' : 'sm:grid-cols-3'} gap-4 bg-slate-50 p-6 rounded border border-slate-100`}>
                <div className="text-center sm:border-r border-slate-200">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Empenhado</p>
                  <p className="text-2xl font-light text-slate-800">R$ {selectedEmpenho.valores.empenhado}</p>
                </div>
                <div className="text-center sm:border-r border-slate-200">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Liquidado</p>
                  <p className="text-2xl font-light text-blue-600">R$ {selectedEmpenho.valores.liquidado}</p>
                </div>
                <div className={`text-center ${selectedEmpenho.valores.aPagar ? 'sm:border-r border-slate-200' : ''}`}>
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

            <Accordion title="Dados do Empenho" defaultExpanded={true}>
              <div className="space-y-3 mb-8">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-slate-800">Nº do Empenho:</span>
                  <span className="text-sm text-[#0097B2] font-medium">{selectedEmpenho.id}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-slate-800">Data de Emissão:</span>
                  <span className="text-sm text-slate-600">{selectedEmpenho.data}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-slate-800">Valor:</span>
                  <span className="text-sm text-slate-600">{selectedEmpenho.valor}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-slate-800">Favorecido:</span>
                  <span className="text-sm text-slate-600">
                    {selectedEmpenho.credor || (selectedEmpenho.empenhos && selectedEmpenho.empenhos[0]?.favorecido) || '-'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-slate-800">CPF/CNPJ:</span>
                  <span className="text-sm text-slate-600">
                    {selectedEmpenho.cpfCnpj || (selectedEmpenho.empenhos && selectedEmpenho.empenhos[0]?.cpfCnpj) || '-'}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-slate-800 shrink-0">Finalidade:</span>
                  <span className="text-sm text-slate-600 leading-relaxed">{selectedEmpenho.objeto}</span>
                </div>
              </div>

              <h4 className="text-xs font-bold text-[#007B9E] uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                Licitação / Contrato
              </h4>
              <div className="flex flex-wrap gap-x-12 gap-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-slate-800">Modalidade da Licitação:</span>
                  <span className="text-sm text-slate-600">{selectedEmpenho.licitacaoModalidade || '-'}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-slate-800">Nº do Procedimento Licitatório:</span>
                  <span className="text-sm text-[#0097B2]">{selectedEmpenho.procedimentoLicitatorio || '-'}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold text-slate-800">Processo Administrativo:</span>
                  <span className="text-sm text-[#0097B2]">{selectedEmpenho.processo || '-'}</span>
                </div>
              </div>
            </Accordion>

            <Accordion title="DADOS DO ORÇAMENTO" defaultExpanded={true}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-16 gap-y-10">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#007B9E] uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                    Classificação Orçamentária
                  </h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-slate-800">Unidade Orçamentária:</span>
                    <span className="text-sm text-slate-600">{selectedEmpenho.programatica?.unidade || '-'}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-slate-800">Função:</span>
                    <span className="text-sm text-slate-600">{selectedEmpenho.programatica?.funcao || selectedEmpenho.funcao || '-'}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-slate-800">Subfunção:</span>
                    <span className="text-sm text-slate-600">{selectedEmpenho.programatica?.subfuncao || '-'}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-slate-800">Programa:</span>
                    <span className="text-sm text-slate-600">{selectedEmpenho.programatica?.programa || '-'}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-slate-800">Ação / Projeto Atividade:</span>
                    <span className="text-sm text-slate-600">{selectedEmpenho.programatica?.projetoAtividade || '-'}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#007B9E] uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                    Classificação por Natureza da Despesa
                  </h4>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-slate-800">Categoria Econômica:</span>
                    <span className="text-sm text-slate-600">{selectedEmpenho.programatica?.categoria || '-'}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-slate-800">Grupo de Natureza da Despesa:</span>
                    <span className="text-sm text-slate-600">{selectedEmpenho.programatica?.gnd || '-'}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-slate-800">Modalidade de Aplicação:</span>
                    <span className="text-sm text-slate-600">{selectedEmpenho.programatica?.modalidade || '-'}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-slate-800">Elemento de Despesa:</span>
                    <span className="text-sm text-slate-600">{selectedEmpenho.programatica?.itemDespesa || '-'}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-slate-800">Fonte de recursos:</span>
                    <span className="text-sm text-slate-600">{selectedEmpenho.programatica?.fonte || '-'}</span>
                  </div>
                </div>
              </div>
            </Accordion>

            <Accordion title="Execução Financeira" defaultExpanded={true}>
              <div className="space-y-10">
                {selectedEmpenho.empenhos && selectedEmpenho.empenhos.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-[#007B9E] uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                      Empenhos
                    </h4>
                    <div className="overflow-hidden">
                      {renderTabelaFase(null, selectedEmpenho.empenhos, 'mb-0')}
                    </div>
                  </div>
                )}

                {selectedEmpenho.liquidacoes && selectedEmpenho.liquidacoes.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-[#007B9E] uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                      Liquidações
                    </h4>
                    <div className="overflow-hidden">
                      {renderTabelaFase(null, selectedEmpenho.liquidacoes, 'mb-0')}
                    </div>
                  </div>
                )}

                {selectedEmpenho.pagamentos && selectedEmpenho.pagamentos.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-[#007B9E] uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">
                      Pagamentos
                    </h4>
                    <div className="overflow-hidden">
                      {renderTabelaFase(null, selectedEmpenho.pagamentos, 'mb-0')}
                    </div>
                  </div>
                )}

                {(!selectedEmpenho.empenhos?.length && !selectedEmpenho.liquidacoes?.length && !selectedEmpenho.pagamentos?.length) && (
                  <p className="text-sm text-slate-500 italic text-center py-4">
                    Não existem registros de execução financeira para este documento.
                  </p>
                )}
              </div>
            </Accordion>
          </div>
        )}
      </main>
    </div>
  );
}