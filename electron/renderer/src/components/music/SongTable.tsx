'use client';

import { motion } from 'framer-motion';
import { Download, Heart, MoreHorizontal, Play } from 'lucide-react';
import { useMemo, type MouseEvent } from 'react';
import { SkeletonBlock } from '@/components/common/AsyncState';
import { Cover } from '@/components/common/Cover';
import { riseItem, staggerList } from '@/components/common/motion';
import { useNavigation } from '@/components/layout/navigation';
import { formatTime, usePlayer } from '@/components/player/player-store';
import { Checkbox, IconButton } from '@/components/ui';
import type { CatalogTrack } from '@/lib/catalog-client';
import { cn } from '@/lib/cn';
import type { Selection } from '@/lib/selection';
import { toTrack } from '@/lib/to-track';
import { Equalizer } from './Equalizer';
import styles from './SongTable.module.css';

const stillItem = { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0 } };

/** Selection key: stable across filtering and paging. */
export const trackKey = (track: CatalogTrack) => `${track.source}:${track.id}`;

/**
 * Track list for collections and search: index (play on hover), cover + title,
 * hover actions, album (links to album page) and duration. Double-click plays.
 * With an active `selection`, the index column becomes checkboxes and clicking
 * a row toggles it (shift-click selects a range).
 */
export function SongTable({ tracks, startIndex = 0, showAlbum = true, showCover = true, loading = false, skeletonRows = 10, emptyText = '暂无歌曲', animateFrom = 0, selection }: {
  tracks: CatalogTrack[];
  /** Number shown for the first row (for paged lists). */
  startIndex?: number;
  showAlbum?: boolean;
  showCover?: boolean;
  loading?: boolean;
  skeletonRows?: number;
  emptyText?: string;
  /** Rows before this index are already on screen and skip the entrance animation. */
  animateFrom?: number;
  selection?: Selection;
}) {
  const player = usePlayer();
  const { navigate } = useNavigation();
  const queue = useMemo(() => tracks.map(toTrack), [tracks]);
  const selecting = Boolean(selection?.active);

  if (loading) {
    return (
      <div className={styles.table} aria-busy="true">
        {Array.from({ length: skeletonRows }, (_, index) => <SkeletonBlock key={index} className={styles.skeleton} />)}
      </div>
    );
  }

  const onRowClick = (event: MouseEvent, key: string) => {
    if (!selection?.active) return;
    // Clicks on links/buttons inside the row keep their own behaviour.
    if ((event.target as HTMLElement).closest('button, a')) return;
    selection.toggle(key, event.shiftKey);
  };

  return (
    <div className={cn(styles.table, selecting && styles.selecting)} role="table" aria-label="歌曲列表" aria-multiselectable={selecting || undefined}>
      <div className={cn(styles.row, styles.head)} role="row">
        <span role="columnheader" className={styles.index}>
          {selecting && selection
            ? <Checkbox checked={selection.allSelected} mixed={selection.someSelected} onChange={selection.toggleAll} label="全选" />
            : '#'}
        </span>
        <span role="columnheader">歌曲</span>
        <span role="columnheader" aria-label="操作" />
        <span role="columnheader">{showAlbum ? '专辑' : ''}</span>
        <span role="columnheader" className={styles.duration}>时长</span>
      </div>
      <motion.div variants={staggerList} initial="hidden" animate="show">
        {tracks.map((item, index) => {
          const track = queue[index];
          const key = trackKey(item);
          const current = player.track.id === track.id;
          const checked = Boolean(selection?.isSelected(key));
          return (
            <motion.div
              key={`${key}:${index}`}
              role="row"
              aria-selected={selecting ? checked : undefined}
              className={cn(styles.row, styles.song, current && styles.current, checked && styles.checked)}
              // Earlier pages are already visible: show them instantly instead of replaying the entrance.
              variants={index >= animateFrom ? riseItem : stillItem}
              onClick={event => onRowClick(event, key)}
              onDoubleClick={() => { if (!selecting) player.play(track, queue); }}
            >
              <span role="cell" className={styles.index}>
                {selecting && selection ? (
                  <Checkbox checked={checked} onChange={event => selection.toggle(key, event.shiftKey)} label={`选择${track.title}`} />
                ) : (
                  <>
                    {current && player.playing ? <Equalizer /> : <span className={styles.indexNumber}>{String(startIndex + index + 1).padStart(2, '0')}</span>}
                    <button type="button" className={styles.indexPlay} onClick={() => player.play(track, queue)} aria-label={`播放${track.title}`}>
                      <Play size={13} strokeWidth={0} fill="currentColor" />
                    </button>
                  </>
                )}
              </span>
              <span role="cell" className={styles.identity}>
                {showCover && <Cover seed={track.coverSeed} src={track.cover} size={40} radius={6} />}
                <span className={styles.names}>
                  <strong title={track.title}>{track.title}{item.vip && <em className={styles.vip}>VIP</em>}</strong>
                  <span title={track.artist}>{track.artist}</span>
                </span>
              </span>
              <span role="cell" className={styles.actions}>
                {!selecting && (
                  <>
                    <IconButton label="喜欢" size="sm" tone="muted"><Heart size={16} strokeWidth={1.4} /></IconButton>
                    <IconButton label="下载" size="sm" tone="muted" iconHover={{ y: 2 }}><Download size={16} strokeWidth={1.4} /></IconButton>
                    <IconButton label="更多操作" size="sm" tone="muted"><MoreHorizontal size={16} strokeWidth={1.4} /></IconButton>
                  </>
                )}
              </span>
              <span role="cell">
                {showAlbum && item.album && (
                  item.albumId && !selecting
                    ? <button type="button" className={styles.album} onClick={() => navigate({ name: 'album', id: item.albumId!, title: item.album })} title={item.album}>{item.album}</button>
                    : <span className={styles.album} title={item.album}>{item.album}</span>
                )}
              </span>
              <span role="cell" className={styles.duration}>{track.duration ? formatTime(track.duration) : '—'}</span>
            </motion.div>
          );
        })}
      </motion.div>
      {!tracks.length && <p className={styles.empty}>{emptyText}</p>}
    </div>
  );
}
