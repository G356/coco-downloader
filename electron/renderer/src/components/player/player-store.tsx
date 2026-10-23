'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { initialTrack } from '@/lib/mock-data';
import type { Track } from '@/types/music';

export type RepeatMode = 'list' | 'one';

type PlayerState = {
  track: Track;
  playing: boolean;
  volume: number;
  liked: boolean;
  shuffle: boolean;
  repeat: RepeatMode;
  lyricsOpen: boolean;
  togglePlay: () => void;
  play: (track: Track, queue?: Track[]) => void;
  /** Append to the end of the play queue (skips tracks already queued). */
  enqueue: (tracks: Track[]) => void;
  previous: () => void;
  next: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleLike: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  openLyrics: () => void;
  closeLyrics: () => void;
};

const PlayerContext = createContext<PlayerState | null>(null);
// Position changes every frame; isolating it keeps the rest of the UI from re-rendering at 60fps.
const PositionContext = createContext(0);

/**
 * Mock player: requestAnimationFrame advances position while "playing" so the
 * progress bar moves continuously. The real version will mirror an <audio> element.
 */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<Track[]>([initialTrack]);
  const [track, setTrack] = useState(initialTrack);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [volume, setVolume] = useState(0.62);
  const lastVolume = useRef(0.62);
  const [likedIds, setLikedIds] = useState<Set<string>>(() => new Set());
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState<RepeatMode>('list');
  const [lyricsOpen, setLyricsOpen] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const duration = track.duration ?? 0;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;
      setPosition(value => (value + delta >= duration ? 0 : value + delta));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, track]);

  const value = useMemo<PlayerState>(() => {
    const step = (offset: number) => {
      if (!queue.length) return;
      const index = queue.findIndex(item => item.id === track.id);
      const nextIndex = shuffle
        ? Math.floor(Math.random() * queue.length)
        : (Math.max(0, index) + offset + queue.length) % queue.length;
      setTrack(queue[nextIndex]);
      setPosition(0);
      setPlaying(true);
    };
    return {
      track, playing, volume, shuffle, repeat, lyricsOpen,
      liked: likedIds.has(track.id),
      togglePlay: () => setPlaying(value => !value),
      play: (next, nextQueue) => {
        if (nextQueue) setQueue(nextQueue);
        if (next.id === track.id) { setPlaying(value => !value); return; }
        setTrack(next); setPosition(0); setPlaying(true);
      },
      enqueue: tracks => setQueue(previous => {
        const known = new Set(previous.map(item => item.id));
        return [...previous, ...tracks.filter(item => !known.has(item.id))];
      }),
      previous: () => step(-1),
      next: () => step(1),
      seek: seconds => setPosition(Math.max(0, Math.min(track.duration ?? 0, seconds))),
      setVolume: next => { if (next > 0) lastVolume.current = next; setVolume(next); },
      toggleMute: () => setVolume(value => (value > 0 ? 0 : lastVolume.current || 0.62)),
      toggleLike: () => setLikedIds(previous => {
        const next = new Set(previous);
        if (next.has(track.id)) next.delete(track.id); else next.add(track.id);
        return next;
      }),
      toggleShuffle: () => setShuffle(value => !value),
      cycleRepeat: () => setRepeat(value => (value === 'list' ? 'one' : 'list')),
      openLyrics: () => setLyricsOpen(true),
      closeLyrics: () => setLyricsOpen(false),
    };
  }, [queue, track, playing, volume, likedIds, shuffle, repeat, lyricsOpen]);

  return (
    <PlayerContext.Provider value={value}>
      <PositionContext.Provider value={position}>{children}</PositionContext.Provider>
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const value = useContext(PlayerContext);
  if (!value) throw new Error('PlayerProvider is required');
  return value;
}

/** Subscribe only where the playhead is drawn (progress bar, lyrics). */
export function usePlaybackPosition() {
  return useContext(PositionContext);
}

export function formatTime(seconds = 0) {
  const total = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
