// ============================================================
// THEMES: 10 Distinct Design Systems
// Each theme has unique animations, shapes, effects, and personality
// ============================================================

const THEMES = {
    // ─────────────────────────────────────────────────────────
    // THEME 1: MODERNA — Original violet, clean, elegant
    // ─────────────────────────────────────────────────────────
    moderna: {
        name: 'Moderna',
        description: 'Violet élégant, design original',
        vars: {
            '--primary': '#6C63FF',
            '--primary-light': '#8B83FF',
            '--primary-dark': '#4A42D8',
            '--primary-gradient': 'linear-gradient(135deg, #6C63FF 0%, #4A42D8 100%)',
            '--accent': '#FF6B6B',
            '--success': '#2ECC71',
            '--danger': '#FF4757',
            '--warning': '#FFA502',
            '--bg': '#F0F2F5',
            '--card-bg': '#FFFFFF',
            '--shadow': '0 4px 20px rgba(108, 99, 255, 0.08)',
            '--shadow-lg': '0 8px 40px rgba(108, 99, 255, 0.15)',
            '--shadow-hover': '0 12px 48px rgba(108, 99, 255, 0.25)',
            '--radius': '16px',
            '--radius-sm': '10px',
            '--transition': 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '--font-family': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            '--modern-gradient-1': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '--header-bg': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '--header-shadow': '0 8px 32px rgba(102, 126, 234, 0.4)',
            '--body-bg': 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            '--table-stripe': '#f8f9ff',
            '--btn-radius': '10px',
            '--card-border': '1px solid rgba(108, 99, 255, 0.08)'
        },
        css: `
            @keyframes moderna-shine {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }
            @keyframes moderna-float {
                0%,100% { transform: translateY(0px); }
                50% { transform: translateY(-4px); }
            }
            body.theme-moderna .app-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                box-shadow: 0 8px 32px rgba(102, 126, 234, 0.4) !important;
            }
            body.theme-moderna .app-header .header-title,
            body.theme-moderna .brand span:first-child { color: white !important; font-weight: 800; }
            body.theme-moderna .nav-tab {
                border-radius: 10px !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            }
            body.theme-moderna .nav-tab.active {
                background: rgba(255,255,255,0.2) !important;
                color: white !important;
            }
            body.theme-moderna .nav-tab:hover:not(.active) {
                background: rgba(255,255,255,0.1);
                transform: translateY(-1px);
            }
            body.theme-moderna .period-card,
            body.theme-moderna .key-card,
            body.theme-moderna .inventory-card {
                border: 1px solid rgba(108, 99, 255, 0.06) !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            }
            body.theme-moderna .period-card:hover,
            body.theme-moderna .key-card:hover,
            body.theme-moderna .inventory-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 12px 48px rgba(108, 99, 255, 0.15) !important;
            }
            body.theme-moderna .table-wrap {
                border-radius: 16px !important;
                overflow: hidden;
            }
            body.theme-moderna .table-wrap table thead { background: linear-gradient(135deg, #6C63FF, #4A42D8) !important; }
            body.theme-moderna .table-wrap table th { color: white; font-weight: 700; }
            body.theme-moderna .table-wrap table td { border-color: rgba(108, 99, 255, 0.06) !important; }
            body.theme-moderna input, body.theme-moderna select, body.theme-moderna textarea {
                border: 1.5px solid rgba(108, 99, 255, 0.15) !important;
                border-radius: 10px !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            }
            body.theme-moderna input:focus, body.theme-moderna select:focus, body.theme-moderna textarea:focus {
                border-color: #6C63FF !important;
                box-shadow: 0 0 0 3px rgba(108, 99, 255, 0.1) !important;
            }
            body.theme-moderna .btn-primary {
                background: linear-gradient(135deg, #6C63FF, #4A42D8) !important;
                border: none !important;
                border-radius: 10px !important;
                box-shadow: 0 4px 16px rgba(108, 99, 255, 0.3) !important;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            }
            body.theme-moderna .btn-primary:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 8px 28px rgba(108, 99, 255, 0.4) !important;
            }
            body.theme-moderna .sh-day-header {
                background: rgba(108, 99, 255, 0.04) !important;
                border-radius: 10px;
            }
            body.theme-moderna ::-webkit-scrollbar { width: 8px; }
            body.theme-moderna ::-webkit-scrollbar-track { background: rgba(108, 99, 255, 0.03); border-radius: 10px; }
            body.theme-moderna ::-webkit-scrollbar-thumb { background: rgba(108, 99, 255, 0.2); border-radius: 10px; }
            body.theme-moderna ::-webkit-scrollbar-thumb:hover { background: rgba(108, 99, 255, 0.35); }
        `
    },

    // ─────────────────────────────────────────────────────────
    // THEME 2: FOREST — Organic, breathing, earthy, texture
    // ─────────────────────────────────────────────────────────
    forest: {
        name: 'Forêt',
        description: 'Organique, textures nature, zen',
        vars: {
            '--primary': '#059669',
            '--primary-light': '#34d399',
            '--primary-dark': '#047857',
            '--primary-gradient': 'linear-gradient(135deg, #059669, #047857)',
            '--accent': '#f97316',
            '--success': '#22c55e',
            '--danger': '#ef4444',
            '--warning': '#eab308',
            '--bg': '#f0fdf4',
            '--card-bg': '#ffffff',
            '--shadow': '0 2px 16px rgba(5,150,105,0.06)',
            '--shadow-lg': '0 8px 32px rgba(5,150,105,0.10)',
            '--shadow-hover': '0 12px 40px rgba(5,150,105,0.16)',
            '--radius': '24px',
            '--radius-sm': '16px',
            '--transition': 'all 0.5s cubic-bezier(0.22,1,0.36,1)',
            '--font-family': "'Inter', system-ui, sans-serif",
            '--modern-gradient-1': 'linear-gradient(135deg, #059669, #047857)',
            '--header-bg': 'linear-gradient(135deg, #059669, #065f46)',
            '--header-shadow': '0 8px 32px rgba(5,150,105,0.25)',
            '--body-bg': 'linear-gradient(160deg, #f0fdf4 0%, #ecfdf5 30%, #f0fdf4 60%, #dcfce7 100%)',
            '--table-stripe': 'rgba(5,150,105,0.03)',
            '--btn-radius': '16px',
            '--card-border': '1px solid rgba(5,150,105,0.08)'
        },
        css: `
            @keyframes forest-breathe {
                0%,100% { transform: scale(1); }
                50% { transform: scale(1.005); }
            }
            @keyframes forest-sway {
                0%,100% { transform: rotate(0deg) translateX(0); }
                25% { transform: rotate(1deg) translateX(4px); }
                75% { transform: rotate(-1deg) translateX(-4px); }
            }
            @keyframes forest-leaf-fall {
                0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
                10% { opacity: 0.4; }
                100% { transform: translateY(calc(100vh + 20px)) rotate(360deg); opacity: 0; }
            }
            body.theme-forest { position: relative; }
            body.theme-forest::before {
                content: '';
                position: fixed;
                inset: 0;
                background:
                    radial-gradient(ellipse 600px 400px at 10% 20%, rgba(5,150,105,0.04), transparent),
                    radial-gradient(ellipse 500px 300px at 80% 70%, rgba(34,197,94,0.04), transparent);
                pointer-events: none;
                z-index: 0;
            }
            body.theme-forest .app-header {
                background: linear-gradient(135deg, rgba(5,150,105,0.95), rgba(6,95,70,0.95)) !important;
                border-bottom: 2px solid rgba(255,255,255,0.1);
            }
            body.theme-forest .app-header .header-title {
                letter-spacing: -0.02em;
                font-weight: 800;
            }
            body.theme-forest .nav-tab {
                border-radius: 16px !important;
                transition: all 0.5s cubic-bezier(0.22,1,0.36,1) !important;
                font-weight: 500;
            }
            body.theme-forest .nav-tab.active {
                background: rgba(255,255,255,0.2) !important;
                color: white !important;
            }
            body.theme-forest .period-card,
            body.theme-forest .key-card,
            body.theme-forest .inventory-card {
                border-radius: 24px !important;
                border: 1px solid rgba(5,150,105,0.08) !important;
                transition: all 0.5s cubic-bezier(0.22,1,0.36,1) !important;
                position: relative;
                overflow: hidden;
            }
            body.theme-forest .period-card::before,
            body.theme-forest .key-card::before,
            body.theme-forest .inventory-card::before {
                content: '';
                position: absolute;
                top: 0; right: 0;
                width: 80px; height: 80px;
                background: radial-gradient(circle at top right, rgba(5,150,105,0.06), transparent 70%);
                transition: all 0.8s ease;
            }
            body.theme-forest .period-card:hover,
            body.theme-forest .key-card:hover,
            body.theme-forest .inventory-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 12px 40px rgba(5,150,105,0.12) !important;
            }
            body.theme-forest .period-card:hover::before,
            body.theme-forest .key-card:hover::before,
            body.theme-forest .inventory-card:hover::before {
                width: 120px; height: 120px;
            }
            body.theme-forest .table-wrap {
                border-radius: 24px !important;
                border: 1px solid rgba(5,150,105,0.06);
                overflow: hidden;
            }
            body.theme-forest .table-wrap table thead { background: linear-gradient(135deg, #059669, #047857) !important; }
            body.theme-forest .table-wrap table th { color: white; font-weight: 700; }
            body.theme-forest input, body.theme-forest select, body.theme-forest textarea {
                border-radius: 16px !important;
                border: 1.5px solid rgba(5,150,105,0.15) !important;
                transition: all 0.5s cubic-bezier(0.22,1,0.36,1) !important;
            }
            body.theme-forest input:focus, body.theme-forest select:focus, body.theme-forest textarea:focus {
                border-color: #059669 !important;
                box-shadow: 0 0 0 4px rgba(5,150,105,0.08) !important;
            }
            body.theme-forest .btn-primary {
                background: linear-gradient(135deg, #059669, #047857) !important;
                border: none !important;
                border-radius: 16px !important;
                box-shadow: 0 4px 16px rgba(5,150,105,0.25) !important;
                transition: all 0.5s cubic-bezier(0.22,1,0.36,1) !important;
            }
            body.theme-forest .btn-primary:hover {
                transform: translateY(-2px) !important;
                box-shadow: 0 8px 28px rgba(5,150,105,0.35) !important;
            }
            body.theme-forest .sh-day-header {
                background: rgba(5,150,105,0.05) !important;
                border-radius: 16px;
                border-left: 3px solid #059669;
            }
            body.theme-forest ::-webkit-scrollbar { width: 8px; }
            body.theme-forest ::-webkit-scrollbar-track { background: #f0fdf4; }
            body.theme-forest ::-webkit-scrollbar-thumb {
                background: rgba(5,150,105,0.2);
                border-radius: 10px;
            }
            body.theme-forest ::-webkit-scrollbar-thumb:hover { background: rgba(5,150,105,0.35); }
        `
    },

    // ─────────────────────────────────────────────────────────
    // THEME 4: MINIMAL — Ultra-clean, flat, monochrome, sharp
    // ─────────────────────────────────────────────────────────
    minimal: {
        name: 'Méridien',
        description: 'Minimaliste plat, monochrome strict',
        vars: {
            '--primary': '#171717',
            '--primary-light': '#404040',
            '--primary-dark': '#0a0a0a',
            '--primary-gradient': 'linear-gradient(135deg, #171717, #262626)',
            '--accent': '#ef4444',
            '--success': '#22c55e',
            '--danger': '#ef4444',
            '--warning': '#f59e0b',
            '--bg': '#fafafa',
            '--card-bg': '#ffffff',
            '--shadow': 'none',
            '--shadow-lg': 'none',
            '--shadow-hover': 'none',
            '--radius': '0px',
            '--radius-sm': '0px',
            '--transition': 'all 0.15s ease',
            '--font-family': "'Inter', system-ui, sans-serif",
            '--modern-gradient-1': 'linear-gradient(135deg, #171717, #262626)',
            '--header-bg': '#171717',
            '--header-shadow': 'none',
            '--body-bg': '#fafafa',
            '--table-stripe': '#f5f5f5',
            '--btn-radius': '0px',
            '--card-border': '1px solid #e5e5e5'
        },
        css: `
            body.theme-minimal * { border-radius: 0 !important; }
            body.theme-minimal .app-header {
                background: #171717 !important;
                box-shadow: none !important;
                border-bottom: 3px solid #171717;
            }
            body.theme-minimal .app-header .header-title {
                font-weight: 900 !important;
                letter-spacing: -0.03em;
                text-transform: uppercase;
                font-size: 14px !important;
            }
            body.theme-minimal .nav-tab {
                border-radius: 0 !important;
                text-transform: uppercase !important;
                letter-spacing: 0.1em !important;
                font-size: 11px !important;
                font-weight: 700 !important;
                transition: all 0.15s ease !important;
                border-bottom: 3px solid transparent !important;
                padding: 8px 16px !important;
            }
            body.theme-minimal .nav-tab.active {
                background: transparent !important;
                color: white !important;
                border-bottom-color: white !important;
            }
            body.theme-minimal .nav-tab:hover:not(.active) {
                background: rgba(255,255,255,0.08) !important;
                border-bottom-color: rgba(255,255,255,0.3) !important;
            }
            body.theme-minimal .period-card,
            body.theme-minimal .key-card,
            body.theme-minimal .inventory-card {
                border: 1px solid #e5e5e5 !important;
                border-radius: 0 !important;
                box-shadow: none !important;
                transition: all 0.15s ease !important;
            }
            body.theme-minimal .period-card:hover,
            body.theme-minimal .key-card:hover,
            body.theme-minimal .inventory-card:hover {
                border-color: #171717 !important;
                box-shadow: none !important;
                transform: none !important;
            }
            body.theme-minimal .metric-value,
            body.theme-minimal .key-value,
            body.theme-minimal .inv-value {
                font-weight: 900 !important;
                letter-spacing: -0.02em;
            }
            body.theme-minimal .table-wrap {
                border: 1px solid #e5e5e5 !important;
                border-radius: 0 !important;
                overflow: hidden;
            }
            body.theme-minimal .table-wrap table thead { background: #171717 !important; }
            body.theme-minimal .table-wrap table th {
                color: white !important;
                font-weight: 700;
                text-transform: uppercase;
                letter-spacing: 0.08em;
                font-size: 10px;
                padding: 12px 16px !important;
            }
            body.theme-minimal .table-wrap table td {
                border-color: #e5e5e5 !important;
                padding: 10px 16px !important;
            }
            body.theme-minimal .table-wrap table tbody tr { border-bottom: 1px solid #e5e5e5 !important; }
            body.theme-minimal .table-wrap table tbody tr:last-child { border-bottom: none !important; }
            body.theme-minimal input, body.theme-minimal select, body.theme-minimal textarea {
                border: 2px solid #e5e5e5 !important;
                border-radius: 0 !important;
                font-weight: 500;
                transition: border-color 0.15s ease !important;
            }
            body.theme-minimal input:focus, body.theme-minimal select:focus, body.theme-minimal textarea:focus {
                border-color: #171717 !important;
                box-shadow: none !important;
                outline: none !important;
            }
            body.theme-minimal .btn-primary {
                background: #171717 !important;
                border: none !important;
                border-radius: 0 !important;
                font-weight: 700 !important;
                text-transform: uppercase !important;
                letter-spacing: 0.06em !important;
                font-size: 13px !important;
                transition: all 0.15s ease !important;
            }
            body.theme-minimal .btn-primary:hover {
                background: #404040 !important;
                transform: none !important;
            }
            body.theme-minimal .sh-day-header {
                background: #f5f5f5 !important;
                border-radius: 0;
                border-left: 4px solid #171717;
                text-transform: uppercase;
                letter-spacing: 0.04em;
                font-weight: 700;
                font-size: 13px;
            }
            body.theme-minimal h3, body.theme-minimal h4 {
                font-weight: 900 !important;
                letter-spacing: -0.02em;
            }
            body.theme-minimal .form-group label {
                text-transform: uppercase !important;
                letter-spacing: 0.06em !important;
                font-size: 11px !important;
                font-weight: 700 !important;
                color: #737373 !important;
            }
            body.theme-minimal .settings-info {
                background: #f5f5f5 !important;
                border: 1px solid #e5e5e5;
                border-radius: 0;
            }
            body.theme-minimal hr { border: none !important; border-top: 2px solid #e5e5e5 !important; }
            body.theme-minimal .analytics-section-title h2 {
                font-weight: 900 !important;
                text-transform: uppercase;
                letter-spacing: -0.02em;
            }
            body.theme-minimal .section-subtitle { color: #a3a3a3 !important; }
            body.theme-minimal .last-sold-item {
                background: #ffffff !important;
                border: 1px solid #e5e5e5 !important;
                border-radius: 0;
            }
            body.theme-minimal .items-purchased { color: #737373 !important; }
            body.theme-minimal ::-webkit-scrollbar { width: 6px; }
            body.theme-minimal ::-webkit-scrollbar-track { background: #fafafa; }
            body.theme-minimal ::-webkit-scrollbar-thumb { background: #d4d4d4; }
            body.theme-minimal ::-webkit-scrollbar-thumb:hover { background: #a3a3a3; }
        `
    },

    // ─────────────────────────────────────────────────────────
    // THEME 5: SHOPIFY — Green rail, admin-style nav
    // ─────────────────────────────────────────────────────────
    shopify: {
        name: 'Shopify',
        description: 'Vert marchand, rail latéral, style admin',
        vars: {
            '--primary': '#008060',
            '--primary-light': '#33A98B',
            '--primary-dark': '#006E4E',
            '--primary-gradient': 'linear-gradient(135deg, #008060 0%, #005A40 100%)',
            '--accent': '#201F1F',
            '--success': '#00A04E',
            '--danger': '#D82C0D',
            '--warning': '#F2C94C',
            '--bg': '#F6F6F7',
            '--card-bg': '#FFFFFF',
            '--shadow': '0 1px 4px rgba(0,0,0,0.06)',
            '--shadow-lg': '0 6px 24px rgba(0,0,0,0.10)',
            '--shadow-hover': '0 10px 32px rgba(0,0,0,0.14)',
            '--radius': '10px',
            '--radius-sm': '6px',
            '--transition': 'all 0.2s ease-out',
            '--font-family': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            '--modern-gradient-1': 'linear-gradient(135deg, #008060, #005A40)',
            '--header-bg': 'linear-gradient(135deg, #008060, #005A40)',
            '--header-shadow': '0 4px 20px rgba(0,128,96,0.35)',
            '--body-bg': '#F6F6F7',
            '--table-stripe': '#FAFAFA',
            '--btn-radius': '8px',
            '--card-border': '1px solid #E3E5E7',
            '--theme-secondary': '#005A40',
            '--theme-text': '#202223',
            '--theme-border': '#E3E5E7',
            '--theme-card': '#FFFFFF',
            '--theme-bg': '#F6F6F7'
        },
        decor: `
            <div class="td-shopify-rail"><span class="td-shopify-mark"></span></div>
        `,
        css: `
            body.theme-shopify .app-header {
                background: linear-gradient(135deg, #008060, #005A40) !important;
                box-shadow: 0 4px 20px rgba(0,128,96,0.35) !important;
            }
            body.theme-shopify .app-header .header-title,
            body.theme-shopify .brand span:first-child { color: #FFFFFF !important; font-weight: 800; }
            body.theme-shopify .nav-tab { border-radius: 8px !important; transition: all 0.2s ease-out !important; }
            body.theme-shopify .nav-tab.active { background: #FFFFFF !important; color: #008060 !important; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
            body.theme-shopify .nav-tab:hover:not(.active) { background: rgba(255,255,255,0.14) !important; color: #fff !important; }
            body.theme-shopify .period-card,
            body.theme-shopify .key-card,
            body.theme-shopify .inventory-card {
                border: 1px solid #E3E5E7 !important;
                border-top: 3px solid #008060 !important;
                border-radius: 10px !important;
                box-shadow: 0 1px 4px rgba(0,0,0,0.05) !important;
                transition: all 0.2s ease-out !important;
            }
            body.theme-shopify .period-card:hover,
            body.theme-shopify .key-card:hover,
            body.theme-shopify .inventory-card:hover { transform: translateY(-3px); box-shadow: 0 10px 32px rgba(0,128,96,0.15) !important; }
            body.theme-shopify .table-wrap { border: 1px solid #E3E5E7 !important; border-radius: 10px !important; overflow: hidden; }
            body.theme-shopify .table-wrap table thead { background: linear-gradient(135deg, #008060, #005A40) !important; }
            body.theme-shopify .table-wrap table th { color: white; font-weight: 700; }
            body.theme-shopify .table-wrap table td { border-color: #EDEEEF !important; }
            body.theme-shopify input, body.theme-shopify select, body.theme-shopify textarea {
                border: 1px solid #C9CCCF !important;
                border-radius: 6px !important;
                transition: all 0.2s ease-out !important;
            }
            body.theme-shopify input:focus, body.theme-shopify select:focus, body.theme-shopify textarea:focus {
                border-color: #008060 !important;
                box-shadow: 0 0 0 3px rgba(0,128,96,0.15) !important;
            }
            body.theme-shopify .btn-primary { background: #008060 !important; border: none !important; border-radius: 8px !important; box-shadow: 0 2px 8px rgba(0,128,96,0.3) !important; transition: all 0.2s ease-out !important; }
            body.theme-shopify .btn-primary:hover { background: #006E4E !important; transform: translateY(-1px) !important; box-shadow: 0 4px 14px rgba(0,128,96,0.4) !important; }
            body.theme-shopify .sh-day-header { background: #EFFAF5 !important; border-radius: 8px; border-left: 3px solid #008060; }
            body.theme-shopify ::-webkit-scrollbar { width: 8px; }
            body.theme-shopify ::-webkit-scrollbar-track { background: transparent; }
            body.theme-shopify ::-webkit-scrollbar-thumb { background: #C9CCCF; border-radius: 8px; }
            body.theme-shopify ::-webkit-scrollbar-thumb:hover { background: #008060; }
            body.theme-shopify .td-shopify-rail { position: fixed; top: 0; bottom: 0; left: 0; width: 6px; background: linear-gradient(180deg, #008060, #005A40); z-index: 1001; pointer-events: none; }
            body.theme-shopify .td-shopify-mark { position: absolute; top: 12px; left: 50%; width: 8px; height: 8px; transform: translateX(-50%); background: #FFFFFF; border-radius: 50%; box-shadow: 0 0 6px rgba(0,0,0,0.3); }
        `
    },

    // ─────────────────────────────────────────────────────────
    // THEME 7: TOAST — Warm orange, dark command bar
    // ─────────────────────────────────────────────────────────
    toast: {
        name: 'Toast',
        description: 'Orange chaud, barre sombre, coins marqués',
        vars: {
            '--primary': '#FF6F20',
            '--primary-light': '#FF8A3D',
            '--primary-dark': '#E85C12',
            '--primary-gradient': 'linear-gradient(135deg, #FF6F20 0%, #D94B0A 100%)',
            '--accent': '#23262D',
            '--success': '#2FA44F',
            '--danger': '#D7263D',
            '--warning': '#F5A623',
            '--bg': '#F4F4F5',
            '--card-bg': '#FFFFFF',
            '--shadow': '0 2px 12px rgba(35,38,45,0.08)',
            '--shadow-lg': '0 8px 28px rgba(35,38,45,0.12)',
            '--shadow-hover': '0 12px 36px rgba(35,38,45,0.16)',
            '--radius': '14px',
            '--radius-sm': '10px',
            '--transition': 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
            '--font-family': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            '--modern-gradient-1': 'linear-gradient(135deg, #23262D, #2E323B)',
            '--header-bg': 'linear-gradient(135deg, #23262D, #2E323B)',
            '--header-shadow': '0 4px 20px rgba(35,38,45,0.35)',
            '--body-bg': '#F4F4F5',
            '--table-stripe': '#FAFAFA',
            '--btn-radius': '10px',
            '--card-border': '1px solid #E9E9EB',
            '--theme-secondary': '#D94B0A',
            '--theme-text': '#23262D',
            '--theme-border': '#E9E9EB',
            '--theme-card': '#FFFFFF',
            '--theme-bg': '#F4F4F5'
        },
        decor: `
            <div class="td-toast-corner"></div>
            <div class="td-toast-pill"><span></span><span></span><span></span></div>
        `,
        css: `
            body.theme-toast .app-header {
                background: linear-gradient(135deg, #23262D, #2E323B) !important;
                box-shadow: 0 4px 20px rgba(35,38,45,0.35) !important;
            }
            body.theme-toast .app-header .header-title,
            body.theme-toast .brand span:first-child { color: #FFFFFF !important; font-weight: 800; letter-spacing: -0.01em; }
            body.theme-toast .nav-tab { border-radius: 999px !important; transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important; }
            body.theme-toast .nav-tab.active { background: #FF6F20 !important; color: white !important; box-shadow: 0 2px 10px rgba(255,111,32,0.5); }
            body.theme-toast .nav-tab:hover:not(.active) { background: rgba(255,255,255,0.1) !important; color: #fff !important; }
            body.theme-toast .period-card,
            body.theme-toast .key-card,
            body.theme-toast .inventory-card {
                border: 1px solid #E9E9EB !important;
                border-radius: 14px !important;
                box-shadow: 0 2px 12px rgba(35,38,45,0.06) !important;
                transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important;
            }
            body.theme-toast .period-card:hover,
            body.theme-toast .key-card:hover,
            body.theme-toast .inventory-card:hover { transform: translateY(-3px); box-shadow: 0 12px 36px rgba(255,111,32,0.14) !important; border-color: #FF8A3D !important; }
            body.theme-toast .table-wrap { border: 1px solid #E9E9EB !important; border-radius: 14px !important; overflow: hidden; }
            body.theme-toast .table-wrap table thead { background: linear-gradient(135deg, #23262D, #2E323B) !important; }
            body.theme-toast .table-wrap table th { color: white; font-weight: 700; }
            body.theme-toast .table-wrap table td { border-color: #F1F1F2 !important; }
            body.theme-toast input, body.theme-toast select, body.theme-toast textarea {
                border: 1px solid #D9D9DC !important;
                border-radius: 10px !important;
                transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important;
            }
            body.theme-toast input:focus, body.theme-toast select:focus, body.theme-toast textarea:focus {
                border-color: #FF6F20 !important;
                box-shadow: 0 0 0 3px rgba(255,111,32,0.15) !important;
            }
            body.theme-toast .btn-primary { background: linear-gradient(135deg, #FF6F20, #E85C12) !important; border: none !important; border-radius: 10px !important; box-shadow: 0 4px 14px rgba(255,111,32,0.35) !important; transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important; }
            body.theme-toast .btn-primary:hover { transform: translateY(-2px) !important; box-shadow: 0 8px 24px rgba(255,111,32,0.45) !important; }
            body.theme-toast .sh-day-header { background: #FFF5EE !important; border-radius: 10px; border-left: 3px solid #FF6F20; }
            body.theme-toast ::-webkit-scrollbar { width: 8px; }
            body.theme-toast ::-webkit-scrollbar-track { background: transparent; }
            body.theme-toast ::-webkit-scrollbar-thumb { background: #D9D9DC; border-radius: 8px; }
            body.theme-toast ::-webkit-scrollbar-thumb:hover { background: #FF8A3D; }
            body.theme-toast .td-toast-corner { position: fixed; top: 0; right: 0; width: 44px; height: 44px; background: linear-gradient(135deg, rgba(255,111,32,0.9), rgba(232,92,18,0.8)); clip-path: polygon(100% 0, 0 0, 100% 100%); z-index: 1001; pointer-events: none; }
            body.theme-toast .td-toast-pill { position: fixed; bottom: 18px; right: 18px; display: flex; align-items: center; gap: 6px; padding: 8px 14px; background: rgba(255,255,255,0.92); border: 1px solid rgba(255,111,32,0.3); border-radius: 999px; box-shadow: 0 6px 20px rgba(255,111,32,0.18); z-index: 1001; pointer-events: none; }
            body.theme-toast .td-toast-pill span { width: 8px; height: 8px; border-radius: 50%; background: #FF6F20; display: inline-block; }
        `
    },

    // ─────────────────────────────────────────────────────────
    // THEME 7: LIGHTSPEED — Indigo speed, diagonal ribbon
    // ─────────────────────────────────────────────────────────
    lightspeed: {
        name: 'Lightspeed',
        description: 'Indigo rapide, rail droit, bande dynamique',
        vars: {
            '--primary': '#2F5BEA',
            '--primary-light': '#6C8DF5',
            '--primary-dark': '#1E3FB0',
            '--primary-gradient': 'linear-gradient(135deg, #2F5BEA 0%, #1E2E7A 100%)',
            '--accent': '#00C2FF',
            '--success': '#0FA87C',
            '--danger': '#E5484D',
            '--warning': '#F5A623',
            '--bg': '#F4F6FB',
            '--card-bg': '#FFFFFF',
            '--shadow': '0 2px 14px rgba(30,46,122,0.08)',
            '--shadow-lg': '0 10px 32px rgba(30,46,122,0.14)',
            '--shadow-hover': '0 14px 40px rgba(30,46,122,0.18)',
            '--radius': '8px',
            '--radius-sm': '6px',
            '--transition': 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
            '--font-family': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            '--modern-gradient-1': 'linear-gradient(135deg, #2F5BEA, #1E2E7A)',
            '--header-bg': 'linear-gradient(135deg, #2F5BEA, #1E2E7A)',
            '--header-shadow': '0 4px 24px rgba(30,46,122,0.35)',
            '--body-bg': '#F4F6FB',
            '--table-stripe': '#F8FAFF',
            '--btn-radius': '6px',
            '--card-border': '1px solid #E4E9F5',
            '--theme-secondary': '#1E2E7A',
            '--theme-text': '#1B254B',
            '--theme-border': '#E4E9F5',
            '--theme-card': '#FFFFFF',
            '--theme-bg': '#F4F6FB'
        },
        decor: `
            <div class="td-light-rail"></div>
            <div class="td-light-band"></div>
        `,
        css: `
            body.theme-lightspeed .app-header {
                background: linear-gradient(135deg, #2F5BEA, #1E2E7A) !important;
                box-shadow: 0 4px 24px rgba(30,46,122,0.35) !important;
            }
            body.theme-lightspeed .app-header .header-title,
            body.theme-lightspeed .brand span:first-child { color: #FFFFFF !important; font-weight: 800; letter-spacing: -0.02em; }
            body.theme-lightspeed .nav-tab { border-radius: 6px !important; transition: all 0.25s cubic-bezier(0.4,0,0.2,1) !important; }
            body.theme-lightspeed .nav-tab.active { background: rgba(255,255,255,0.16) !important; color: #FFFFFF !important; box-shadow: inset 0 -2px 0 #00C2FF; }
            body.theme-lightspeed .nav-tab:hover:not(.active) { background: rgba(255,255,255,0.08) !important; color: #fff !important; }
            body.theme-lightspeed .period-card,
            body.theme-lightspeed .key-card,
            body.theme-lightspeed .inventory-card {
                border: 1px solid #E4E9F5 !important;
                border-radius: 8px !important;
                box-shadow: 0 2px 14px rgba(30,46,122,0.06) !important;
                transition: all 0.25s cubic-bezier(0.4,0,0.2,1) !important;
            }
            body.theme-lightspeed .period-card:hover,
            body.theme-lightspeed .key-card:hover,
            body.theme-lightspeed .inventory-card:hover { transform: translateY(-3px); box-shadow: 0 14px 40px rgba(30,46,122,0.14) !important; border-color: #2F5BEA !important; }
            body.theme-lightspeed .table-wrap { border: 1px solid #E4E9F5 !important; border-radius: 8px !important; overflow: hidden; }
            body.theme-lightspeed .table-wrap table thead { background: linear-gradient(135deg, #2F5BEA, #1E2E7A) !important; }
            body.theme-lightspeed .table-wrap table th { color: white; font-weight: 700; letter-spacing: 0.02em; }
            body.theme-lightspeed .table-wrap table td { border-color: #EDF1FA !important; }
            body.theme-lightspeed input, body.theme-lightspeed select, body.theme-lightspeed textarea {
                border: 1px solid #D6DEF2 !important;
                border-radius: 6px !important;
                transition: all 0.25s cubic-bezier(0.4,0,0.2,1) !important;
            }
            body.theme-lightspeed input:focus, body.theme-lightspeed select:focus, body.theme-lightspeed textarea:focus {
                border-color: #2F5BEA !important;
                box-shadow: 0 0 0 3px rgba(47,91,234,0.14) !important;
            }
            body.theme-lightspeed .btn-primary { background: linear-gradient(135deg, #2F5BEA, #1E3FB0) !important; border: none !important; border-radius: 6px !important; box-shadow: 0 3px 12px rgba(47,91,234,0.35) !important; transition: all 0.25s cubic-bezier(0.4,0,0.2,1) !important; }
            body.theme-lightspeed .btn-primary:hover { transform: translateY(-1px) !important; box-shadow: 0 6px 20px rgba(47,91,234,0.45) !important; }
            body.theme-lightspeed .sh-day-header { background: #EFF3FD !important; border-radius: 6px; border-left: 3px solid #2F5BEA; }
            body.theme-lightspeed ::-webkit-scrollbar { width: 8px; }
            body.theme-lightspeed ::-webkit-scrollbar-track { background: transparent; }
            body.theme-lightspeed ::-webkit-scrollbar-thumb { background: #C3CEF0; border-radius: 6px; }
            body.theme-lightspeed ::-webkit-scrollbar-thumb:hover { background: #2F5BEA; }
            body.theme-lightspeed .td-light-rail { position: fixed; top: 0; bottom: 0; right: 0; width: 5px; background: linear-gradient(180deg, #2F5BEA, #00C2FF); z-index: 1001; pointer-events: none; }
            body.theme-lightspeed .td-light-band { position: fixed; bottom: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #1E2E7A, #2F5BEA, #00C2FF, #2F5BEA, #1E2E7A); z-index: 1001; pointer-events: none; }
        `
    },

    // ─────────────────────────────────────────────────────────
    // THEME 8: RUBY — Rouge profond, chic et chaleureux
    // ─────────────────────────────────────────────────────────
    ruby: {
        name: 'Rubis',
        description: 'Rouge profond, chic et chaleureux',
        vars: {
            '--primary': '#C0392B',
            '--primary-light': '#E74C3C',
            '--primary-dark': '#8E2C21',
            '--primary-gradient': 'linear-gradient(135deg, #C0392B 0%, #8E2C21 100%)',
            '--accent': '#7B241C',
            '--success': '#2ECC71',
            '--danger': '#D64545',
            '--warning': '#F1C40F',
            '--bg': '#FDF7F6',
            '--card-bg': '#FFFFFF',
            '--shadow': '0 2px 12px rgba(192,57,43,0.08)',
            '--shadow-lg': '0 8px 28px rgba(192,57,43,0.14)',
            '--shadow-hover': '0 12px 36px rgba(192,57,43,0.18)',
            '--radius': '16px',
            '--radius-sm': '12px',
            '--transition': 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
            '--font-family': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            '--modern-gradient-1': 'linear-gradient(135deg, #C0392B, #8E2C21)',
            '--header-bg': 'linear-gradient(135deg, #C0392B, #8E2C21)',
            '--header-shadow': '0 4px 20px rgba(192,57,43,0.35)',
            '--body-bg': '#FDF7F6',
            '--table-stripe': '#FDF1F0',
            '--btn-radius': '12px',
            '--card-border': '1px solid #F3DAD6',
            '--theme-secondary': '#8E2C21',
            '--theme-text': '#3C1613',
            '--theme-border': '#F3DAD6',
            '--theme-card': '#FFFFFF',
            '--theme-bg': '#FDF7F6'
        },
        decor: `
            <div class="td-ruby-band"></div>
        `,
        css: `
            body.theme-ruby .app-header {
                background: linear-gradient(135deg, #C0392B, #8E2C21) !important;
                box-shadow: 0 4px 20px rgba(192,57,43,0.35) !important;
            }
            body.theme-ruby .app-header .header-title,
            body.theme-ruby .brand span:first-child { color: #FFFFFF !important; font-weight: 800; }
            body.theme-ruby .nav-tab { border-radius: 12px !important; transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important; }
            body.theme-ruby .nav-tab.active { background: rgba(255,255,255,0.22) !important; color: #FFFFFF !important; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.3); }
            body.theme-ruby .nav-tab:hover:not(.active) { background: rgba(255,255,255,0.1) !important; color: #fff !important; }
            body.theme-ruby .period-card,
            body.theme-ruby .key-card,
            body.theme-ruby .inventory-card {
                border: 1px solid #F3DAD6 !important;
                border-radius: 16px !important;
                box-shadow: 0 2px 12px rgba(192,57,43,0.06) !important;
                transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important;
            }
            body.theme-ruby .period-card:hover,
            body.theme-ruby .key-card:hover,
            body.theme-ruby .inventory-card:hover { transform: translateY(-3px); box-shadow: 0 12px 36px rgba(192,57,43,0.14) !important; border-color: #E74C3C !important; }
            body.theme-ruby .table-wrap { border: 1px solid #F3DAD6 !important; border-radius: 16px !important; overflow: hidden; }
            body.theme-ruby .table-wrap table thead { background: linear-gradient(135deg, #C0392B, #8E2C21) !important; }
            body.theme-ruby .table-wrap table th { color: white; font-weight: 700; }
            body.theme-ruby .table-wrap table td { border-color: #F6E4E1 !important; }
            body.theme-ruby input, body.theme-ruby select, body.theme-ruby textarea {
                border: 1px solid #E8C3BE !important;
                border-radius: 12px !important;
                transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important;
            }
            body.theme-ruby input:focus, body.theme-ruby select:focus, body.theme-ruby textarea:focus {
                border-color: #C0392B !important;
                box-shadow: 0 0 0 3px rgba(192,57,43,0.14) !important;
            }
            body.theme-ruby .btn-primary { background: linear-gradient(135deg, #C0392B, #8E2C21) !important; border: none !important; border-radius: 12px !important; box-shadow: 0 4px 14px rgba(192,57,43,0.3) !important; transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important; }
            body.theme-ruby .btn-primary:hover { transform: translateY(-2px) !important; box-shadow: 0 8px 24px rgba(192,57,43,0.4) !important; }
            body.theme-ruby .sh-day-header { background: #FDEEEC !important; border-radius: 12px; border-left: 3px solid #C0392B; }
            body.theme-ruby ::-webkit-scrollbar { width: 8px; }
            body.theme-ruby ::-webkit-scrollbar-track { background: transparent; }
            body.theme-ruby ::-webkit-scrollbar-thumb { background: #D9A8A2; border-radius: 8px; }
            body.theme-ruby ::-webkit-scrollbar-thumb:hover { background: #C0392B; }
            body.theme-ruby .td-ruby-band { position: fixed; bottom: 0; left: 0; right: 0; height: 5px; background: linear-gradient(90deg, #8E2C21, #E74C3C, #C0392B); z-index: 1001; pointer-events: none; }
        `
    },

    // ─────────────────────────────────────────────────────────
    // THEME 9: AZUR — Bleu ciel, frais et lumineux
    // ─────────────────────────────────────────────────────────
    azur: {
        name: 'Azur',
        description: 'Bleu ciel, frais et lumineux',
        vars: {
            '--primary': '#1D7FD6',
            '--primary-light': '#4DA6F0',
            '--primary-dark': '#0F5AA8',
            '--primary-gradient': 'linear-gradient(135deg, #1D7FD6 0%, #0F5AA8 100%)',
            '--accent': '#0B3D73',
            '--success': '#10B981',
            '--danger': '#EF4444',
            '--warning': '#F59E0B',
            '--bg': '#F3F8FE',
            '--card-bg': '#FFFFFF',
            '--shadow': '0 2px 12px rgba(29,127,214,0.08)',
            '--shadow-lg': '0 8px 28px rgba(29,127,214,0.14)',
            '--shadow-hover': '0 12px 36px rgba(29,127,214,0.18)',
            '--radius': '14px',
            '--radius-sm': '10px',
            '--transition': 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
            '--font-family': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            '--modern-gradient-1': 'linear-gradient(135deg, #1D7FD6, #0F5AA8)',
            '--header-bg': 'linear-gradient(135deg, #1D7FD6, #0F5AA8)',
            '--header-shadow': '0 4px 20px rgba(29,127,214,0.35)',
            '--body-bg': '#F3F8FE',
            '--table-stripe': '#EDF6FF',
            '--btn-radius': '10px',
            '--card-border': '1px solid #D8E9FA',
            '--theme-secondary': '#0F5AA8',
            '--theme-text': '#15324F',
            '--theme-border': '#D8E9FA',
            '--theme-card': '#FFFFFF',
            '--theme-bg': '#F3F8FE'
        },
        decor: `
            <div class="td-azur-line"></div>
        `,
        css: `
            body.theme-azur .app-header {
                background: linear-gradient(135deg, #1D7FD6, #0F5AA8) !important;
                box-shadow: 0 4px 20px rgba(29,127,214,0.35) !important;
            }
            body.theme-azur .app-header .header-title,
            body.theme-azur .brand span:first-child { color: #FFFFFF !important; font-weight: 800; }
            body.theme-azur .nav-tab { border-radius: 10px !important; transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important; }
            body.theme-azur .nav-tab.active { background: rgba(255,255,255,0.22) !important; color: #FFFFFF !important; box-shadow: inset 0 -2px 0 #FFFFFF; }
            body.theme-azur .nav-tab:hover:not(.active) { background: rgba(255,255,255,0.1) !important; color: #fff !important; }
            body.theme-azur .period-card,
            body.theme-azur .key-card,
            body.theme-azur .inventory-card {
                border: 1px solid #D8E9FA !important;
                border-radius: 14px !important;
                box-shadow: 0 2px 12px rgba(29,127,214,0.06) !important;
                transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important;
            }
            body.theme-azur .period-card:hover,
            body.theme-azur .key-card:hover,
            body.theme-azur .inventory-card:hover { transform: translateY(-3px); box-shadow: 0 12px 36px rgba(29,127,214,0.14) !important; border-color: #4DA6F0 !important; }
            body.theme-azur .table-wrap { border: 1px solid #D8E9FA !important; border-radius: 14px !important; overflow: hidden; }
            body.theme-azur .table-wrap table thead { background: linear-gradient(135deg, #1D7FD6, #0F5AA8) !important; }
            body.theme-azur .table-wrap table th { color: white; font-weight: 700; }
            body.theme-azur .table-wrap table td { border-color: #E3F0FC !important; }
            body.theme-azur input, body.theme-azur select, body.theme-azur textarea {
                border: 1px solid #BBD8F4 !important;
                border-radius: 10px !important;
                transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important;
            }
            body.theme-azur input:focus, body.theme-azur select:focus, body.theme-azur textarea:focus {
                border-color: #1D7FD6 !important;
                box-shadow: 0 0 0 3px rgba(29,127,214,0.14) !important;
            }
            body.theme-azur .btn-primary { background: linear-gradient(135deg, #1D7FD6, #0F5AA8) !important; border: none !important; border-radius: 10px !important; box-shadow: 0 4px 14px rgba(29,127,214,0.3) !important; transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important; }
            body.theme-azur .btn-primary:hover { transform: translateY(-2px) !important; box-shadow: 0 8px 24px rgba(29,127,214,0.4) !important; }
            body.theme-azur .sh-day-header { background: #EAF4FE !important; border-radius: 10px; border-left: 3px solid #1D7FD6; }
            body.theme-azur ::-webkit-scrollbar { width: 8px; }
            body.theme-azur ::-webkit-scrollbar-track { background: transparent; }
            body.theme-azur ::-webkit-scrollbar-thumb { background: #A9CCEB; border-radius: 8px; }
            body.theme-azur ::-webkit-scrollbar-thumb:hover { background: #1D7FD6; }
            body.theme-azur .td-azur-line { position: fixed; top: 0; bottom: 0; left: 0; width: 5px; background: linear-gradient(180deg, #4DA6F0, #0F5AA8); z-index: 1001; pointer-events: none; }
        `
    },

    // ─────────────────────────────────────────────────────────
    // THEME 10: NUIT — Sombre profond, accent électrique
    // ─────────────────────────────────────────────────────────
    nuit: {
        name: 'Nuit',
        description: 'Sombre profond, accent électrique',
        vars: {
            '--primary': '#7C8CF8',
            '--primary-light': '#9AA8FF',
            '--primary-dark': '#5A68D6',
            '--primary-gradient': 'linear-gradient(135deg, #7C8CF8 0%, #5A68D6 100%)',
            '--accent': '#00E5FF',
            '--success': '#34D399',
            '--danger': '#F87171',
            '--warning': '#FBBF24',
            '--bg': '#0F1117',
            '--card-bg': '#1A1E29',
            '--shadow': '0 4px 20px rgba(0,0,0,0.4)',
            '--shadow-lg': '0 10px 36px rgba(0,0,0,0.5)',
            '--shadow-hover': '0 14px 44px rgba(0,0,0,0.55)',
            '--radius': '16px',
            '--radius-sm': '12px',
            '--transition': 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
            '--font-family': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            '--modern-gradient-1': 'linear-gradient(135deg, #7C8CF8, #5A68D6)',
            '--header-bg': 'linear-gradient(135deg, #151A26, #1E2434)',
            '--header-shadow': '0 4px 24px rgba(0,0,0,0.5)',
            '--body-bg': '#0F1117',
            '--table-stripe': 'rgba(255,255,255,0.02)',
            '--btn-radius': '12px',
            '--card-border': '1px solid #2A2F3F',
            '--theme-secondary': '#5A68D6',
            '--theme-text': '#E5E7F0',
            '--theme-border': '#2A2F3F',
            '--theme-card': '#1A1E29',
            '--theme-bg': '#0F1117'
        },
        decor: `
            <div class="td-nuit-glow"></div>
        `,
        css: `
            body.theme-nuit .app-header {
                background: linear-gradient(135deg, #151A26, #1E2434) !important;
                box-shadow: 0 4px 24px rgba(0,0,0,0.5) !important;
                border-bottom: 1px solid #2A2F3F;
            }
            body.theme-nuit .app-header .header-title,
            body.theme-nuit .brand span:first-child { color: #FFFFFF !important; font-weight: 800; }
            body.theme-nuit .nav-tab { border-radius: 12px !important; transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important; color: #C6CBDD; }
            body.theme-nuit .nav-tab.active { background: rgba(124,140,248,0.2) !important; color: #9AA8FF !important; box-shadow: inset 0 0 0 1px rgba(124,140,248,0.4); }
            body.theme-nuit .nav-tab:hover:not(.active) { background: rgba(255,255,255,0.08) !important; color: #fff !important; }
            body.theme-nuit .period-card,
            body.theme-nuit .key-card,
            body.theme-nuit .inventory-card {
                background: #1A1E29 !important;
                border: 1px solid #2A2F3F !important;
                border-radius: 16px !important;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3) !important;
                transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important;
            }
            body.theme-nuit .period-card:hover,
            body.theme-nuit .key-card:hover,
            body.theme-nuit .inventory-card:hover { transform: translateY(-3px); box-shadow: 0 14px 44px rgba(0,0,0,0.5) !important; border-color: #7C8CF8 !important; }
            body.theme-nuit .table-wrap { border: 1px solid #2A2F3F !important; border-radius: 16px !important; overflow: hidden; background: #1A1E29; }
            body.theme-nuit .table-wrap table thead { background: linear-gradient(135deg, #7C8CF8, #5A68D6) !important; }
            body.theme-nuit .table-wrap table th { color: white; font-weight: 700; }
            body.theme-nuit .table-wrap table td { border-color: #2A2F3F !important; color: #E5E7F0; }
            body.theme-nuit input, body.theme-nuit select, body.theme-nuit textarea {
                background: #141824 !important;
                color: #E5E7F0 !important;
                border: 1px solid #2A2F3F !important;
                border-radius: 12px !important;
                transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important;
            }
            body.theme-nuit input:focus, body.theme-nuit select:focus, body.theme-nuit textarea:focus {
                border-color: #7C8CF8 !important;
                box-shadow: 0 0 0 3px rgba(124,140,248,0.18) !important;
            }
            body.theme-nuit .btn-primary { background: linear-gradient(135deg, #7C8CF8, #5A68D6) !important; border: none !important; border-radius: 12px !important; box-shadow: 0 4px 18px rgba(124,140,248,0.35) !important; transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important; }
            body.theme-nuit .btn-primary:hover { transform: translateY(-2px) !important; box-shadow: 0 8px 28px rgba(124,140,248,0.5) !important; }
            body.theme-nuit .sh-day-header { background: rgba(124,140,248,0.08) !important; border-radius: 12px; border-left: 3px solid #7C8CF8; color: #E5E7F0; }
            body.theme-nuit ::-webkit-scrollbar { width: 8px; }
            body.theme-nuit ::-webkit-scrollbar-track { background: transparent; }
            body.theme-nuit ::-webkit-scrollbar-thumb { background: #3A4052; border-radius: 8px; }
            body.theme-nuit ::-webkit-scrollbar-thumb:hover { background: #7C8CF8; }
            body.theme-nuit .td-nuit-glow { position: fixed; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #00E5FF, #7C8CF8, #00E5FF); z-index: 1001; pointer-events: none; }
        `
    },

    // ─────────────────────────────────────────────────────────
    // THEME 11: TERRE — Terracotta chaud, or cuivré
    // ─────────────────────────────────────────────────────────
    terre: {
        name: 'Terre',
        description: 'Terracotta chaud, or cuivré',
        vars: {
            '--primary': '#C86A2B',
            '--primary-light': '#E0884A',
            '--primary-dark': '#9C4F1D',
            '--primary-gradient': 'linear-gradient(135deg, #C86A2B 0%, #9C4F1D 100%)',
            '--accent': '#B8860B',
            '--success': '#C9A227',
            '--danger': '#C0392B',
            '--warning': '#D97706',
            '--bg': '#FBF6EF',
            '--card-bg': '#FFFFFF',
            '--shadow': '0 2px 12px rgba(200,106,43,0.08)',
            '--shadow-lg': '0 8px 28px rgba(200,106,43,0.14)',
            '--shadow-hover': '0 12px 36px rgba(200,106,43,0.18)',
            '--radius': '18px',
            '--radius-sm': '12px',
            '--transition': 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
            '--font-family': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            '--modern-gradient-1': 'linear-gradient(135deg, #C86A2B, #9C4F1D)',
            '--header-bg': 'linear-gradient(135deg, #C86A2B, #9C4F1D)',
            '--header-shadow': '0 4px 20px rgba(200,106,43,0.35)',
            '--body-bg': '#FBF6EF',
            '--table-stripe': '#F9F1E4',
            '--btn-radius': '12px',
            '--card-border': '1px solid #EFDFC8',
            '--theme-secondary': '#9C4F1D',
            '--theme-text': '#4A2A12',
            '--theme-border': '#EFDFC8',
            '--theme-card': '#FFFFFF',
            '--theme-bg': '#FBF6EF'
        },
        decor: `
            <div class="td-terre-rule"></div>
        `,
        css: `
            body.theme-terre .app-header {
                background: linear-gradient(135deg, #C86A2B, #9C4F1D) !important;
                box-shadow: 0 4px 20px rgba(200,106,43,0.35) !important;
            }
            body.theme-terre .app-header .header-title,
            body.theme-terre .brand span:first-child { color: #FFFFFF !important; font-weight: 800; }
            body.theme-terre .nav-tab { border-radius: 12px !important; transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important; }
            body.theme-terre .nav-tab.active { background: rgba(255,255,255,0.22) !important; color: #FFFFFF !important; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.3); }
            body.theme-terre .nav-tab:hover:not(.active) { background: rgba(255,255,255,0.1) !important; color: #fff !important; }
            body.theme-terre .period-card,
            body.theme-terre .key-card,
            body.theme-terre .inventory-card {
                border: 1px solid #EFDFC8 !important;
                border-radius: 18px !important;
                box-shadow: 0 2px 12px rgba(200,106,43,0.06) !important;
                transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important;
            }
            body.theme-terre .period-card:hover,
            body.theme-terre .key-card:hover,
            body.theme-terre .inventory-card:hover { transform: translateY(-3px); box-shadow: 0 12px 36px rgba(200,106,43,0.14) !important; border-color: #E0884A !important; }
            body.theme-terre .table-wrap { border: 1px solid #EFDFC8 !important; border-radius: 18px !important; overflow: hidden; }
            body.theme-terre .table-wrap table thead { background: linear-gradient(135deg, #C86A2B, #9C4F1D) !important; }
            body.theme-terre .table-wrap table th { color: white; font-weight: 700; }
            body.theme-terre .table-wrap table td { border-color: #F3E6D0 !important; }
            body.theme-terre input, body.theme-terre select, body.theme-terre textarea {
                border: 1px solid #E4CFAE !important;
                border-radius: 12px !important;
                transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important;
            }
            body.theme-terre input:focus, body.theme-terre select:focus, body.theme-terre textarea:focus {
                border-color: #C86A2B !important;
                box-shadow: 0 0 0 3px rgba(200,106,43,0.14) !important;
            }
            body.theme-terre .btn-primary { background: linear-gradient(135deg, #C86A2B, #9C4F1D) !important; border: none !important; border-radius: 12px !important; box-shadow: 0 4px 14px rgba(200,106,43,0.3) !important; transition: all 0.3s cubic-bezier(0.4,0,0.2,1) !important; }
            body.theme-terre .btn-primary:hover { transform: translateY(-2px) !important; box-shadow: 0 8px 24px rgba(200,106,43,0.4) !important; }
            body.theme-terre .sh-day-header { background: #F9F0E2 !important; border-radius: 12px; border-left: 3px solid #C86A2B; }
            body.theme-terre ::-webkit-scrollbar { width: 8px; }
            body.theme-terre ::-webkit-scrollbar-track { background: transparent; }
            body.theme-terre ::-webkit-scrollbar-thumb { background: #D8BE9A; border-radius: 8px; }
            body.theme-terre ::-webkit-scrollbar-thumb:hover { background: #C86A2B; }
            body.theme-terre .td-terre-rule { position: fixed; top: 0; right: 0; width: 6px; height: 100%; background: linear-gradient(180deg, #C9A227, #C86A2B, #9C4F1D); z-index: 1001; pointer-events: none; }
        `
    }
};

