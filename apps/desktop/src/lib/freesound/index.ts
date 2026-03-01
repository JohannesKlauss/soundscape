// Types
export type {
	FreesoundSound,
	FreesoundSearchResponse,
	FreesoundSearchOptions,
	FreesoundSortOption,
	FreesoundPreviews,
	FreesoundOAuthTokens,
} from '$lib/freesound/_types'

// Reactive state & search
export {
	freesoundState,
	searchFreesound,
	clearFreesoundResults,
	downloadFreesoundSample,
	updateAuthState,
} from '$lib/freesound/freesound.svelte'

// API (for direct use if needed)
export { searchSounds, downloadSound, downloadPreview, FreesoundApiError } from '$lib/freesound/api'

// OAuth2
export {
	getAuthorizationUrl,
	exchangeCodeForToken,
	refreshAccessToken,
	getValidAccessToken,
	hasStoredTokens,
	clearTokens,
} from '$lib/freesound/oauth'

// Config
export { FREESOUND_SEARCH_DEBOUNCE_MS } from '$lib/freesound/config'
