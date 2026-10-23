/**
 * Platform-neutral catalog shapes returned by /api/music/*. Each provider
 * (netease now; qq/kugou later) maps its own payloads into these.
 */
export type CatalogSource = 'netease' | 'qq' | 'kugou';
export type Trend = 'up' | 'down' | 'same' | 'new';

export interface CatalogTrack {
  id: string;
  source: CatalogSource;
  title: string;
  artist: string;
  /** Individual artists, for linking. */
  artists?: Array<{ id: string; name: string }>;
  album?: string;
  albumId?: string;
  cover?: string;
  /** Seconds. */
  duration?: number;
  /** Track requires a paid membership upstream (informational only). */
  vip?: boolean;
}

export interface CatalogPlaylist {
  id: string;
  source: CatalogSource;
  name: string;
  cover?: string;
  trackCount?: number;
  playCount?: number;
  creator?: string;
  /** Short tag such as a category or recommendation reason. */
  tag?: string;
}

export interface CatalogAlbum {
  id: string;
  source: CatalogSource;
  name: string;
  artist: string;
  cover?: string;
  trackCount?: number;
  /** Epoch milliseconds. */
  publishTime?: number;
}

export interface CatalogArtist {
  id: string;
  source: CatalogSource;
  name: string;
  avatar?: string;
  alias?: string;
  songCount?: number;
  albumCount?: number;
}

export interface CatalogChart {
  id: string;
  source: CatalogSource;
  name: string;
  updateLabel?: string;
  cover?: string;
  /** `trend` is present only when the platform reports rank movement. */
  entries: Array<{ rank: number; track: CatalogTrack; trend?: Trend }>;
}

export interface CategoryGroup {
  id: string;
  label: string;
  options: string[];
}

/** 'hot' pages by offset; 'quality' (curated) pages by an opaque cursor. */
export type PlaylistOrder = 'hot' | 'quality';

export interface PlaylistPage {
  items: CatalogPlaylist[];
  total: number;
  hasMore: boolean;
  /** Pass back as `cursor` to fetch the next page. */
  cursor?: string;
}

export interface HomeFeatured {
  playlists: CatalogPlaylist[];
  tracks: CatalogTrack[];
  charts: CatalogChart[];
}

/** Header of a playlist or album detail page. */
export interface CollectionInfo {
  kind: 'playlist' | 'album';
  id: string;
  source: CatalogSource;
  name: string;
  cover?: string;
  description?: string;
  /** Playlist creator or album artist. */
  owner?: { name: string; avatar?: string };
  tags?: string[];
  trackCount: number;
  playCount?: number;
  subscribedCount?: number;
  /** Epoch ms: playlist creation or album release. */
  createdAt?: number;
  updatedAt?: number;
  /** Album label / publisher. */
  company?: string;
}

export interface CollectionDetail {
  info: CollectionInfo;
  tracks: CatalogTrack[];
  offset: number;
  hasMore: boolean;
}

export type SearchType = 'song' | 'playlist' | 'album' | 'artist';

export type SearchResult =
  | { type: 'song'; items: CatalogTrack[]; total: number; hasMore: boolean }
  | { type: 'playlist'; items: CatalogPlaylist[]; total: number; hasMore: boolean }
  | { type: 'album'; items: CatalogAlbum[]; total: number; hasMore: boolean }
  | { type: 'artist'; items: CatalogArtist[]; total: number; hasMore: boolean };

/** Grouped type-ahead matches for a partial keyword. */
export interface SearchSuggestion {
  keywords: string[];
  songs: CatalogTrack[];
  artists: CatalogArtist[];
  albums: CatalogAlbum[];
  playlists: CatalogPlaylist[];
}

export interface HotSearch {
  keyword: string;
  score?: number;
  /** Optional one-line note shown under the keyword. */
  note?: string;
  /** Upstream marks: hot/new/up. */
  badge?: 'hot' | 'new' | 'up';
}

export interface SearchDiscovery {
  /** Placeholder keyword shown in the empty search box. */
  placeholder?: string;
  hot: HotSearch[];
}

export interface CatalogProvider {
  source: CatalogSource;
  featured(): Promise<HomeFeatured>;
  newReleases(): Promise<{ tracks: CatalogTrack[]; albums: CatalogAlbum[] }>;
  artists(limit: number): Promise<CatalogArtist[]>;
  charts(limit: number): Promise<CatalogChart[]>;
  categories(): Promise<CategoryGroup[]>;
  playlists(query: { category: string; order: PlaylistOrder; cursor?: string; limit: number }): Promise<PlaylistPage>;
  playlistDetail(id: string, offset: number, limit: number): Promise<CollectionDetail>;
  albumDetail(id: string): Promise<CollectionDetail>;
  search(keyword: string, type: SearchType, offset: number, limit: number): Promise<SearchResult>;
  bestMatch(keyword: string): Promise<BestMatch>;
  suggest(keyword: string): Promise<SearchSuggestion>;
  searchDiscovery(): Promise<SearchDiscovery>;
}

/** Top-of-results highlight when the keyword clearly names an artist/album/playlist. */
export interface BestMatch {
  artist?: CatalogArtist;
  album?: CatalogAlbum;
  playlist?: CatalogPlaylist;
}
