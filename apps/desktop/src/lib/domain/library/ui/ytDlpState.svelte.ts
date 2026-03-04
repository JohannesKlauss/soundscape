import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

type AudioInfo = {
  title: string
  duration: number
  tags: string[]
}

type DownloadResult = {
  file_path: string
  content_type: string
  duration: number
  title: string
  tags: string[]
}

type DependencyStatus = {
  yt_dlp_ready: boolean
  ffmpeg_ready: boolean
  downloading: boolean
  error: string | null
}

type DownloadProgress = {
  status: string
  percent: number | null
}

type YtDlpState = {
  ytDlpReady: boolean
  ffmpegReady: boolean
  ready: boolean
  depsDownloading: boolean
  depsError: string | null
  isDownloading: boolean
  downloadStatus: string | null
  downloadPercent: number | null
}

const _state = $state<YtDlpState>({
  ytDlpReady: false,
  ffmpegReady: false,
  ready: false,
  depsDownloading: false,
  depsError: null,
  isDownloading: false,
  downloadStatus: null,
  downloadPercent: null,
})

export const ytDlpState: Readonly<YtDlpState> = _state

export async function ensureDependencies(): Promise<void> {
  if (_state.ytDlpReady && _state.ffmpegReady) {
    return
  }

  _state.depsDownloading = true
  _state.depsError = null

  const unlisten = await listen<DependencyStatus>('dependency-status', (event) => {
    _state.ytDlpReady = event.payload.yt_dlp_ready
    _state.ffmpegReady = event.payload.ffmpeg_ready
    _state.ready = event.payload.yt_dlp_ready && event.payload.ffmpeg_ready
    _state.depsDownloading = event.payload.downloading
    _state.depsError = event.payload.error ?? null
  })

  try {
    const result = await invoke<DependencyStatus>('ensure_dependencies')
    _state.ytDlpReady = result.yt_dlp_ready
    _state.ffmpegReady = result.ffmpeg_ready
    _state.ready = result.yt_dlp_ready && result.ffmpeg_ready
    _state.depsDownloading = false
  } catch (e) {
    _state.depsError = String(e)
    _state.depsDownloading = false
  } finally {
    unlisten()
  }
}

export async function fetchAudioInfo(url: string): Promise<AudioInfo> {
  return invoke<AudioInfo>('fetch_audio_info', { url })
}

export async function downloadAudio(url: string): Promise<DownloadResult> {
  _state.isDownloading = true
  _state.downloadStatus = 'Starting download...'
  _state.downloadPercent = null

  const unlisten = await listen<DownloadProgress>('download-progress', (event) => {
    _state.downloadStatus = event.payload.status
    _state.downloadPercent = event.payload.percent
  })

  try {
    const result = await invoke<DownloadResult>('download_audio', { url })
    return result
  } finally {
    _state.isDownloading = false
    _state.downloadStatus = null
    _state.downloadPercent = null
    unlisten()
  }
}
