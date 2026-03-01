import type { FreesoundOAuthTokens } from '$lib/freesound/_types'
import { FREESOUND_BASE_URL, FREESOUND_CALLBACK_URL, FREESOUND_CLIENT_ID } from '$lib/freesound/config'

const STORAGE_KEY_ACCESS_TOKEN = 'freesound_access_token'
const STORAGE_KEY_REFRESH_TOKEN = 'freesound_refresh_token'
const STORAGE_KEY_EXPIRES_AT = 'freesound_expires_at'

/**
 * Returns the Freesound OAuth2 authorization URL.
 * Redirect the user to this URL to start the OAuth2 flow.
 */
export function getAuthorizationUrl(): string {
	const params = new URLSearchParams({
		client_id: FREESOUND_CLIENT_ID,
		response_type: 'code',
		redirect_uri: FREESOUND_CALLBACK_URL,
	})

	return `${FREESOUND_BASE_URL}/oauth2/authorize/?${params}`
}

/**
 * Exchange an authorization code for access + refresh tokens.
 * Call this after the user is redirected back with a `code` query parameter.
 */
export async function exchangeCodeForToken(code: string): Promise<FreesoundOAuthTokens> {
	const res = await fetch(`${FREESOUND_BASE_URL}/oauth2/access_token/`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: FREESOUND_CLIENT_ID,
			grant_type: 'authorization_code',
			code,
		}),
	})

	if (!res.ok) {
		const body = await res.text().catch(() => 'Unknown error')
		throw new Error(`OAuth2 token exchange failed (${res.status}): ${body}`)
	}

	const tokens: FreesoundOAuthTokens = await res.json()
	storeTokens(tokens)

	return tokens
}

/**
 * Refresh an expired access token using the stored refresh token.
 */
export async function refreshAccessToken(): Promise<FreesoundOAuthTokens> {
	const refreshToken = getStoredRefreshToken()

	if (!refreshToken) {
		throw new Error('No refresh token available. User must re-authenticate.')
	}

	const res = await fetch(`${FREESOUND_BASE_URL}/oauth2/access_token/`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: FREESOUND_CLIENT_ID,
			grant_type: 'refresh_token',
			refresh_token: refreshToken,
		}),
	})

	if (!res.ok) {
		clearTokens()
		const body = await res.text().catch(() => 'Unknown error')
		throw new Error(`OAuth2 token refresh failed (${res.status}): ${body}`)
	}

	const tokens: FreesoundOAuthTokens = await res.json()
	storeTokens(tokens)

	return tokens
}

/**
 * Get a valid access token — refreshes automatically if expired.
 * Returns `null` if the user has never authenticated.
 */
export async function getValidAccessToken(): Promise<string | null> {
	const accessToken = localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN)

	if (!accessToken) {
		return null
	}

	const expiresAt = Number(localStorage.getItem(STORAGE_KEY_EXPIRES_AT) ?? 0)

	if (Date.now() < expiresAt) {
		return accessToken
	}

	// Token expired — attempt refresh
	try {
		const tokens = await refreshAccessToken()
		return tokens.access_token
	} catch {
		return null
	}
}

/**
 * Check whether the user has stored OAuth2 tokens (may be expired but refreshable).
 */
export function hasStoredTokens(): boolean {
	return localStorage.getItem(STORAGE_KEY_ACCESS_TOKEN) !== null
}

// ── Internal helpers ──────────────────────────────────────────────────

function storeTokens(tokens: FreesoundOAuthTokens): void {
	localStorage.setItem(STORAGE_KEY_ACCESS_TOKEN, tokens.access_token)
	localStorage.setItem(STORAGE_KEY_REFRESH_TOKEN, tokens.refresh_token)
	// Store absolute expiry time (with 60s safety margin)
	const expiresAt = Date.now() + (tokens.expires_in - 60) * 1000
	localStorage.setItem(STORAGE_KEY_EXPIRES_AT, String(expiresAt))
}

function getStoredRefreshToken(): string | null {
	return localStorage.getItem(STORAGE_KEY_REFRESH_TOKEN)
}

export function clearTokens(): void {
	localStorage.removeItem(STORAGE_KEY_ACCESS_TOKEN)
	localStorage.removeItem(STORAGE_KEY_REFRESH_TOKEN)
	localStorage.removeItem(STORAGE_KEY_EXPIRES_AT)
}
