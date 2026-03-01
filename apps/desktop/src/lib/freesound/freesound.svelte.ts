import type { FreesoundSearchOptions, FreesoundSound } from '$lib/freesound/_types'
import { downloadPreview, downloadSound, searchSounds } from '$lib/freesound/api'
import { FREESOUND_SEARCH_DEBOUNCE_MS } from '$lib/freesound/config'
import { getValidAccessToken, hasStoredTokens } from '$lib/freesound/oauth'

// ── Reactive state ────────────────────────────────────────────────────

type FreesoundState = {
	results: FreesoundSound[]
	isSearching: boolean
	error: string | null
	isAuthenticated: boolean
	totalCount: number
	currentQuery: string
}

const _state = $state<FreesoundState>({
	results: [],
	isSearching: false,
	error: null,
	isAuthenticated: hasStoredTokens(),
	totalCount: 0,
	currentQuery: '',
})

export const freesoundState: Readonly<FreesoundState> = _state

// ── Debounced search ──────────────────────────────────────────────────

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let abortController: AbortController | null = null

/**
 * Trigger a debounced search against the Freesound API.
 * Subsequent calls within the debounce window cancel the previous pending search.
 * Empty queries clear the results immediately.
 */
export function searchFreesound(query: string, options: FreesoundSearchOptions = {}): void {
	// Cancel any pending debounce
	if (debounceTimer) {
		clearTimeout(debounceTimer)
		debounceTimer = null
	}

	// Cancel any in-flight request
	if (abortController) {
		abortController.abort()
		abortController = null
	}

	const trimmed = query.trim()

	// Clear results for empty query
	if (trimmed.length < 2) {
		_state.results = []
		_state.isSearching = false
		_state.error = null
		_state.totalCount = 0
		_state.currentQuery = ''
		return
	}

	_state.isSearching = true
	_state.currentQuery = trimmed

	debounceTimer = setTimeout(async () => {
		abortController = new AbortController()

		try {
			const response = await searchSounds(trimmed, options)

			// Only apply results if this is still the current query
			if (_state.currentQuery === trimmed) {
				_state.results = response.results
				_state.totalCount = response.count
				_state.error = null
			}
		} catch (err) {
			// Ignore abort errors (from superseded searches)
			if (err instanceof DOMException && err.name === 'AbortError') {
				return
			}

			if (_state.currentQuery === trimmed) {
				_state.error = err instanceof Error ? err.message : 'Search failed'
				_state.results = []
				_state.totalCount = 0
			}
		} finally {
			if (_state.currentQuery === trimmed) {
				_state.isSearching = false
			}
		}
	}, FREESOUND_SEARCH_DEBOUNCE_MS)
}

/** Clear all search results and reset state. */
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
}

// ── Download helpers ──────────────────────────────────────────────────

/**
 * Download a Freesound sample.
 * Tries to download the original file via OAuth2 if authenticated,
 * falls back to the HQ MP3 preview otherwise.
 */
export async function downloadFreesoundSample(
	sound: FreesoundSound,
): Promise<{ blob: Blob; contentType: string; fileName: string }> {
	let blob: Blob
	let contentType: string

	const accessToken = await getValidAccessToken()

	if (accessToken) {
		// Download original quality via OAuth2
		const result = await downloadSound(sound.id, accessToken)
		blob = result.blob
		contentType = result.contentType
	} else {
		// Fall back to HQ MP3 preview
		const result = await downloadPreview(sound.previews['preview-hq-mp3'])
		blob = result.blob
		contentType = result.contentType
	}

	const ext = contentType.includes('mpeg') || contentType.includes('mp3') ? 'mp3' : sound.type
	const fileName = `${sound.name}-${sound.id}.${ext}`

	return { blob, contentType, fileName }
}

/**
 * Update the authentication state (call after OAuth2 flow completes).
 */
export function updateAuthState(): void {
	_state.isAuthenticated = hasStoredTokens()
}
