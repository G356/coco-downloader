'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useDebounced<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export type InfiniteState<T> = {
  items: T[];
  total: number;
  loading: boolean;
  loadingMore: boolean;
  error: string;
  hasMore: boolean;
  loadMore: () => void;
  retry: () => void;
};

type Page<T> = { items: T[]; total: number; hasMore: boolean };
type State<T> = Page<T> & { key: string; loading: boolean; loadingMore: boolean; error: string };

/**
 * Offset-paged list keyed by `key`. Changing the key resets and reloads;
 * `loadMore` appends the next page and ignores calls while one is in flight.
 */
export function useInfiniteList<T>(key: string, loadPage: (offset: number, signal: AbortSignal) => Promise<Page<T>>): InfiniteState<T> {
  const [state, setState] = useState<State<T>>({ key, items: [], total: 0, hasMore: false, loading: true, loadingMore: false, error: '' });
  const [revision, setRevision] = useState(0);
  const loader = useRef(loadPage);
  loader.current = loadPage;
  const latest = useRef(state);
  latest.current = state;
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setState({ key, items: [], total: 0, hasMore: false, loading: true, loadingMore: false, error: '' });
    loader.current(0, current.signal)
      .then(page => { if (!current.signal.aborted) setState({ key, ...page, loading: false, loadingMore: false, error: '' }); })
      .catch(error => { if (!current.signal.aborted) setState(previous => ({ ...previous, loading: false, error: error instanceof Error ? error.message : '加载失败' })); });
    return () => current.abort();
  }, [key, revision]);

  const loadMore = useCallback(() => {
    const snapshot = latest.current;
    if (snapshot.key !== key || snapshot.loading || snapshot.loadingMore || !snapshot.hasMore) return;
    const current = new AbortController();
    controller.current = current;
    setState(previous => ({ ...previous, loadingMore: true }));
    loader.current(snapshot.items.length, current.signal)
      .then(page => {
        if (current.signal.aborted) return;
        setState(previous => previous.key !== key ? previous : { ...previous, items: [...previous.items, ...page.items], total: page.total, hasMore: page.hasMore, loadingMore: false });
      })
      .catch(() => { if (!current.signal.aborted) setState(previous => ({ ...previous, loadingMore: false, hasMore: false })); });
  }, [key]);

  const retry = useCallback(() => setRevision(value => value + 1), []);
  const visible = state.key === key ? state : { ...state, items: [], loading: true };
  return { ...visible, loadMore, retry };
}

/** Calls `onReach` whenever the returned ref's element nears the scroll viewport. */
export function useReachEnd(onReach: () => void, deps: unknown[]) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onReach);
  callback.current = onReach;
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const root = node.closest<HTMLElement>('[data-scroll-root]');
    const observer = new IntersectionObserver(entries => { if (entries[0]?.isIntersecting) callback.current(); }, { root, rootMargin: '500px' });
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}
