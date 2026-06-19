import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Edit2, Trash2, Shield, Building, ToggleLeft, ToggleRight, Check, X, AlertTriangle } from 'lucide-react';
import { toTitleCase } from '../utils/stringUtils';

export default function Usuarios() {
  const { user: currentUser, listUsers, createUser, updateUser, deleteUser } = useAuth();
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states (Add User)
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [senha, setSenha] = useState('');
  const [role, setRole] = useState('usuario');
  const [empresa, setEmpresa] = useState(() => {
    return currentUser && currentUser.empresa !== 'TODAS' ? currentUser.empresa : 'SANDRINI';
  });

  // Edit states
  const [editingUser, setEditingUser] = useState(null);
  const [editNome, setEditNome] = useState('');
  const [editRole, setEditRole] = useState('usuario');
  const [editStatus, setEditStatus] = useState('ativo');
  const [editEmpresa, setEditEmpresa] = useState('SANDRINI');

  // Delete states
  const [deletingUser, setDeletingUser] = useState(null);

  const isAdmin = currentUser && currentUser.role === 'admin';
  const isGestor = currentUser && currentUser.role === 'gestor';

  const loadUsersList = async () => {
    setLoading(true);
    const data = await listUsers();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadUsersList();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !nome.trim() || !senha) {
      setErrorMsg('Preencha todos os campos obrigatórios.');
      return;
    }

    if (senha.length < 5) {
      setErrorMsg('A senha de primeiro acesso deve ter pelo menos 5 caracteres.');
      return;
    }

    // Force company restriction for gestor
    const targetEmpresa = isGestor ? currentUser.empresa : empresa;
    const targetRole = isGestor && role === 'admin' ? 'usuario' : role;

    const res = await createUser(email.trim(), nome.trim(), senha, targetRole, targetEmpresa);
    if (res.success) {
      setSuccessMsg('Usuário criado com sucesso! Compartilhe a senha de primeiro acesso.');
      setIsAddOpen(false);
      // Reset form
      setEmail('');
      setNome('');
      setSenha('');
      setRole('usuario');
      loadUsersList();
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(res.error || 'Erro ao criar usuário.');
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const res = await updateUser(editingUser.id, editNome.trim(), editRole, editStatus, editEmpresa);
    if (res.success) {
      setSuccessMsg('Usuário atualizado com sucesso.');
      setEditingUser(null);
      loadUsersList();
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(res.error || 'Erro ao atualizar usuário.');
    }
  };

  const handleDeleteConfirm = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    const res = await deleteUser(deletingUser.id);
    if (res.success) {
      setSuccessMsg('Usuário excluído.');
      setDeletingUser(null);
      loadUsersList();
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(res.error || 'Erro ao excluir usuário.');
      setDeletingUser(null);
    }
  };

  const openEditModal = (u) => {
    setEditingUser(u);
    setEditNome(u.nome);
    setEditRole(u.role);
    setEditStatus(u.status);
    setEditEmpresa(u.empresa);
  };

  if (!isAdmin && !isGestor) {
    return (
      <div style={styles.errorState}>
        <AlertTriangle size={48} color="#ef4444" />
        <h2>Acesso Negado</h2>
        <p>Você não tem privilégios para acessar a página de gerenciamento de usuários.</p>
      </div>
    );
  }

  return (
    <div className="header-main" style={styles.container}>
      <div style={styles.headerRow}>
        <div>
          <h1>Usuários do Sistema</h1>
          <p>Gerencie o controle de acesso e permissões</p>
        </div>
        <button className="btn-padrao" onClick={() => setIsAddOpen(true)} style={styles.addButton}>
          <UserPlus size={18} /> Novo Usuário
        </button>
      </div>

      {successMsg && <div style={styles.successBanner}>{successMsg}</div>}
      {errorMsg && <div style={styles.errorBanner}>{errorMsg}</div>}

      {/* ADD USER MODAL */}
      <AnimatePresence>
        {isAddOpen && (
          <div style={styles.modalOverlay} onClick={() => setIsAddOpen(false)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={styles.modalContent} 
              onClick={e => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <h2>Cadastrar Novo Usuário</h2>
                <button style={styles.closeBtn} onClick={() => setIsAddOpen(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleAddSubmit} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nome Completo</label>
                  <input type="text" className="input-padrao" value={nome} onChange={e => setNome(e.target.value)} required />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>E-mail</label>
                  <input type="email" className="input-padrao" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Senha de 1º Acesso</label>
                  <input type="password" className="input-padrao" placeholder="Min. 5 caracteres..." value={senha} onChange={e => setSenha(e.target.value)} required />
                </div>
                
                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ ...styles.formGroup, flex: 1 }}>
                    <label style={styles.label}>Nível de Acesso (Role)</label>
                    <select className="input-padrao" value={role} onChange={e => setRole(e.target.value)}>
                      <option value="usuario">Usuário</option>
                      <option value="gestor">Gestor</option>
                      {isAdmin && <option value="admin">Administrador</option>}
                    </select>
                  </div>
                  
                  <div style={{ ...styles.formGroup, flex: 1 }}>
                    <label style={styles.label}>Empresa</label>
                    <select 
                      className="input-padrao" 
                      value={isGestor ? currentUser.empresa : empresa} 
                      onChange={e => setEmpresa(e.target.value)}
                      disabled={isGestor}
                    >
                      {isAdmin && <option value="TODAS">Todas</option>}
                      <option value="SANDRINI">Sandrini</option>
                      <option value="BUY CLOCK">Buy Clock</option>
                    </select>
                  </div>
                </div>

                <div style={styles.modalActions}>
                  <button type="button" className="btn-padrao" onClick={() => setIsAddOpen(false)} style={styles.cancelBtn}>Cancelar</button>
                  <button type="submit" className="btn-padrao" style={styles.confirmBtn}>Criar Usuário</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT USER MODAL */}
      <AnimatePresence>
        {editingUser && (
          <div style={styles.modalOverlay} onClick={() => setEditingUser(null)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={styles.modalContent} 
              onClick={e => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <h2>Editar Usuário</h2>
                <button style={styles.closeBtn} onClick={() => setEditingUser(null)}><X size={20} /></button>
              </div>
              <form onSubmit={handleEditSubmit} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nome Completo</label>
                  <input type="text" className="input-padrao" value={editNome} onChange={e => setEditNome(e.target.value)} required />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>E-mail (Não editável)</label>
                  <input type="email" className="input-padrao" value={editingUser.email} disabled style={{ opacity: 0.7 }} />
                </div>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ ...styles.formGroup, flex: 1 }}>
                    <label style={styles.label}>Nível de Acesso (Role)</label>
                    <select className="input-padrao" value={editRole} onChange={e => setEditRole(e.target.value)}>
                      <option value="usuario">Usuário</option>
                      <option value="gestor">Gestor</option>
                      {isAdmin && <option value="admin">Administrador</option>}
                    </select>
                  </div>
                  
                  <div style={{ ...styles.formGroup, flex: 1 }}>
                    <label style={styles.label}>Empresa</label>
                    <select 
                      className="input-padrao" 
                      value={isGestor ? currentUser.empresa : editEmpresa} 
                      onChange={e => setEditEmpresa(e.target.value)}
                      disabled={isGestor}
                    >
                      {isAdmin && <option value="TODAS">Todas</option>}
                      <option value="SANDRINI">Sandrini</option>
                      <option value="BUY CLOCK">Buy Clock</option>
                    </select>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Status da Conta</label>
                  <select className="input-padrao" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                    <option value="novo">Primeiro Acesso pendente</option>
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>

                <div style={styles.modalActions}>
                  <button type="button" className="btn-padrao" onClick={() => setEditingUser(null)} style={styles.cancelBtn}>Cancelar</button>
                  <button type="submit" className="btn-padrao" style={styles.confirmBtn}>Salvar Alterações</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRM MODAL */}
      <AnimatePresence>
        {deletingUser && (
          <div style={styles.modalOverlay} onClick={() => setDeletingUser(null)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={styles.modalContentSmall} 
              onClick={e => e.stopPropagation()}
            >
              <div style={styles.modalHeader}>
                <h2>Confirmar Exclusão</h2>
                <button style={styles.closeBtn} onClick={() => setDeletingUser(null)}><X size={20} /></button>
              </div>
              <div style={{ padding: '8px 0', fontSize: '14px', color: '#64748b', lineHeight: '1.6' }}>
                Tem certeza de que deseja remover o usuário <strong>{deletingUser.nome}</strong> ({deletingUser.email})? 
                Esta ação é irreversível e removerá todo o acesso do usuário ao sistema.
              </div>
              <div style={styles.modalActions}>
                <button type="button" className="btn-padrao" onClick={() => setDeletingUser(null)} style={styles.cancelBtn}>Cancelar</button>
                <button type="button" className="btn-padrao" onClick={handleDeleteConfirm} style={styles.deleteConfirmBtn}>Excluir permanentemente</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="skeleton-loader" style={{ height: '60px' }}></div>
          <div className="skeleton-loader" style={{ height: '60px' }}></div>
          <div className="skeleton-loader" style={{ height: '60px' }}></div>
        </div>
      ) : (
        <div style={styles.tableCard}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.trHead}>
                <th style={{ ...styles.th, textAlign: 'left' }}>Nome</th>
                <th style={{ ...styles.th, textAlign: 'left' }}>E-mail</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Role</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Empresa</th>
                <th style={{ ...styles.th, textAlign: 'center' }}>Status</th>
                <th style={{ ...styles.th, textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ ...styles.td, textAlign: 'center', color: '#94a3b8', padding: '40px 0' }}>
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              ) : (
                users.map(u => {
                  const self = currentUser && currentUser.id === u.id;
                  return (
                    <tr key={u.id} style={styles.trRow} className="usuarios-tr-row">
                      <td style={{ ...styles.td, fontWeight: 600 }}>{u.nome} {self && <span style={styles.selfBadge}>(Você)</span>}</td>
                      <td style={{ ...styles.td, color: '#64748b', fontFamily: 'monospace' }}>{u.email}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span style={{ 
                          ...styles.badge, 
                          color: u.role === 'admin' ? '#8b5cf6' : u.role === 'gestor' ? '#3b82f6' : '#64748b',
                          background: u.role === 'admin' ? '#f5f3ff' : u.role === 'gestor' ? '#eff6ff' : '#f8fafc',
                          border: u.role === 'admin' ? '1px solid #ddd6fe' : u.role === 'gestor' ? '1px solid #bfdbfe' : '1px solid #e2e8f0'
                        }}>
                          <Shield size={12} style={{ marginRight: '4px', verticalAlign: 'middle', display: 'inline-block' }} /> {toTitleCase(u.role)}
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span style={{ 
                          ...styles.badge, 
                          color: '#0f172a',
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1'
                        }}>
                          <Building size={12} style={{ marginRight: '4px', verticalAlign: 'middle', display: 'inline-block' }} /> {u.empresa === 'TODAS' ? 'Todas' : toTitleCase(u.empresa)}
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <span style={{ 
                          ...styles.badge, 
                          color: u.status === 'ativo' ? '#15803d' : u.status === 'novo' ? '#b45309' : '#b91c1c',
                          background: u.status === 'ativo' ? '#dcfce7' : u.status === 'novo' ? '#fef3c7' : '#fee2e2',
                          border: u.status === 'ativo' ? '1px solid #bbf7d0' : u.status === 'novo' ? '1px solid #fde68a' : '1px solid #fecaca'
                        }}>
                          {u.status === 'ativo' ? 'Ativo' : u.status === 'novo' ? '1º Acesso Pendente' : 'Inativo'}
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button 
                            className="btn-padrao" 
                            style={styles.actionBtnEdit}
                            onClick={() => openEditModal(u)}
                            title="Editar usuário"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button 
                            className="btn-padrao usuarios-delete-btn" 
                            style={styles.actionBtnDelete}
                            onClick={() => setDeletingUser(u)}
                            disabled={self}
                            title={self ? "Você não pode se excluir" : "Excluir usuário"}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    fontFamily: "'Outfit', 'Inter', sans-serif"
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  addButton: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    color: 'white',
    border: 'none',
    boxShadow: '0 4px 10px rgba(59, 130, 246, 0.2)'
  },
  successBanner: {
    background: '#dcfce7',
    border: '1px solid #bbf7d0',
    color: '#15803d',
    padding: '12px 16px',
    borderRadius: '10px',
    marginBottom: '16px',
    fontSize: '14px',
    fontWeight: 500
  },
  errorBanner: {
    background: '#fee2e2',
    border: '1px solid #fecaca',
    color: '#b91c1c',
    padding: '12px 16px',
    borderRadius: '10px',
    marginBottom: '16px',
    fontSize: '14px',
    fontWeight: 500
  },
  errorState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '80px 20px',
    textAlign: 'center',
    background: 'white',
    borderRadius: '16px',
    border: '1px solid #e2e8f0',
    maxWidth: '500px',
    margin: '40px auto'
  },
  tableCard: {
    background: 'white',
    borderRadius: '16px',
    border: '1px solid #f1f5f9',
    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
    overflow: 'hidden'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px'
  },
  trHead: {
    borderBottom: '1px solid #f1f5f9',
    background: '#fafafa'
  },
  th: {
    padding: '14px 20px',
    color: '#64748b',
    fontWeight: 600,
    fontSize: '12px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  trRow: {
    borderBottom: '1px solid #f1f5f9',
    transition: 'background 0.2s'
  },
  td: {
    padding: '16px 20px',
    color: '#1e293b',
    verticalAlign: 'middle'
  },
  selfBadge: {
    fontSize: '11px',
    color: '#3b82f6',
    fontWeight: 700,
    marginLeft: '6px'
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 10px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.2px'
  },
  actionBtnEdit: {
    background: '#eff6ff',
    color: '#3b82f6',
    border: '1px solid #bfdbfe',
    width: '32px',
    height: '32px',
    padding: 0,
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionBtnDelete: {
    background: '#fee2e2',
    color: '#ef4444',
    border: '1px solid #fecaca',
    width: '32px',
    height: '32px',
    padding: 0,
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(15, 23, 42, 0.4)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    padding: '16px'
  },
  modalContent: {
    background: 'white',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '500px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    overflow: 'hidden'
  },
  modalContentSmall: {
    background: 'white',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  modalHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    h2: {
      fontSize: '18px',
      fontWeight: 700,
      margin: 0,
      color: '#0f172a'
    }
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: 0
  },
  form: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '12px',
    justifyContent: 'flex-end'
  },
  cancelBtn: {
    background: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0'
  },
  confirmBtn: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
    color: 'white',
    border: 'none'
  },
  deleteConfirmBtn: {
    background: '#ef4444',
    color: 'white',
    border: 'none'
  }
};
