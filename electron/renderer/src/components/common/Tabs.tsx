'use client';

import { motion } from 'framer-motion';
import { useId } from 'react';
import { cn } from '@/lib/cn';
import styles from './Tabs.module.css';

/** Text tabs whose underline glides to the selected item (shared layoutId). */
export function Tabs<T extends string>({ items, value, onChange, label, size = 'md' }: {
  items: readonly T[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: 'md' | 'sm';
}) {
  const layoutId = useId();
  return (
    <div className={cn(styles.tabs, size === 'sm' && styles.small)} role="tablist" aria-label={label}>
      {items.map(item => {
        const active = item === value;
        return (
          <button key={item} type="button" role="tab" aria-selected={active} className={cn(styles.tab, active && styles.active)} onClick={() => onChange(item)}>
            {item}
            {active && <motion.span layoutId={layoutId} className={styles.indicator} transition={{ type: 'spring', stiffness: 520, damping: 38 }} />}
          </button>
        );
      })}
    </div>
  );
}

/** Pill-style segmented choice used for compact filters. */
export function ChipGroup({ options, value, onChange, label }: {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  const layoutId = useId();
  return (
    <div className={styles.chips} role="radiogroup" aria-label={label}>
      {options.map(option => {
        const active = option === value;
        return (
          <button key={option} type="button" role="radio" aria-checked={active} className={cn(styles.chip, active && styles.chipActive)} onClick={() => onChange(active ? '' : option)}>
            {active && <motion.span layoutId={layoutId} className={styles.chipPill} transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
            <span className={styles.chipLabel}>{option}</span>
          </button>
        );
      })}
    </div>
  );
}
