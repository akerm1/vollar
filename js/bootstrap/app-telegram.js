// === TELEGRAM BACKUP (option « envoyer la sauvegarde sur Telegram ») ===
// Ajoute un miroir Telegram aux points de sauvegarde existants : à la fermeture
// de l'application, à un intervalle choisi, et manuellement. Desktop uniquement
// (l'API Telegram est sans en-têtes CORS) : l'upload est fait par le processus
// principal Electron (voir electron/main.js, canaux telegram-*).

let _tgTimer = null;

function _tgApp() {
  return (typeof vollarApp !== 'undefined' && vollarApp) ? vollarApp : null;
}

function _tgConfigured() {
  return !!(settings && settings.telegramToken && settings.telegramChatId);
}

function _tgEnabled() {
  const a = _tgApp();
  return !!(settings && settings.telegramEnabled && _tgConfigured() && a && a.sendTelegramDocument);
}

function _tgTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function _tgWithCap(promise, ms) {
  return Promise.race([promise, new Promise(function (resolve) {
    setTimeout(function () { resolve({ ok: false, error: 'timeout' }); }, ms);
  })]);
}

function telegramSendBackup(filename, json) {
  const a = _tgApp();
  if (!a || !a.sendTelegramDocument) return Promise.resolve({ ok: false, error: 'desktop-only' });
  if (!_tgEnabled()) return Promise.resolve({ ok: false, error: 'disabled' });
  const name = filename || ('backup_' + _tgTimestamp() + '.json');
  return Promise.resolve(a.sendTelegramDocument({
    token: settings.telegramToken,
    chatId: settings.telegramChatId,
    content: json,
    fileName: name,
    caption: '💾 ' + (settings.shopName || 'POS') + ' — ' + new Date().toLocaleString()
  })).catch(function (e) { return { ok: false, error: (e && e.message) || 'error' }; });
}
window.telegramSendBackup = telegramSendBackup;

function _tgSendFresh(notify) {
  if (!_tgEnabled()) {
    if (notify) showToast(t('telegramNotConfigured'), 'warning');
    return Promise.resolve({ ok: false });
  }
  if (typeof buildBackupPayload !== 'function') return Promise.resolve({ ok: false });
  return buildBackupPayload().then(function (payload) {
    const json = JSON.stringify(payload, null, 2);
    return telegramSendBackup('backup_' + _tgTimestamp() + '.json', json).then(function (res) {
      if (notify) showToast(res && res.ok ? t('telegramSent') : t('telegramSendFailed'), res && res.ok ? 'success' : 'error');
      return res;
    });
  }).catch(function () {
    if (notify) showToast(t('telegramSendFailed'), 'error');
    return { ok: false };
  });
}

window.telegramSendNow = function () {
  const a = _tgApp();
  if (!a || !a.sendTelegramDocument) { showToast(t('telegramDesktopOnly'), 'info'); return Promise.resolve(); }
  return _tgSendFresh(true);
};

window.telegramTestConnection = function () {
  const a = _tgApp();
  if (!a || !a.telegramTest) { showToast(t('telegramDesktopOnly'), 'info'); return Promise.resolve(); }
  if (!_tgConfigured()) { showToast(t('telegramNotConfigured'), 'warning'); return Promise.resolve(); }
  return Promise.resolve(a.telegramTest({ token: settings.telegramToken, chatId: settings.telegramChatId })).then(function (res) {
    if (res && res.ok) showToast(t('telegramTestOk'), 'success');
    else showToast(t('telegramTestFailed') + ' ' + ((res && res.error) || ''), 'error');
  });
};

window.telegramDetectChat = function () {
  const a = _tgApp();
  if (!a || !a.telegramGetChat) { showToast(t('telegramDesktopOnly'), 'info'); return Promise.resolve(); }
  if (!settings || !settings.telegramToken) { showToast(t('telegramNeedToken'), 'warning'); return Promise.resolve(); }
  return Promise.resolve(a.telegramGetChat({ token: settings.telegramToken })).then(function (res) {
    if (res && res.ok) {
      settings.telegramChatId = res.chatId;
      dbPut('settings', { key: 'telegramChatId', value: res.chatId })['catch'](function () {});
      const el = document.getElementById('settings-telegram-chat');
      if (el) el.value = res.chatId;
      showToast(t('telegramChatDetected'), 'success');
      _tgUpdateStatus();
    } else {
      showToast(t('telegramNoChat'), 'warning');
    }
  });
};

window.saveTelegramPrefs = function () {
  const tokenEl = document.getElementById('settings-telegram-token');
  const chatEl = document.getElementById('settings-telegram-chat');
  const intEl = document.getElementById('settings-telegram-interval');
  if (tokenEl) settings.telegramToken = tokenEl.value.trim();
  if (chatEl) settings.telegramChatId = chatEl.value.trim();
  if (intEl) settings.telegramIntervalMinutes = parseInt(intEl.value, 10) || 0;
  dbPut('settings', { key: 'telegramToken', value: settings.telegramToken })['catch'](function () {});
  dbPut('settings', { key: 'telegramChatId', value: settings.telegramChatId })['catch'](function () {});
  dbPut('settings', { key: 'telegramIntervalMinutes', value: settings.telegramIntervalMinutes })['catch'](function () {});
  _tgRestartSchedule();
  _tgUpdateStatus();
};

function _tgRestartSchedule() {
  if (_tgTimer) { clearInterval(_tgTimer); _tgTimer = null; }
  const mins = parseInt((settings && settings.telegramIntervalMinutes) || 0, 10);
  if (!mins || !_tgEnabled()) return;
  _tgTimer = setInterval(function () { _tgSendFresh(false); }, mins * 60000);
}

function _tgUpdateStatus() {
  const el = document.getElementById('telegram-status');
  if (!el) return;
  const a = _tgApp();
  let msg, color;
  if (!a || !a.sendTelegramDocument) {
    msg = t('telegramDesktopOnly'); color = '#888';
  } else if (!_tgConfigured()) {
    msg = t('telegramNotConfigured'); color = '#d97706';
  } else if (!settings.telegramEnabled) {
    msg = t('telegramStatusOff'); color = '#888';
  } else {
    const mins = parseInt(settings.telegramIntervalMinutes || 0, 10);
    msg = t('telegramStatusOn');
    if (mins) msg += ' — ' + t('telegramEvery') + ' ' + mins + ' min';
    if (settings.telegramOnClose !== false) msg += ' + ' + t('telegramOnCloseShort');
    color = '#16a34a';
  }
  el.textContent = msg;
  el.style.color = color;
}

function refreshTelegramUI() {
  const tokenEl = document.getElementById('settings-telegram-token');
  const chatEl = document.getElementById('settings-telegram-chat');
  const intEl = document.getElementById('settings-telegram-interval');
  if (tokenEl && document.activeElement !== tokenEl) tokenEl.value = (settings && settings.telegramToken) || '';
  if (chatEl && document.activeElement !== chatEl) chatEl.value = (settings && settings.telegramChatId) || '';
  if (intEl) intEl.value = String((settings && settings.telegramIntervalMinutes != null) ? settings.telegramIntervalMinutes : 60);
  const enEl = document.querySelector('[data-setting="telegramEnabled"]');
  if (enEl) enEl.checked = !!(settings && settings.telegramEnabled);
  const ocEl = document.querySelector('[data-setting="telegramOnClose"]');
  if (ocEl) ocEl.checked = !(settings && settings.telegramOnClose === false);
  _tgUpdateStatus();
  _tgRestartSchedule();
}
window.refreshTelegramUI = refreshTelegramUI;

// The shutdown backup is written by app-backup.js. Chain the Telegram upload so
// the quit handshake (renderer-quit-ready) waits for it — but never longer than
// 10s, and only when Telegram is enabled and "on close" is not disabled.
(function _tgInstallShutdownHook() {
  const prev = window.performShutdownBackup;
  if (typeof prev !== 'function') return;
  window.performShutdownBackup = function () {
    return Promise.resolve(prev.apply(this, arguments)).then(function (res) {
      if (!_tgEnabled() || settings.telegramOnClose === false) return res;
      return _tgWithCap(_tgSendFresh(false), 10000).then(function () { return res; }, function () { return res; });
    });
  };
})();

// Settings load asynchronously during bootstrap; refresh the card once the
// Telegram defaults are present in the shared settings object.
(function _tgWhenReady() {
  if (typeof settings !== 'undefined' && settings && typeof settings.telegramEnabled !== 'undefined') {
    refreshTelegramUI();
    return;
  }
  setTimeout(_tgWhenReady, 500);
})();
