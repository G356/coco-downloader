'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useRef, useState } from 'react';
import { ErrorState, SkeletonBlock } from '@/components/common/AsyncState';
import { fadeSwap } from '@/components/common/motion';
import { ChipGroup, Tabs } from '@/components/common/Tabs';
import { useNavigation } from '@/components/layout/navigation';
import { CardGrid } from '@/components/music/CardGrid';
import { PlaylistCard } from '@/components/music/PlaylistCard';
import { CollapsingHeader, Page, StickyBar, useScrollArea } from '@/components/scroll';
import { ListFooter } from '@/components/ui';
import { catalogApi, useCatalog, type CatalogPlaylist, type PlaylistOrder } from '@/lib/catalog-client';
import { useInfiniteList, useReachEnd } from '@/lib/hooks';
import styles from './Discover.module.css';

const orders: Array<{ label: string; value: PlaylistOrder }> = [
  { label: '热门', value: 'hot' },
  { label: '精品', value: 'quality' },
];
const PAGE = 24;

/**
 * 歌单广场. The title collapses on scroll while the category filters stay pinned
 * at the top; changing a filter scrolls back so results start just below them.
 */
export function DiscoverView() {
  const { navigate } = useNavigation();
  const { scrollY, scrollTo } = useScrollArea();
  const categories = useCatalog(catalogApi.categories, 'categories');
  const groups = categories.data?.groups ?? [];
  const [groupId, setGroupId] = useState('');
  const [category, setCategory] = useState('');
  const [order, setOrder] = useState<PlaylistOrder>('hot');
  const activeGroup = groups.find(group => group.id === groupId) ?? groups[0];
  const orderLabel = orders.find(item => item.value === order)!.label;

  // The API pages by an opaque cursor; remember the cursor for each loaded offset.
  const cursors = useRef(new Map<number, string | undefined>());
  const loadPage = useCallback(async (offset: number, signal: AbortSignal) => {
    if (offset === 0) cursors.current = new Map();
    const page = await catalogApi.playlists({ category, order, cursor: offset ? cursors.current.get(offset) : undefined, limit: PAGE }, signal);
    cursors.current.set(offset + page.items.length, page.cursor);
    return { items: page.items, total: page.total, hasMore: page.hasMore && Boolean(page.cursor) };
  }, [category, order]);
  const list = useInfiniteList<CatalogPlaylist>(`${category}|${order}`, loadPage);
  const sentinel = useReachEnd(list.loadMore, [list.items.length, list.hasMore]);

  const refilter = (apply: () => void) => {
    if (scrollY.get() > 120) scrollTo(120, true);
    apply();
  };

  return (
    <Page gap="sm">
      <CollapsingHeader title="歌单广场" subtitle="按语种、风格、场景和情感找到喜欢的歌单" />

      <StickyBar compactTitle="歌单广场">
        <div className={styles.filters}>
          {categories.error ? <ErrorState message={categories.error} onRetry={categories.retry} /> : !activeGroup ? (
            <div className={styles.filterSkeleton}>
              <SkeletonBlock className={styles.skeletonTabs} />
              <SkeletonBlock className={styles.skeletonChips} />
            </div>
          ) : (
            <>
              <div className={styles.filterTop}>
                <Tabs items={groups.map(group => group.label)} value={activeGroup.label} size="sm" label="分类维度" onChange={label => refilter(() => {
                  setGroupId(groups.find(group => group.label === label)?.id ?? '');
                  setCategory('');
                })} />
                <Tabs items={orders.map(item => item.label)} value={orderLabel} size="sm" label="排序" onChange={label => refilter(() => setOrder(orders.find(item => item.label === label)!.value))} />
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={activeGroup.id} {...fadeSwap}>
                  <ChipGroup options={activeGroup.options} value={category} label={`${activeGroup.label}分类`} onChange={value => refilter(() => setCategory(value))} />
                </motion.div>
              </AnimatePresence>
            </>
          )}
        </div>
      </StickyBar>

      <div className={styles.resultBar}>
        <span>{category || '全部歌单'} · {orderLabel}</span>
        {!list.loading && <span>共 {list.total.toLocaleString('zh-CN')} 张歌单</span>}
      </div>

      {list.error && !list.items.length ? <ErrorState message={list.error} onRetry={list.retry} /> : (
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={`${category}|${order}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }}>
            <CardGrid loading={list.loading}>
              {list.items.map(playlist => (
                <PlaylistCard key={playlist.id} playlist={playlist} onOpen={() => navigate({ name: 'playlist', id: playlist.id, title: playlist.name })} />
              ))}
            </CardGrid>
          </motion.div>
        </AnimatePresence>
      )}

      <div ref={sentinel}>
        <ListFooter loading={list.loadingMore} done={!list.loading && !list.hasMore && list.items.length > 0} doneText="已经到底了" />
      </div>
    </Page>
  );
}
