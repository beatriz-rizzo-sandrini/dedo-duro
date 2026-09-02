import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, Eye, EyeOff, ShieldAlert, ArrowRight, CheckCircle2, HelpCircle, Copy, Check, X, ShieldCheck, MessageSquare } from 'lucide-react';
import './Login.css';

export default function Login() {
  const { login, changePassword, loading, user } = useAuth();
  
  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Password change states (for first access)
  const [isFirstAccess, setIsFirstAccess] = useState(() => !!(user && user.status === 'novo'));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changeSuccess, setChangeSuccess] = useState(false);

  // Forgot password modal states
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotUserIdent, setForgotUserIdent] = useState('');
  const [copiedForgotMsg, setCopiedForgotMsg] = useState(false);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!email.trim() || !password) {
      setErrorMsg('Preencha todos os campos.');
      return;
    }

    const res = await login(email.trim(), password);
    if (res.success) {
      if (res.user.status === 'novo') {
        setIsFirstAccess(true);
      }
    } else {
      setErrorMsg(res.error || 'Falha ao realizar login.');
    }
  };

  const handlePasswordChangeSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newPassword || !confirmPassword) {
      setErrorMsg('Preencha os dois campos de senha.');
      return;
    }

    if (newPassword.length < 5) {
      setErrorMsg('A nova senha deve ter pelo menos 5 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }

    const res = await changePassword(newPassword);
    if (res.success) {
      setChangeSuccess(true);
      setTimeout(() => {
        // AuthContext automatically updates user session, causing App.jsx to route to dashboard
      }, 1500);
    } else {
      setErrorMsg(res.error || 'Falha ao alterar senha.');
    }
  };

  const getForgotMessageText = () => {
    const ident = forgotUserIdent.trim();
    if (ident) {
      return `Olá! Esqueci minha senha no sistema Dedo Duro. Você poderia redefinir meu acesso, por favor?\nMeu usuário/e-mail é: ${ident}`;
    }
    return `Olá! Esqueci minha senha no sistema Dedo Duro. Você poderia redefinir meu acesso, por favor?`;
  };

  const handleCopyForgotMessage = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(getForgotMessageText());
      setCopiedForgotMsg(true);
      setTimeout(() => setCopiedForgotMsg(false), 3000);
    }
  };

  return (
    <div className="login-container">
      {/* Animated Glowing Background Orbs */}
      <div className="login-orb login-orb1" />
      <div className="login-orb login-orb2" />
      <div className="login-orb login-orb3" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="login-card"
      >
        <div className="login-header">
          <div className="login-logo-image-container">
            <img src="/logo_cortado.png" alt="Grupo Sandrini" className="login-logo-image" />
          </div>
          <h2 className="login-title">Dedo Duro</h2>
          <p className="login-subtitle">
            {isFirstAccess 
              ? 'Defina sua senha definitiva para continuar' 
              : 'Sistema de Gestão de Estoques e Performance'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {!isFirstAccess ? (
            <motion.form 
              key="login-form"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              onSubmit={handleLoginSubmit} 
              className="login-form"
            >
              {errorMsg && (
                <div className="login-error">
                  <ShieldAlert size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="login-input-group">
                <label className="login-label">Usuário ou E-mail</label>
                <div className="login-input-wrapper">
                  <Mail size={18} className="login-input-icon" />
                  <input 
                    type="text" 
                    placeholder="nome.sobrenome ou e-mail..."
                    className="login-input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="login-input-group">
                <div className="login-label-row">
                  <label className="login-label">Senha</label>
                  <button 
                    type="button" 
                    className="login-forgot-inline-btn"
                    onClick={() => {
                      setForgotUserIdent(email);
                      setShowForgotModal(true);
                    }}
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="login-input-wrapper">
                  <Lock size={18} className="login-input-icon" />
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="Digite sua senha..."
                    className="login-input"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    className="login-eye-btn" 
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading} className="login-submit-btn">
                {loading ? 'Entrando...' : 'Entrar'} <ArrowRight size={18} />
              </button>
            </motion.form>
          ) : (
            <motion.form 
              key="change-password-form"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onSubmit={handlePasswordChangeSubmit} 
              className="login-form"
            >
              {changeSuccess ? (
                <div className="login-success-container">
                  <CheckCircle2 size={32} color="#10b981" />
                  <h3 className="login-success-title">Senha Alterada!</h3>
                  <p className="login-success-text">Redirecionando você para o dashboard...</p>
                </div>
              ) : (
                <>
                  <div className="login-warning-alert">
                    <ShieldAlert size={18} style={{ flexShrink: 0 }} />
                    <span>Este é seu primeiro acesso. Por segurança, você deve definir uma nova senha.</span>
                  </div>

                  {errorMsg && (
                    <div className="login-error">
                      <ShieldAlert size={16} />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="login-input-group">
                    <label className="login-label">Nova Senha</label>
                    <div className="login-input-wrapper">
                      <Lock size={18} className="login-input-icon" />
                      <input 
                        type={showNewPassword ? 'text' : 'password'} 
                        placeholder="Mínimo de 5 caracteres..."
                        className="login-input"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        required
                      />
                      <button 
                        type="button" 
                        className="login-eye-btn" 
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="login-input-group">
                    <label className="login-label">Confirmar Nova Senha</label>
                    <div className="login-input-wrapper">
                      <Lock size={18} className="login-input-icon" />
                      <input 
                        type={showNewPassword ? 'text' : 'password'} 
                        placeholder="Confirme a nova senha..."
                        className="login-input"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="login-submit-btn">
                    {loading ? 'Salvando...' : 'Salvar e Acessar'} <ArrowRight size={18} />
                  </button>
                </>
              )}
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      {/* FORGOT PASSWORD INSTRUCTION MODAL */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="login-modal-overlay" onClick={() => setShowForgotModal(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="login-forgot-modal"
              onClick={e => e.stopPropagation()}
            >
              <div className="login-forgot-modal-header">
                <div className="login-forgot-icon-wrap">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="login-forgot-title">Esqueceu sua senha?</h3>
                  <p className="login-forgot-desc">Redefinição rápida com o administrador</p>
                </div>
                <button className="login-forgot-close-btn" onClick={() => setShowForgotModal(false)}>
                  <X size={20} />
                </button>
              </div>

              <div className="login-forgot-modal-body">
                <p className="login-forgot-info-text">
                  Por motivos de governança e segurança, as senhas de acesso ao Dedo Duro são gerenciadas e redefinidas pelos <strong>Administradores do Sistema</strong>.
                </p>

                <div className="login-input-group" style={{ marginBottom: '14px' }}>
                  <label className="login-label">Seu Usuário ou E-mail</label>
                  <input 
                    type="text" 
                    className="login-input" 
                    placeholder="Ex: seu.nome ou seu.email@gruposandrini.com.br"
                    value={forgotUserIdent}
                    onChange={e => setForgotUserIdent(e.target.value)}
                  />
                </div>

                <div className="login-forgot-preview-box">
                  <div className="login-forgot-preview-header">
                    <MessageSquare size={14} />
                    <span>Mensagem pronta para enviar:</span>
                  </div>
                  <pre className="login-forgot-preview-text">{getForgotMessageText()}</pre>
                  
                  <button 
                    type="button" 
                    className={`login-copy-msg-btn ${copiedForgotMsg ? 'copied' : ''}`}
                    onClick={handleCopyForgotMessage}
                  >
                    {copiedForgotMsg ? (
                      <>
                        <Check size={16} /> Mensagem Copiada!
                      </>
                    ) : (
                      <>
                        <Copy size={16} /> Copiar Mensagem para WhatsApp / Teams
                      </>
                    )}
                  </button>
                </div>

                <div className="login-forgot-step-tip">
                  <strong>💡 Como funciona após o contato?</strong>
                  <p>
                    O administrador gerará uma senha temporária para você. Assim que você entrar com ela, o sistema solicitará automaticamente a criação da sua nova senha pessoal definitiva.
                  </p>
                </div>
              </div>

              <div className="login-forgot-modal-footer">
                <button 
                  type="button" 
                  className="login-forgot-back-btn"
                  onClick={() => setShowForgotModal(false)}
                >
                  Entendido, Voltar ao Login
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
