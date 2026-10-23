'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Heart, ListMusic, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume1, Volume2, VolumeX } from 'lucide-react';
import { IconButton, Slider } from '@/components/ui';
import { cn } from '@/lib/cn';
import { usePlayer } from './player-store';
import { ProgressBar } from './ProgressBar';
import { TrackInfo } from './TrackInfo';
import styles from './PlayerBar.module.css';

/** Cross-rotating swap between two icons (play/pause, repeat modes, like). */
const swap = {
  initial: { opacity: 0, scale: 0.5, rotate: -45 },
  animate: { opacity: 1, scale: 1, rotate: 0 },
  exit: { opacity: 0, scale: 0.5, rotate: 45 },
  transition: { type: 'spring' as const, stiffness: 500, damping: 28 },
};

function Swap({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span key={id} className={styles.iconWrap} {...swap}>{children}</motion.span>
    </AnimatePresence>
  );
}

/**
 * Full-bleed three-zone player fixed to the window bottom. The middle zone is
 * centered on the whole window: left and right zones are equal grid tracks.
 */
export function PlayerBar() {
  const player = usePlayer();
  const VolumeIcon = player.volume === 0 ? VolumeX : player.volume < 0.5 ? Volume1 : Volume2;

  return (
    <footer className={styles.player} aria-label="播放控制">
      <div className={styles.nowPlaying}>
        <TrackInfo />
      </div>

      <div className={styles.transport}>
        <div className={styles.buttons}>
          <IconButton label="随机播放" onClick={player.toggleShuffle} pressed={player.shuffle} active={player.shuffle} tone="muted">
            <Shuffle size={18} strokeWidth={1.4} />
          </IconButton>
          <IconButton label={player.liked ? '取消喜欢' : '喜欢'} onClick={player.toggleLike} pressed={player.liked} className={cn(player.liked && styles.liked)}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={String(player.liked)}
                className={styles.iconWrap}
                initial={{ scale: player.liked ? 0.3 : 1.2, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.6, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 600, damping: 14 }}
              >
                <Heart size={18} strokeWidth={1.4} fill={player.liked ? 'currentColor' : 'none'} />
              </motion.span>
            </AnimatePresence>
          </IconButton>
          <IconButton label="上一首" onClick={player.previous} iconHover={{ x: -2, scale: 1.1 }}>
            <SkipBack size={20} strokeWidth={1.4} />
          </IconButton>
          <motion.button
            type="button"
            className={cn(styles.playButton, player.playing && styles.playing)}
            onClick={player.togglePlay}
            aria-label={player.playing ? '暂停' : '播放'}
            title={player.playing ? '暂停' : '播放'}
            whileHover={{ scale: 1.07 }}
            whileTap={{ scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 520, damping: 20 }}
          >
            <Swap id={player.playing ? 'pause' : 'play'}>
              {player.playing ? <Pause size={18} strokeWidth={0} fill="currentColor" /> : <Play size={18} strokeWidth={0} fill="currentColor" className={styles.playGlyph} />}
            </Swap>
          </motion.button>
          <IconButton label="下一首" onClick={player.next} iconHover={{ x: 2, scale: 1.1 }}>
            <SkipForward size={20} strokeWidth={1.4} />
          </IconButton>
          <IconButton label={player.repeat === 'one' ? '单曲循环' : '列表循环'} onClick={player.cycleRepeat} active={player.repeat === 'one'} tone="muted">
            <Swap id={player.repeat}>
              {player.repeat === 'one' ? <Repeat1 size={18} strokeWidth={1.4} /> : <Repeat size={18} strokeWidth={1.4} />}
            </Swap>
          </IconButton>
        </div>
        <ProgressBar />
      </div>

      <div className={styles.tools}>
        <IconButton label={player.volume > 0 ? '静音' : '取消静音'} onClick={player.toggleMute}>
          <VolumeIcon size={19} strokeWidth={1.4} />
        </IconButton>
        <Slider className={styles.volume} size="sm" value={Math.round(player.volume * 100)} max={100} step={1} onChange={value => player.setVolume(value / 100)} label="音量" formatValue={value => `${Math.round(value)}%`} />
        <IconButton label="歌词" className={styles.lyricButton} onClick={player.openLyrics}>词</IconButton>
        <IconButton label="播放队列">
          <ListMusic size={19} strokeWidth={1.4} />
        </IconButton>
      </div>
    </footer>
  );
}
