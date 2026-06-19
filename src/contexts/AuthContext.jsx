import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../services/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const cached = localStorage.getItem('__dd_user__');
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('f_login', {
        p_email: email,
        p_senha: password
      });

      if (rpcError) throw rpcError;

      if (data && data.length > 0) {
        const loggedUser = data[0];
        setUser(loggedUser);
        localStorage.setItem('__dd_user__', JSON.stringify(loggedUser));
        return { success: true, user: loggedUser };
      } else {
        throw new Error('E-mail ou senha incorretos.');
      }
    } catch (err) {
      const msg = err.message || 'Falha na autenticação';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('__dd_user__');
    localStorage.removeItem('selectedCompany');
  };

  const changePassword = async (newPassword) => {
    if (!user) return { success: false, error: 'Usuário não autenticado' };
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('f_change_password', {
        p_user_id: user.id,
        p_new_senha: newPassword
      });

      if (rpcError) throw rpcError;

      if (data) {
        const updatedUser = { ...user, status: 'ativo' };
        setUser(updatedUser);
        localStorage.setItem('__dd_user__', JSON.stringify(updatedUser));
        return { success: true };
      }
      throw new Error('Falha ao alterar senha.');
    } catch (err) {
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (email, nome, senha, role, empresa) => {
    if (!user) return { success: false, error: 'Ação não autorizada' };
    try {
      const { data, error: rpcError } = await supabase.rpc('f_create_usuario', {
        p_caller_id: user.id,
        p_email: email,
        p_nome: nome,
        p_senha: senha,
        p_role: role,
        p_empresa: empresa
      });

      if (rpcError) throw rpcError;
      return { success: true, newUserId: data };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const listUsers = async () => {
    if (!user) return [];
    try {
      const { data, error: rpcError } = await supabase.rpc('f_list_usuarios', {
        p_caller_id: user.id
      });
      if (rpcError) throw rpcError;
      return data || [];
    } catch (err) {
      console.error('Erro ao listar usuários:', err.message);
      return [];
    }
  };

  const updateUser = async (userId, nome, role, status, empresa) => {
    if (!user) return { success: false, error: 'Ação não autorizada' };
    try {
      const { data, error: rpcError } = await supabase.rpc('f_update_usuario', {
        p_caller_id: user.id,
        p_user_id: userId,
        p_nome: nome,
        p_role: role,
        p_status: status,
        p_empresa: empresa
      });
      if (rpcError) throw rpcError;
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const deleteUser = async (userId) => {
    if (!user) return { success: false, error: 'Ação não autorizada' };
    try {
      const { data, error: rpcError } = await supabase.rpc('f_delete_usuario', {
        p_caller_id: user.id,
        p_user_id: userId
      });
      if (rpcError) throw rpcError;
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, changePassword, createUser, listUsers, updateUser, deleteUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
