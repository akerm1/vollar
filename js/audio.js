// ============================================================
// AUDIO: Audio System
// ============================================================
function playTone(freq, duration, type = 'sine') {
    try {
        if (!audioCtx) {
            audioCtx = new(window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = 0.3;
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (_) { /* silently fail */ }
}

// ============================================================
// VIBRATION FEEDBACK - controlled by settings.vibrationEnabled
// ============================================================
function vibrateFeedback(pattern) {
    if (window.__vibrationEnabled !== true) return;
    try {
        if (navigator && typeof navigator.vibrate === 'function') {
            navigator.vibrate(pattern);
        }
    } catch (_) { /* silently fail */ }
}

function playSuccess() { if (window.__soundEnabled !== false) playTone(880, 0.08, 'sine'); vibrateFeedback([30]); }
// ^-- Settings: soundEnabled → désactiver les sons de succès (transaction terminée)
function playError() { if (window.__soundEnabled !== false) playTone(150, 0.25, 'sawtooth'); vibrateFeedback([120]); }
// ^-- Settings: soundEnabled → désactiver les sons d'erreur (stock insuffisant, échec)
function playScan() { if (window.__soundEnabled !== false) playTone(440, 0.05, 'square'); vibrateFeedback([15]); }
// ^-- Settings: soundEnabled → désactiver le bip de scan (produit ajouté au panier)
function playWarning() { if (window.__soundEnabled !== false) playTone(300, 0.15, 'triangle'); vibrateFeedback([60]); }
// ^-- Settings: soundEnabled → désactiver les sons d'avertissement

// ============================================================
// PLAY METER SOUND - Special sound for meter products
// ============================================================
function playMeterSound() {
    if (window.__soundEnabled === false) return;
    // ^-- Settings: soundEnabled → désactiver le son spécial des produits au mètre
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Play a two-tone chime specifically for meter products
        // First tone - lower
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.frequency.value = 600;
        osc1.type = 'sine';
        gain1.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        osc1.start(audioCtx.currentTime);
        osc1.stop(audioCtx.currentTime + 0.1);
        
        // Second tone - higher (after a short delay)
        setTimeout(() => {
            const osc2 = audioCtx.createOscillator();
            const gain2 = audioCtx.createGain();
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);
            osc2.frequency.value = 900;
            osc2.type = 'sine';
            gain2.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
            osc2.start(audioCtx.currentTime);
            osc2.stop(audioCtx.currentTime + 0.1);
        }, 120);
        
        console.log('🔊 Meter sound played');
    } catch (error) {
        console.log('⚠️ Could not play meter sound:', error);
        // Fallback to scan sound
        if (typeof playScan === 'function') {
            playScan();
        }
    }
}