import type { FreesoundSearchOptions, FreesoundSound } from '$lib/freesound/_types'
import { downloadPreview, searchSounds } from '$lib/freesound/api'
import { FREESOUND_SEARCH_DEBOUNCE_MS } from '$lib/freesound/config'

type FreesoundState = {
  results: FreesoundSound[]
  isSearching: boolean
  error: string | null
  totalCount: number
  currentQuery: string
  currentPage: number
  hasMore: boolean
  isLoadingMore: boolean
}

const _state = $state<FreesoundState>({
  results: [],
  isSearching: false,
  error: null,
  totalCount: 0,
  currentQuery: '',
  currentPage: 1,
  hasMore: false,
  isLoadingMore: false,
})

export const freesoundState: Readonly<FreesoundState> = _state

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let abortController: AbortController | null = null

export function searchFreesound(query: string, options: FreesoundSearchOptions = {}): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }

  if (abortController) {
    abortController.abort()
    abortController = null
  }

  const trimmed = query.trim()

  if (trimmed.length < 2) {
    _state.results = []
    _state.isSearching = false
    _state.error = null
    _state.totalCount = 0
    _state.currentQuery = ''
    _state.currentPage = 1
    _state.hasMore = false
    _state.isLoadingMore = false
    return
  }

  _state.isSearching = true
  _state.currentQuery = trimmed

  debounceTimer = setTimeout(async () => {
    abortController = new AbortController()

    try {
      const response = await searchSounds(trimmed, { ...options, page: 1 })

      if (_state.currentQuery === trimmed) {
        _state.results = response.results
        _state.totalCount = response.count
        _state.error = null
        _state.currentPage = 1
        _state.hasMore = response.next !== null
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return
      }

      if (_state.currentQuery === trimmed) {
        _state.error = err instanceof Error ? err.message : 'Search failed'
        _state.results = []
        _state.totalCount = 0
        _state.currentPage = 1
        _state.hasMore = false
      }
    } finally {
      if (_state.currentQuery === trimmed) {
        _state.isSearching = false
      }
    }
  }, FREESOUND_SEARCH_DEBOUNCE_MS)
}

export async function loadNextFreesoundPage(): Promise<void> {
  if (!_state.hasMore || _state.isLoadingMore || _state.currentQuery.length < 2) {
    return
  }

  _state.isLoadingMore = true

  const nextPage = _state.currentPage + 1
  const query = _state.currentQuery

  try {
    const response = await searchSounds(query, { page: nextPage })

    // Only apply if the query hasn't changed while we were fetching
    if (_state.currentQuery === query) {
      _state.results = [..._state.results, ...response.results]
      _state.totalCount = response.count
      _state.currentPage = nextPage
      _state.hasMore = response.next !== null
    }
  } catch (err) {
    if (_state.currentQuery === query) {
      _state.error = err instanceof Error ? err.message : 'Failed to load more results'
    }
  } finally {
    if (_state.currentQuery === query) {
      _state.isLoadingMore = false
    }
  }
}

export function clearFreesoundResults(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }

  if (abortController) {
    abortController.abort()
    abortController = null
  }

  _state.results = []
  _state.isSearching = false
  _state.error = null
  _state.totalCount = 0
  _state.currentQuery = ''
  _state.currentPage = 1
  _state.hasMore = false
  _state.isLoadingMore = false
}

export async function downloadFreesoundSample(
  sound: FreesoundSound,
): Promise<{ blob: Blob; contentType: string; fileName: string }> {
  const { blob, contentType } = await downloadPreview(sound.previews['preview-hq-mp3'])
  const fileName = `${sound.name}-${sound.id}.mp3`

  return { blob, contentType, fileName }
}
