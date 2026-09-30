import type { RuntimeContext, MusicId } from "./types";
// Extracted original rules/controller; all cross-domain access is explicit.
import INTRO_SRC from "../assets/music/intro.mp3";
import MUSIC_SRC from "../assets/music/theme.mp3";

export function installAudio(ctx: RuntimeContext) {
  const life = ctx.life,
    abort = (ctx.audioAbort = new AbortController());
  const retryAtHandoff = new Set<MusicId>();
  life.add(() => {
    abort.abort();
    retryAtHandoff.clear();
    ctx.MUSIC.started = false;
    for (const t of Object.values(ctx.MUSIC.T)) {
      if (t.src) {
        t.src.onended = null;
        try {
          t.src.stop();
        } catch {}
        t.src!.disconnect();
      }
      t.g?.disconnect();
      t.src = t.g = t.buf = null;
      t.loading = false;
    }
    ctx.MUSIC.gain?.disconnect();
    ctx.MUSIC.gain = null;
    if (ctx.SND.ctx) {
      ctx.SND.ctx.close().catch(() => {});
      ctx.SND.ctx = null;
    }
    ctx.SND.buf = null;
  });
  ctx.SND = {
    ctx: null,
    on: true,
    buf: null,
    init() {
      if (this.ctx || life.disposed) return;
      try {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {}
    },
    noise() {
      if (this.buf) return this.buf;
      const c = this.ctx;
      if (!c) return null;
      const len = Math.round(c.sampleRate * 1.5),
        b = c.createBuffer(1, len, c.sampleRate),
        d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      return (this.buf = b);
    },
    play(type) {
      if (!this.on || !this.ctx || life.disposed || this.ctx.state === "closed")
        return;
      const c = this.ctx;
      if (c.state === "suspended") c.resume().catch(() => {});
      const t = c.currentTime;
      const buf = this.noise();
      if (!buf) return;
      // One grain of filtered noise, swept in frequency: reads as a scratch, not a tone.
      const grain = (
        st: number,
        dur: number,
        vol: number,
        f0: number,
        f1: number,
        q: number,
        ftype?: BiquadFilterType,
      ) => {
        const off = Math.random() * (buf.duration - dur - 0.05),
          src = c.createBufferSource();
        src.buffer = buf;
        const filt = c.createBiquadFilter();
        filt.type = ftype || "bandpass";
        filt.Q.value = q || 2.5;
        filt.frequency.setValueAtTime(f0, t + st);
        filt.frequency.exponentialRampToValueAtTime(
          Math.max(f1 || f0, 40),
          t + st + dur,
        );
        const g = c.createGain();
        g.gain.setValueAtTime(0, t + st);
        g.gain.linearRampToValueAtTime(
          vol,
          t + st + Math.min(0.008, dur * 0.3),
        );
        g.gain.exponentialRampToValueAtTime(0.0001, t + st + dur);
        src.connect(filt).connect(g).connect(c.destination);
        src.start(t + st, off, dur + 0.02);
      };
      // A cluster of tiny grains in quick, uneven succession: a shuffle of pages.
      const shuffle = (
        st: number,
        n: number,
        spread: number,
        vol: number,
        lo: number,
        hi: number,
      ) => {
        for (let i = 0; i < n; i++) {
          const r = Math.random();
          grain(
            st + r * spread,
            0.025 + Math.random() * 0.03,
            vol * (0.55 + Math.random() * 0.45),
            lo + r * (hi - lo),
            lo + Math.random() * (hi - lo),
            3 + Math.random() * 5,
          );
        }
      };
      switch (type) {
        case "tap":
          grain(0, 0.035, 0.08, 3200, 2200, 3);
          break;
        case "buy":
          shuffle(0, 3, 0.07, 0.09, 1200, 2800);
          break;
        case "deny":
          grain(0, 0.16, 0.11, 500, 120, 1.4, "lowpass");
          break;
        case "event":
          shuffle(0, 4, 0.14, 0.08, 700, 2400);
          break;
        case "alert":
          grain(0, 0.2, 0.1, 300, 900, 2);
          grain(0.16, 0.24, 0.09, 260, 800, 2);
          break;
        case "major":
          shuffle(0, 8, 0.45, 0.09, 500, 3400);
          break;
        case "win":
          shuffle(0, 11, 0.7, 0.1, 600, 4200);
          break;
        case "lose":
          grain(0, 0.4, 0.12, 260, 90, 1, "lowpass");
          grain(0.3, 0.5, 0.1, 180, 70, 1, "lowpass");
          break;
      }
    },
  };
  ctx.MUSIC = {
    on: true,
    started: false,
    cur: "intro",
    gain: null,
    T: {
      intro: { vol: 0.76, pos: 0, then: "theme" },
      theme: { vol: 1, pos: 0, loop: [2.25, 240.25] },
    },
    init() {
      this.load(this.cur);
      if (this.on) this.start();
    },
    load(k) {
      const t = this.T[k],
        d = k === "intro" ? INTRO_SRC : MUSIC_SRC;
      if (t.buf || t.loading || !d || life.disposed) return;
      ctx.SND.init();
      const c = ctx.SND.ctx;
      if (!c || c.state === "closed") return;
      t.loading = true;
      fetch(d, { signal: abort.signal })
        .then((r) => {
          if (!r.ok) throw new Error("Audio asset " + r.status);
          return r.arrayBuffer();
        })
        .then((a) => {
          if (life.disposed || c.state === "closed")
            throw new Error("Audio runtime closed");
          return c.decodeAudioData(a);
        })
        .then((buf) => {
          t.loading = false;
          retryAtHandoff.delete(k);
          if (life.disposed || c.state === "closed" || c !== ctx.SND.ctx)
            return;
          t.buf = buf;
          this.play();
        })
        .catch(() => {
          t.loading = false;
          // A handoff during an in-flight prefetch gets one recovery attempt.
          // A failed handoff request itself is not recursively retried.
          if (
            retryAtHandoff.delete(k) &&
            !life.disposed &&
            c.state !== "closed"
          )
            this.load(k);
        });
    },
    // start() says music is wanted; play() makes the current track audible once it is decoded.
    start() {
      if (life.disposed) return;
      this.started = true;
      this.play();
    },
    play() {
      const c = ctx.SND.ctx,
        t = this.T[this.cur];
      if (
        !this.on ||
        !this.started ||
        !t.buf ||
        t.src ||
        !c ||
        life.disposed ||
        c.state === "closed"
      )
        return;
      if (!this.gain) {
        this.gain = c.createGain();
        this.gain.gain.value = 0.35;
        this.gain.connect(c.destination);
      }
      const s = c.createBufferSource(),
        g = c.createGain();
      s.buffer = t.buf;
      g.gain.value = t.vol;
      if (t.loop) {
        s.loop = true;
        s.loopStart = t.loop[0];
        s.loopEnd = t.loop[1];
      }
      // A track that runs out hands off to the next, which decodes while this one plays.
      else {
        s.onended = () => {
          if (!life.disposed && t.src === s) this.next();
        };
        this.load(t.then!);
      }
      s.connect(g).connect(this.gain);
      try {
        s.start(0, t.pos);
      } catch {
        s.onended = null;
        s.disconnect();
        g.disconnect();
        return;
      }
      t.src = s;
      t.g = g;
      t.t0 = c.currentTime - t.pos;
      if (c.state === "suspended") {
        const r = c.resume();
        if (r && r.catch) r.catch(() => {});
      }
    },
    // The intro has played out: let its buffer go and move on for good.
    next() {
      if (life.disposed) return;
      const t = this.T[this.cur];
      if (!t.then) return;
      if (t.src) t.src.onended = null;
      t.src?.disconnect();
      t.g?.disconnect();
      t.src = t.g = t.buf = null;
      this.cur = t.then;
      const next = this.T[this.cur];
      if (!next.buf && this.started && this.on) {
        if (next.loading) retryAtHandoff.add(this.cur);
        else this.load(this.cur);
      }
      this.play();
    },
    // Keep the playhead, folding laps of the loop back into it, so music resumes where it stopped.
    stop() {
      this.started = false;
      const t = this.T[this.cur],
        s = t.src;
      if (!s) return;
      let p = ctx.SND.ctx!.currentTime - t.t0!;
      if (t.loop) {
        const [a, b] = t.loop;
        if (p >= b) p = a + ((p - a) % (b - a));
      }
      t.pos = p;
      t.src = null;
      s.onended = null;
      try {
        s.stop();
      } catch (e) {}
      s.disconnect();
      t.g!.disconnect();
      t.g = null;
    },
  };
}
