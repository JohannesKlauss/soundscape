import { PUBLIC_FREESOUND_API_KEY } from '$env/static/public'

export const FREESOUND_BASE_URL = 'https://freesound.org/apiv2'
export const FREESOUND_API_KEY = PUBLIC_FREESOUND_API_KEY

export const FREESOUND_SEARCH_FIELDS = [
  'id',
  'name',
  'tags',
  'duration',
  'avg_rating',
  'num_downloads',
  'previews',
  'username',
  'license',
  'type',
].join(',')

export const FREESOUND_DEFAULT_PAGE_SIZE = 15
export const FREESOUND_SEARCH_DEBOUNCE_MS = 350
