export interface TranslationDict {
  common: {
    close: string;
    purchaseBatchStatus: {
      active: string;
      partially_remaining: string;
      fully_consumed: string;
      archived: string;
    };
    batchStatus: {
      open: string;
      closed: string;
    };
    months: {
      jan: string; feb: string; mar: string; apr: string; may: string; jun: string;
      jul: string; aug: string; sep: string; oct: string; nov: string; dec: string;
    };
    loading: string;
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
    continueAsGoogleAccount: string;
    chooseAnotherGoogleAccount: string;
    forgetAccount: string;
    backToSavedAccounts: string;
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
      businessWorth: {
        label: string;
        desc: string;
        // [Business Worth Evolution — Implementation Authorization,
        // Increment 2; Specification §32, FR-59] Shown next to the value
        // whenever the card is displaying Estimated Business Worth (State
        // 1a — no BusinessWorthSnapshot yet) instead of Current, so the
        // two are never visually indistinguishable.
        estimatedLabel: string;
        // Genuinely UNKNOWN (Specification §6 State 1) — a brand-new
        // business with no historical Capital Inicial and no snapshot yet.
        unknown: string;
      };
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
      // [Business Worth Evolution — Implementation Authorization,
      // Increment 2; Specification §32, FR-59] Shown in place of
      // totalLabel when the modal is displaying Estimated Business Worth
      // (State 1a) instead of Current.
      totalLabelEstimated: string;
      // Short banner shown only in the Estimated state, explaining why the
      // figure is an estimate rather than a measured Current value.
      estimatedNotice: string;
      // Click-through into the Business Worth history view (FR-47).
      viewHistory: string;
    };
    // [Business Worth Evolution — Implementation Authorization, Increment
    // 2; Specification §8, §32, FR-47] The Business Worth history view —
    // every confirmed BusinessWorthSnapshot for this business, ordered,
    // each independently drillable, including the current record.
    historyModal: {
      title: string;
      subtitle: string;
      empty: string;
      current: string;
      measuredOn: string;
      close: string;
      // [Business Worth Evolution — Implementation Authorization,
      // Increment 8; Specification §25, §26]
      corrected: string;
      recovered: string;
      // [Business Worth Evolution — Implementation Authorization,
      // Increment 10 (Revision 3); Specification §42.1, §42.3, FR-61,
      // FR-69]
      ownerDeclared: string;
      ownerDeclaredNotice: string;
      correctAction: string;
      recoverAction: string;
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
  nav: {
    tabs: {
      dashboard: { label: string; shortLabel: string };
      stocks: { label: string; shortLabel: string };
      addStock: { label: string; shortLabel: string };
      stockCount: { label: string; shortLabel: string };
      // [Business Worth Evolution — Implementation Authorization,
      // Increment 10 (Revision 3)]
      declareWorth: { label: string; shortLabel: string };
      addQuebra: { label: string; shortLabel: string };
      addExpense: { label: string; shortLabel: string };
      addWithdrawal: { label: string; shortLabel: string };
      closing: { label: string; shortLabel: string };
      // [Business Worth Evolution — Implementation Authorization,
      // Increment 3; Specification §11, §12]
      debts: { label: string; shortLabel: string };
      // [Business Worth Evolution — Implementation Authorization,
      // Increment 5; Specification §13]
      startupInvestment: { label: string; shortLabel: string };
      reports: { label: string; shortLabel: string };
      timeline: { label: string; shortLabel: string };
    };
    /** Browser-tab title for the initial stock count onboarding flow — not
     * one of the 11 NAV_TABS bar entries, so it lives outside `tabs`. */
    initialStockTitle: string;
  };
  // [Business Worth Evolution — Implementation Authorization, Increment 3;
  // Specification §11, §12] Minimal screen for the Owner to record
  // debts owed to the business (Receivables) and view/settle supplier
  // debts (Payables, created automatically by a supplier-credit +Stock
  // purchase).
  debts: {
    title: string;
    subtitle: string;
    receivablesSection: {
      title: string;
      addButton: string;
      empty: string;
      totalLabel: string;
      remainingLabel: string;
      recordPayment: string;
      statusUnpaid: string;
      statusPartial: string;
      statusPaid: string;
    };
    payablesSection: {
      title: string;
      addButton: string;
      empty: string;
      totalLabel: string;
      remainingLabel: string;
      recordPayment: string;
      hint: string;
      manualBadge: string;
      unknownSupplier: string;
    };
    cashPositionSection: {
      title: string;
      subtitle: string;
      currentLabel: string;
      asOfLabel: string;
      updateButton: string;
      empty: string;
      history: string;
    };
    form: {
      amountLabel: string;
      debtorNameLabel: string;
      supplierNameLabel: string;
      descriptionLabel: string;
      submit: string;
      cancel: string;
      paymentAmountLabel: string;
      paymentDateLabel: string;
      submitPayment: string;
      cashAmountLabel: string;
      cashDateLabel: string;
    };
  };
  // [Business Worth Evolution — Implementation Authorization, Increment 5;
  // Specification §13] Minimal screen for the Owner to record residual
  // Startup Investment spending (FR-17) and view the report-time
  // aggregate total (FR-16). Never shows a shortfall/performance figure
  // relative to Business Worth (FR-52).
  startupInvestment: {
    title: string;
    subtitle: string;
    reportSection: {
      totalLabel: string;
      purchasesLabel: string;
      expensesLabel: string;
      entriesLabel: string;
      noBaselineYet: string;
    };
    entriesSection: {
      title: string;
      addButton: string;
      empty: string;
    };
    form: {
      categoryLabel: string;
      amountLabel: string;
      dateLabel: string;
      descriptionLabel: string;
      submit: string;
      cancel: string;
    };
    categories: {
      labor: string;
      wages: string;
      transport: string;
      preparation: string;
      license: string;
      other: string;
    };
  };
  header: {
    myBusiness: string;
    profileNotSet: string;
    registeredBusiness: string;
    contactTitle: string;
    searchPlaceholder: string;
    searchNoResults: string;
    notifications: string;
    noNotifications: string;
    userFallback: string;
    roleOwner: string;
    roleStaff: string;
    settings: string;
    currency: string;
    helpAndConcept: string;
    logout: string;
    completeProfile: string;
    currencyModal: {
      title: string;
      description: string;
      done: string;
    };
    helpModal: {
      title: string;
      section1Title: string;
      section1Body: string;
      section2Title: string;
      section2Body: string;
      section2Formula: string;
      section3Title: string;
      section3Body: string;
      section4Title: string;
      section4Body: string;
      gotIt: string;
    };
  };
  addStock: {
    title: string;
    subtitle: string;
    successTitle: string;
    successMessageSingle: string;
    successMessageMultiple: string;
    supplier: {
      sectionTitle: string;
      nameLabel: string;
      namePlaceholder: string;
      phoneLabel: string;
      phonePlaceholder: string;
      notesLabel: string;
      notesPlaceholder: string;
      unspecifiedHint: string;
      creditCheckboxLabel: string;
      outstandingBalanceWarning: string;
      searchPlaceholder: string;
      existingTag: string;
      createNewShort: string;
      selectedHint: string;
      changeSupplier: string;
    };
    table: {
      batch: string;
      product: string;
      dateEntered: string;
      quantity: string;
      unit: string;
      buyPrice: string;
      sellPrice: string;
      estProfit: string;
      action: string;
    };
    productSearchPlaceholder: string;
    existingTag: string;
    maybeTag: string;
    similarProduct: {
      warning: string;
    };
    createNew: string;
    createNewShort: string;
    unitSuggestionsTitle: string;
    unitSuggestionsLabel: string;
    unitOutsideRelationshipWarning: string;
    priceDeviationWarningAbove: string;
    priceDeviationWarningBelow: string;
    totalProfitTitle: string;
    estProfitMobile: string;
    removeBatch: string;
    removeRowConfirm: string;
    addAnotherProduct: string;
    summary: {
      titleOne: string;
      titleOther: string;
      totalInvestment: string;
      marketValue: string;
      embeddedProfit: string;
    };
    autoCloseNotice: string;
    submitOne: string;
    submitMultiple: string;
    fields: {
      costPrice: string;
      sellPrice: string;
    };
    errors: {
      missingName: string;
      invalidQty: string;
      invalidPrice: string;
    };
    draft: {
      savingIndicator: string;
      savedIndicator: string;
      saveErrorIndicator: string;
      retryButton: string;
      restoredNotice: string;
      discardButton: string;
      discardConfirm: string;
      conflictTitle: string;
      conflictBody: string;
      conflictUseTheirs: string;
      conflictKeepMine: string;
    };
    event: {
      addAnotherSupplier: string;
    };
    // [Restock Observation Amendment v1.0]
    restockObservation: {
      label: string;
      optional: string;
      placeholder: string;
      dontKnow: string;
      helperText: string;
    };
    // [Smart Stock Entry — Tier 1]
    smartEntry: {
      title: string;
      subtitle: string;
      takePictureButton: string;
      uploadButton: string;
      processing: string;
      rejectScan: string;
      noConfidentMatch: string;
      sellingPriceFromMemory: string;
      sellingPriceNotFound: string;
      fields: {
        product: string;
        quantity: string;
        unit: string;
        costPrice: string;
      };
      errors: {
        invalid_upload: string;
        too_large: string;
        unsupported_type: string;
        provider_unavailable: string;
        unreadable: string;
        network_error: string;
      };
    };
    // [Supplier-Wording Recognition — Checkpoint 3]
    supplierWording: {
      candidateTitle: string;
      candidateHint: string;
      confirmButton: string;
      noneOfTheseButton: string;
      reusedNotice: string;
      conflictWarning: string;
      distinguishingInfoLabel: string;
      distinguishingInfoPlaceholder: string;
      distinguishingInfoRequiredError: string;
      unresolvedCandidatesError: string;
      // [Product Recognition Intelligence — Checkpoint 3] Plain-language
      // label for every possible candidate `ground` value (Checkpoint
      // 1/2/4's own new grounds included), reused unchanged by every
      // checkpoint — no new UI component, no per-checkpoint duplicate
      // key set.
      grounds: {
        initialStockName: string;
        existingAlternativeWording: string;
        unitSpellingEquivalence: string;
        characterSpellingVariation: string;
        abbreviationMatch: string;
        synonymMatch: string;
        translationMatch: string;
        semanticMatch: string;
      };
      // [Checkpoint 1/3 — Contradiction Check] Shown only when a
      // weak-tier contradiction suppressed an otherwise-plausible
      // candidate for the CURRENT typed wording — never a new
      // confirm/decline control, purely explanatory text.
      contradictionNotShownNotice: string;
    };
    // [Increment B, Checkpoint B1 — Consolidated Specification §8]
    sequencing: {
      resolveBeforeReview: string;
    };
  };
  addQuebra: {
    title: string;
    subtitle: string;
    registeredTitle: string;
    successMessageOne: string;
    successMessageOther: string;
    emptyState: string;
    loadingAfterShopSwitch: string;
    selectProduct: string;
    selectBatch: string;
    noBatchesForProduct: string;
    qtyLabel: string;
    batchStatusOpen: string;
    batchStatusClosed: string;
    lossDate: string;
    lossQuantity: string;
    warningTitle: string;
    warningBody: string;
    currentBatchStock: string;
    stockAfterLoss: string;
    lostCostValue: string;
    unitsValue: string;
    reasonLabel: string;
    reasonPlaceholder: string;
    quickSuggestions: string;
    reasons: {
      expired: string;
      broken: string;
      packagingDamaged: string;
      transportLoss: string;
      spoiledMold: string;
      customerSample: string;
    };
    submitButton: string;
    errors: {
      selectProductBatch: string;
      invalidQuantity: string;
      missingReason: string;
    };
  };
  addExpense: {
    title: string;
    subtitle: string;
    registeredTitle: string;
    successMessage: string;
    descriptionLabel: string;
    descriptionPlaceholder: string;
    expenseDate: string;
    amountLabel: string;
    categoryLabel: string;
    categoryPlaceholder: string;
    quickSuggestions: string;
    categories: {
      rent: string;
      utilities: string;
      transport: string;
      salaries: string;
      maintenance: string;
      other: string;
    };
    submitButton: string;
    errors: {
      missingDescription: string;
      invalidAmount: string;
    };
  };
  addWithdrawal: {
    title: string;
    subtitle: string;
    registeredTitle: string;
    successMessage: string;
    infoNote: string;
    withdrawalDate: string;
    amountLabel: string;
    reasonLabel: string;
    reasonPlaceholder: string;
    quickSuggestions: string;
    reasons: {
      personalUse: string;
      salary: string;
      family: string;
      emergency: string;
      home: string;
      vehicle: string;
      other: string;
    };
    notesLabel: string;
    notesPlaceholder: string;
    submitButton: string;
    errors: {
      invalidAmount: string;
    };
  };
  // [Business Worth Evolution — Implementation Authorization, Increment
  // 10 (Revision 3); Specification §42.1, §6 State 2, FR-61; BDR
  // Decision 36] Dedicated, separate entry point from stock-count.
  declareWorth: {
    title: string;
    subtitle: string;
    infoNote: string;
    dateLabel: string;
    amountLabel: string;
    submitButton: string;
    registeredTitle: string;
    successMessage: string;
    currentValueLabel: string;
    currentValueUnknownNote: string;
    reviewButton: string;
    reviewTitle: string;
    reviewSubtitle: string;
    reviewAmountLabel: string;
    reviewCurrentLabel: string;
    reviewDifferenceLabel: string;
    deviationWarningAbove: string;
    deviationWarningBelow: string;
    backButton: string;
    errors: {
      invalidAmount: string;
      generic: string;
    };
  };
  stocksView: {
    title: string;
    subtitle: string;
    legacySupplierName: string;
    remainingInvestment: string;
    marketValue: string;
    remainingEmbeddedProfit: string;
    searchPlaceholder: string;
    allSuppliers: string;
    allStatuses: string;
    showArchived: string;
    groupByEvent: string;
    emptyState: string;
    legacyBadge: string;
    productCountOne: string;
    productCountOther: string;
    invested: string;
    market: string;
    embeddedProfit: string;
    event: {
      batchCountOne: string;
      batchCountOther: string;
    };
    modal: {
      supplier: string;
      createdBy: string;
      notes: string;
      totalInvestment: string;
      marketValue: string;
      embeddedProfit: string;
      remainingInvestment: string;
      remainingMarket: string;
      remainingProfit: string;
      inventoryLostWarning: string;
      productsHeading: string;
      table: {
        product: string;
        qtyRemaining: string;
        costSell: string;
        remainingInvestment: string;
        embeddedProfit: string;
        statusPrefix: string;
      };
      productRemoved: string;
      timelineHeading: string;
      reactivateBatch: string;
      archiveBatch: string;
      generatingPdf: string;
      exportPdf: string;
      close: string;
    };
  };
  reports: {
    home: {
      title: string;
      subtitle: string;
      embeddedProfitLabel: string;
      embeddedProfitHint: string;
      embeddedProfitDescription: string;
      footerNote: string;
    };
    categories: {
      businessWorth: { title: string; description: string };
      inventoryValuation: { title: string; description: string };
      batchPerformance: { title: string; description: string };
      capitalGrowth: { title: string; description: string };
      expenses: { title: string; description: string };
      withdrawals: { title: string; description: string };
      inventoryLosses: { title: string; description: string };
      stockVerification: { title: string; description: string };
    };
    common: {
      backTooltip: string;
      pdf: string;
      excel: string;
      print: string;
      filters: string;
      thisWeek: string;
      thisMonth: string;
      last30Days: string;
      allTime: string;
      startDate: string;
      endDate: string;
      indicator: string;
      value: string;
      summary: string;
      tableFallback: string;
      dateCol: string;
      descriptionCol: string;
      categoryCol: string;
      reasonCol: string;
      totalCol: string;
      generalCategory: string;
      unspecified: string;
      notDefined: string;
      insufficientTrendData: string;
      insufficientChartData: string;
      trendIncreased: string;
      trendDecreased: string;
      trendSentence: string;
      concentrationSingle: string;
      concentrationMultiple: string;
      shareOf: string;
      statusActive: string;
      statusPartiallyRemaining: string;
      statusFullyConsumed: string;
      statusArchived: string;
      delete: string;
      locked: string;
    };
    businessWorth: {
      title: string;
      description: string;
      snapshotAt: string;
      kpiInitialCapitalFull: string;
      kpiInitialCapital: string;
      kpiInventoryCostFull: string;
      kpiInventoryCost: string;
      kpiMarketValueFull: string;
      kpiMarketValue: string;
      kpiEmbeddedProfit: string;
      kpiInventoryLossesFull: string;
      kpiInventoryLossesExcel: string;
      kpiInventoryLosses: string;
      kpiTotalExpenses: string;
      kpiTotalWithdrawalsFull: string;
      kpiTotalWithdrawals: string;
      kpiBusinessWorth: string;
      kpiBusinessWorthEstimated: string;
      kpiCapitalGrowth: string;
      heroLabel: string;
      heroLabelEstimated: string;
      heroSinceInitial: string;
      heroNoInitialCount: string;
      compositionTitle: string;
      compositionNote: string;
      expensesInPeriod: string;
      expensesInPeriodRange: string;
      noExpensesInPeriod: string;
      withdrawalsInPeriod: string;
      withdrawalsInPeriodRange: string;
      noWithdrawalsInPeriod: string;
      insightGrew: string;
      insightShrank: string;
      insightNoInitialCount: string;
      insightEmbeddedProfitShare: string;
      insightLossesCost: string;
    };
    inventoryValuation: {
      title: string;
      description: string;
      groupedBy: string;
      kpiInventoryCost: string;
      kpiInventoryCostFull: string;
      kpiMarketValue: string;
      kpiMarketValueFull: string;
      kpiEmbeddedProfit: string;
      kpiAvgMargin: string;
      kpiAvgMarginFull: string;
      kpiNumProducts: string;
      kpiNumProductsFull: string;
      kpiActiveBatches: string;
      kpiActiveBatchesFull: string;
      kpiHighestValueProduct: string;
      kpiHighestValueProductFull: string;
      kpiLowestValueProduct: string;
      kpiLowestValueProductFull: string;
      inventoryByGroup: string;
      byGroup: string;
      detail: string;
      noInventory: string;
      noDataToShow: string;
      colInvestment: string;
      colMarket: string;
      colEmbeddedProfit: string;
      groupSupplier: string;
      groupBatch: string;
      groupBatchFull: string;
      groupProduct: string;
      entitySuppliersPlural: string;
      entityBatchesPlural: string;
      entityProductsPlural: string;
      removedProduct: string;
      unspecifiedSupplier: string;
      noPurchaseBatch: string;
      insightHighestValue: string;
      insightAvgMargin: string;
    };
    batchPerformance: {
      title: string;
      description: string;
      periodRange: string;
      kpiBatchesInPeriod: string;
      kpiTotalInvestment: string;
      kpiRemainingInventory: string;
      kpiRemainingProfit: string;
      searchTitle: string;
      searchPlaceholder: string;
      searchHint: string;
      searchNoResults: string;
      colBatch: string;
      colDate: string;
      colSupplier: string;
      colProducts: string;
      colInvestment: string;
      colMarketValue: string;
      colEmbeddedProfit: string;
      colRemainingInventory: string;
      colRemainingProfit: string;
      colStatus: string;
      supplierLabel: string;
      allSuppliers: string;
      remainingProfitByBatch: string;
      sortHighestProfit: string;
      sortHighestInvestment: string;
      sortNewest: string;
      sortOldest: string;
      noBatchesInPeriod: string;
      allBatches: string;
      insightTopBatch: string;
      insightExcludesInitialCapital: string;
    };
    capitalGrowth: {
      title: string;
      description: string;
      evolutionSince: string;
      kpiInitialCapital: string;
      kpiCurrentCapital: string;
      kpiCurrentCapitalFull: string;
      kpiCurrentCapitalEstimated: string;
      kpiCurrentCapitalFullEstimated: string;
      kpiIncrease: string;
      kpiGrowthPct: string;
      timelineInitialCapitalLabel: string;
      timelineTodayLabel: string;
      timelineTitlePdf: string;
      timelineTitleExcel: string;
      colDate: string;
      colPeriod: string;
      colBusinessWorth: string;
      monthlyGrowthLabel: string;
      yearlyGrowthLabel: string;
      businessWorthTimelineTitle: string;
      noTimelineData: string;
      closingsHistoryTitle: string;
      noClosings: string;
      colClosingDate: string;
      colEmbeddedProfit: string;
      colExpenses: string;
      colWithdrawals: string;
      insightNoInitialCount: string;
      insightGrew: string;
      insightShrank: string;
      insightNoClosings: string;
      insightLastMonthlyChangeUp: string;
      insightLastMonthlyChangeDown: string;
    };
    expenses: {
      title: string;
      description: string;
      kpiTotal: string;
      kpiTotalFull: string;
      kpiAvgMonthly: string;
      kpiLargestCategory: string;
      kpiCount: string;
      kpiCountFull: string;
      groupCategory: string;
      groupMonth: string;
      groupYear: string;
      sectionByGroupTitle: string;
      allExpensesTitle: string;
      allExpensesCount: string;
      emptyMessage: string;
      insightTopCategory: string;
      insightMonthlyChangeUp: string;
      insightMonthlyChangeDown: string;
    };
    withdrawals: {
      title: string;
      description: string;
      kpiTotal: string;
      kpiTotalFull: string;
      kpiTopReason: string;
      kpiCount: string;
      kpiCountFull: string;
      groupMonth: string;
      groupReason: string;
      sectionByGroupTitle: string;
      allWithdrawalsTitle: string;
      timelineTitle: string;
      emptyMessage: string;
      insightTopReason: string;
    };
    inventoryLosses: {
      title: string;
      description: string;
      kpiTotalLost: string;
      kpiUnitsLost: string;
      kpiProductsAffected: string;
      kpiLargestLoss: string;
      groupProduct: string;
      groupReason: string;
      groupMonth: string;
      sectionByGroupTitle: string;
      allLossesTitle: string;
      allLossesCount: string;
      emptyMessage: string;
      productRemoved: string;
      unitsSuffix: string;
      colQuantity: string;
      colValueLost: string;
      insightLargestLoss: string;
    };
    stockVerification: {
      title: string;
      description: string;
      typeInitial: string;
      typeWeekly: string;
      typeMonthly: string;
      typeQuarterly: string;
      typeYearly: string;
      typeCustom: string;
      kpiBefore: string;
      kpiAfter: string;
      kpiFinancialImpact: string;
      kpiProductsAdjusted: string;
      historyTitle: string;
      colType: string;
      colProductsCounted: string;
      colProductsAdjusted: string;
      colBefore: string;
      colAfter: string;
      colImpact: string;
      diffTableTitle: string;
      colProduct: string;
      colDiffQty: string;
      colDiffValue: string;
      itemsCountedLabel: string;
      noStockCountsMessage: string;
      noComparisonMessage: string;
      insightNoCounts: string;
      insightOnlyInitial: string;
      insightLatestAdjusted: string;
      insightValueUp: string;
      insightValueDown: string;
    };
  };
  // Release Readiness Audit finding (19-v1-completion-review-and-release-readiness-audit.md,
  // §2a/§2c): the client previously had zero in-app subscription/trial
  // status visibility, and a blocked write surfaced a raw Firebase
  // error. These keys are the minimum client-facing surface closing
  // that gap — a persistent status banner and a shared notice shown
  // in place of any entry form once subscriptionBlocksNewRecords is
  // true, per AppContext.tsx's own new derived value of that name.
  subscription: {
    banner: {
      trialActive: {
        title: string;
        daysRemaining: string; // {{days}}
        endsOn: string; // {{date}}
        subscribeButton: string;
      };
      gracePeriod: {
        title: string;
        daysRemaining: string; // {{days}}
        subscribeButton: string;
      };
      expired: {
        title: string;
        contactButton: string;
      };
    };
    // SuperAdmin V1 Operational Control Plane, Phase C (ADR-0006, Gap
    // 1). Distinct from the trial/grace/expired states above — this is
    // a platform operator having suspended the business directly, not
    // a billing state. Deliberately does not say the user's own
    // account/login was affected (it wasn't — see AppContext.tsx's
    // businessSuspended field comment for why).
    businessSuspension: {
      banner: {
        title: string;
        message: string;
        contactHint: string;
      };
    };
    blockedNotice: {
      title: string;
      trialCompletedMessage: string;
      expiredMessage: string;
      contactButton: string;
    };
    contactModal: {
      title: string;
      message: string;
      closeButton: string;
    };
    // Module #19 V1 Manual Payment Bridge (temporary — PaySuite/PayTED
    // remain deferred). Payment destination labels, keyed by
    // PaymentMethod (src/types.ts) — src/data/subscriptionPlan.ts's own
    // PAYMENT_METHODS array references these via labelKey.
    paymentMethods: {
      mpesa: { label: string };
      emola: { label: string };
      bim: { label: string };
    };
    subscribe: {
      title: string;
      priceLabel: string;
      chooseMethod: string;
      payTo: string;
      referenceLabel: string;
      referencePlaceholder: string;
      notesLabel: string;
      submitButton: string;
      submitting: string;
      pendingTitle: string;
      pendingMessage: string;
      pendingMethod: string;
      pendingReference: string;
      pendingSubmittedAt: string;
      rejectedTitle: string;
      rejectedRetryHint: string;
      errorMissingMethod: string;
      errorMissingReference: string;
      errorGeneric: string;
    };
  };
  // Module #20 Phase 3 Checkpoint 3 (Trial Engine Producer) — server-
  // rendered notification content, read by server/notificationPlatform.ts's
  // t() via resolveNotificationLanguage()/LanguageContext's own locale
  // dictionaries (ADR-0004 Decision 5: one source of truth, not a
  // second localization system). First-draft copy, not itself a
  // Business Decision Record — see 20-notifications-implementation
  // reasoning / trialNotificationProducer.ts's own header.
  notificationTemplates: {
    trial: {
      endingSoon: {
        whatHappened: string;
        whyItMatters: string;
        recommendedAction: string;
      };
      endingTomorrow: {
        whatHappened: string;
        whyItMatters: string;
        recommendedAction: string;
      };
    };
    closing: {
      approaching: {
        whatHappened: string;
        whyItMatters: string;
        recommendedAction: string;
      };
      due: {
        whatHappened: string;
        whyItMatters: string;
        recommendedAction: string;
      };
      overdue: {
        whatHappened: string;
        whyItMatters: string;
        recommendedAction: string;
      };
    };
    inventoryRisk: {
      breakage: {
        whatHappened: string;
        whyItMatters: string;
        recommendedAction: string;
      };
    };
    // [Business Worth Evolution — Implementation Authorization,
    // Increment 7; Specification §22, FR-57]
    businessWorth: {
      valueDiscrepancy: {
        whatHappened: string;
        whyItMatters: string;
        recommendedAction: string;
      };
      cashDiscrepancy: {
        whatHappened: string;
        whyItMatters: string;
        recommendedAction: string;
      };
      payableOutstanding: {
        whatHappened: string;
        whyItMatters: string;
        recommendedAction: string;
      };
      receivableOutstanding: {
        whatHappened: string;
        whyItMatters: string;
        recommendedAction: string;
      };
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
    purchaseBatchStatus: {
      active: 'Ativo',
      partially_remaining: 'Parcialmente Restante',
      fully_consumed: 'Totalmente Consumido',
      archived: 'Arquivado',
    },
    batchStatus: {
      open: '🟢 Ativo',
      closed: '🔒 Fechado',
    },
    months: {
      jan: 'Jan', feb: 'Fev', mar: 'Mar', apr: 'Abr', may: 'Mai', jun: 'Jun',
      jul: 'Jul', aug: 'Ago', sep: 'Set', oct: 'Out', nov: 'Nov', dec: 'Dez',
    },
    loading: 'A carregar…',
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
    continueAsGoogleAccount: 'Continuar como {name}',
    chooseAnotherGoogleAccount: 'Escolher outra conta',
    forgetAccount: 'Remover esta conta da lista',
    backToSavedAccounts: 'Voltar às contas guardadas',
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
        descUnset: 'Toque para escolher como estabelecer o Valor do Negócio — faça uma Contagem de Stock ou declare-o directamente.',
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
        estimatedLabel: 'Estimado',
        unknown: 'Ainda sem valor',
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
      totalLabelEstimated: 'Valor Estimado do Negócio:',
      estimatedNotice: 'Este é um valor Estimado — ainda não há uma Contagem confirmada para medir o Valor Atual do Negócio.',
      viewHistory: 'Ver histórico do Valor do Negócio',
      latestCount: 'Contagem Física Mais Recente:',
      initialCapital: 'Capital Inicial (ponto de partida):',
      growth: 'Crescimento do Capital:',
      basedOnCount: 'Stock atual baseado na contagem de {{date}}',
      defineInitialCapital: ' · Defina o Capital Inicial para medir o crescimento.',
    },
    historyModal: {
      title: 'Histórico do Valor do Negócio',
      subtitle: 'Cada Contagem confirmada cria um registo permanente e não editável.',
      empty: 'Ainda não há registos — confirme a primeira Contagem para começar o histórico.',
      current: 'Atual',
      measuredOn: 'Medido em {{date}}',
      close: 'Fechar',
      corrected: 'Corrigido',
      recovered: 'Recuperado',
      ownerDeclared: 'Declarado',
      ownerDeclaredNotice: 'Sem detalhe físico ou financeiro — valor declarado diretamente pelo dono, sem Contagem.',
      correctAction: 'Corrigir esta Contagem ({{hours}}h restantes)',
      recoverAction: 'Recuperar (autorizado, {{hours}}h restantes)',
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
  nav: {
    tabs: {
      dashboard: { label: 'Dashboard', shortLabel: 'Dashboard' },
      stocks: { label: 'Stocks', shortLabel: 'Stocks' },
      addStock: { label: 'Adicionar Stock', shortLabel: '+ Stock' },
      stockCount: { label: 'Contagem de Stock', shortLabel: 'Contagem' },
      declareWorth: { label: 'Declarar Valor do Negócio', shortLabel: 'Declarar' },
      addQuebra: { label: 'Adicionar Quebra', shortLabel: '+ Quebra' },
      addExpense: { label: 'Adicionar Despesa', shortLabel: '+ Despesa' },
      addWithdrawal: { label: 'Registar Levantamento', shortLabel: '+ Levant.' },
      closing: { label: 'Fecho Mensal/Anual', shortLabel: 'Fecho' },
      debts: { label: 'Dívidas', shortLabel: 'Dívidas' },
      startupInvestment: { label: 'Investimento Inicial', shortLabel: 'Invest. Inicial' },
      reports: { label: 'Relatórios', shortLabel: 'Relatórios' },
      timeline: { label: 'Linha do Tempo', shortLabel: 'Histórico' },
    },
    initialStockTitle: 'Contagem de Stock Inicial',
  },
  debts: {
    title: 'Dívidas',
    subtitle: 'Dinheiro que a sua empresa deve receber ou pagar.',
    receivablesSection: {
      title: 'A Receber (Clientes)',
      addButton: '+ Nova Dívida',
      empty: 'Nenhuma dívida registada.',
      totalLabel: 'Total',
      remainingLabel: 'Em Aberto',
      recordPayment: 'Registar Pagamento',
      statusUnpaid: 'Por Pagar',
      statusPartial: 'Parcialmente Paga',
      statusPaid: 'Paga',
    },
    payablesSection: {
      title: 'A Pagar (Fornecedores)',
      addButton: '+ Nova Dívida',
      empty: 'Nenhuma dívida a fornecedores.',
      totalLabel: 'Total',
      remainingLabel: 'Em Aberto',
      recordPayment: 'Registar Pagamento',
      hint: 'Criadas automaticamente ao comprar stock a crédito do fornecedor. Já deve dinheiro a um fornecedor desde antes de usar este sistema? Adicione aqui.',
      manualBadge: 'Saldo Inicial',
      unknownSupplier: 'Fornecedor não identificado',
    },
    cashPositionSection: {
      title: 'Posição de Caixa',
      subtitle: 'Dinheiro que o negócio tem em mãos, neste momento.',
      currentLabel: 'Caixa Atual',
      asOfLabel: 'A partir de',
      updateButton: 'Atualizar',
      empty: 'Ainda não registou a posição de caixa.',
      history: 'Histórico',
    },
    form: {
      amountLabel: 'Valor',
      debtorNameLabel: 'Quem deve (opcional)',
      supplierNameLabel: 'Fornecedor (opcional)',
      descriptionLabel: 'Descrição (opcional)',
      submit: 'Guardar',
      cancel: 'Cancelar',
      paymentAmountLabel: 'Valor Pago',
      paymentDateLabel: 'Data do Pagamento',
      submitPayment: 'Confirmar Pagamento',
      cashAmountLabel: 'Dinheiro em Caixa',
      cashDateLabel: 'A partir de',
    },
  },
  startupInvestment: {
    title: 'Investimento Inicial',
    subtitle: 'Quanto investiu para estabelecer o seu negócio — separado do Valor do Negócio.',
    reportSection: {
      totalLabel: 'Total Investido',
      purchasesLabel: 'Compras de Stock (referenciadas)',
      expensesLabel: 'Despesas (referenciadas)',
      entriesLabel: 'Outros Investimentos',
      noBaselineYet: 'Ainda não tem um Capital Inicial confirmado — o total mostrado inclui apenas os registos abaixo.',
    },
    entriesSection: {
      title: 'Registos de Investimento',
      addButton: '+ Novo Registo',
      empty: 'Nenhum registo de Investimento Inicial.',
    },
    form: {
      categoryLabel: 'Categoria',
      amountLabel: 'Valor',
      dateLabel: 'Data',
      descriptionLabel: 'Descrição (opcional)',
      submit: 'Guardar',
      cancel: 'Cancelar',
    },
    categories: {
      labor: 'Mão de Obra',
      wages: 'Salários',
      transport: 'Transporte',
      preparation: 'Preparação/Remodelação',
      license: 'Licenças',
      other: 'Outro',
    },
  },
  header: {
    myBusiness: 'Meu Negócio',
    profileNotSet: 'Perfil não definido',
    registeredBusiness: 'Negócio Registado',
    contactTitle: 'Contacto: {{contact}}',
    searchPlaceholder: 'Pesquisar no sistema...',
    searchNoResults: 'Nenhum produto encontrado para "{{query}}".',
    notifications: 'Notificações',
    noNotifications: 'Sem notificações novas.',
    userFallback: 'Utilizador',
    roleOwner: 'Dono',
    roleStaff: 'Staff',
    settings: 'Definições',
    currency: 'Moeda',
    helpAndConcept: 'Ajuda e Conceito',
    logout: 'Sair',
    completeProfile: 'Complete o perfil do seu negócio',
    currencyModal: {
      title: 'Seleccionar Moeda',
      description: 'Todos os valores e relatórios serão apresentados com a moeda selecionada.',
      done: 'Concluído',
    },
    helpModal: {
      title: 'Como Funciona o Lucro por Lote',
      section1Title: '1. Sem Necessidade de Registar Vendas Diárias',
      section1Body: 'Não precisa de registar cada venda individual. Em vez disso, ao registar um <strong>novo lote de stock</strong> de um produto, o <strong>lote anterior fecha automaticamente</strong>. Fechar um lote não significa que o stock foi vendido — significa que deixou de ser o lote de compra ativo, e o cálculo do seu lucro é finalizado com base no stock restante após as quebras registadas.',
      section2Title: '2. Lotes Fechados = Lucro Finalizado',
      section2Body: 'Quando um lote é substituído por um novo, o seu lucro é finalizado:',
      section2Formula: 'Stock Restante = Stock Inicial do Lote − Quebras',
      section3Title: '3. Lote Ativo = Estimativa em Curso',
      section3Body: 'Para o stock ativo atual, a aplicação mostra uma <strong>estimativa em curso</strong> do lucro projetado caso as unidades restantes sejam vendidas ao preço definido.',
      section4Title: '4. Quebras e Despesas Gerais',
      section4Body: 'Registe produtos estragados ou fora de validade em <strong>Quebras</strong>. Custos fixos como renda e eletricidade são registados em <strong>Despesas</strong> para determinar o <strong>Rendimento Líquido</strong> real.',
      gotIt: 'Entendido!',
    },
  },
  addStock: {
    title: 'Entrada Rápida de Stock',
    subtitle: 'Registe vários produtos numa única sessão. Os lotes anteriores serão fechados automaticamente.',
    successTitle: 'Stock Guardado com Sucesso!',
    successMessageSingle: 'Lote de stock para "{{product}}" adicionado com sucesso!',
    successMessageMultiple: '{{count}} lotes de stock adicionados com sucesso!',
    supplier: {
      sectionTitle: 'Fornecedor deste Lote',
      nameLabel: 'Nome do Fornecedor',
      namePlaceholder: 'Ex.: Distribuidora Central',
      phoneLabel: 'Telefone (opcional)',
      phonePlaceholder: 'Ex.: 84 000 0000',
      notesLabel: 'Notas do Lote (opcional)',
      notesPlaceholder: 'Ex.: Compra à vista, entrega parcial...',
      unspecifiedHint: 'Se não indicar um fornecedor, este lote será guardado como "Fornecedor Não Especificado".',
      creditCheckboxLabel: 'Esta compra foi feita a crédito do fornecedor (ainda não paga)',
      outstandingBalanceWarning: 'Este fornecedor já tem {{amount}} em dívidas por pagar.',
      searchPlaceholder: 'Pesquisar/criar fornecedor...',
      existingTag: 'Existente',
      createNewShort: '+ Criar "{{name}}"',
      selectedHint: 'Fornecedor existente selecionado — para alterar os dados deste fornecedor, use "Trocar Fornecedor".',
      changeSupplier: 'Trocar Fornecedor',
    },
    table: {
      batch: 'Lote',
      product: 'Produto',
      dateEntered: 'Data Entrada',
      quantity: 'Qtd',
      unit: 'Unid',
      buyPrice: 'Compra',
      sellPrice: 'Venda',
      estProfit: 'Lucro Est.',
      action: 'Ação',
    },
    productSearchPlaceholder: 'Pesquisar/criar produto...',
    existingTag: 'Existente',
    // [Feature — "did you mean an existing product?"] Deliberately
    // distinct wording/color from existingTag above — this is a
    // forgiving similarity guess (productNameSimilarity.ts), never a
    // confirmed match, and must never look like one.
    maybeTag: 'Talvez',
    similarProduct: {
      warning: 'Este nome não corresponde exatamente a nenhum produto — pode ser um destes já existentes?',
    },
    createNew: '+ Criar novo produto "{{name}}"',
    createNewShort: '+ Criar "{{name}}"',
    unitSuggestionsTitle: 'Sugestões de unidades',
    unitSuggestionsLabel: 'Unidades:',
    unitOutsideRelationshipWarning:
      'Esta unidade não faz parte da relação de unidades confirmada deste produto — o preço não foi alterado; confirme ou ajuste manualmente.',
    priceDeviationWarningAbove:
      'Este preço é {{percent}}% acima do último preço registado para este produto — confirme que não é um erro de digitação.',
    priceDeviationWarningBelow:
      'Este preço é {{percent}}% abaixo do último preço registado para este produto — confirme que não é um erro de digitação.',
    totalProfitTitle: 'Lucro Total: {{value}}',
    estProfitMobile: 'Lucro Est: {{value}}',
    removeBatch: 'Remover este lote',
    removeRowConfirm: 'Remover esta linha? Os dados já preenchidos (produto, quantidade, preços) serão perdidos.',
    addAnotherProduct: '+ Adicionar outro produto',
    summary: {
      titleOne: 'Resumo ({{count}} lote)',
      titleOther: 'Resumo ({{count}} lotes)',
      totalInvestment: 'Investimento Total:',
      marketValue: 'Valor de Mercado:',
      embeddedProfit: 'Lucro Embutido:',
    },
    autoCloseNotice: 'Ao guardar, o lote ativo anterior de cada produto selecionado será automaticamente fechado.',
    submitOne: 'Guardar Lote e Ativar Stock',
    submitMultiple: 'Guardar {{count}} Lotes e Ativar Stock',
    fields: {
      costPrice: 'Custo ({{symbol}})',
      sellPrice: 'Venda ({{symbol}})',
    },
    errors: {
      missingName: 'Por favor introduza o nome do produto no Lote #{{n}}.',
      invalidQty: 'Por favor introduza uma quantidade maior que zero no Lote #{{n}} ({{name}}).',
      invalidPrice: 'Por favor introduza preços válidos no Lote #{{n}} ({{name}}).',
    },
    draft: {
      savingIndicator: 'A guardar rascunho...',
      savedIndicator: 'Rascunho guardado',
      saveErrorIndicator: 'Falha ao guardar — não sincronizado com outros dispositivos',
      retryButton: 'Tentar novamente',
      restoredNotice: 'Continuou uma compra em curso — os produtos já guardados foram restaurados.',
      discardButton: 'Descartar Rascunho',
      discardConfirm: 'Tem a certeza que quer descartar este rascunho? Os produtos já guardados serão perdidos.',
      conflictTitle: 'Este rascunho foi editado noutro dispositivo',
      conflictBody: 'Enquanto editava aqui, alguém guardou uma versão diferente deste rascunho noutro dispositivo. Se continuar aqui, a sua próxima gravação irá substituir essa versão.',
      conflictUseTheirs: 'Usar a versão mais recente',
      conflictKeepMine: 'Manter as minhas alterações',
    },
    event: {
      addAnotherSupplier: 'Adicionar Outro Fornecedor a Esta Compra',
    },
    restockObservation: {
      label: 'Stock restante antes desta reposição',
      optional: 'opcional',
      placeholder: 'Ex.: 8',
      dontKnow: 'Não sei',
      helperText: 'Isto ajuda a entender o movimento de stock entre reposições. Não representa vendas — pode incluir vendas, quebras, uso interno ou outras saídas.',
    },
    smartEntry: {
      title: 'Adicionar Documento de Compra',
      subtitle: 'Tire uma foto ou carregue um recibo/fatura para preencher esta entrada automaticamente.',
      takePictureButton: 'Tirar Foto',
      uploadButton: 'Carregar Documento',
      processing: 'A analisar documento...',
      rejectScan: 'Rejeitar digitalização',
      noConfidentMatch: 'Não foi possível confirmar o produto — escolha um existente ou crie um novo',
      sellingPriceFromMemory: 'Preço da memória do produto — confirme ou ajuste',
      sellingPriceNotFound: 'Sem preço memorizado para esta unidade — indique o preço',
      fields: {
        product: 'Produto',
        quantity: 'Quantidade',
        unit: 'Unidade',
        costPrice: 'Preço de Compra',
      },
      errors: {
        invalid_upload: 'Não foi possível ler o ficheiro enviado. Tente novamente ou continue manualmente.',
        too_large: 'A imagem é demasiado grande. Tente uma foto mais pequena ou continue manualmente.',
        unsupported_type: 'Este tipo de ficheiro não é suportado. Use uma foto JPEG, PNG ou WebP, ou continue manualmente.',
        provider_unavailable: 'A digitalização não está disponível neste momento. Pode continuar a adicionar o stock manualmente.',
        unreadable: 'Não conseguimos ler este documento com confiança. Pode continuar a adicionar o stock manualmente.',
        network_error: 'Sem ligação ao servidor. Verifique a sua internet ou continue manualmente.',
      },
    },
    supplierWording: {
      candidateTitle: 'Este pode ser um produto já existente',
      candidateHint: 'O fornecedor pode usar um nome diferente para um produto que já tem no catálogo. Confirme se é o mesmo produto:',
      confirmButton: 'Sim, é o mesmo produto',
      noneOfTheseButton: 'Não, é um produto novo',
      reusedNotice: 'Reconhecido automaticamente como um produto já existente, com base numa correspondência anterior confirmada para este fornecedor.',
      conflictWarning: 'Este nome já está associado a outro produto. Se confirmar que é diferente, explique o que os distingue.',
      distinguishingInfoLabel: 'O que torna este produto diferente?',
      distinguishingInfoPlaceholder: 'Ex.: embalagem de 500g em vez de 400g',
      distinguishingInfoRequiredError: 'Explique o que torna este produto diferente antes de continuar (linha {n}).',
      unresolvedCandidatesError: 'Resolva a correspondência de produto sugerida antes de continuar (linha {n}).',
      grounds: {
        initialStockName: 'Nome igual ao do catálogo',
        existingAlternativeWording: 'Nome já associado a este produto',
        unitSpellingEquivalence: 'Mesma quantidade, unidade escrita de forma diferente',
        characterSpellingVariation: 'Ortografia parecida',
        abbreviationMatch: 'Forma abreviada conhecida',
        synonymMatch: 'Nome alternativo conhecido',
        translationMatch: 'Tradução conhecida',
        semanticMatch: 'Sugestão do assistente inteligente',
      },
      contradictionNotShownNotice: 'Não mostrado: as quantidades/tamanhos parecem diferentes.',
    },
    sequencing: {
      resolveBeforeReview: 'Resolva a linha {n} de {total} antes de rever o recibo completo.',
    },
  },
  addQuebra: {
    title: 'Registar Perda de Stock (Quebra)',
    subtitle: 'Registe produtos estragados, partidos ou fora de validade associados a um lote de stock.',
    registeredTitle: 'Quebra Registada!',
    successMessageOne: 'Registada perda de {{count}} unidade no lote.',
    successMessageOther: 'Registada perda de {{count}} unidades no lote.',
    emptyState: 'Nenhum produto cadastrado. Adicione primeiro um lote de stock antes de registar quebras.',
    loadingAfterShopSwitch: 'A atualizar dados da loja...',
    selectProduct: 'Selecionar Produto',
    selectBatch: 'Selecionar Lote',
    noBatchesForProduct: 'Nenhum lote de stock registado para este produto.',
    qtyLabel: 'Qtd',
    batchStatusOpen: '🟢 Lote Aberto Ativo',
    batchStatusClosed: '🔒 Lote Fechado',
    lossDate: 'Data da Perda',
    lossQuantity: 'Quantidade Perdida (Unidades)',
    warningTitle: '⚠️ AVISO: Perda Excessiva',
    warningBody: 'A quantidade de perda de <strong>{{qty}} unidades</strong> excede o stock restante deste lote (<strong>{{remaining}} unidades</strong>). Pode registar esta entrada, mas um aviso será assinalado nos relatórios.',
    currentBatchStock: 'Stock Atual do Lote',
    stockAfterLoss: 'Stock Após Perda',
    lostCostValue: 'Valor do Custo Perdido',
    unitsValue: '{{qty}} unidades',
    reasonLabel: 'Motivo da Perda',
    reasonPlaceholder: 'ex.: Fora do prazo, embalagem danificada, caiu no transporte...',
    quickSuggestions: 'Sugestões Rápidas:',
    reasons: {
      expired: 'Fora do prazo',
      broken: 'Partida / Danificada',
      packagingDamaged: 'Embalagem estragada / Fuga',
      transportLoss: 'Perda no transporte',
      spoiledMold: 'Produto estragado / Mofo',
      customerSample: 'Amostra / Oferta ao cliente',
    },
    submitButton: 'Registar Entrada de Quebra',
    errors: {
      selectProductBatch: 'Por favor selecione um produto e um lote.',
      invalidQuantity: 'Por favor introduza uma quantidade de perda válida superior a 0.',
      missingReason: 'Por favor indique um motivo para a perda (ex.: Fora do prazo, Danificada, etc.).',
    },
  },
  addExpense: {
    title: 'Registar Despesa',
    subtitle: 'Registe custos do negócio como renda, água/luz, transporte ou outras despesas operacionais.',
    registeredTitle: 'Despesa Registada!',
    successMessage: 'Registada despesa de {{amount}}.',
    descriptionLabel: 'Descrição da Despesa',
    descriptionPlaceholder: 'ex.: Renda da loja, Conta de luz, Combustível...',
    expenseDate: 'Data da Despesa',
    amountLabel: 'Valor ({{symbol}})',
    categoryLabel: 'Categoria (opcional)',
    categoryPlaceholder: 'ex.: Renda, Água/Luz, Transporte...',
    quickSuggestions: 'Sugestões Rápidas:',
    categories: {
      rent: 'Renda',
      utilities: 'Água / Luz',
      transport: 'Transporte',
      salaries: 'Salários',
      maintenance: 'Manutenção',
      other: 'Outro',
    },
    submitButton: 'Registar Despesa',
    errors: {
      missingDescription: 'Por favor descreva a despesa (ex.: Renda da loja, Conta de luz...).',
      invalidAmount: 'Por favor introduza um valor válido superior a 0.',
    },
  },
  addWithdrawal: {
    title: 'Registar Levantamento do Dono',
    subtitle: 'Dinheiro retirado do negócio para uso pessoal, salário, família, ou outra necessidade.',
    registeredTitle: 'Levantamento Registado!',
    successMessage: 'Levantamento de {{amount}} registado.',
    infoNote: 'Um levantamento <strong>não é uma despesa</strong> do negócio — é capital que sai do negócio para o dono. Reduz o Capital Disponível, mas não afeta o cálculo de lucro operacional.',
    withdrawalDate: 'Data do Levantamento',
    amountLabel: 'Valor ({{symbol}})',
    reasonLabel: 'Motivo (opcional)',
    reasonPlaceholder: 'ex.: Uso Pessoal, Salário, Família...',
    quickSuggestions: 'Sugestões Rápidas:',
    reasons: {
      personalUse: 'Uso Pessoal',
      salary: 'Salário',
      family: 'Família',
      emergency: 'Emergência',
      home: 'Casa',
      vehicle: 'Veículo',
      other: 'Outro',
    },
    notesLabel: 'Notas (opcional)',
    notesPlaceholder: 'Detalhes adicionais sobre este levantamento...',
    submitButton: 'Registar Levantamento',
    errors: {
      invalidAmount: 'Por favor introduza um valor válido superior a 0.',
    },
  },
  declareWorth: {
    title: 'Declarar Valor do Negócio',
    subtitle: 'Já sabe quanto vale o seu negócio? Declare o valor diretamente, sem precisar de fazer uma Contagem física.',
    infoNote: 'Esta declaração estabelece o Valor do Negócio com o mesmo peso de uma Contagem — mas, ao contrário de uma Contagem, não terá um detalhe de stock, lucro embutido ou posição de caixa associado, porque nenhuma medição física foi feita.',
    dateLabel: 'Data da Declaração',
    amountLabel: 'Valor Declarado ({{symbol}})',
    submitButton: 'Declarar Valor do Negócio',
    registeredTitle: 'Valor do Negócio Declarado!',
    successMessage: 'Valor do Negócio de {{amount}} declarado com sucesso.',
    currentValueLabel: 'Valor do Negócio Atual',
    currentValueUnknownNote: 'Ainda não há um Valor do Negócio registado para comparar.',
    reviewButton: 'Rever Declaração',
    reviewTitle: 'Reveja antes de confirmar',
    reviewSubtitle: 'Esta declaração substitui o Valor do Negócio atual assim que confirmada.',
    reviewAmountLabel: 'Valor a Declarar',
    reviewCurrentLabel: 'Valor Atual',
    reviewDifferenceLabel: 'Diferença',
    deviationWarningAbove: 'Este valor é {{percent}}% acima do Valor do Negócio atual — confirme que é isto que pretende declarar antes de continuar.',
    deviationWarningBelow: 'Este valor é {{percent}}% abaixo do Valor do Negócio atual — confirme que é isto que pretende declarar antes de continuar.',
    backButton: 'Voltar e Corrigir',
    errors: {
      invalidAmount: 'Por favor introduza um valor válido superior a 0.',
      generic: 'Erro ao declarar o Valor do Negócio.',
    },
  },
  stocksView: {
    title: 'Histórico de Lotes — Registo de Investimento',
    subtitle: 'Cada compra de stock é um investimento. Reveja cada lote, o seu fornecedor, valor investido e lucro embutido.',
    legacySupplierName: 'Histórico (Pré-Atualização)',
    remainingInvestment: 'Investimento Restante',
    marketValue: 'Valor de Mercado',
    remainingEmbeddedProfit: 'Lucro Embutido Restante',
    searchPlaceholder: 'Pesquisar por nº de lote, fornecedor ou produto...',
    allSuppliers: 'Todos os Fornecedores',
    allStatuses: 'Todos os Estados',
    showArchived: 'Mostrar lotes arquivados',
    groupByEvent: 'Agrupar por Evento de Compra',
    emptyState: 'Nenhum lote encontrado com os filtros atuais.',
    legacyBadge: 'Legado',
    productCountOne: '{{count}} produto',
    productCountOther: '{{count}} produtos',
    invested: 'Investido',
    market: 'Mercado',
    embeddedProfit: 'Lucro Embutido',
    event: {
      batchCountOne: '· {{count}} lote',
      batchCountOther: '· {{count}} lotes',
    },
    modal: {
      supplier: 'Fornecedor',
      createdBy: 'Criado Por',
      notes: 'Notas',
      totalInvestment: 'Investimento Total',
      marketValue: 'Valor de Mercado',
      embeddedProfit: 'Lucro Embutido',
      remainingInvestment: 'Invest. Restante',
      remainingMarket: 'Mercado Restante',
      remainingProfit: 'Lucro Restante',
      inventoryLostWarning: 'Inventário perdido (quebras) neste lote: {{value}}',
      productsHeading: 'Produtos',
      table: {
        product: 'Produto',
        qtyRemaining: 'Qtd (Rest.)',
        costSell: 'Custo / Venda',
        remainingInvestment: 'Invest. Restante',
        embeddedProfit: 'Lucro Embutido',
        statusPrefix: 'Status:',
      },
      productRemoved: 'Produto Removido',
      timelineHeading: 'Linha do Tempo',
      reactivateBatch: 'Reativar Lote',
      archiveBatch: 'Arquivar Lote',
      generatingPdf: 'A gerar PDF...',
      exportPdf: 'Exportar PDF',
      close: 'Fechar',
    },
  },
  reports: {
    home: {
      title: 'Centro de Inteligência de Negócio',
      subtitle: 'Escolha uma categoria para entender melhor o seu negócio — não apenas números, mas o que eles significam.',
      embeddedProfitLabel: 'Lucro Embutido',
      embeddedProfitHint: 'Lucro que já está dentro do stock que ainda não vendeu — a diferença entre o valor de mercado e o que custou.',
      embeddedProfitDescription: 'Lucro do stock comprado em cada período (ex: últimos 30 dias)',
      footerNote: 'Estes relatórios ajudam a tomar decisões melhores e a crescer com segurança. Dados atualizados em tempo real com base nas suas operações.',
    },
    categories: {
      businessWorth: {
        title: 'Valor do Negócio',
        description: 'Quanto vale o negócio hoje: capital, inventário, lucro embutido, despesas e retiradas.',
      },
      inventoryValuation: {
        title: 'Inventário',
        description: 'Quanto inventário existe, o seu valor de custo e de mercado, agrupado por fornecedor, lote ou produto.',
      },
      batchPerformance: {
        title: 'Desempenho de Lotes',
        description: 'Lucro do stock comprado em cada período (ex: últimos 30 dias) — e procure qualquer lote ou produto a qualquer momento.',
      },
      capitalGrowth: {
        title: 'Crescimento de Capital',
        description: 'Como o capital do negócio evoluiu desde o capital inicial até hoje.',
      },
      expenses: {
        title: 'Despesas',
        description: 'Para onde vai o dinheiro: despesas agrupadas por categoria, mês e ano.',
      },
      withdrawals: {
        title: 'Retiradas do Proprietário',
        description: 'Quanto o proprietário retirou do negócio, quando e para quê.',
      },
      inventoryLosses: {
        title: 'Perdas de Inventário',
        description: 'Onde o negócio está a perder dinheiro: quebras por produto, motivo e período.',
      },
      stockVerification: {
        title: 'Contagens de Stock',
        description: 'Cada recontagem física de stock: o que mudou entre uma contagem e a seguinte.',
      },
    },
    common: {
      backTooltip: 'Voltar aos Relatórios',
      pdf: 'PDF',
      excel: 'Excel',
      print: 'Imprimir',
      filters: 'Filtros',
      thisWeek: 'Esta Semana',
      thisMonth: 'Este Mês',
      last30Days: 'Últimos 30 Dias',
      allTime: 'Desde Sempre',
      startDate: 'Data Inicial',
      endDate: 'Data Final',
      indicator: 'Indicador',
      value: 'Valor',
      summary: 'Resumo',
      tableFallback: 'Tabela {{n}}',
      dateCol: 'Data',
      descriptionCol: 'Descrição',
      categoryCol: 'Categoria',
      reasonCol: 'Motivo',
      totalCol: 'Total',
      generalCategory: 'Geral',
      unspecified: 'Não especificado',
      notDefined: 'Não definido',
      insufficientTrendData: 'É necessário mais do que um ponto no tempo para desenhar uma tendência.',
      insufficientChartData: 'Sem dados suficientes para este gráfico.',
      trendIncreased: 'aumentou',
      trendDecreased: 'diminuiu',
      trendSentence: '{{label}} {{direction}} {{pct}}% em relação ao período anterior ({{previous}} → {{current}}).',
      concentrationSingle: '{{label}} representa {{pct}}% do total.',
      concentrationMultiple: '{{count}} {{entityLabelPlural}} representam {{pct}}% do total.',
      shareOf: '{{part}} corresponde a {{pct}}% de {{whole}}.',
      statusActive: 'Ativo',
      statusPartiallyRemaining: 'Parcialmente Restante',
      statusFullyConsumed: 'Totalmente Consumido',
      statusArchived: 'Arquivado',
      delete: 'Eliminar',
      locked: 'Bloqueado — reabra o período para editar',
    },
    businessWorth: {
    title: 'Valor do Negócio',
    description: 'Uma fotografia honesta do que o negócio vale hoje.',
    snapshotAt: 'Instantâneo a {{date}}',
    kpiInitialCapitalFull: 'Capital Inicial do Negócio',
    kpiInitialCapital: 'Capital Inicial',
    kpiInventoryCostFull: 'Custo do Inventário Atual',
    kpiInventoryCost: 'Custo do Inventário',
    kpiMarketValueFull: 'Valor de Mercado do Inventário Atual',
    kpiMarketValue: 'Valor de Mercado',
    kpiEmbeddedProfit: 'Lucro Embutido',
    kpiInventoryLossesFull: 'Perdas de Inventário (Quebras, a custo)',
    kpiInventoryLossesExcel: 'Perdas de Inventário (a custo)',
    kpiInventoryLosses: 'Perdas de Inventário',
    kpiTotalExpenses: 'Despesas Totais',
    kpiTotalWithdrawalsFull: 'Retiradas Totais do Proprietário',
    kpiTotalWithdrawals: 'Retiradas Totais',
    kpiBusinessWorth: 'Valor do Negócio',
    kpiBusinessWorthEstimated: 'Valor do Negócio (Estimado)',
    kpiCapitalGrowth: 'Crescimento de Capital',
    heroLabel: 'Valor Atual do Negócio',
    heroLabelEstimated: 'Valor do Negócio (Estimado)',
    heroSinceInitial: 'desde o capital inicial',
    heroNoInitialCount: 'Registe uma Contagem Inicial de Stock para medir o crescimento.',
    compositionTitle: 'Como o Valor do Negócio é Composto',
    compositionNote: 'Valor de Mercado do Inventário = Custo + Lucro Embutido. Despesas e retiradas já reduzem o Valor do Negócio, mas não fazem parte do inventário em si.',
    expensesInPeriod: 'Despesas no Período',
    expensesInPeriodRange: 'Despesas no Período ({{start}} — {{end}})',
    noExpensesInPeriod: 'Nenhuma despesa registada neste período.',
    withdrawalsInPeriod: 'Retiradas no Período',
    withdrawalsInPeriodRange: 'Retiradas no Período ({{start}} — {{end}})',
    noWithdrawalsInPeriod: 'Nenhuma retirada registada neste período.',
    insightGrew: 'O negócio cresceu {{amount}} ({{pct}}%) desde o capital inicial.',
    insightShrank: 'O negócio reduziu {{amount}} ({{pct}}%) desde o capital inicial.',
    insightNoInitialCount: 'Ainda não foi registada uma Contagem Inicial de Stock, por isso o crescimento de capital não pode ser medido.',
    insightEmbeddedProfitShare: '{{pct}}% do valor de mercado do inventário atual é lucro embutido ainda não realizado.',
    insightLossesCost: 'As quebras já custaram {{amount}}, cerca de {{pct}}% do valor investido em stock.',
    },
    inventoryValuation: {
      title: 'Avaliação de Inventário',
      description: 'Quanto inventário existe hoje e o que vale.',
      groupedBy: 'Agrupado por {{group}}',
      kpiInventoryCost: 'Custo do Inventário',
      kpiInventoryCostFull: 'Custo do Inventário Atual',
      kpiMarketValue: 'Valor de Mercado',
      kpiMarketValueFull: 'Valor de Mercado Atual',
      kpiEmbeddedProfit: 'Lucro Embutido',
      kpiAvgMargin: 'Margem Média',
      kpiAvgMarginFull: 'Margem Média Ponderada',
      kpiNumProducts: 'Número de Produtos',
      kpiNumProductsFull: 'Número de Produtos',
      kpiActiveBatches: 'Lotes Ativos',
      kpiActiveBatchesFull: 'Lotes Ativos',
      kpiHighestValueProduct: 'Produto de Maior Valor',
      kpiHighestValueProductFull: 'Produto de Maior Valor',
      kpiLowestValueProduct: 'Produto de Menor Valor',
      kpiLowestValueProductFull: 'Produto de Menor Valor',
      inventoryByGroup: 'Inventário por {{group}}',
      byGroup: 'Por {{group}}',
      detail: 'Detalhe',
      noInventory: 'Sem inventário registado ainda.',
      noDataToShow: 'Sem dados para mostrar.',
      colInvestment: 'Valor de Investimento',
      colMarket: 'Valor de Mercado',
      colEmbeddedProfit: 'Lucro Embutido',
      groupSupplier: 'Fornecedor',
      groupBatch: 'Lote',
      groupBatchFull: 'Lote de Compra',
      groupProduct: 'Produto',
      entitySuppliersPlural: 'fornecedores',
      entityBatchesPlural: 'lotes',
      entityProductsPlural: 'produtos',
      removedProduct: 'Produto Removido',
      unspecifiedSupplier: 'Fornecedor Não Especificado',
      noPurchaseBatch: 'Sem Lote ({{date}})',
      insightHighestValue: '{{name}} é o produto de maior valor em stock, com {{value}} em valor de mercado.',
      insightAvgMargin: 'A margem média ponderada do inventário atual é de {{pct}}%.',
    },
    batchPerformance: {
      title: 'Desempenho de Lotes',
      description: 'Lucro gerado pelo stock comprado em cada período — e o histórico completo de cada lote, para consultar quando quiser.',
      periodRange: '{{start}} — {{end}}',
      kpiBatchesInPeriod: 'Lotes no Período',
      kpiTotalInvestment: 'Investimento Total',
      kpiRemainingInventory: 'Inventário Restante',
      kpiRemainingProfit: 'Lucro Embutido Restante',
      searchTitle: 'Procurar um Lote ou Produto',
      searchPlaceholder: 'Nº do lote, fornecedor ou nome do produto (ex: BAT-000004, Arroz)',
      searchHint: 'Pesquisa em todos os lotes de sempre, independentemente do período abaixo — para consultar qualquer entrada de stock a qualquer momento.',
      searchNoResults: 'Nenhum lote encontrado para essa pesquisa.',
      colBatch: 'Lote',
      colDate: 'Data',
      colSupplier: 'Fornecedor',
      colProducts: 'Produtos',
      colInvestment: 'Investimento',
      colMarketValue: 'Valor de Mercado',
      colEmbeddedProfit: 'Lucro Embutido',
      colRemainingInventory: 'Inventário Restante',
      colRemainingProfit: 'Lucro Restante',
      colStatus: 'Estado',
      supplierLabel: 'Fornecedor',
      allSuppliers: 'Todos',
      remainingProfitByBatch: 'Lucro Embutido Restante por Lote',
      sortHighestProfit: 'Maior Lucro',
      sortHighestInvestment: 'Maior Investimento',
      sortNewest: 'Mais Recente',
      sortOldest: 'Mais Antigo',
      noBatchesInPeriod: 'Nenhum lote de compra neste período.',
      allBatches: 'Todos os Lotes',
      insightTopBatch: '{{batch}} ({{date}}, {{supplier}}) tem o maior lucro embutido restante: {{value}}.',
      insightExcludesInitialCapital: 'Este total refere-se apenas a lotes de stock comprados no período selecionado — o Capital Inicial fica de fora e nunca entra nesta soma.',
    },
    capitalGrowth: {
      title: 'Crescimento de Capital',
      description: 'Como o negócio evoluiu desde o capital inicial.',
      evolutionSince: 'Evolução desde o capital inicial',
      kpiInitialCapital: 'Capital Inicial',
      kpiCurrentCapital: 'Valor Atual do Negócio',
      kpiCurrentCapitalFull: 'Valor Atual do Negócio',
      kpiCurrentCapitalEstimated: 'Valor do Negócio (Estimado)',
      kpiCurrentCapitalFullEstimated: 'Valor do Negócio (Estimado)',
      kpiIncrease: 'Aumento',
      kpiGrowthPct: 'Crescimento %',
      timelineInitialCapitalLabel: 'Capital Inicial',
      timelineTodayLabel: 'Hoje',
      timelineTitlePdf: 'Linha do Tempo (Fechos de Período)',
      timelineTitleExcel: 'Linha do Tempo',
      colDate: 'Data',
      colPeriod: 'Período',
      colBusinessWorth: 'Valor do Negócio',
      monthlyGrowthLabel: 'Crescimento Mensal ({{period}})',
      yearlyGrowthLabel: 'Crescimento Anual ({{period}})',
      businessWorthTimelineTitle: 'Linha do Tempo do Valor do Negócio',
      noTimelineData: 'Registe a Contagem Inicial de Stock e feche pelo menos um período para ver a linha do tempo.',
      closingsHistoryTitle: 'Histórico de Fechos',
      noClosings: 'Nenhum período fechado ainda.',
      colClosingDate: 'Data de Fecho',
      colEmbeddedProfit: 'Lucro Embutido',
      colExpenses: 'Despesas',
      colWithdrawals: 'Retiradas',
      insightNoInitialCount: 'Registe uma Contagem Inicial de Stock para começar a medir o crescimento de capital.',
      insightGrew: 'O negócio cresceu de forma constante: {{amount}} ({{pct}}%) desde o início.',
      insightShrank: 'O valor do negócio está {{amount}} ({{pct}}%) abaixo do capital inicial.',
      insightNoClosings: 'Ainda não foram registados fechos mensais ou anuais — feche um período para acompanhar a evolução ao longo do tempo.',
      insightLastMonthlyChangeUp: 'No fecho mais recente ({{period}}), o Valor do Negócio aumentou {{pct}}%.',
      insightLastMonthlyChangeDown: 'No fecho mais recente ({{period}}), o Valor do Negócio diminuiu {{pct}}%.',
    },
    expenses: {
      title: 'Relatório de Despesas',
      description: 'Para onde vai o dinheiro do negócio.',
      kpiTotal: 'Despesas Totais',
      kpiTotalFull: 'Despesas Totais',
      kpiAvgMonthly: 'Média Mensal',
      kpiLargestCategory: 'Maior Categoria',
      kpiCount: 'Nº de Despesas',
      kpiCountFull: 'Número de Despesas',
      groupCategory: 'Categoria',
      groupMonth: 'Mês',
      groupYear: 'Ano',
      sectionByGroupTitle: 'Despesas por {{group}}',
      allExpensesTitle: 'Todas as Despesas',
      allExpensesCount: 'Todas as Despesas ({{count}})',
      emptyMessage: 'Nenhuma despesa registada neste período.',
      insightTopCategory: '"{{label}}" é a maior categoria de despesa, representando {{pct}}% do total.',
      insightMonthlyChangeUp: 'As despesas em {{month}} aumentaram {{pct}}% em relação a {{prevMonth}}.',
      insightMonthlyChangeDown: 'As despesas em {{month}} diminuíram {{pct}}% em relação a {{prevMonth}}.',
    },
    withdrawals: {
      title: 'Retiradas do Proprietário',
      description: 'Quanto o proprietário retirou do negócio e para quê.',
      kpiTotal: 'Retiradas Totais',
      kpiTotalFull: 'Retiradas Totais',
      kpiTopReason: 'Motivo Mais Comum',
      kpiCount: 'Nº de Retiradas',
      kpiCountFull: 'Número de Retiradas',
      groupMonth: 'Mês',
      groupReason: 'Motivo',
      sectionByGroupTitle: 'Retiradas por {{group}}',
      allWithdrawalsTitle: 'Todas as Retiradas',
      timelineTitle: 'Linha do Tempo ({{count}})',
      emptyMessage: 'Nenhuma retirada registada neste período.',
      insightTopReason: '"{{label}}" é o motivo mais comum de retirada, representando {{pct}}% do total retirado.',
    },
    inventoryLosses: {
      title: 'Perdas de Inventário',
      description: 'Onde o negócio está a perder dinheiro em stock.',
      kpiTotalLost: 'Valor Total Perdido',
      kpiUnitsLost: 'Unidades Perdidas',
      kpiProductsAffected: 'Produtos Afetados',
      kpiLargestLoss: 'Maior Perda Individual',
      groupProduct: 'Produto',
      groupReason: 'Motivo',
      groupMonth: 'Mês',
      sectionByGroupTitle: 'Perdas por {{group}}',
      allLossesTitle: 'Todas as Perdas',
      allLossesCount: 'Todas as Perdas ({{count}})',
      emptyMessage: 'Nenhuma perda registada neste período.',
      productRemoved: 'Produto Removido',
      unitsSuffix: 'unidades',
      colQuantity: 'Quantidade',
      colValueLost: 'Valor Perdido',
      insightLargestLoss: 'A maior perda individual foi {{amount}} em {{product}} ({{date}}).',
    },
    stockVerification: {
      title: 'Verificação de Stock',
      description: 'O que mudou entre cada recontagem física e a anterior.',
      typeInitial: 'Inicial',
      typeWeekly: 'Semanal',
      typeMonthly: 'Mensal',
      typeQuarterly: 'Trimestral',
      typeYearly: 'Anual',
      typeCustom: 'Personalizada',
      kpiBefore: 'Inventário Antes',
      kpiAfter: 'Inventário Depois',
      kpiFinancialImpact: 'Impacto Financeiro',
      kpiProductsAdjusted: 'Produtos Ajustados',
      historyTitle: 'Histórico de Verificações ({{count}})',
      colType: 'Tipo',
      colProductsCounted: 'Produtos Contados',
      colProductsAdjusted: 'Produtos Ajustados',
      colBefore: 'Antes',
      colAfter: 'Depois',
      colImpact: 'Impacto',
      diffTableTitle: 'Diferenças por Produto — {{date}}',
      colProduct: 'Produto',
      colDiffQty: 'Diferença (Qtd)',
      colDiffValue: 'Diferença (Valor)',
      itemsCountedLabel: '{{items}} produtos contados · {{adjusted}} ajustados',
      noStockCountsMessage: 'Nenhuma contagem de stock registada ainda.',
      noComparisonMessage: 'Registe uma nova recontagem para comparar com a Contagem Inicial.',
      insightNoCounts: 'Ainda não foi registada nenhuma contagem de stock.',
      insightOnlyInitial: 'Apenas a Contagem Inicial foi registada. Faça uma nova recontagem para ver comparações.',
      insightLatestAdjusted: 'Na verificação mais recente ({{date}}), {{adjusted}} de {{total}} produtos tiveram a quantidade ajustada.',
      insightValueUp: 'O valor do inventário aumentou {{amount}} desde a contagem anterior.',
      insightValueDown: 'O valor do inventário diminuiu {{amount}} desde a contagem anterior.',
    },
  },
  subscription: {
    banner: {
      trialActive: {
        title: 'Período experimental ativo',
        daysRemaining: 'Dias restantes: {{days}}',
        endsOn: 'O período experimental termina a {{date}}',
        subscribeButton: 'Subscrever',
      },
      gracePeriod: {
        title: 'A sua subscrição precisa de atenção',
        daysRemaining: 'Período de tolerância restante: {{days}} dias',
        subscribeButton: 'Subscrever',
      },
      expired: {
        title: 'O seu negócio está atualmente em modo só de leitura',
        contactButton: 'Contactar Suporte',
      },
    },
    businessSuspension: {
      banner: {
        title: 'Este negócio foi suspenso',
        message: 'O acesso aos dados e operações deste negócio está temporariamente indisponível.',
        contactHint: 'Contacte o suporte Sabush para mais informações.',
      },
    },
    blockedNotice: {
      title: 'Novos registos estão pausados',
      trialCompletedMessage: 'O seu período experimental terminou. Os seus dados e histórico continuam disponíveis, mas não é possível criar novos registos até subscrever um plano.',
      expiredMessage: 'A sua subscrição expirou. Os seus dados e histórico continuam disponíveis, mas não é possível criar novos registos até renovar a subscrição.',
      contactButton: 'Contactar Suporte',
    },
    contactModal: {
      title: 'Subscrever o Sabush BPT',
      message: 'Para ativar ou renovar a sua subscrição, contacte a equipa Sabush BPT. Em breve poderá subscrever diretamente na aplicação.',
      closeButton: 'Fechar',
    },
    paymentMethods: {
      mpesa: { label: 'M-Pesa' },
      emola: { label: 'e-Mola' },
      bim: { label: 'Millennium BIM' },
    },
    subscribe: {
      title: 'Subscrever o Sabush BPT',
      priceLabel: 'por mês',
      chooseMethod: 'Escolha um método de pagamento',
      payTo: 'Pague para:',
      referenceLabel: 'Referência do pagamento / ID da transação',
      referencePlaceholder: 'Ex: QGH7X2K9P1',
      notesLabel: 'Notas (opcional)',
      submitButton: 'Submeter pagamento',
      submitting: 'A submeter…',
      pendingTitle: 'Pagamento em análise',
      pendingMessage: 'Recebemos a sua referência de pagamento. A nossa equipa vai confirmar e a sua subscrição será ativada em breve.',
      pendingMethod: 'Método',
      pendingReference: 'Referência',
      pendingSubmittedAt: 'Submetido em',
      rejectedTitle: 'O pagamento anterior não foi confirmado',
      rejectedRetryHint: 'Verifique os dados e submeta novamente, ou contacte o suporte se o pagamento foi efetuado corretamente.',
      errorMissingMethod: 'Escolha um método de pagamento.',
      errorMissingReference: 'Indique a referência do pagamento.',
      errorGeneric: 'Não foi possível submeter o pagamento. Tente novamente.',
    },
  },
  notificationTemplates: {
    trial: {
      endingSoon: {
        whatHappened: 'O seu período experimental termina em 7 dias.',
        whyItMatters: 'Escolha um plano para continuar a utilizar o Sabush BPT sem interrupções.',
        recommendedAction: 'Reveja os planos disponíveis.',
      },
      endingTomorrow: {
        whatHappened: 'O seu período experimental termina amanhã.',
        whyItMatters: 'Após o término, escolha um plano para continuar a utilizar o Sabush BPT sem interrupções.',
        recommendedAction: 'Escolha o seu plano agora.',
      },
    },
    closing: {
      approaching: {
        whatHappened: 'A data de Fecho do seu período atual aproxima-se dentro de poucos dias.',
        whyItMatters: 'Fechar o período regista os valores do seu negócio até esta data — lucro embutido, despesas e retiradas.',
        recommendedAction: 'Reveja os seus valores antes de fechar o período.',
      },
      due: {
        whatHappened: 'O seu período atual atingiu a data de Fecho.',
        whyItMatters: 'Nada se perde se fechar um pouco mais tarde, mas quanto mais cedo fechar, mais cedo o próximo período começa organizado.',
        recommendedAction: 'Feche o período quando estiver pronto.',
      },
      overdue: {
        whatHappened: 'A data de Fecho do seu período atual já passou e o período continua aberto.',
        whyItMatters: 'Um período aberto significa que novos registos continuam a entrar nele em vez de um período novo — fechá-lo regista os valores de hoje como histórico definitivo.',
        recommendedAction: 'Feche o período para manter os seus registos organizados.',
      },
    },
    inventoryRisk: {
      breakage: {
        whatHappened: 'Um dos seus lotes de stock perdeu mais unidades do que tinha originalmente.',
        whyItMatters: 'As perdas neste lote já excedem a quantidade comprada — isto altera o valor real do lote.',
        recommendedAction: 'Reveja os registos de quebra deste lote para confirmar que estão corretos.',
      },
    },
    businessWorth: {
      valueDiscrepancy: {
        whatHappened: 'A última Contagem mostrou uma diferença no valor do negócio.',
        whyItMatters: 'Certifique-se de que os movimentos de stock estão a ser registados corretamente.',
        recommendedAction: 'Reveja os registos de stock desde a última Contagem.',
      },
      cashDiscrepancy: {
        whatHappened: 'A última Contagem mostrou uma discrepância na posição de caixa.',
        whyItMatters: 'Lembre-se de verificar os seus registos antes da próxima Contagem.',
        recommendedAction: 'Reveja os movimentos de caixa desde a última Contagem.',
      },
      payableOutstanding: {
        whatHappened: 'Tem pagamentos a fornecedores por regularizar.',
        whyItMatters: 'Um pagamento não registado pode explicar diferenças no valor do negócio.',
        recommendedAction: 'Lembre-se de atualizar o estado de pagamento a fornecedores.',
      },
      receivableOutstanding: {
        whatHappened: 'Ainda há valores a receber por regularizar.',
        whyItMatters: 'Um valor por cobrar ainda não conta para o valor do negócio.',
        recommendedAction: 'Considere fazer o acompanhamento com os clientes.',
      },
    },
  },
};
