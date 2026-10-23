export type Trend = 'up' | 'down' | 'same' | 'new';

/** A track as the player sees it. */
export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  /** Seconds. */
  duration?: number;
  /** Real artwork URL when known; otherwise the seeded placeholder is drawn. */
  cover?: string;
  /** Seed for the placeholder artwork (and its loading backdrop). */
  coverSeed: string;
}
