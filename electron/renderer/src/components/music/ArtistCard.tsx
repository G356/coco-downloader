'use client';

import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { Cover } from '@/components/common/Cover';
import { riseItem } from '@/components/common/motion';
import { useNavigation } from '@/components/layout/navigation';
import type { CatalogArtist } from '@/lib/catalog-client';
import styles from './ArtistCard.module.css';

/** Until an artist page exists, opening an artist searches their songs. */
export function ArtistCard({ artist }: { artist: CatalogArtist }) {
  const { navigate } = useNavigation();
  const meta = [artist.songCount ? `${artist.songCount} 首歌曲` : '', artist.albumCount ? `${artist.albumCount} 张专辑` : ''].filter(Boolean).join(' · ');
  return (
    <motion.button type="button" className={styles.artist} variants={riseItem} aria-label={`查看歌手：${artist.name}`} onClick={() => navigate({ name: 'search', keyword: artist.name, type: 'song' })}>
      <span className={styles.avatar}>
        <Cover seed={`${artist.source}:artist:${artist.id}`} src={artist.avatar} className={styles.cover} radius={999} />
        <span className={styles.play} aria-hidden>
          <Play size={18} strokeWidth={0} fill="currentColor" />
        </span>
      </span>
      <strong>{artist.name}</strong>
      {meta && <span>{meta}</span>}
    </motion.button>
  );
}
