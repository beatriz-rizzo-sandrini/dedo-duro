-- ==============================================================================
-- FUNÇÃO RPC PARA REDEFINIÇÃO DE SENHA POR ADMINISTRADORES / GESTORES
-- ==============================================================================
-- Esta função permite que um usuário administrador ou gestor redefina a senha
-- de outro colaborador diretamente, de forma segura com hash bcrypt (pgcrypto).
--
-- Caso 'p_force_change' seja TRUE, o status é alterado para 'novo', fazendo com
-- que a tela de login force o usuário a cadastrar sua senha pessoal definitiva
-- no primeiro acesso.

CREATE OR REPLACE FUNCTION public.f_admin_reset_password(
  p_caller_id int, 
  p_user_id int, 
  p_new_senha text, 
  p_force_change boolean DEFAULT true
)
RETURNS boolean AS $$
DECLARE
  v_caller_role text;
  v_target_role text;
  v_new_status text;
BEGIN
  -- 1. Verifica privilégios de quem está executando a ação
  SELECT role INTO v_caller_role FROM public.usuarios_sistema WHERE id = p_caller_id;
  IF v_caller_role IS NULL OR (v_caller_role != 'admin' AND v_caller_role != 'gestor') THEN
    RAISE EXCEPTION 'Acesso negado: apenas administradores e gestores podem redefinir senhas.';
  END IF;

  -- 2. Gestor não pode redefinir senha de Administrador
  SELECT role INTO v_target_role FROM public.usuarios_sistema WHERE id = p_user_id;
  IF v_caller_role = 'gestor' AND v_target_role = 'admin' THEN
    RAISE EXCEPTION 'Acesso negado: gestores não podem redefinir senhas de administradores.';
  END IF;

  -- 3. Define novo status (novo = força troca no próximo login)
  v_new_status := CASE WHEN p_force_change THEN 'novo' ELSE 'ativo' END;

  -- 4. Atualiza a senha criptografada e o status
  UPDATE public.usuarios_sistema
  SET senha = crypt(p_new_senha, gen_salt('bf')),
      status = v_new_status
  WHERE id = p_user_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
