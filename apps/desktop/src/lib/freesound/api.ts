import type { FreesoundSearchOptions, FreesoundSearchResponse } from '$lib/freesound/_types'
import {
	FREESOUND_API_KEY,
	FREESOUND_BASE_URL,
	FREESOUND_DEFAULT_PAGE_SIZE,
	FREESOUND_SEARCH_FIELDS,
} from '$lib/freesound/config'

export class FreesoundApiError extends Error {
	constructor(
		public status: number,
		message: string,
	) {
		super(message)
		this.name = 'FreesoundApiError'
	}
}

/**
 * Low-level fetch wrapper that injects token authentication.
 * Uses API key (Token auth) by default, or Bearer token for OAuth2-protected endpoints.
 */
async function fetchApi(url: string, bearerToken?: string): Promise<Response> {
	const headers: Record<string, string> = bearerToken
		? { Authorization: `Bearer ${bearerToken}` }
		: { Authorization: `Token ${FREESOUND_API_KEY}` }

	const res = await fetch(url, { headers })

	if (!res.ok) {
		const body = await res.text().catch(() => 'Unknown error')
		throw new FreesoundApiError(res.status, `Freesound API ${res.status}: ${body}`)
	}

	return res
}

/**
 * Search the Freesound database by text query.
 * Returns sounds matching the query with all fields needed for display and playback.
 */
export async function searchSounds(
	query: string,
	options: FreesoundSearchOptions = {},
): Promise<FreesoundSearchResponse> {
	const { page = 1, pageSize = FREESOUND_DEFAULT_PAGE_SIZE, sort = 'score', filter } = options

	const params = new URLSearchParams({
		query,
		fields: FREESOUND_SEARCH_FIELDS,
		page: String(page),
		page_size: String(pageSize),
		sort,
	})

	if (filter) {
		params.set('filter', filter)
	}

	const url = `${FREESOUND_BASE_URL}/search/text/?${params}`
	const res = await fetchApi(url)

	return res.json() as Promise<FreesoundSearchResponse>
}

/**
 * Download the original sound file. Requires an OAuth2 access token.
 * Returns the raw audio blob and content type.
 */
export async function downloadSound(
	soundId: number,
	accessToken: string,
): Promise<{ blob: Blob; contentType: string }> {
	const url = `${FREESOUND_BASE_URL}/sounds/${soundId}/download/`
	const res = await fetchApi(url, accessToken)

	const contentType = res.headers.get('content-type') ?? 'audio/mpeg'
	const blob = await res.blob()

	return { blob, contentType }
}

/**
 * Fetch the HQ MP3 preview of a sound. No OAuth2 required.
 * Useful as a fallback when user is not authenticated.
 */
export async function downloadPreview(previewUrl: string): Promise<{ blob: Blob; contentType: string }> {
	const res = await fetch(previewUrl)

	if (!res.ok) {
		throw new FreesoundApiError(res.status, `Failed to download preview: ${res.status}`)
	}

	const contentType = res.headers.get('content-type') ?? 'audio/mpeg'
	const blob = await res.blob()

	return { blob, contentType }
}
