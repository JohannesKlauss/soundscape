import {
	PUBLIC_FREESOUND_API_KEY,
	PUBLIC_FREESOUND_CLIENT_ID,
	PUBLIC_FREESOUND_CALLBACK_URL,
} from '$env/static/public'

export const FREESOUND_BASE_URL = 'https://freesound.org/apiv2'

export const FREESOUND_API_KEY = PUBLIC_FREESOUND_API_KEY
export const FREESOUND_CLIENT_ID = PUBLIC_FREESOUND_CLIENT_ID
export const FREESOUND_CALLBACK_URL = PUBLIC_FREESOUND_CALLBACK_URL

/** Fields requested in search results to minimize response size. */
export const FREESOUND_SEARCH_FIELDS = [
	'id',
	'name',
	'tags',
	'duration',
	'avg_rating',
	'num_downloads',
	'previews',
	'download',
	'username',
	'license',
	'type',
].join(',')

/** Default number of results per search page. */
export const FREESOUND_DEFAULT_PAGE_SIZE = 15

/** Debounce delay in milliseconds for search input. */
export const FREESOUND_SEARCH_DEBOUNCE_MS = 350
