import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, Eye, EyeOff, ShieldAlert, ArrowRight, CheckCircle2 } from 'lucide-react';
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
                <label className="login-label">Senha</label>
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
    </div>
  );
}
