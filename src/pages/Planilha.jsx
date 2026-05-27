import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FileSpreadsheet, ExternalLink, RefreshCw, Eye, Edit2 } from 'lucide-react';
import './Planilha.css';

export default function Planilha() {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [viewMode, setViewMode] = useState('preview'); // 'preview' ou 'edit'
  
  const baseSheetUrl = 'https://docs.google.com/spreadsheets/d/1y-DA1HWwkDRED5HYZD1XivXiixD4OclESY1EKE7ELoE';
  
  // URLs para os diferentes modos
  const iframeUrls = {
    preview: `${baseSheetUrl}/preview?rm=minimal`,
    edit: `${baseSheetUrl}/edit?rm=minimal`
  };

  const handleRefresh = () => {
    setIframeLoading(true);
    const iframe = document.getElementById('google-sheet-iframe');
    if (iframe) {
      // Força a recarga do iframe alterando o src temporariamente ou redefinindo
      iframe.src = iframeUrls[viewMode];
    }
  };

  const toggleViewMode = (mode) => {
    if (mode !== viewMode) {
      setIframeLoading(true);
      setViewMode(mode);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.4 }}
      className="header-main"
    >
      {/* Cabeçalho Premium da Página */}
      <div className="sheet-page-header">
        <div>
          <div className="sheet-title-area">
            <div className="sheet-icon-wrapper">
              <FileSpreadsheet size={28} className="sheet-main-icon" />
            </div>
            <div>
              <h1>Planilha de Apoio</h1>
              <p>Visualização e interação direta com a base de dados integrada</p>
            </div>
          </div>
        </div>

        {/* Grupo de Ações do Cabeçalho */}
        <div className="sheet-actions-group">
          {/* Seletor de Modo de Visualização */}
          <div className="mode-selector">
            <button 
              className={`mode-btn ${viewMode === 'preview' ? 'active' : ''}`}
              onClick={() => toggleViewMode('preview')}
              title="Modo de Visualização Limpa"
            >
              <Eye size={16} />
              <span>Modo Leitura</span>
            </button>
            <button 
              className={`mode-btn ${viewMode === 'edit' ? 'active' : ''}`}
              onClick={() => toggleViewMode('edit')}
              title="Modo Completo do Editor"
            >
              <Edit2 size={16} />
              <span>Modo Edição</span>
            </button>
          </div>

          {/* Botão de Atualizar */}
          <button 
            className="btn-padrao action-icon-btn" 
            onClick={handleRefresh} 
            title="Atualizar Planilha"
          >
            <RefreshCw size={18} className={iframeLoading ? "spin" : ""} />
          </button>

          {/* Botão Primário para Abrir Externo */}
          <a 
            href={`${baseSheetUrl}/edit?usp=sharing`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="sheet-external-link-btn"
          >
            <span>Abrir no Google Sheets</span>
            <ExternalLink size={16} />
          </a>
        </div>
      </div>

      {/* Container Principal da Planilha */}
      <div className="sheet-viewport-card">
        {/* Esqueleto de Carregamento Premium */}
        {iframeLoading && (
          <div className="sheet-loader-overlay">
            <div className="sheet-loading-card">
              <div className="loading-bar-animation"></div>
              <div className="sheet-loading-spinner">
                <FileSpreadsheet size={40} className="pulse-icon" />
              </div>
              <h3>Carregando Planilha de Apoio...</h3>
              <p>Carregando dados seguros do Google Sheets</p>
            </div>
          </div>
        )}

        {/* O Iframe da Planilha */}
        <iframe
          id="google-sheet-iframe"
          src={iframeUrls[viewMode]}
          className="google-sheet-iframe"
          title="Planilha Dedo Duro"
          onLoad={() => setIframeLoading(false)}
          allow="autoplay"
        ></iframe>
      </div>
    </motion.div>
  );
}
