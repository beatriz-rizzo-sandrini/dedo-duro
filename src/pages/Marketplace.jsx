import React, { useState, useMemo } from 'react';
import { Trophy, TrendingUp, Search, UserCheck, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import marketplaceData from '../data/marketplace_data.json';
import './Marketplace.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
);

export default function Marketplace() {
  const [selectedCreator, setSelectedCreator] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // 1. Cálculos Gerais
  const totalGMV = useMemo(() => {
    return marketplaceData.creators.reduce((acc, curr) => acc + curr.total_gmv, 0);
  }, []);

  const topCreators = useMemo(() => {
    return [...marketplaceData.creators]
      .sort((a, b) => b.total_gmv - a.total_gmv)
      .slice(0, 3);
  }, []);
  
  // 2. Filtro de tabela geral
  const filteredData = useMemo(() => {
    let data = marketplaceData.creators.filter(item => 
      item.creator.toLowerCase().includes(searchTerm.toLowerCase())
    );
    // Sort by GMV descending
    data.sort((a, b) => b.total_gmv - a.total_gmv);
    return data;
  }, [searchTerm]);

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const currentTableData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  // 3. Dados do gráfico (Chart.js)
  const chartData = useMemo(() => {
    if (!selectedCreator) return null;
    const creatorInfo = marketplaceData.creators.find(c => c.creator === selectedCreator);
    if (!creatorInfo || !creatorInfo.products) return null;

    const productMap = {};
    creatorInfo.products.forEach(p => {
      const names = p.product.split(',');
      const total = p.julho_video + p.agosto_video + p.julho_live + p.agosto_live;
      // Atribui o volume para o primeiro produto principal do vídeo/live
      const mainName = names[0].trim();
      if (!productMap[mainName]) {
        productMap[mainName] = 0;
      }
      productMap[mainName] += total;
    });

    const top10 = Object.keys(productMap).map(name => ({
      fullName: name,
      total: productMap[name]
    })).sort((a, b) => b.total - a.total).slice(0, 10);

    const maxTotal = top10.length > 0 ? top10[0].total : 1;

    return { top10, maxTotal };
  }, [selectedCreator]);

  // 4. Totais Diários e Gráfico de Linha
  const totalGMVJulho = useMemo(() => marketplaceData.dailyGMV.reduce((a, b) => a + b.julho, 0), []);
  const totalGMVAgosto = useMemo(() => marketplaceData.dailyGMV.reduce((a, b) => a + b.agosto, 0), []);

  const gmvChartData = useMemo(() => {
    return {
      labels: marketplaceData.dailyGMV.map(d => String(d.day).padStart(2, '0')),
      datasets: [
        {
          label: 'Julho',
          data: marketplaceData.dailyGMV.map(d => d.julho),
          borderColor: '#94a3b8',
          backgroundColor: '#94a3b8',
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3
        },
        {
          label: 'Agosto',
          data: marketplaceData.dailyGMV.map(d => d.agosto),
          borderColor: '#10b981', // Verde sucesso
          backgroundColor: '#10b981',
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3
        }
      ]
    };
  }, []);

  const gmvChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { font: { family: 'Inter, sans-serif' } } },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { grid: { color: '#f1f5f9' }, ticks: { callback: (value) => 'R$ ' + value } }
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  return (
    <div className="mkp-dashboard">
      <div className="mkp-header">
        <div>
          <h1 className="mkp-title">Análise de Marketplace</h1>
          <p className="mkp-subtitle">Visão consolidada do desempenho dos Criadores (Julho e Agosto)</p>
        </div>
        <div className="mkp-kpi-card total-sales">
          <div className="kpi-icon"><TrendingUp size={24} /></div>
          <div>
            <h3>GMV Total (Jul e Ago)</h3>
            <p className="kpi-value">{formatCurrency(totalGMV)}</p>
          </div>
        </div>
      </div>

      <div className="mkp-top-creators">
        <h2><Trophy className="icon-title" size={24} /> Top 3 Criadores</h2>
        <div className="cards-grid">
          {topCreators.map((creator, index) => (
            <div 
              key={creator.creator} 
              className={`creator-card rank-${index + 1} ${selectedCreator === creator.creator ? 'selected' : ''}`}
              onClick={() => setSelectedCreator(selectedCreator === creator.creator ? '' : creator.creator)}
            >
              <div className="rank-badge">#{index + 1}</div>
              <h3>@{creator.creator}</h3>
              <p className="creator-total">{formatCurrency(creator.total_gmv)}</p>
              <div className="creator-split">
                <span title="Total de Vendas por Vídeo">📹 Vídeo: {creator.julho_video + creator.agosto_video}</span>
                <span title="Total de Vendas por Live">🔴 Live: {creator.julho_live + creator.agosto_live}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedCreator && chartData && (
        <div className="mkp-chart-section animated-fade-in">
          <div className="chart-header">
            <h2>Top 10 Produtos Mais Vendidos de @{selectedCreator}</h2>
            <button className="btn-clear" onClick={() => setSelectedCreator('')}>Limpar Filtro</button>
          </div>
          <div className="ranking-list-container">
            {chartData.top10.map((item, idx) => (
              <div key={idx} className="ranking-item">
                <div className="ranking-rank">#{idx + 1}</div>
                <div className="ranking-content">
                  <div className="ranking-info">
                    <span className="ranking-name" title={item.fullName}>{item.fullName}</span>
                    <span className="ranking-value">{item.total} itens</span>
                  </div>
                  <div className="ranking-bar-bg">
                    <div 
                      className="ranking-bar-fill" 
                      style={{ width: `${(item.total / chartData.maxTotal) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mkp-chart-section animated-fade-in" style={{ marginBottom: '32px' }}>
        <div className="chart-header">
          <h2><CalendarDays size={20} className="header-icon" style={{ display: 'inline', verticalAlign: 'middle', marginRight: '8px' }}/> Comparativo GMV Diário (Julho vs Agosto)</h2>
        </div>
        <div className="chart-container" style={{ height: '300px' }}>
          <Line data={gmvChartData} options={gmvChartOptions} />
        </div>
      </div>

      <div className="mkp-sections-grid">
        
        {/* TABELA DE GMV DIÁRIO */}
        <div className="mkp-table-section gmv-section">
          <div className="table-header gmv-header">
            <h2><CalendarDays size={20} className="header-icon"/> Tabela GMV Diário (TikTok)</h2>
          </div>
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th colSpan="2" className="text-center group-header">Julho</th>
                  <th colSpan="2" className="text-center group-header border-left">Agosto</th>
                </tr>
                <tr>
                  <th>Data</th>
                  <th className="text-right">GMV</th>
                  <th className="border-left">Data</th>
                  <th className="text-right">GMV</th>
                </tr>
              </thead>
              <tbody>
                {marketplaceData.dailyGMV.map((row) => (
                  <tr key={row.day}>
                    <td>{String(row.day).padStart(2, '0')}/jul</td>
                    <td className="gmv-val text-right">{formatCurrency(row.julho)}</td>
                    <td className="border-left">{String(row.day).padStart(2, '0')}/ago</td>
                    <td className="gmv-val text-right">{formatCurrency(row.agosto)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="gmv-footer">
                  <td>TOTAL</td>
                  <td className="gmv-val text-right">{formatCurrency(totalGMVJulho)}</td>
                  <td className="border-left">TOTAL</td>
                  <td className="gmv-val text-right">{formatCurrency(totalGMVAgosto)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* TABELA DE CRIADORES */}
        <div className="mkp-table-section creators-section">
          <div className="table-header">
            <h2>Todos os Criadores</h2>
            <div className="search-box">
              <Search size={18} className="search-icon" />
              <input 
                type="text" 
                placeholder="Buscar criador..." 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>
          </div>
          
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Criador</th>
                  <th className="text-right">GMV Total</th>
                </tr>
              </thead>
              <tbody>
                {currentTableData.map((row, i) => (
                  <tr key={i} onClick={() => setSelectedCreator(row.creator)} className="clickable-row">
                    <td className="td-creator">
                      <UserCheck size={16} className="table-row-icon"/> 
                      {row.creator}
                    </td>
                    <td className="td-total text-right">
                      <span className="badge-total">{formatCurrency(row.total_gmv)}</span>
                    </td>
                  </tr>
                ))}
                {filteredData.length === 0 && (
                  <tr><td colSpan="2" className="td-empty">Nenhum criador encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Paginação */}
          {totalPages > 1 && (
            <div className="pagination">
              <button 
                onClick={() => goToPage(currentPage - 1)} 
                disabled={currentPage === 1}
                className="btn-page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="page-info">
                Página {currentPage} de {totalPages}
              </span>
              <button 
                onClick={() => goToPage(currentPage + 1)} 
                disabled={currentPage === totalPages}
                className="btn-page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
