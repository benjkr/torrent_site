export interface ApiItem {
  added: string
  files: FileInfo[]
  category: string
  id: string
  leechers: string
  imdb: string
  info_hash: string
  name: string
  num_files: string
  seeders: string
  size: string
  status: string
  username: string
}

/** DEV-only per-branch apibay query stats */
export interface SearchDebugQueryBranch {
  label: string
  url: string
  rawCount: number
  afterFilterCount: number
}

/** DEV-only payload from /api/search */
export interface SearchDebugInfo {
  query: string
  filters: string[]
  /** Primary / first apibay URL (compat) */
  apibayUrl: string
  queries: SearchDebugQueryBranch[]
  fetchedAt: string
  durationMs: number
  rawCount: number
  afterFilterCount: number
  returnedCount: number
  raw: unknown[]
  filtered: ApiItem[]
}

export interface SearchApiDebugResponse {
  items: ApiItem[]
  debug: SearchDebugInfo
}

export type SearchResponse = ApiItem[] | SearchApiDebugResponse

export interface FileInfo {
  name: string
  size: number
  progress: number
  priority: number
  is_seed: boolean
  availability: number | null
}

export interface TorrentInfo {
  hash: string
  name: string
  progress: number
  state: string
  dlspeed: number
  upspeed: number
  num_seeds: number
  num_leechs?: number
  num_leechers?: number
  eta: number
  size: number
  save_path: string
  added_on: number
  completion_on: number
  category: string
  tags: string
  ratio: number
}

export interface ImdbMeta {
  id: string
  title: string
  year: number | null
  image: string | null
}

export type ImdbTitleType = "movie" | "series" | "unknown"

export interface ImdbSuggestion {
  title: string
  id: string
  year: number | null
  image: string | null
  stars: string
  type: ImdbTitleType
}

export interface TvEpisode {
  number: number
  name: string
  /** IMDb aggregate rating 0–10 when available */
  rating: number | null
}

export interface TvSeason {
  season: number
  episodes: TvEpisode[]
}

export interface TvShowPayload {
  kind: "series" | "movie" | "unknown"
  imdb: string
  title: string
  year: number | null
  image: string | null
  stars: string
  rating: number | null
  genres: string[]
  status: string | null
  seasons: TvSeason[]
}

/** qBittorrent WebUI connection (from QB_* env vars) */
export interface QbConnectionSettings {
  baseUrl: string
  username: string
  password: string
}

/** Keys the Settings UI displays and the /api/settings action may mutate */
export const APP_SETTINGS_KEYS = [
  "save_path",
  "temp_path",
  "temp_path_enabled",
  "start_paused_enabled",
  "create_subfolder_enabled",
  "dl_limit",
  "up_limit",
  "queueing_enabled",
  "max_active_downloads",
  "max_active_uploads",
  "max_active_torrents",
] as const

export type AppSettingsKey = (typeof APP_SETTINGS_KEYS)[number]

/** Common qBittorrent preferences exposed in Settings */
export interface AppSettings {
  save_path: string
  temp_path: string
  temp_path_enabled: boolean
  start_paused_enabled: boolean
  create_subfolder_enabled: boolean
  /** KiB/s; -1 = unlimited */
  dl_limit: number
  /** KiB/s; -1 = unlimited */
  up_limit: number
  queueing_enabled: boolean
  max_active_downloads: number
  max_active_uploads: number
  max_active_torrents: number
}
