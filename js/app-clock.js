// ============================================================
// APP: Application Initialization
// ============================================================

// Clock update function
function updateClock() {
    if (DOM.clockDisplay) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: false 
        });
        DOM.clockDisplay.textContent = timeStr;
    }
}

// Start clock interval
function startClock() {
    updateClock();
    setInterval(updateClock, 1000);
}
