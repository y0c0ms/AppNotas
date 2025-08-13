// Placeholder API for Option B (per-user prefs). Wire to server when available.
import { getApi } from './auth'

export type NotePrefs = {
  pinned?: boolean
  isList?: boolean
  colorOverride?: string | null
  collapsed?: boolean
}

export async function updateNotePrefs(noteId: string, prefs: NotePrefs) {
  const api = getApi()
  try {
    await api.post(`notes/${noteId}/prefs`, { json: prefs }).json()
  } catch {}
}


