/** API exposed by electron/src/preload/index.ts. Absent when the renderer runs in a plain browser. */
interface CocoBridge {
  platform: NodeJS.Platform;
  material: 'acrylic' | 'vibrancy' | 'none';
  window: {
    minimize(): void;
    toggleMaximize(): void;
    close(): void;
    /** Shrink to a compact always-on-top window, or restore. */
    toggleMini?(): void;
  };
}

interface Window {
  coco?: CocoBridge;
}
