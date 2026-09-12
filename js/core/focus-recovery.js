// === FOCUS RECOVERY — garde-fou anti-blocage de la saisie ===
// Si les drapeaux focusLockEnabled/formInputActive restent coincés
// (ex: sortie tôt d'un handler focus, aboutissement dans un état incohérent),
// cette sentinelle les remet à leur état de repos en caisse toutes les 750 ms.
// Elle ne vole JAMAIS le focus : elle se contente d'aligner les drapeaux,
// le comportement de focus reste géré par lockFocus()/les handlers existants.
function setupFocusRecovery() {
  if (window.__focusRecoveryBound) return;
  window.__focusRecoveryBound = true;
  setInterval(function () {
    try {
      if (typeof currentView !== 'undefined' && currentView !== 'checkout') return;
      if (window.meterPromptActive) return;
      if (window.askCustomerModalOpen) return;
      const ae = document.activeElement;
      if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.tagName === 'SELECT' || ae.isContentEditable)) return;
      focusLockEnabled = true;
      formInputActive = false;
    } catch (e) { /* garde-fou silencieux */ }
  }, 750);
}
window['setupFocusRecovery'] = setupFocusRecovery;
setupFocusRecovery();