// The Gilded Vault — sound: tiny WebAudio bleeps generated in code, no files.
// Everything is guarded: no audio context exists until the first key or click,
// and any failure just leaves the game silent.
export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context) return context;
    try {
      const Ctor = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    } catch {
      context = null;
    }
    return context;
  }

  /** One short tone: frequency in Hz, length in seconds, wave type, volume. */
  function tone(freq, seconds, type = 'sine', gain = 0.08) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx || ctx.state === 'suspended') {
      if (ctx) ctx.resume().catch(() => {});
      if (!ctx || ctx.state === 'suspended') return;
    }
    try {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      amp.gain.setValueAtTime(gain, ctx.currentTime);
      amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + seconds);
      osc.connect(amp).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + seconds);
    } catch {
      // Silence is acceptable: the game never depends on sound.
    }
  }

  return {
    /** The alarm is rising: a soft tick, throttled by the caller. */
    alert() {
      tone(620, 0.07, 'square', 0.03);
    },
    /** The Sunstone is grabbed: two bright notes. */
    pickup() {
      tone(880, 0.12, 'sine', 0.09);
      window.setTimeout(() => tone(1318, 0.18, 'sine', 0.09), 90);
    },
    /** Caught: a low buzz. */
    caught() {
      tone(140, 0.35, 'sawtooth', 0.1);
    },
    /** Getaway: a short rising arpeggio. */
    win() {
      [523, 659, 784, 1046].forEach((freq, i) => {
        window.setTimeout(() => tone(freq, 0.22, 'triangle', 0.09), i * 110);
      });
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    isMuted() {
      return muted;
    },
  };
}
