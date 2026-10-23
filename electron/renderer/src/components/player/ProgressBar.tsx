'use client';

import { Slider } from '@/components/ui';
import { formatTime, usePlaybackPosition, usePlayer } from './player-store';
import styles from './PlayerBar.module.css';

/** Isolated so only this subtree re-renders on every playhead frame. */
export function ProgressBar() {
  const { track, seek } = usePlayer();
  const position = usePlaybackPosition();
  const duration = track.duration ?? 0;
  return (
    <div className={styles.progress}>
      <time>{formatTime(position)}</time>
      <Slider value={position} max={duration} onCommit={seek} label="播放进度" formatValue={formatTime} />
      <time>{formatTime(duration)}</time>
    </div>
  );
}
