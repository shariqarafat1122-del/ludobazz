import { useCallback, useRef } from 'react';

type SoundType = 'dice_roll' | 'token_move' | 'capture' | 'win' | 'turn_change'
  | 'home_entry' | 'life_lost' | 'timer_tick' | 'join' | 'notification';

export function useSound(enabled: boolean = true) {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return ctxRef.current;
  }, []);

  const play = useCallback((type: SoundType) => {
    if (!enabled) return;
    try {
      const ctx = getCtx();

      const beep = (freq: number, dur: number, vol = 0.2, type_: OscillatorType = 'sine', delay = 0) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = type_;
        gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + dur);
      };

      switch (type) {
        case 'dice_roll':
          for (let i = 0; i < 6; i++) {
            setTimeout(() => beep(150 + Math.random() * 200, 0.08, 0.1, 'sawtooth'), i * 70);
          }
          break;
        case 'token_move':
          beep(600, 0.1, 0.15);
          beep(800, 0.1, 0.12, 'sine', 0.1);
          break;
        case 'capture':
          beep(400, 0.15, 0.2, 'square');
          beep(200, 0.25, 0.15, 'sawtooth', 0.1);
          break;
        case 'win':
          [523, 659, 784, 1047, 1319].forEach((f, i) => beep(f, 0.3, 0.2, 'sine', i * 0.12));
          break;
        case 'life_lost':
          beep(300, 0.2, 0.25, 'square');
          beep(200, 0.3, 0.2, 'sawtooth', 0.15);
          break;
        case 'timer_tick':
          beep(880, 0.05, 0.1);
          break;
        case 'turn_change':
          beep(440, 0.1, 0.15);
          beep(550, 0.1, 0.12, 'sine', 0.1);
          break;
        case 'join':
          beep(600, 0.15, 0.2);
          beep(800, 0.15, 0.18, 'sine', 0.12);
          beep(1000, 0.2, 0.15, 'sine', 0.24);
          break;
        case 'notification':
          beep(700, 0.1, 0.15);
          beep(900, 0.15, 0.12, 'sine', 0.1);
          break;
      }
    } catch (_) { /* ignore */ }
  }, [enabled, getCtx]);

  return { play };
}
