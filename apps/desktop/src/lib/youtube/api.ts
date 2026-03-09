import { YOUTUBE_API_KEY, YOUTUBE_API_BASE_URL } from '$lib/youtube/config'

type YoutubeVideoInfo = {
  title: string
  duration: number
  tags: string[]
}

/**
 * Extract the video ID from a YouTube URL.
 * Supports youtube.com/watch?v=, youtu.be/, youtube.com/shorts/,
 * youtube.com/embed/, and music.youtube.com/watch?v= variants.
 */
export function extractYoutubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const hostname = parsed.hostname.replace('www.', '')

    if (hostname === 'youtu.be') {
      return parsed.pathname.slice(1) || null
    }

    if (hostname === 'youtube.com' || hostname === 'music.youtube.com' || hostname === 'm.youtube.com') {
      // /watch?v=ID
      const v = parsed.searchParams.get('v')
      if (v) return v

      // /shorts/ID, /embed/ID, /v/ID
      const match = parsed.pathname.match(/^\/(shorts|embed|v)\/([^/?]+)/)
      if (match) return match[2]
    }

    return null
  } catch {
    return null
  }
}

/**
 * Parse an ISO 8601 duration string (e.g. "PT1H23M45S") into seconds.
 */
function parseIsoDuration(iso: string): number {
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/)
  if (!match) return 0

  const hours = parseInt(match[1] || '0', 10)
  const minutes = parseInt(match[2] || '0', 10)
  const seconds = parseInt(match[3] || '0', 10)

  return hours * 3600 + minutes * 60 + seconds
}

/**
 * Fetch video metadata from the YouTube Data API v3.
 * Returns title, duration (seconds), and up to 5 lowercase tags.
 */
export async function fetchYoutubeInfo(videoId: string): Promise<YoutubeVideoInfo> {
  const params = new URLSearchParams({
    part: 'snippet,contentDetails',
    id: videoId,
    key: YOUTUBE_API_KEY,
  })

  const res = await fetch(`${YOUTUBE_API_BASE_URL}/videos?${params}`)

  if (!res.ok) {
    throw new Error(`YouTube API error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()

  if (!data.items || data.items.length === 0) {
    throw new Error('Video not found')
  }

  const item = data.items[0]
  const snippet = item.snippet
  const contentDetails = item.contentDetails

  return {
    title: snippet.title,
    duration: parseIsoDuration(contentDetails.duration),
    tags: (snippet.tags ?? []).slice(0, 5).map((t: string) => t.toLowerCase()),
  }
}
