import localFont from 'next/font/local';
import styles from './BrandMark.module.css';

// Same logo file and Geo typeface as the web app's navbar (src/components/Navbar.tsx).
const geo = localFont({ src: '../../../public/fonts/Geo-Regular.ttf', display: 'swap' });

export function BrandMark() {
  return (
    <span className={styles.brand}>
      <img src="/images/coco-downloader.svg" alt="" width={34} height={34} className={styles.logo} draggable={false} />
      <span className={`${geo.className} ${styles.wordmark}`}>CoCo</span>
    </span>
  );
}
