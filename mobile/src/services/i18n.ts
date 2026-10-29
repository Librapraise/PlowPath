import { useSettingsStore } from '../store/settingsStore';

export type Locale = 'fr-QC' | 'en-CA' | 'en-US' | 'en-GB';

export const translations = {
  'fr-QC': {
    // General
    appName: 'PlowPath',
    cancel: 'Annuler',
    error: 'Erreur',
    success: 'Succès',
    version: 'Version',
    loading: 'Chargement...',

    // Login Screen
    phone: 'NUMÉRO DE CELLULAIRE',
    password: 'MOT DE PASSE',
    startShift: 'START SHIFT (COMMENCER LE QUART)',
    forgotPasswordLink: 'Mot de passe oublié?',
    activeVehicle: 'VÉHICULE ACTIF',
    incorrectCredentials: 'Numéro de cell ou mot de passe incorrect. Réessaie, t\'sais.',
    networkError: 'Erreur réseau. Le serveur est injoignable pantoute. Check ta connexion.',
    forgotHeaderTitle: 'Mot de passe oublié',
    forgotHeaderDesc: 'Rentre ton numéro de cell ou ton courriel pis on va t\'envoyer un code de récupération à 6 chiffres.',
    phoneOrEmail: 'CELLULAIRE OU COURRIEL',
    requestCode: 'DEMANDER UN CODE',
    codeExpires: 'Le code expire dans 10 minutes, c\'est le boutte.',
    backToLogin: '← Retour à la connexion',
    codeSentTitle: 'Code envoyé!',
    codeSentBody: 'On a envoyé un code à 6 chiffres à {{destination}}. Check tes messages!',
    enterVerificationCode: 'ENTRER LE CODE DE VÉRIFICATION',
    resendCode: 'Renvoyer le code',
    resendCodeSeconds: 'Renvoyer le code ({{seconds}}s)',
    resetPasswordTitle: 'Réinitialiser le mot de passe',
    resetPasswordDesc: 'Rentre le code à 6 chiffres pis ton nouveau mot de passe.',
    verificationCodeLabel: 'CODE DE VÉRIFICATION À 6 CHIFFRES',
    newPasswordLabel: 'NOUVEAU MOT DE PASSE',
    confirmPasswordLabel: 'CONFIRMER LE NOUVEAU MOT DE PASSE',
    setNewPassword: 'MODIFIER LE MOT DE PASSE',
    validationAllRequired: 'Tous les champs de mot de passe sont requis.',
    validationLength: 'Le nouveau mot de passe doit faire au moins 6 caractères.',
    validationMatch: 'Le mot de passe de confirmation correspond pas, t\'sais.',
    successPasswordUpdated: 'Mot de passe mis à jour avec succès! Connecte-toi avec ton nouveau mot de passe.',
    startShiftTitle: 'Commencer le quart',
    startShiftDesc: 'Connecte-toi pour débuter tes trajets.',
    termsText: 'En te connectant, tu acceptes nos Conditions d\'utilisation.',

    // TabNavigator
    tabRoute: 'Mon trajet',
    tabSign: 'Panneaux',
    tabHistory: 'Notifications',
    tabSettings: 'Réglages',

    // RouteScreen
    welcomeBack: 'SALUT TOI,',
    activeShift: 'Quart actif',
    endShift: 'Finir le quart',
    shiftHandover: 'Passer son shift',
    routesToday: '{{count}} trajets aujourd\'hui',
    routesTodaySingle: '{{count}} trajet aujourd\'hui',
    activeRoutes: '{{count}} en cours',
    stops: 'Arrêts',
    miles: 'Milles',
    estTime: 'Temps estimé',
    completed: 'Complété',
    viewSummary: 'Voir le résumé →',
    resumeRoute: 'REPRENDRE LE TRAJET',
    startRoute: 'DÉBUTER LE TRAJET',
    allFilter: 'Tous',
    inProgressFilter: 'En cours',
    assignedFilter: 'Assignés',
    completedFilter: 'Complétés',
    noRoutesMatch: 'Aucun trajet correspond à ce filtre.',
    noRoutesAssigned: 'T\'as aucun trajet assigné aujourd\'hui, t\'sais.',
    notAssignedDriver: 'T\'es pas assigné comme chauffeur icitte.',
    signOut: 'Se déconnecter',
    logoutConfirmTitle: 'Déconnexion',
    logoutConfirmDesc: 'Es-tu sûr de vouloir te déconnecter de ta session?',

    // NavigationScreen
    hudNextStop: 'Prochain arrêt',
    hudEta: 'ETA',
    hudCompleted: 'Arrêts faits',
    b2bPartnerJob: 'Contrat partenaire : {{name}}',
    metersToArrival: '{{distance}} mètres avant d\'arriver',
    milesToArrival: '{{distance}} milles avant d\'arriver',
    voiceConsole: 'Console de commandes vocales',
    voiceConsoleDesc: 'Dis « arrive », « skip » ou « emergency » pour enregistrer la télémétrie sans tes mains.',
    skipStop: 'Sauter l\'arrêt',
    markComplete: 'Marquer fait',
    simulateDrive: 'Simuler trajet',
    stopSimulation: 'Arrêter sim',
    proofOfService: 'Preuve de service',
    proofOfServiceDesc: 'Prends une photo du terrain déneigé pour la vérification du contrat.',
    takePhoto: 'CONTINUER',
    submittingProof: 'ENVOI DE LA PREUVE PHOTO...',
    uploadingProgress: 'Envoi en cours... {{progress}}%',
    skipReasonTitle: 'Sauter l\'endroit',
    skipReasonDesc: 'Rentre la raison pour laquelle tu passes l\'arrêt :',
    skipReasonPlaceholder: 'Barrière verrouillée, client qui a annulé, etc.',
    completeRouteTitle: 'Trajet terminé!',
    completeRouteDesc: 'T\'as fait tous les arrêts du trajet optimisé. Beau travail!',
    goBackRouteList: 'RETOURNER À LA LISTE DES TRAJETS',
    routeSummaryTitle: 'Résumé du trajet',
    navAlert: 'Alerte de navigation',
    navAlertDesc: 'L\'application de guidage s\'ouvrira automatiquement.',

    // SignRouteScreen
    signCrew: 'Équipe de panneaux',
    installSigns: 'Poser les panneaux',
    removeSigns: 'Retirer les panneaux',
    stopsLeft: 'Restants',
    TSPCalculating: 'Calcul du trajet optimisé...',
    allCompletedSigns: 'Toutes les propriétés sont faites pour cette opération hors saison!',
    lastRemoved: 'Panneau retiré le {{date}}',
    markInstalled: 'Marquer installé',
    markRemoved: 'Marquer retiré',
    installedPill: 'INSTALLÉ',
    removedPill: 'RETIRÉ',
    pendingPill: 'EN ATTENTE',

    // ShiftSwapScreen
    swapTitle: 'Passer son shift',
    swapSubtitle: 'Transfère tes trajets à un autre chauffeur de façon sécuritaire.',
    outgoingDriverTitle: 'Tu finis ton shift? (Chauffeur sortant)',
    outgoingDriverDesc: 'Génère un jeton sécuritaire temporaire pour transférer tes trajets actifs en cours.',
    generateTokenBtn: 'Générer le jeton de transfert',
    tokenActiveLabel: 'CLÉ DE TRANSFERT SÉCURISÉE (ACTIVE 10 MIN):',
    expiresIn: 'Expire dans {{time}}',
    incomingDriverTitle: 'Tu commences ton shift? (Chauffeur entrant)',
    incomingDriverDesc: 'Rentre la clé du chauffeur sortant pour reprendre sa file de trajets pis arrêter son shift.',
    pasteKeyPlaceholder: 'Rentre la clé sécurisée icitte...',
    acceptShiftBtn: 'Accepter le shift et les trajets',
    warningShiftText: 'Ça va couper tout de suite le timer de shift du chauffeur sortant, t\'sais.',

    // SettingsScreen
    settingsTitle: 'Réglages',
    displayAppearance: 'Affichage et apparence',
    displayAppearanceDesc: 'Thème de l\'écran et contraste de la carte',
    defaultNav: 'Application de guidage',
    defaultNavDesc: 'Application turn-by-turn préférée',
    gpsBattery: 'GPS et batterie',
    gpsBatteryDesc: 'Précision de suivi et télémétrie',
    syncCache: 'Synchro locale',
    syncCacheDesc: 'Synchro en arrière-plan et cache locale',
    accountSecurity: 'Sécurité du compte',
    accountSecurityDesc: 'Modifier le mot de passe de ton compte',
    themeLabel: 'Thème d\'affichage',
    themeDesc: 'Choisis ton mode d\'affichage préféré',
    nightMode: 'Mode nuit / antireflet',
    nightModeDesc: 'Mode sombre contrasté pour les opérations de nuit',
    highContrast: 'Carte à haut contraste',
    highContrastDesc: 'Améliore la visibilité des lignes en basse lumière',
    livePreview: 'Aperçu en direct',
    navToolLabel: 'Outil de guidage par défaut',
    navToolDesc: 'Sélectionne l\'application pour ton guidage :',
    navToolInfo: 'Cette application va s\'ouvrir automatiquement quand tu vas naviguer.',
    locationAccuracy: 'Précision GPS',
    locationAccuracyDesc: 'La haute précision utilise le GPS continu; l\'économie de batterie espace les mises à jour.',
    highPrecision: 'Haute précision',
    highPrecisionDesc: 'Suivi satellite continu du déneigement',
    powerSaver: 'Économie de batterie',
    powerSaverDesc: 'Suivi GPS espacé et optimisé',
    telemetryLabel: 'Fréquence de télémétrie',
    uploadFreq: 'Fréquence d\'envoi GPS : {{seconds}} secondes',
    syncStatus: 'Statut de la base locale',
    queuedGps: 'Positions GPS en attente',
    queuedStops: 'Événements d\'arrêt en attente',
    syncNow: 'FORCER LA SYNCHRONISATION',
    clearCache: 'Vider la cache des trajets',
    clearCacheDesc: 'Supprime la cache locale sans te déconnecter de ta session',
    clearCacheBtn: 'VIDER LA CACHE',
    confirmClearCacheBtn: 'CONFIRME LE VIDAGE DANS {{count}}',
    securityLabel: 'Sécurité de ton compte',
    currentPassword: 'MOT DE PASSE ACTUEL',
    newPassword: 'NOUVEAU MOT DE PASSE',
    confirmPassword: 'CONFIRMER LE MOT DE PASSE',
    changePasswordBtn: 'MODIFIER LE MOT DE PASSE',
    updatingPassword: 'Mise à jour du mot de passe...',
    languageLabel: 'Langue de l\'application',
    languageDesc: 'Choisis ta langue d\'affichage préférée',
  },
  'en-CA': {
    // General
    appName: 'PlowPath',
    cancel: 'Cancel',
    error: 'Error',
    success: 'Success',
    version: 'Version',
    loading: 'Loading...',

    // Login Screen
    phone: 'PHONE NUMBER',
    password: 'PASSWORD',
    startShift: 'START SHIFT',
    forgotPasswordLink: 'Forgot password?',
    activeVehicle: 'ACTIVE VEHICLE',
    incorrectCredentials: 'Incorrect phone or password. Please try again.',
    networkError: 'Network error. Cannot reach the server. Please check your connection.',
    forgotHeaderTitle: 'Forgot Password',
    forgotHeaderDesc: 'Enter your phone number or email and we\'ll send you a 6-digit recovery code.',
    phoneOrEmail: 'PHONE OR EMAIL',
    requestCode: 'REQUEST CODE',
    codeExpires: 'Code expires in 10 minutes.',
    backToLogin: '← Back to Login',
    codeSentTitle: 'Code Sent!',
    codeSentBody: 'We sent a 6-digit code to {{destination}}. Check your messages.',
    enterVerificationCode: 'ENTER VERIFICATION CODE',
    resendCode: 'Resend Code',
    resendCodeSeconds: 'Resend Code ({{seconds}}s)',
    resetPasswordTitle: 'Reset Password',
    resetPasswordDesc: 'Enter the 6-digit code and your new password.',
    verificationCodeLabel: '6-DIGIT VERIFICATION CODE',
    newPasswordLabel: 'NEW PASSWORD',
    confirmPasswordLabel: 'CONFIRM NEW PASSWORD',
    setNewPassword: 'SET NEW PASSWORD',
    validationAllRequired: 'All password fields are required.',
    validationLength: 'New password must be at least 6 characters.',
    validationMatch: 'Confirm password does not match new password.',
    successPasswordUpdated: 'Password updated successfully! Please log in with your new password.',
    startShiftTitle: 'Start Shift',
    startShiftDesc: 'Sign in to begin your route assignments.',
    termsText: 'By signing in, you agree to our Terms of Service.',

    // TabNavigator
    tabRoute: "Today's Route",
    tabSign: 'Sign Operations',
    tabHistory: 'Notifications',
    tabSettings: 'Settings',

    // RouteScreen
    welcomeBack: 'WELCOME BACK,',
    activeShift: 'Active Shift',
    endShift: 'End Shift',
    shiftHandover: 'Shift Handover',
    routesToday: '{{count}} routes today',
    routesTodaySingle: '{{count}} route today',
    activeRoutes: '{{count}} active',
    stops: 'Stops',
    miles: 'Miles',
    estTime: 'Est. Time',
    completed: 'Completed',
    viewSummary: 'View Summary →',
    resumeRoute: 'RESUME ROUTE',
    startRoute: 'START ROUTE',
    allFilter: 'All',
    inProgressFilter: 'In Progress',
    assignedFilter: 'Assigned',
    completedFilter: 'Completed',
    noRoutesMatch: 'No routes match this filter.',
    noRoutesAssigned: 'No routes assigned to you today.',
    notAssignedDriver: 'You are not assigned as a driver.',
    signOut: 'Sign out',
    logoutConfirmTitle: 'Log Out',
    logoutConfirmDesc: 'Are you sure you want to log out?',

    // NavigationScreen
    hudNextStop: 'Next Stop',
    hudEta: 'ETA',
    hudCompleted: 'Completed',
    b2bPartnerJob: 'Enterprise Partner Job: {{name}}',
    metersToArrival: '{{distance}} meters to arrival',
    milesToArrival: '{{distance}} miles to arrival',
    voiceConsole: 'Voice Command Console',
    voiceConsoleDesc: 'Say "arrive", "skip", or "emergency" to trigger driver telemetry logs hands-free.',
    skipStop: 'Skip Stop',
    markComplete: 'Mark Complete',
    simulateDrive: 'Simulate Drive',
    stopSimulation: 'Stop Simulation',
    proofOfService: 'Proof of Service',
    proofOfServiceDesc: 'Capture a photo of the completed property for B2B contract verification.',
    takePhoto: 'CONTINUE',
    submittingProof: 'SUBMITTING PROOF PHOTO...',
    uploadingProgress: 'Uploading... {{progress}}%',
    skipReasonTitle: 'Skip Location',
    skipReasonDesc: 'Enter skip reason for dispatch records:',
    skipReasonPlaceholder: 'Locked gate, client cancellation, etc.',
    completeRouteTitle: 'Route Completed!',
    completeRouteDesc: 'You have serviced all stops on this optimized path sequence.',
    goBackRouteList: 'GO BACK TO ROUTE LIST',
    routeSummaryTitle: 'Route Summary',
    navAlert: 'Navigation Launching',
    navAlertDesc: 'Turn-by-turn navigation will open automatically.',

    // SignRouteScreen
    signCrew: 'Sign Crew',
    installSigns: 'Install Signs',
    removeSigns: 'Remove Signs',
    stopsLeft: 'Stops Left',
    TSPCalculating: 'Calculating optimized TSP route...',
    allCompletedSigns: 'All properties are completed for this off-season sign operation!',
    lastRemoved: 'Sign was last removed on {{date}}',
    markInstalled: 'Mark Installed',
    markRemoved: 'Mark Removed',
    installedPill: 'INSTALLED',
    removedPill: 'REMOVED',
    pendingPill: 'PENDING',

    // ShiftSwapScreen
    swapTitle: 'Shift Handover',
    swapSubtitle: 'Transfer routes between drivers safely.',
    outgoingDriverTitle: 'Leaving Shift? (Outgoing Driver)',
    outgoingDriverDesc: 'Generate a secure, short-lived handover token to transfer your current active routes.',
    generateTokenBtn: 'Generate Handover Token',
    tokenActiveLabel: 'SECURE HANDOVER KEY (ACTIVE 10M):',
    expiresIn: 'Expires in {{time}}',
    incomingDriverTitle: 'Starting Shift? (Incoming Driver)',
    incomingDriverDesc: 'Enter the outgoing driver\'s secure handover token to immediately assume their route queue and end their active shift timer.',
    pasteKeyPlaceholder: 'Enter secure key here...',
    acceptShiftBtn: 'Accept Shift & Routes',
    warningShiftText: 'This will immediately end the outgoing driver\'s active shift timer.',

    // SettingsScreen
    settingsTitle: 'Settings',
    displayAppearance: 'Display & Appearance',
    displayAppearanceDesc: 'Choose display theme & map contrast',
    defaultNav: 'Default Navigation App',
    defaultNavDesc: 'Preferred turn-by-turn navigation app',
    gpsBattery: 'GPS & Battery',
    gpsBatteryDesc: 'Accuracy and telemetry frequencies',
    syncCache: 'Sync & Cache',
    syncCacheDesc: 'Offline queue synchronization & storage',
    accountSecurity: 'Account Security',
    accountSecurityDesc: 'Manage and update account password',
    themeLabel: 'Theme',
    themeDesc: 'Choose your preferred display mode',
    nightMode: 'Night Mode / Dark Glare',
    nightModeDesc: 'High-contrast dark mode for night operations',
    highContrast: 'High Contrast Map',
    highContrastDesc: 'Boosts map line visibility in low-light conditions',
    livePreview: 'Live Preview',
    navToolLabel: 'Preferred Navigation Tool',
    navToolDesc: 'Select your default application for turn-by-turn routing:',
    navToolInfo: 'This app will launch automatically when you tap Navigate on any stop.',
    locationAccuracy: 'Location Accuracy',
    locationAccuracyDesc: 'High Precision runs the GPS continuously; Power Saver reduces background updates.',
    highPrecision: 'High Precision',
    highPrecisionDesc: 'Continuous satellite GPS tracking',
    powerSaver: 'Power Saver',
    powerSaverDesc: 'Optimized tracking intervals',
    telemetryLabel: 'Telemetry Frequencies',
    uploadFreq: 'Upload GPS events every {{seconds}} seconds',
    syncStatus: 'Sync Status',
    queuedGps: 'Queued GPS Samples',
    queuedStops: 'Queued Stop Events',
    syncNow: 'FORCE SYNC NOW',
    clearCache: 'Clear Cached Routes',
    clearCacheDesc: 'Removes offline route data without logging out',
    clearCacheBtn: 'CLEAR CACHE',
    confirmClearCacheBtn: 'CONFIRM CLEAR IN {{count}}',
    securityLabel: 'Account Password',
    currentPassword: 'CURRENT PASSWORD',
    newPassword: 'NEW PASSWORD',
    confirmPassword: 'CONFIRM NEW PASSWORD',
    changePasswordBtn: 'CHANGE PASSWORD',
    updatingPassword: 'Updating Password...',
    languageLabel: 'Language & Region',
    languageDesc: 'Select your preferred application language',
  },
  'en-US': {
    // English US inherits CA translations except spelling differences
    // (US: color, center, check, favor, realize, program)
  },
  'en-GB': {
    // English UK inherits CA translations except spelling differences
    // (UK: colour, centre, cheque, favour, realise, programme)
  }
};

// Fallback matching logic for US/GB to keep bundle small
export function getTranslation(locale: Locale, key: keyof typeof translations['fr-QC'], variables?: Record<string, string | number>): string {
  let dict = translations[locale] as any;
  if (!dict || !dict[key]) {
    // Fall back to en-CA if English variant is missing
    if (locale.startsWith('en')) {
      dict = translations['en-CA'] as any;
    } else {
      dict = translations['fr-QC'] as any;
    }
  }

  let text = dict[key] || (translations['en-CA'] as any)[key] || key;

  // Apply US/UK spelling variations dynamically if needed
  if (locale === 'en-US') {
    text = text
      .replace(/colour/g, 'color')
      .replace(/Colour/g, 'Color')
      .replace(/centre/g, 'center')
      .replace(/Centre/g, 'Center')
      .replace(/cheque/g, 'check')
      .replace(/favour/g, 'favor')
      .replace(/realise/g, 'realize')
      .replace(/programme/g, 'program');
  } else if (locale === 'en-GB') {
    text = text
      .replace(/color/g, 'colour')
      .replace(/Color/g, 'Colour')
      .replace(/center/g, 'centre')
      .replace(/Center/g, 'Centre')
      .replace(/check/g, 'cheque')
      .replace(/favor/g, 'favour')
      .replace(/realize/g, 'realise')
      .replace(/program/g, 'programme');
  }

  if (variables) {
    Object.keys(variables).forEach((v) => {
      text = text.replace(new RegExp(`{{${v}}}`, 'g'), String(variables[v]));
    });
  }

  return text;
}

export function useTranslation() {
  const language = useSettingsStore((s) => s.settings.language) || 'fr-QC';
  const t = (key: keyof typeof translations['fr-QC'], variables?: Record<string, string | number>) => {
    return getTranslation(language, key, variables);
  };

  const formatDate = (date: Date) => {
    if (language === 'fr-QC') {
      const months = [
        'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
      ];
      return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    }
    if (language === 'en-CA') {
      // YYYY-MM-DD
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${date.getFullYear()}-${m}-${d}`;
    }
    if (language === 'en-US') {
      // MM/DD/YYYY
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${m}/${d}/${date.getFullYear()}`;
    }
    // en-GB (DD/MM/YYYY)
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${d}/${m}/${date.getFullYear()}`;
  };

  const formatCurrency = (amount: number) => {
    if (language === 'fr-QC') {
      return `${amount.toFixed(2).replace('.', ',')} $`;
    }
    if (language === 'en-GB') {
      return `£${amount.toFixed(2)}`;
    }
    return `$${amount.toFixed(2)}`;
  };

  return { t, locale: language, formatDate, formatCurrency };
}
