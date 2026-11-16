const modeSelect = document.getElementById('modeSelect');
const volumeRange = document.getElementById('volumeRange');
const volumeLabel = document.getElementById('volumeLabel');
const statusText = document.getElementById('statusText');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');

let audioCtx = null;
let gainNode = null;
let oscillator = null;
let sweepTimer = null;

const cycleSettings = {
  quick: { duration: 8000, startHz: 200, endHz: 4500 },
  deep: { duration: 15000, startHz: 180, endHz: 7000 },
};

function updateVolumeLabel() {
  volumeLabel.textContent = `${volumeRange.value}%`;
}

function ensureAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  if (!gainNode) {
    gainNode = audioCtx.createGain();
    gainNode.gain.value = 0;
    gainNode.connect(audioCtx.destination);
  }
}

function stopSweep() {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }

  if (oscillator) {
    const now = audioCtx.currentTime;
    gainNode.gain.cancelScheduledValues(now);
    gainNode.gain.setValueAtTime(gainNode.gain.value, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    oscillator.stop(now + 0.15);
    oscillator.disconnect();
    oscillator = null;
  }

  statusText.textContent = 'Stopped: speaker cleaning cycle ended.';
}

function startSweep() {
  ensureAudio();

  if (oscillator) {
    stopSweep();
  }

  const mode = modeSelect.value;
  const settings = cycleSettings[mode];
  const volume = Number(volumeRange.value) / 100;

  oscillator = audioCtx.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(settings.startHz, audioCtx.currentTime);

  gainNode.gain.cancelScheduledValues(audioCtx.currentTime);
  gainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(Math.max(0.02, volume * 0.12), audioCtx.currentTime + 0.15);

  oscillator.connect(gainNode);
  oscillator.start();

  const start = audioCtx.currentTime;
  const end = start + settings.duration / 1000;

  oscillator.frequency.exponentialRampToValueAtTime(settings.endHz, end);
  oscillator.frequency.setValueAtTime(settings.endHz, end);

  sweepTimer = setInterval(() => {
    const elapsed = Date.now() - sweepStartTime;
    if (elapsed >= settings.duration) {
      stopSweep();
    }
  }, 80);

  const sweepStartTime = Date.now();
  statusText.textContent = `Cleaning in ${mode === 'quick' ? 'Quick' : 'Deep'} mode: speaker sweep in progress.`;
}

startBtn.addEventListener('click', startSweep);
stopBtn.addEventListener('click', stopSweep);
volumeRange.addEventListener('input', updateVolumeLabel);

updateVolumeLabel();
