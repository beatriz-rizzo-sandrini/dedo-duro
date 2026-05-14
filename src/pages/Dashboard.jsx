import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { TrendingUp, Layers, Box, Tags, Truck, Share2, Bell, Activity } from 'lucide-react';
import './Dashboard.css';

const cards = [
  { id: 'vendas', title: 'Vendas', desc: 'Relatórios de vendas', icon: TrendingUp, path: '/vendas', className: 'card-vendas' },
  { id: 'cobertura', title: 'Cobertura', desc: 'Cobertura de estoque', icon: Layers, path: '/cobertura', className: 'card-cobertura' },
  { id: 'estoque', title: 'Estoque', desc: 'Visualização de estoque', icon: Box, path: '/estoque', className: 'card-estoque' },
  { id: 'produto', title: 'Produto', desc: 'Gestão de produto', icon: Tags, path: '/produto', className: 'card-produto' },
  { id: 'reposicao', title: 'Reposição', desc: 'Reposição a caminho', icon: Truck, path: '/reposicao', className: 'card-reposicao' },
  { id: 'sellout', title: 'Sellout', desc: 'Análise de Sellout', icon: Activity, path: '/sellout', className: 'card-sellout' },
  { id: 'alertas', title: 'Alertas', desc: 'Alertas de estoque', icon: Bell, path: '/alertas', className: 'card-alertas' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
};

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      <motion.div 
        className="grid-layout"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.button
              key={card.id}
              className={`dashboard-card ${card.className}`}
              variants={itemVariants}
              whileHover={{ y: -8, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(card.path)}
            >
              <div className="card-content">
                <Icon size={48} className="card-icon" />
                <h2 className="card-title">{card.title}</h2>
                <p className="card-desc">{card.desc}</p>
              </div>
            </motion.button>
          )
        })}
      </motion.div>
    </div>
  );
}
