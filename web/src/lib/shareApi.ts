import { getApi } from './auth'

export async function updateSharing(
  noteId: string,
  opts: { isShared?: boolean; addCollaborators?: string[]; removeCollaborators?: string[] }
) {
  const api = getApi()
  await api.post(`notes/${noteId}/share`, { json: opts }).json<any>().catch((e: any) => {
    console.warn('updateSharing failed', e?.message)
    throw e
  })
}

export async function leaveNote(noteId: string) {
  const api = getApi()
  await api.post(`notes/${noteId}/leave`)
}


