export interface TranslationDict {
  common: {
    close: string;
  };
  auth: {
    subtitle: string;
    backToQuickLogin: string;
    tabs: {
      login: string;
      register: string;
    };
    loginAs: string;
    roleOwner: string;
    roleStaff: string;
    form: {
      yourName: string;
      namePlaceholder: string;
      businessName: string;
      businessNamePlaceholder: string;
      category: string;
      categoryAuto: string;
      selectCategory: string;
      currency: string;
      email: string;
      emailPlaceholder: string;
      password: string;
      confirmPassword: string;
      showPassword: string;
      hidePassword: string;
    };
    defaults: {
      ownerFallback: string;
      businessNameFallback: string;
      demoBusinessNameFallback: string;
      demoOwnerFallback: string;
    };
    submitting: string;
    submitLogin: string;
    submitRegister: string;
    googleLogin: string;
    demoLogin: string;
    secureFooter: string;
    errors: {
      wrongCredentials: string;
      accountSuspended: string;
      invalidEmail: string;
      genericAuth: string;
      profileNotFound: string;
      profileFetchFailed: string;
      enterName: string;
      enterBusinessName: string;
      selectCategory: string;
      passwordMismatch: string;
      emailInUse: string;
      weakPassword: string;
      invalidEmailFormat: string;
      createAccountFailed: string;
      saveProfileFailed: string;
      saveBusinessFailed: string;
      genericRequest: string;
      googlePopupClosed: string;
      unauthorizedDomain: string;
      googleGenericError: string;
      demoOperationNotAllowed: string;
    };
  };
  quickLogin: {
    enterPin: string;
    whoIsUsing: string;
    noStaffConfigured: string;
    loginAsOwner: string;
    back: string;
    pinDigits: string;
    errors: {
      suspended: string;
      tooManyAttempts: string;
      wrongPin: string;
    };
  };
}

// Portuguese (Português) — canonical/fallback locale.
// This is the primary language for Sabush Tech's market (Mozambique),
// so every other locale file should stay structurally in sync with this one
// (same keys, same nesting — see the TranslationDict interface above).
export const pt: TranslationDict = {
  common: {
    close: 'Fechar',
  },
  auth: {
    subtitle: 'Gestão inteligente e controlo de lucro por lote para o seu negócio',
    backToQuickLogin: 'Voltar ao login rápido',
    tabs: {
      login: 'Entrar',
      register: 'Registar Negócio',
    },
    loginAs: 'Entrar como:',
    roleOwner: 'Dono (Proprietário)',
    roleStaff: 'Funcionário (Staff)',
    form: {
      yourName: 'O seu Nome',
      namePlaceholder: 'Ex: João Silva',
      businessName: 'Nome do Negócio / Empresa',
      businessNamePlaceholder: 'Ex: Mercearia Esperança',
      category: 'Ramo de Negócio',
      categoryAuto: 'auto',
      selectCategory: 'Selecione uma categoria...',
      currency: 'Moeda Principal',
      email: 'Email',
      emailPlaceholder: 'seuemail@exemplo.com',
      password: 'Palavra-passe',
      confirmPassword: 'Confirmar Palavra-passe',
      showPassword: 'Mostrar palavra-passe',
      hidePassword: 'Ocultar palavra-passe',
    },
    defaults: {
      ownerFallback: 'Proprietário',
      businessNameFallback: 'Meu Negócio',
      demoBusinessNameFallback: 'Negócio de Demonstração',
      demoOwnerFallback: 'Proprietário Demo',
    },
    submitting: 'A processar...',
    submitLogin: 'Entrar no Sistema',
    submitRegister: 'Criar Conta e Negócio',
    googleLogin: 'Entrar com Conta Google',
    demoLogin: 'Entrar em Modo Demonstração (Sem Email)',
    secureFooter: '🔒 Acesso seguro com isolamento total de dados por empresa.',
    errors: {
      wrongCredentials: 'Email ou palavra-passe incorretos.',
      accountSuspended: 'Esta conta foi suspensa. Contacte o dono do negócio para mais informações.',
      invalidEmail: 'Formato de email inválido.',
      genericAuth: 'Erro de autenticação.',
      profileNotFound: 'Perfil de utilizador não encontrado no Firestore.',
      profileFetchFailed: 'Falha ao consultar perfil no banco de dados',
      enterName: 'Por favor insira o seu nome.',
      enterBusinessName: 'Por favor insira o nome do seu negócio.',
      selectCategory: 'Por favor selecione o ramo do seu negócio.',
      passwordMismatch: 'As palavras-passe não coincidem. Por favor, verifique e tente novamente.',
      emailInUse: 'Este email já está registado na plataforma. Tente fazer login.',
      weakPassword: 'A palavra-passe deve ter pelo menos 6 caracteres.',
      invalidEmailFormat: 'O formato do email é inválido.',
      createAccountFailed: 'Falha ao criar conta de autenticação.',
      saveProfileFailed: 'Erro ao guardar dados do perfil',
      saveBusinessFailed: 'Erro ao guardar dados do negócio',
      genericRequest: 'Ocorreu um erro ao processar o seu pedido.',
      googlePopupClosed: 'A janela de autenticação foi fechada antes de concluir.',
      unauthorizedDomain:
        'O domínio ({{domain}}) não está autorizado no Firebase ({{project}}). Adicione este domínio na Consola do Firebase (Authentication -> Definições -> Domínios autorizados) ou crie conta com Email e Palavra-passe acima.',
      googleGenericError: 'Erro ao entrar com Google.',
      demoOperationNotAllowed:
        'O login Anónimo está desativado na consola do Firebase. Utilize a opção "Entrar com Google".',
    },
  },
  quickLogin: {
    enterPin: 'Introduza o seu PIN',
    whoIsUsing: 'Quem está a usar este dispositivo?',
    noStaffConfigured: 'Ainda não há funcionários configurados para este dispositivo.',
    loginAsOwner: 'Entrar como Dono',
    back: 'Voltar',
    pinDigits: 'PIN de 6 dígitos',
    errors: {
      suspended: 'Esta conta foi suspensa. Contacte o dono do negócio.',
      tooManyAttempts: 'Demasiadas tentativas. Aguarde um momento e tente novamente.',
      wrongPin: 'PIN incorreto. Tente novamente.',
    },
  },
};
