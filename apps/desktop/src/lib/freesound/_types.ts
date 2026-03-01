/**
 * Freesound API v2 type definitions.
 * @see https://freesound.org/docs/api/resources_apiv2.html
 */

export type FreesoundPreviews = {
	'preview-hq-mp3': string
	'preview-lq-mp3': string
	'preview-hq-ogg': string
	'preview-lq-ogg': string
}

export type FreesoundSound = {
	id: number
	name: string
	tags: string[]
	duration: number
	avg_rating: number
	num_downloads: number
	previews: FreesoundPreviews
	download: string
	username: string
	license: string
	type: string
}

export type FreesoundSearchResponse = {
	count: number
	next: string | null
	previous: string | null
	results: FreesoundSound[]
}

export type FreesoundOAuthTokens = {
	access_token: string
	refresh_token: string
	expires_in: number
	scope: string
}

export type FreesoundSearchOptions = {
	page?: number
	pageSize?: number
	sort?: FreesoundSortOption
	filter?: string
}

export type FreesoundSortOption =
	| 'score'
	| 'duration_desc'
	| 'duration_asc'
	| 'created_desc'
	| 'created_asc'
	| 'downloads_desc'
	| 'downloads_asc'
	| 'rating_desc'
	| 'rating_asc'
