// Types
export type {
	FreesoundSound,
	FreesoundSearchResponse,
	FreesoundSearchOptions,
	FreesoundSortOption,
	FreesoundPreviews,
} from '$lib/freesound/_types'

// Reactive state & search
export {
	freesoundState,
	searchFreesound,
	clearFreesoundResults,
	downloadFreesoundSample,
	loadNextFreesoundPage,
} from '$lib/freesound/freesound.svelte'

// API (for direct use if needed)
export { searchSounds, downloadPreview, FreesoundApiError } from '$lib/freesound/api'

// Config
export { FREESOUND_SEARCH_DEBOUNCE_MS } from '$lib/freesound/config'
