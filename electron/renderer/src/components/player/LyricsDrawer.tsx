'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useEffect } from 'react';
import { Cover } from '@/components/common/Cover';
import { usePlayer } from './player-store';
import styles from './LyricsDrawer.module.css';

/** Full-window lyrics sheet. Lyrics content arrives with the playback/lyric API. */
export function LyricsDrawer() {
  const { lyricsOpen, closeLyrics, track } = usePlayer();

  useEffect(() => {
    if (!lyricsOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') closeLyrics(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lyricsOpen, closeLyrics]);

  return (
    <AnimatePresence>
      {lyricsOpen && (
        <motion.section
          className={styles.drawer}
          role="dialog"
          aria-modal="true"
          aria-label="歌词"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 260, damping: 32 }}
        >
          <div className={styles.backdrop} aria-hidden>
            <Cover seed={track.coverSeed} src={track.cover} className={styles.backdropCover} />
          </div>
          <motion.button type="button" className={styles.close} onClick={closeLyrics} aria-label="收起歌词" title="收起" whileHover={{ y: 2 }} whileTap={{ scale: 0.9 }}>
            <ChevronDown size={24} strokeWidth={1.5} />
          </motion.button>
          <div className={styles.content}>
            <motion.div className={styles.art} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.12, type: 'spring', stiffness: 220, damping: 24 }}>
              <Cover seed={track.coverSeed} src={track.cover} className={styles.artCover} radius={18} />
            </motion.div>
            <motion.div className={styles.lyrics} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}>
              <h2>{track.title}</h2>
              <p>{track.artist}{track.album ? ` · ${track.album}` : ''}</p>
              <div className={styles.placeholder}>歌词将在接入播放服务后显示</div>
            </motion.div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
