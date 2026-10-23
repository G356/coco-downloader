import type { CatalogProvider } from '../types';
import { albumDetail, playlistDetail } from './collections';
import { categories, charts, featured, newReleases, playlists, topArtists } from './discovery';
import { bestMatch, search, searchDiscovery, suggest } from './search';
import { SOURCE } from './mappers';

export const neteaseProvider: CatalogProvider = {
  source: SOURCE,
  featured,
  newReleases,
  artists: topArtists,
  charts,
  categories,
  playlists,
  playlistDetail,
  albumDetail,
  search,
  bestMatch,
  suggest,
  searchDiscovery,
};
