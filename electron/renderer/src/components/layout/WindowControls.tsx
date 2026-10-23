'use client';

import { Minus, Square, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { IconButton } from '@/components/ui';
import styles from './WindowControls.module.css';

/** Custom controls for the frameless window on Windows/Linux. macOS keeps native traffic lights. */
export function WindowControls() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    // Plain browser preview still shows the controls so layout matches the design.
    setVisible(window.coco?.platform !== 'darwin');
  }, []);
  if (!visible) return null;

  return (
    <div className={styles.controls}>
      <IconButton label="最小化" onClick={() => window.coco?.window.minimize()} className={styles.control} iconHover={{ y: 1 }}>
        <Minus size={16} strokeWidth={1.4} />
      </IconButton>
      <IconButton label="最大化" onClick={() => window.coco?.window.toggleMaximize()} className={styles.control} iconHover={{ scale: 1.12 }}>
        <Square size={13} strokeWidth={1.4} />
      </IconButton>
      <IconButton label="关闭" tone="danger" onClick={() => window.coco?.window.close()} className={styles.control} iconHover={{ rotate: 90 }}>
        <X size={17} strokeWidth={1.4} />
      </IconButton>
    </div>
  );
}
