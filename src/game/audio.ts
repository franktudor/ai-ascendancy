import type { RuntimeContext, MusicId } from "./types";
// Extracted original rules/controller; all cross-domain access is explicit.
import INTRO_MUSIC_URL from "../assets/music/intro.mp3";
import THEME_MUSIC_URL from "../assets/music/theme.mp3";

export function installAudio(context: RuntimeContext) {
  const lifecycle = context.lifecycle,
    audioAbortController = (context.audioAbort = new AbortController());
  const retryAtHandoff = new Set<MusicId>();
  lifecycle.addCleanup(() => {
    audioAbortController.abort();
    retryAtHandoff.clear();
    context.musicController.playbackRequested = false;
    for (const track of Object.values(context.musicController.tracks)) {
      if (track.sourceNode) {
        track.sourceNode.onended = null;
        try {
          track.sourceNode.stop();
        } catch {}
        track.sourceNode!.disconnect();
      }
      track.gainNode?.disconnect();
      track.sourceNode = track.gainNode = track.audioBuffer = null;
      track.loading = false;
    }
    context.musicController.masterGainNode?.disconnect();
    context.musicController.masterGainNode = null;
    if (context.soundController.audioContext) {
      context.soundController.audioContext.close().catch(() => {});
      context.soundController.audioContext = null;
    }
    context.soundController.noiseBuffer = null;
  });
  context.soundController = {
    audioContext: null,
    enabled: true,
    noiseBuffer: null,
    initializeAudioContext() {
      if (this.audioContext || lifecycle.disposed) return;
      try {
        this.audioContext = new (
          window.AudioContext || window.webkitAudioContext
        )();
      } catch (error) {}
    },
    getNoiseBuffer() {
      if (this.noiseBuffer) return this.noiseBuffer;
      const audioContext = this.audioContext;
      if (!audioContext) return null;
      const sampleCount = Math.round(audioContext.sampleRate * 1.5),
        noiseBuffer = audioContext.createBuffer(
          1,
          sampleCount,
          audioContext.sampleRate,
        ),
        samples = noiseBuffer.getChannelData(0);
      for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++)
        samples[sampleIndex] = Math.random() * 2 - 1;
      return (this.noiseBuffer = noiseBuffer);
    },
    playCue(cue) {
      if (
        !this.enabled ||
        !this.audioContext ||
        lifecycle.disposed ||
        this.audioContext.state === "closed"
      )
        return;
      const audioContext = this.audioContext;
      if (audioContext.state === "suspended")
        audioContext.resume().catch(() => {});
      const currentTimeSeconds = audioContext.currentTime;
      const noiseBuffer = this.getNoiseBuffer();
      if (!noiseBuffer) return;
      // One grain of filtered noise, swept in frequency: reads as a scratch, not a tone.
      const playNoiseGrain = (
        startDelaySeconds: number,
        durationSeconds: number,
        volume: number,
        startFrequencyHz: number,
        endFrequencyHz: number,
        filterQ: number,
        filterType?: BiquadFilterType,
      ) => {
        const bufferOffsetSeconds =
            Math.random() * (noiseBuffer.duration - durationSeconds - 0.05),
          sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = noiseBuffer;
        const filterNode = audioContext.createBiquadFilter();
        filterNode.type = filterType || "bandpass";
        filterNode.Q.value = filterQ || 2.5;
        filterNode.frequency.setValueAtTime(
          startFrequencyHz,
          currentTimeSeconds + startDelaySeconds,
        );
        filterNode.frequency.exponentialRampToValueAtTime(
          Math.max(endFrequencyHz || startFrequencyHz, 40),
          currentTimeSeconds + startDelaySeconds + durationSeconds,
        );
        const gainNode = audioContext.createGain();
        gainNode.gain.setValueAtTime(0, currentTimeSeconds + startDelaySeconds);
        gainNode.gain.linearRampToValueAtTime(
          volume,
          currentTimeSeconds +
            startDelaySeconds +
            Math.min(0.008, durationSeconds * 0.3),
        );
        gainNode.gain.exponentialRampToValueAtTime(
          0.0001,
          currentTimeSeconds + startDelaySeconds + durationSeconds,
        );
        sourceNode
          .connect(filterNode)
          .connect(gainNode)
          .connect(audioContext.destination);
        sourceNode.start(
          currentTimeSeconds + startDelaySeconds,
          bufferOffsetSeconds,
          durationSeconds + 0.02,
        );
      };
      // A cluster of tiny grains in quick, uneven succession: a shuffle of pages.
      const playNoiseShuffle = (
        startDelaySeconds: number,
        grainCount: number,
        spreadSeconds: number,
        volume: number,
        lowFrequencyHz: number,
        highFrequencyHz: number,
      ) => {
        for (let grainIndex = 0; grainIndex < grainCount; grainIndex++) {
          const randomOffset = Math.random();
          playNoiseGrain(
            startDelaySeconds + randomOffset * spreadSeconds,
            0.025 + Math.random() * 0.03,
            volume * (0.55 + Math.random() * 0.45),
            lowFrequencyHz + randomOffset * (highFrequencyHz - lowFrequencyHz),
            lowFrequencyHz + Math.random() * (highFrequencyHz - lowFrequencyHz),
            3 + Math.random() * 5,
          );
        }
      };
      switch (cue) {
        case "tap":
          playNoiseGrain(0, 0.035, 0.08, 3200, 2200, 3);
          break;
        case "buy":
          playNoiseShuffle(0, 3, 0.07, 0.09, 1200, 2800);
          break;
        case "deny":
          playNoiseGrain(0, 0.16, 0.11, 500, 120, 1.4, "lowpass");
          break;
        case "event":
          playNoiseShuffle(0, 4, 0.14, 0.08, 700, 2400);
          break;
        case "alert":
          playNoiseGrain(0, 0.2, 0.1, 300, 900, 2);
          playNoiseGrain(0.16, 0.24, 0.09, 260, 800, 2);
          break;
        case "major":
          playNoiseShuffle(0, 8, 0.45, 0.09, 500, 3400);
          break;
        case "win":
          playNoiseShuffle(0, 11, 0.7, 0.1, 600, 4200);
          break;
        case "lose":
          playNoiseGrain(0, 0.4, 0.12, 260, 90, 1, "lowpass");
          playNoiseGrain(0.3, 0.5, 0.1, 180, 70, 1, "lowpass");
          break;
      }
    },
  };
  context.musicController = {
    enabled: true,
    playbackRequested: false,
    currentTrackId: "intro",
    masterGainNode: null,
    tracks: {
      intro: { volume: 0.76, playbackPositionSeconds: 0, nextTrackId: "theme" },
      theme: {
        volume: 1,
        playbackPositionSeconds: 0,
        loopRangeSeconds: [2.25, 240.25],
      },
    },
    initializeMusic() {
      this.loadTrack(this.currentTrackId);
      if (this.enabled) this.requestPlayback();
    },
    loadTrack(trackId) {
      const track = this.tracks[trackId],
        assetUrl = trackId === "intro" ? INTRO_MUSIC_URL : THEME_MUSIC_URL;
      if (track.audioBuffer || track.loading || !assetUrl || lifecycle.disposed)
        return;
      context.soundController.initializeAudioContext();
      const audioContext = context.soundController.audioContext;
      if (!audioContext || audioContext.state === "closed") return;
      track.loading = true;
      fetch(assetUrl, { signal: audioAbortController.signal })
        .then((response) => {
          if (!response.ok) throw new Error("Audio asset " + response.status);
          return response.arrayBuffer();
        })
        .then((encodedAudio) => {
          if (lifecycle.disposed || audioContext.state === "closed")
            throw new Error("Audio runtime closed");
          return audioContext.decodeAudioData(encodedAudio);
        })
        .then((decodedAudioBuffer) => {
          track.loading = false;
          retryAtHandoff.delete(trackId);
          if (
            lifecycle.disposed ||
            audioContext.state === "closed" ||
            audioContext !== context.soundController.audioContext
          )
            return;
          track.audioBuffer = decodedAudioBuffer;
          this.playCurrentTrackIfReady();
        })
        .catch(() => {
          track.loading = false;
          // A handoff during an in-flight prefetch gets one recovery attempt.
          // A failed handoff request itself is not recursively retried.
          if (
            retryAtHandoff.delete(trackId) &&
            !lifecycle.disposed &&
            audioContext.state !== "closed"
          )
            this.loadTrack(trackId);
        });
    },
    // start() says music is wanted; play() makes the current track audible once it is decoded.
    requestPlayback() {
      if (lifecycle.disposed) return;
      this.playbackRequested = true;
      this.playCurrentTrackIfReady();
    },
    playCurrentTrackIfReady() {
      const audioContext = context.soundController.audioContext,
        track = this.tracks[this.currentTrackId];
      if (
        !this.enabled ||
        !this.playbackRequested ||
        !track.audioBuffer ||
        track.sourceNode ||
        !audioContext ||
        lifecycle.disposed ||
        audioContext.state === "closed"
      )
        return;
      if (!this.masterGainNode) {
        this.masterGainNode = audioContext.createGain();
        this.masterGainNode.gain.value = 0.35;
        this.masterGainNode.connect(audioContext.destination);
      }
      const sourceNode = audioContext.createBufferSource(),
        trackGainNode = audioContext.createGain();
      sourceNode.buffer = track.audioBuffer;
      trackGainNode.gain.value = track.volume;
      if (track.loopRangeSeconds) {
        sourceNode.loop = true;
        sourceNode.loopStart = track.loopRangeSeconds[0];
        sourceNode.loopEnd = track.loopRangeSeconds[1];
      }
      // A track that runs out hands off to the next, which decodes while this one plays.
      else {
        sourceNode.onended = () => {
          if (!lifecycle.disposed && track.sourceNode === sourceNode)
            this.advanceToNextTrack();
        };
        this.loadTrack(track.nextTrackId!);
      }
      sourceNode.connect(trackGainNode).connect(this.masterGainNode);
      try {
        sourceNode.start(0, track.playbackPositionSeconds);
      } catch {
        sourceNode.onended = null;
        sourceNode.disconnect();
        trackGainNode.disconnect();
        return;
      }
      track.sourceNode = sourceNode;
      track.gainNode = trackGainNode;
      track.playbackTimeOriginSeconds =
        audioContext.currentTime - track.playbackPositionSeconds;
      if (audioContext.state === "suspended") {
        const resumePromise = audioContext.resume();
        if (resumePromise && resumePromise.catch) resumePromise.catch(() => {});
      }
    },
    // The intro has played out: let its buffer go and move on for good.
    advanceToNextTrack() {
      if (lifecycle.disposed) return;
      const track = this.tracks[this.currentTrackId];
      if (!track.nextTrackId) return;
      if (track.sourceNode) track.sourceNode.onended = null;
      track.sourceNode?.disconnect();
      track.gainNode?.disconnect();
      track.sourceNode = track.gainNode = track.audioBuffer = null;
      this.currentTrackId = track.nextTrackId;
      const nextTrack = this.tracks[this.currentTrackId];
      if (!nextTrack.audioBuffer && this.playbackRequested && this.enabled) {
        if (nextTrack.loading) retryAtHandoff.add(this.currentTrackId);
        else this.loadTrack(this.currentTrackId);
      }
      this.playCurrentTrackIfReady();
    },
    // Keep the playhead, folding laps of the loop back into it, so music resumes where it stopped.
    pausePlayback() {
      this.playbackRequested = false;
      const track = this.tracks[this.currentTrackId],
        sourceNode = track.sourceNode;
      if (!sourceNode) return;
      let playbackPositionSeconds =
        context.soundController.audioContext!.currentTime -
        track.playbackTimeOriginSeconds!;
      if (track.loopRangeSeconds) {
        const [loopStartSeconds, loopEndSeconds] = track.loopRangeSeconds;
        if (playbackPositionSeconds >= loopEndSeconds)
          playbackPositionSeconds =
            loopStartSeconds +
            ((playbackPositionSeconds - loopStartSeconds) %
              (loopEndSeconds - loopStartSeconds));
      }
      track.playbackPositionSeconds = playbackPositionSeconds;
      track.sourceNode = null;
      sourceNode.onended = null;
      try {
        sourceNode.stop();
      } catch (error) {}
      sourceNode.disconnect();
      track.gainNode!.disconnect();
      track.gainNode = null;
    },
  };
}
