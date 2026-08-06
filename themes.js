// Theme Management System
const themes = {
    modern: {
        name: 'Modern Gradient',
        primary: '#6C63FF',
        secondary: '#4A42D8',
        bg: 'linear-gradient(135deg, #f0fdfa 0%, #e0f2fe 40%, #f5f3ff 70%, #fdf2f8 100%)',
        card: '#FFFFFF',
        text: '#1a1a2e',
        border: 'rgba(108, 99, 255, 0.1)'
    },
    dark: {
        name: 'Dark Professional',
        primary: '#7C4DFF',
        secondary: '#512DA8',
        bg: '#121212',
        card: '#1E1E1E',
        text: '#E0E0E0',
        border: 'rgba(255, 255, 255, 0.1)'
    },
    light: {
        name: 'Light Minimal',
        primary: '#4CAF50',
        secondary: '#2E7D32',
        bg: '#FAFAFA',
        card: '#FFFFFF',
        text: '#212121',
        border: 'rgba(0, 0, 0, 0.08)'
    },
    contrast: {
        name: 'High Contrast',
        primary: '#FF5722',
        secondary: '#E64A19',
        bg: '#FFFFFF',
        card: '#F5F5F5',
        text: '#000000',
        border: 'rgba(0, 0, 0, 0.2)'
    },
    colorful: {
        name: 'Colorful Retail',
        primary: '#FF4081',
        secondary: '#C2185B',
        bg: '#F8F9FF',
        card: '#FFFFFF',
        text: '#1A1A2E',
        border: 'rgba(255, 64, 129, 0.1)'
    }
};

function applyTheme(themeId) {
    const theme = themes[themeId] || themes.modern;
    document.documentElement.style.setProperty('--theme-primary', theme.primary);
    document.documentElement.style.setProperty('--theme-secondary', theme.secondary);
    document.documentElement.style.setProperty('--theme-bg', theme.bg);
    document.documentElement.style.setProperty('--theme-card', theme.card);
    document.documentElement.style.setProperty('--theme-text', theme.text);
    document.documentElement.style.setProperty('--theme-border', theme.border);
    document.documentElement.style.setProperty('--scrollbar-thumb', theme.primary);
    document.documentElement.style.setProperty('--scrollbar-track', theme.bg.includes('gradient') ? 'rgba(108, 99, 255, 0.05)' : `${theme.primary}20`);
    
    // Update theme class on body
    document.body.className = '';
    document.body.classList.add(`theme-${themeId}`);
    
    // Save to settings
    if (window.saveSettings) {
        saveSettings({ theme: themeId });
    }
}

function renderThemeSelector() {
    const container = document.getElementById('theme-selector');
    if (!container) return;
    
    container.innerHTML = '';
    
    Object.entries(themes).forEach(([id, theme]) => {
        const themeEl = document.createElement('div');
        themeEl.className = 'theme-option';
        themeEl.dataset.theme = id;
        themeEl.innerHTML = `
            <div class="theme-preview" style="background: ${theme.bg};">
                <div class="theme-card" style="background: ${theme.card}; border-color: ${theme.border};">
                    <span style="color: ${theme.primary};">●</span>
                    <span style="color: ${theme.text};">${theme.name}</span>
                </div>
            </div>
        `;
        themeEl.addEventListener('click', () => applyTheme(id));
        container.appendChild(themeEl);
    });
}

// Initialize theme from settings or use default
function initTheme() {
    if (window.loadSettings) {
        loadSettings().then(settings => {
            applyTheme(settings?.theme || 'modern');
        });
    } else {
        applyTheme('modern');
    }
    
    // Render theme selector if available
    setTimeout(renderThemeSelector, 500);
}

// Add CSS for theme selector
const themeStyles = document.createElement('style');
themeStyles.textContent = `
.theme-option {
    display: inline-block;
    margin: 0 12px 12px 0;
    cursor: pointer;
    transition: transform 0.3s ease;
}

.theme-option:hover {
    transform: translateY(-3px);
}

.theme-preview {
    width: 140px;
    height: 100px;
    border-radius: 12px;
    overflow: hidden;
    padding: 12px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    transition: all 0.3s ease;
}

.theme-option:hover .theme-preview {
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

.theme-card {
    width: 100%;
    height: 100%;
    border-radius: 8px;
    border: 1px solid;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 600;
}
`;
document.head.appendChild(themeStyles);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
} else {
    initTheme();
}