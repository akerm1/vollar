// === WORD-BY-WORD NAME SUGGESTIONS (« Ajouter produit » — champ #sd-name) ===
// Suggestion mot par mot à partir des noms de produits existants : pendant la
// saisie, seul le mot en cours est complété (ex: « ma » -> « Marlboro », jamais
// « Marlboro Rouge »). Tab/Entrée valident le mot, ajoutent un espace et
// continuent à suggérer le mot suivant. Rattaché par délégation au document,
// donc fonctionne dans openSupplierAddProduct ET openStandaloneAddProduct sans
// toucher au code minifié de suppliers.js.

let _wsCache = null;
let _wsCacheTs = 0;
let _wsInput = null;
let _wsDrop = null;
let _wsItems = [];
let _wsSel = -1;
const _WS_TS = 30000;

function _wsWordRe() {
  return /[A-Za-z0-9\u00C0-\u024F\u0600-\u06FF]+/g;
}

function _wsSplitWords(name) {
  const parts = String(name || '').match(_wsWordRe());
  return parts || [];
}

function _wsBuildFromArray(arr) {
  const map = new Map();
  (arr || []).forEach(function (p) {
    if (!p || !p.name) return;
    _wsSplitWords(p.name).forEach(function (w) {
      if (!w) return;
      const key = w.toLowerCase();
      const entry = map.get(key);
      if (entry) {
        entry.hits++;
      } else {
        map.set(key, { word: w, hits: 1 });
      }
    });
  });
  return map;
}

function _wsCacheArr() {
  if (Array.isArray(window._productsCache) && window._productsCache.length) return window._productsCache;
  if (Array.isArray(window.productsCache) && window.productsCache.length) return window.productsCache;
  return [];
}

function _wsGetCache() {
  if (_wsCache && (Date.now() - _wsCacheTs) < _WS_TS) return _wsCache;
  _wsCache = _wsBuildFromArray(_wsCacheArr());
  _wsCacheTs = Date.now();
  return _wsCache;
}

function _wsEnsureFresh() {
  if (typeof getCachedProducts !== 'function') return;
  getCachedProducts().then(function (arr) {
    if (!arr || !arr.length) return;
    _wsCache = _wsBuildFromArray(arr);
    _wsCacheTs = Date.now();
    if (_wsInput && document.activeElement === _wsInput) _wsRefresh();
  }).catch(function () {});
}

function _wsTokenStart(v, pos) {
  const pre = v.slice(0, pos);
  const m = pre.match(/(\S*)$/);
  return m ? m.index : pos;
}

function _wsCandidates(cache, token) {
  if (!token) return [];
  const out = [];
  cache.forEach(function (entry, key) {
    if (key.length <= token.length) return;
    if (key.indexOf(token) !== 0) return;
    out.push(entry);
  });
  out.sort(function (a, b) {
    if (b.hits !== a.hits) return b.hits - a.hits;
    return a.word.localeCompare(b.word);
  });
  return out.slice(0, 8);
}

function _wsCloseDrop() {
  if (_wsDrop) {
    _wsDrop.remove();
    _wsDrop = null;
  }
  _wsItems = [];
  _wsSel = -1;
  return null;
}

function _wsSelSet(idx, itemEl) {
  _wsSel = idx;
  if (!_wsDrop) return;
  const els = _wsDrop.querySelectorAll('.word-suggest-item');
  for (let i = 0; i < els.length; i++) {
    if (i === idx) els[i].classList.add('active');
    else els[i].classList.remove('active');
  }
}

function _wsShowDrop(input) {
  if (_wsDrop) {
    _wsDrop.remove();
    _wsDrop = null;
  }
  _wsSel = 0;
  const rect = input.getBoundingClientRect();
  const drop = document.createElement('div');
  drop.className = 'word-suggest';
  drop.style.left = rect.left + 'px';
  drop.style.top = (rect.bottom + 4) + 'px';
  drop.style.minWidth = Math.max(rect.width, 160) + 'px';
  drop.innerHTML = _wsItems.map(function (item, i) {
    return '<div class="word-suggest-item' + (i === 0 ? ' active' : '') + '" data-idx="' + i + '"><span>' + escapeHtml(item.word) + '</span></div>';
  }).join('');
  document.body.appendChild(drop);
  _wsDrop = drop;
  _wsSel = 0;
}

function _wsRefresh() {
  const input = _wsInput;
  if (!input || input.id !== 'sd-name' || !input.isConnected) {
    _wsInput = null;
    _wsCloseDrop();
    return;
  }
  const cache = _wsGetCache();
  const v = input.value;
  const pos = (input.selectionStart != null) ? input.selectionStart : v.length;
  const start = _wsTokenStart(v, pos);
  const token = v.slice(start, pos).toLowerCase();
  if (!token) {
    _wsCloseDrop();
    return;
  }
  const items = _wsCandidates(cache, token);
  if (!items.length) {
    _wsCloseDrop();
    return;
  }
  _wsItems = items;
  _wsShowDrop(input);
}

function _wsAcceptWord(entry) {
  const input = _wsInput;
  if (!input || !entry) return;
  const v = input.value;
  const pos = (input.selectionStart != null) ? input.selectionStart : v.length;
  const start = _wsTokenStart(v, pos);
  const tail = v.slice(pos);
  const sep = /^\s/.test(tail) ? '' : ' ';
  const newV = v.slice(0, start) + entry.word + sep + tail;
  input.value = newV;
  const caret = start + entry.word.length + sep.length;
  try { input.setSelectionRange(caret, caret); } catch (e) {}
  _wsCloseDrop();
  input.focus();
}

function _wsPick(idx) {
  const entry = _wsItems[idx];
  if (entry) _wsAcceptWord(entry);
}

if (typeof document !== 'undefined' && document) {
  document.addEventListener('focusin', function (e) {
    const t = e.target;
    if (!t || t.id !== 'sd-name') return;
    _wsInput = t;
    _wsEnsureFresh();
    _wsRefresh();
  });

  document.addEventListener('input', function (e) {
    if (!e.target || e.target.id !== 'sd-name') return;
    _wsInput = e.target;
    _wsRefresh();
  });

  document.addEventListener('click', function (e) {
    if (!e.target) return;
    if (e.target.id === 'sd-name') {
      if (_wsInput) _wsRefresh();
      return;
    }
    if (_wsDrop && e.target.closest && e.target.closest('.word-suggest-item')) {
      const idx = parseInt(e.target.getAttribute('data-idx'), 10);
      if (idx >= 0) _wsPick(idx);
    }
  });

  document.addEventListener('mousedown', function (e) {
    if (!_wsDrop || !e.target) return;
    if (e.target.closest && (e.target.closest('.word-suggest') || e.target.id === 'sd-name')) return;
    _wsCloseDrop();
  });

  document.addEventListener('keydown', function (e) {
    const t = e.target;
    if (!t || t.id !== 'sd-name' || t !== _wsInput) return;
    if (t !== document.activeElement) return;
    const k = e.key;
    if (k === 'ArrowDown') {
      if (!_wsItems.length) return;
      e.preventDefault();
      _wsSelSet((_wsSel + 1) % _wsItems.length);
      return;
    }
    if (k === 'ArrowUp') {
      if (!_wsItems.length) return;
      e.preventDefault();
      _wsSelSet((_wsSel - 1 + _wsItems.length) % _wsItems.length);
      return;
    }
    if (k === 'Escape') {
      if (_wsDrop) {
        e.preventDefault();
        _wsCloseDrop();
      }
      return;
    }
    if (k === 'Enter' || k === 'Tab') {
      if (_wsItems.length && _wsSel >= 0) {
        e.preventDefault();
        _wsPick(_wsSel);
      }
      return;
    }
  });

  document.addEventListener('focusout', function () {
    setTimeout(function () {
      if (_wsDrop && document.activeElement && document.activeElement.id !== 'sd-name') {
        _wsCloseDrop();
      }
    }, 150);
  });

  document.addEventListener('scroll', function () {
    const input = _wsInput;
    if (_wsDrop && input && input.isConnected && document.activeElement === input) {
      const rect = input.getBoundingClientRect();
      _wsDrop.style.left = rect.left + 'px';
      _wsDrop.style.top = (rect.bottom + 4) + 'px';
    }
  }, true);

  document.addEventListener('submit', function () {
    _wsCloseDrop();
  }, true);
}