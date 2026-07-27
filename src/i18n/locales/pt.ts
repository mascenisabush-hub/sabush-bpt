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
  dashboard: {
    kpi: {
      initialCapital: {
        label: string;
        notSet: string;
        descSet: string;
        descUnset: string;
      };
      stockCost: { label: string; desc: string };
      marketValue: { label: string; desc: string };
      embeddedProfit: { label: string; desc: string };
      businessWorth: { label: string; desc: string };
      expenses: { label: string; desc: string };
      withdrawals: { label: string; desc: string };
      quebraLoss: { label: string; desc: string };
      activeBatches: { label: string; desc: string };
    };
    otherIndicators: string;
    toolbar: {
      searchPlaceholder: string;
      allCategories: string;
      allSuppliers: string;
      productCountOne: string;
      productCountOther: string;
      activeBatchOne: string;
      activeBatchOther: string;
      filterSort: string;
      sortBy: string;
      sortName: string;
      sortProfit: string;
      sortCost: string;
    };
    breakdownModal: {
      title: string;
      explanation: string;
      estimatedOpen: string;
      finalizedClosed: string;
      totalLabel: string;
      expensesLabel: string;
      withdrawalsLabel: string;
    };
    worthModal: {
      title: string;
      explanation: string;
      marketValue: string;
      stockCost: string;
      expenses: string;
      withdrawals: string;
      totalLabel: string;
      latestCount: string;
      initialCapital: string;
      growth: string;
      basedOnCount: string;
      defineInitialCapital: string;
    };
    table: {
      emptyTitle: string;
      emptyNoProducts: string;
      emptyNoMatch: string;
      addFirstBatch: string;
      headerProduct: string;
      headerBuy: string;
      headerSell: string;
      headerProfit: string;
      headerActions: string;
      perUnit: string;
      estFinal: string;
      activeBatch: string;
      closedBatchOne: string;
      closedBatchOther: string;
      noBatch: string;
      skuLabel: string;
      est: string;
      final: string;
      exceededWarning: string;
      editStock: string;
      moreOptions: string;
      viewDetails: string;
      addStock: string;
      addQuebra: string;
      editDetails: string;
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
  dashboard: {
    kpi: {
      initialCapital: {
        label: 'Capital Inicial do Negócio',
        notSet: 'Não definido',
        descSet: 'O valor verificado do stock registado quando começou a usar o Sabush.',
        descUnset: 'Toque para registar o stock que já possui e definir o ponto de partida.',
      },
      stockCost: {
        label: 'Custo do Stock Atual',
        desc: 'O valor investido no stock que ainda resta.',
      },
      marketValue: {
        label: 'Valor de Mercado do Stock',
        desc: 'O valor estimado de venda do stock que ainda resta.',
      },
      embeddedProfit: {
        label: 'Lucro Embutido',
        desc: 'O lucro potencial contido no stock que ainda resta.',
      },
      businessWorth: {
        label: 'Valor do Negócio',
        desc: 'O valor estimado atual do negócio, com base no stock verificado e nos ajustes registados.',
      },
      expenses: {
        label: 'Despesas Gerais',
        desc: 'Custos operacionais registados pelo negócio.',
      },
      withdrawals: {
        label: 'Levantamentos do Dono',
        desc: 'Dinheiro retirado intencionalmente pelo dono.',
      },
      quebraLoss: {
        label: 'Perdas de Stock (Quebras)',
        desc: 'Valor perdido por produtos danificados, expirados ou em falta.',
      },
      activeBatches: {
        label: 'Lotes Ativos',
        desc: 'Número de lotes de stock que contribuem atualmente para o inventário.',
      },
    },
    otherIndicators: 'Outros Indicadores',
    toolbar: {
      searchPlaceholder: 'Pesquisar produtos...',
      allCategories: 'Todas Categorias',
      allSuppliers: 'Todos Fornecedores',
      productCountOne: '{{count}} produto',
      productCountOther: '{{count}} produtos',
      activeBatchOne: '{{count}} lote ativo',
      activeBatchOther: '{{count}} lotes ativos',
      filterSort: 'Filtrar / Ordenar',
      sortBy: 'Ordenar Por',
      sortName: 'Nome (A-Z)',
      sortProfit: 'Maior Lucro',
      sortCost: 'Preço Custo',
    },
    breakdownModal: {
      title: 'Lucro Embutido',
      explanation:
        'Lucro Embutido é o lucro potencial marcado no stock — nenhuma venda é registada nesta app, por isso este valor nunca é rendimento realizado.',
      estimatedOpen: 'Estimado (Lotes Abertos):',
      finalizedClosed: 'Finalizado (Lotes Fechados):',
      totalLabel: 'Lucro Embutido Total:',
      expensesLabel: 'Despesas Gerais (até hoje):',
      withdrawalsLabel: 'Levantamentos do Dono (não afeta o lucro):',
    },
    worthModal: {
      title: 'Valor do Negócio',
      explanation:
        'Valor do Negócio = Valor de Mercado do Stock − Despesas − Levantamentos. Sem venda registada, não existe um valor de "caixa" real — por isso não inventamos um.',
      marketValue: 'Valor de Mercado do Stock:',
      stockCost: 'Custo do Stock (Investimento):',
      expenses: 'Despesas Gerais:',
      withdrawals: 'Levantamentos do Dono:',
      totalLabel: 'Valor Total do Negócio:',
      latestCount: 'Contagem Física Mais Recente:',
      initialCapital: 'Capital Inicial (ponto de partida):',
      growth: 'Crescimento do Capital:',
      basedOnCount: 'Stock atual baseado na contagem de {{date}}',
      defineInitialCapital: ' · Defina o Capital Inicial para medir o crescimento.',
    },
    table: {
      emptyTitle: 'Nenhum produto encontrado',
      emptyNoProducts: 'Adicione stock para criar o seu primeiro produto!',
      emptyNoMatch: 'Nenhum produto corresponde à sua pesquisa.',
      addFirstBatch: '+ Adicionar Primeiro Lote',
      headerProduct: 'Produto',
      headerBuy: 'Compra',
      headerSell: 'Venda',
      headerProfit: 'Lucro',
      headerActions: 'Ações',
      perUnit: '/un',
      estFinal: 'Est. / Final',
      activeBatch: 'Lote ativo',
      closedBatchOne: '{{count}} lote fechado',
      closedBatchOther: '{{count}} lotes fechados',
      noBatch: 'Sem lote',
      skuLabel: 'SKU: {{sku}}',
      est: 'Est.',
      final: 'Final',
      exceededWarning: 'Aviso: Quebras excedem stock',
      editStock: 'Adicionar Stock / Editar Lote',
      moreOptions: 'Mais opções',
      viewDetails: 'Ver detalhes',
      addStock: '+ Add Stock',
      addQuebra: '+ Quebra',
      editDetails: 'Editar Detalhes',
    },
  },
};
