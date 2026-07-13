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
}
