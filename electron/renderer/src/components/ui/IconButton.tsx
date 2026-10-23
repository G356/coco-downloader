'use client';

import { motion, type TargetAndTransition } from 'framer-motion';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import styles from './IconButton.module.css';

/**
 * Square icon button. The hover background stays still; only the inner icon
 * animates (`iconHover`), so e.g. a spinning cog never rotates its pill.
 */
export function IconButton({ label, onClick, disabled, active, pressed, tone = 'default', size = 'md', iconHover, className, children }: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Accent-coloured "on" state (e.g. shuffle enabled). */
  active?: boolean;
  /** Toggle semantics for assistive tech. */
  pressed?: boolean;
  tone?: 'default' | 'muted' | 'danger';
  size?: 'sm' | 'md';
  iconHover?: TargetAndTransition;
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.button
      type="button"
      className={cn(styles.button, styles[tone], size === 'sm' && styles.small, active && styles.active, className)}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      initial="rest"
      whileHover={disabled ? undefined : 'hover'}
      whileTap={disabled ? undefined : 'tap'}
    >
      <motion.span
        className={styles.icon}
        variants={{ rest: { scale: 1, rotate: 0, x: 0, y: 0 }, hover: iconHover ?? { scale: 1.12 }, tap: { scale: 0.82 } }}
        transition={{ type: 'spring', stiffness: 480, damping: 20 }}
      >
        {children}
      </motion.span>
    </motion.button>
  );
}
