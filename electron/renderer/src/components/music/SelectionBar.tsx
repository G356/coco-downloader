'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Download, ListPlus, Play, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { Button, IconButton } from '@/components/ui';
import type { Selection } from '@/lib/selection';
import styles from './SelectionBar.module.css';

/** Floating batch-action bar shown while songs are selected. Escape exits selection. */
export function SelectionBar({ selection, onPlay, onQueue, onDownload }: {
  selection: Selection;
  onPlay: () => void;
  onQueue: () => void;
  /** Omitted until the download service exists; the button shows disabled. */
  onDownload?: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!selection.active) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') selection.exit(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selection]);

  if (!mounted) return null;
  const empty = selection.count === 0;
  return createPortal(
    <AnimatePresence>
      {selection.active && (
        <motion.div
          className={styles.bar}
          role="toolbar"
          aria-label="批量操作"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        >
          <span className={styles.count}>
            已选
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.strong key={selection.count} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 8, opacity: 0 }} transition={{ duration: 0.16 }}>
                {selection.count}
              </motion.strong>
            </AnimatePresence>
            首
          </span>
          <Button variant="primary" icon={<Play size={15} strokeWidth={0} fill="currentColor" />} onClick={onPlay} disabled={empty}>播放</Button>
          <Button icon={<ListPlus size={15} strokeWidth={1.5} />} onClick={onQueue} disabled={empty}>加入队列</Button>
          <Button icon={<Download size={15} strokeWidth={1.5} />} onClick={onDownload} disabled={empty || !onDownload} title={onDownload ? undefined : '下载功能即将接入'}>下载</Button>
          <span className={styles.divider} aria-hidden />
          <IconButton label="退出多选" onClick={selection.exit} iconHover={{ rotate: 90 }}>
            <X size={17} strokeWidth={1.5} />
          </IconButton>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
