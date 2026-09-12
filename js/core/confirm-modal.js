// === CONFIRM MODAL — remplace les boîtes natives window.confirm() ===
// Les fenêtres natives (confirm/alert) volent le focus clavier de l'OS et
// peuvent laisser l'application dans un état où la saisie ne répond plus.
// Cette fenêtre interne garde TOUT le focus dans l'application.
function showConfirm(_0x2f8e6a, _0x1b3f4c) {
  const _0x5569c0 = _0x1b3f4c || {};
  return new Promise(function (_0x52d52a) {
    try {
      if (typeof document === 'undefined' || !document.body || !document.createElement) {
_0x52d52a(false);
        return;
      }
      const _0x4a1ebd = document.activeElement || null;
      const _0x33ea43 = document.createElement('div');
      _0x33ea43['id'] = 'app-confirm-overlay';
      _0x33ea43.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;';
      const _0x1ec3ac = document.createElement('div');
      _0x1ec3ac.style.cssText = 'background:#fff;color:#222;border-radius:12px;padding:24px 20px;max-width:420px;width:90%;box-shadow:0 12px 40px rgba(0,0,0,.35);text-align:center;';
      const _0x365619 = document.createElement('div');
      _0x365619.textContent = _0x5569c0['title'] || 'Confirmation';
      _0x365619.style.cssText = 'font-weight:700;font-size:16px;margin-bottom:12px;';
      const _0x2cb54f = document.createElement('div');
      _0x2cb54f.textContent = _0x2f8e6a;
      _0x2cb54f.style.cssText = 'font-size:14px;color:#555;margin-bottom:20px;white-space:pre-line;';
      const _0x40c04a = document.createElement('div');
      _0x40c04a.style.cssText = 'display:flex;gap:10px;justify-content:center;';
      const _0x1c5e64 = document.createElement('button');
      _0x1c5e64.textContent = _0x5569c0['okText'] || (_0x5569c0['danger'] ? 'Supprimer' : 'Confirmer');
      _0x1c5e64.style.cssText = 'padding:10px 18px;border:none;border-radius:8px;cursor:pointer;font-size:14px;color:#fff;font-weight:600;background:' + (_0x5569c0['danger'] ? '#e74c3c' : '#2ecc71') + ';';
      const _0x26c498 = document.createElement('button');
      _0x26c498.textContent = 'Annuler';
      _0x26c498.style.cssText = 'padding:10px 18px;border:none;border-radius:8px;cursor:pointer;font-size:14px;color:#fff;font-weight:600;background:#95a5a6;';
      _0x40c04a.appendChild(_0x1c5e64);
      _0x40c04a.appendChild(_0x26c498);
      _0x1ec3ac.appendChild(_0x365619);
      _0x1ec3ac.appendChild(_0x2cb54f);
      _0x1ec3ac.appendChild(_0x40c04a);
      _0x33ea43.appendChild(_0x1ec3ac);
      try { document.body.appendChild(_0x33ea43); } catch (e) { _0x52d52a(true); return; }
      _0x1c5e64['addEventListener']('click', function () { _0x2c89a3(true); });
      _0x26c498['addEventListener']('click', function () { _0x2c89a3(false); });
      function _0x5fa27e(_0x355f9e) {
        if (_0x355f9e['key'] === 'Escape') { _0x2c89a3(false); }
        else if (_0x355f9e['key'] === 'Enter') { _0x2c89a3(true); }
      }
      function _0x2c89a3(_0x34bccb) {
        try { if (_0x33ea43['parentNode']) _0x33ea43['parentNode']['removeChild'](_0x33ea43); } catch (e) { /* ignore */ }
        try { document['removeEventListener']('keydown', _0x5fa27e); } catch (e) { /* ignore */ }
        if (_0x4a1ebd && _0x4a1ebd['focus'] && typeof _0x4a1ebd['focus'] === 'function' && ((_0x4a1ebd['isConnected'] === undefined) || _0x4a1ebd['isConnected'])) { try { _0x4a1ebd['focus'](); } catch (e) { /* ignore */ } }
        _0x52d52a(_0x34bccb);
      }
      document['addEventListener']('keydown', _0x5fa27e);
      try { _0x1c5e64['focus'](); } catch (e) { /* ignore */ }
      return;
    } catch (e) { _0x52d52a(false); }
  });
}
window['showConfirm'] = showConfirm;