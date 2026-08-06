// ============================================================
// VERIFY — SamtexChabet POS sanity checker
// Usage: node tools/verify.js
//
// Checks:
//   1. SYNTAX       — every js/*.js file parses (vm.Script compile)
//   2. LOAD ORDER   — index.html <script> tags match the js/ folder
//                     (missing files, orphan files)
//   3. SHARED LOAD  — all scripts run together in ONE shared sandbox
//                     in index.html order. This is the real test:
//                     cross-file globals resolve, and a file loaded
//                     too early fails ("X is not defined").
//
// Exit code 0 = all good, 1 = at least one problem.
// ============================================================
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DIR = process.cwd();
const JS_DIR = path.join(DIR, 'js');
const HTML = path.join(DIR, 'index.html');

// Files present in js/ but intentionally NOT loaded by index.html
const NOT_LOADED_OK = new Set(['sqlite-main.js', 'qz-tray.js']);

let failures = 0;
function fail(msg) { failures++; console.log(`FAIL ${msg}`); }
function ok(msg) { console.log(`  ok ${msg}`); }

// ------------------------------------------------------------
// 2. Build the expected script list from index.html
// ------------------------------------------------------------
function readScriptTags() {
  if (!fs.existsSync(HTML)) { fail(`index.html not found (${HTML})`); process.exit(1); }
  const html = fs.readFileSync(HTML, 'utf8');
  const tags = [];
  for (const m of html.matchAll(/<script src="(js\/[^"]+)"/g)) tags.push(m[1]);
  return tags;
}

// ------------------------------------------------------------
// Shared sandbox (DOM + browser stubs) — reused across checks
// ------------------------------------------------------------
function makeClassList() {
  const set = new Set();
  return {
    add: (...c) => c.forEach(x => set.add(x)),
    remove: (...c) => c.forEach(x => set.delete(x)),
    toggle: (c, force) => { if (force === undefined) { set.has(c) ? set.delete(c) : set.add(c); } else { force ? set.add(c) : set.delete(c); } },
    contains: c => set.has(c),
  };
}

function makeElement(id) {
  const el = {
    id, tagName: 'DIV', value: '', textContent: '', innerHTML: '', dataset: {},
    style: { setProperty() {}, display: '', background: '', color: '', cssText: '' },
    classList: makeClassList(),
    children: [],
    parentNode: null,
    _listeners: {},
    setAttribute(k, v) { el[k] = v; },
    getAttribute(k) { return el[k]; },
    appendChild(c) { el.children.push(c); c.parentNode = el; return c; },
    removeChild(c) { el.children = el.children.filter(x => x !== c); return c; },
    replaceChild(n, o) { el.children = el.children.map(x => x === o ? n : x); n.parentNode = el; return o; },
    insertBefore(n, r) { el.children.push(n); n.parentNode = el; return n; },
    addEventListener(t, fn) { (el._listeners[t] = el._listeners[t] || []).push(fn); },
    removeEventListener() {},
    dispatchEvent() { return true; },
    cloneNode() { return makeElement(el.id); },
    remove() { el.parentNode = null; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    contains() { return false; },
    focus() {}, select() {}, blur() {},
    scrollIntoView() {},
    click() {},
    closest() { return null; },
    requestFullscreen() {},
    set selectionStart(v) {}, get selectionStart() { return 0; },
    set selectionEnd(v) {}, get selectionEnd() { return 0; },
  };
  return el;
}

function makeStorage() {
  const m = {};
  return {
    getItem: k => (k in m ? m[k] : null),
    setItem: (k, v) => { m[k] = String(v); },
    removeItem: k => { delete m[k]; },
    clear: () => { for (const k of Object.keys(m)) delete m[k]; },
  };
}

function makeSandbox() {
  const elements = {};
  const documentStub = {
    readyState: 'loading',
    hidden: false,
    head: makeElement('head'),
    body: makeElement('body'),
    documentElement: { style: { setProperty() {} }, classList: makeClassList() },
    _listeners: {},
    addEventListener(t, fn) { (documentStub._listeners[t] = documentStub._listeners[t] || []).push(fn); },
    removeEventListener() {},
    getElementById(id) { if (!elements[id]) elements[id] = makeElement(id); return elements[id]; },
    querySelector(sel) { return elements[sel] || null; },
    querySelectorAll() { return []; },
    createElement(tag) { const el = makeElement(tag); el.tagName = tag.toUpperCase(); return el; },
    createTextNode(t) { return { textContent: t }; },
    createEvent() { return { dataTransfer: null }; },
    execCommand() {},
  };

  const windowStub = {
    document: documentStub,
    addEventListener() {},
    removeEventListener() {},
    devicePixelRatio: 1,
    getComputedStyle() { return { getPropertyValue: () => '' }; },
    innerWidth: 1024,
    innerHeight: 768,
    location: { href: '' },
    localStorage: makeStorage(),
    sessionStorage: makeStorage(),
    requestAnimationFrame: cb => setTimeout(cb, 0),
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
    Blob: function () {},
    FileReader: function () { this.readAsDataURL = () => {}; this.readAsText = () => {}; },
    matchMedia: () => ({ matches: false, addEventListener() {} }),
  };
  windowStub.window = windowStub;

  const sandbox = {
    window: windowStub,
    document: documentStub,
    navigator: { userAgent: 'smoke', storage: { estimate: async () => ({ usage: 0, quota: 0 }) } },
    console,
    setTimeout, clearTimeout, setInterval, clearInterval,
    Date, Math, JSON, Object, Array, String, Number, Boolean,
    parseInt, parseFloat, isNaN, isFinite, Promise, Map, Set, RegExp, Error, Event: function () {},
    Symbol, Proxy, Reflect,
    TextEncoder: function () { this.encode = s => { const b = []; for (let i = 0; i < s.length; i++) b.push(s.charCodeAt(i) & 0xff); return b; }; },
    TextDecoder: function () {},
    Uint8Array, Float32Array, ArrayBuffer,
    requestAnimationFrame: cb => setTimeout(cb, 0),
    performance: { now: () => Date.now(), mark() {}, measure() {} },
    location: { href: '' },
    queueMicrotask: fn => Promise.resolve().then(fn),
    localStorage: null, // replaced below (per-sandbox)
    sessionStorage: null, // replaced below
    crypto: { getRandomValues: arr => { for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256); return arr; } },
    AudioContext: function () {
      return {
        state: 'running', currentTime: 0, destination: {},
        resume: () => Promise.resolve(),
        createOscillator: () => ({ type: '', frequency: { value: 0 }, connect() {}, start() {}, stop() {} }),
        createGain: () => ({ gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }),
      };
    },
    indexedDB: {
      open() {
        const req = {};
        req.onsuccess = null; req.onerror = null; req.onupgradeneeded = null;
        setTimeout(() => { if (typeof req.onsuccess === 'function') req.onsuccess(); }, 0);
        return req;
      },
    },
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  sandbox.top = sandbox;
  sandbox.window = windowStub;
  sandbox.document = documentStub;
  sandbox.localStorage = windowStub.localStorage;
  sandbox.sessionStorage = windowStub.sessionStorage;
  return sandbox;
}

// ------------------------------------------------------------
// Run a single file in a fresh sandbox. Returns null on success.
// ------------------------------------------------------------
function runInSandbox(file, context) {
  try {
    vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: path.basename(file) });
    return null;
  } catch (e) {
    return e;
  }
}

// ------------------------------------------------------------
// MAIN
// ------------------------------------------------------------
const scripts = readScriptTags();
console.log('Indexed scripts:', scripts.length);

// ---- 1. SYNTAX ----
console.log('\n[1/3] Syntax check (vm.Script compile)');
const jsFiles = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js')).sort();
for (const f of jsFiles) {
  const file = path.join(JS_DIR, f);
  try {
    new vm.Script(fs.readFileSync(file, 'utf8'), { filename: f });
  } catch (e) {
    fail(`syntax ${f}: ${e.message}`);
  }
}
if (!failures) ok(`${jsFiles.length} js files parse cleanly`);

// ---- 2. LOAD-ORDER CROSS-CHECK ----
console.log('\n[2/3] Load-order cross-check');
for (const s of scripts) {
  if (!fs.existsSync(path.join(DIR, s))) fail(`index.html references missing file: ${s}`);
}
const loaded = new Set(scripts.map(s => path.basename(s)));
for (const f of jsFiles) {
  if (!loaded.has(f) && !NOT_LOADED_OK.has(f)) fail(`orphan js file never loaded by index.html: ${f}`);
}
if (!failures) ok('all index.html scripts exist, no orphan js files');

// ---- 3. SHARED LOAD (one sandbox, in index.html order) ----
console.log('\n[3/3] Shared-context load (index.html order, single sandbox)');
const shared = vm.createContext(makeSandbox());
for (const s of scripts) {
  const file = path.join(DIR, s);
  if (!fs.existsSync(file)) continue;
  const err = runInSandbox(file, shared);
  if (err) { fail(`${s} (in order): ${err.message}`); break; }
}
if (!failures) ok('all scripts run together in index.html order without error');

// ---- RESULT ----
console.log('\n' + '='.repeat(56));
if (failures === 0) {
  console.log(`ALL CHECKS PASSED — ${scripts.length} scripts, ${jsFiles.length} js files`);
  process.exit(0);
} else {
  console.log(`${failures} PROBLEM(S) FOUND`);
  process.exit(1);
}
