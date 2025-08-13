import { prisma } from '../prisma/client.js';

type SyncOp = {
  type: 'upsert' | 'delete';
  entity: 'note';
  id: string;
  updatedAt: string;
  clientLogicalClock?: number;
  data?: any;
};

export async function sync(userId: string, body: { clientCursor?: number; deviceId?: string; ops?: SyncOp[] }) {
  const clientCursor = Number(body.clientCursor || 0);
  const deviceId = body.deviceId;
  const ops = body.ops || [];

  return await prisma.$transaction(async (tx) => {
    const applied: any[] = [];
    const conflicts: any[] = [];

    for (const op of ops) {
      if (op.entity !== 'note') continue;
      // Owner note (for delete and create)
      const ownerNote = await tx.note.findFirst({ where: { userId, id: op.id } });
      // Accessible note: owner or collaborator
      const accessibleNote = ownerNote ?? await tx.note.findFirst({ where: { id: op.id, collaborators: { some: { userId } } } });

      if (op.type === 'delete') {
        // Only owner can delete
        if (ownerNote) {
          const updated = await tx.note.update({ where: { id: ownerNote.id }, data: { deletedAt: new Date(op.updatedAt), lastModifiedByDeviceId: deviceId } });
          const change = await tx.change.create({ data: { userId, entity: 'note', entityId: updated.id, op: 'delete', deviceId: deviceId || null, snapshotJson: JSON.stringify(updated) } });
          applied.push({ id: updated.id, serverChangeSeq: Number(change.id), updatedAt: updated.updatedAt.toISOString() });
        }
        continue;
      }
      // upsert
      if (!accessibleNote) {
        // Create only allowed for owner
        if (!ownerNote) {
          // Create new note for owner
          const created = await tx.note.create({ data: { userId, id: op.id, title: op.data?.title || '', content: op.data?.content || '', color: op.data?.color || '#fff59d', posX: op.data?.position?.x || 0, posY: op.data?.position?.y || 0, width: op.data?.size?.w || 300, height: op.data?.size?.h || 200, zIndex: op.data?.zIndex || 0, pinned: !!op.data?.pinned, archived: !!op.data?.archived, dueAt: op.data?.dueAt ? new Date(op.data.dueAt) : null, recurrenceRule: op.data?.recurrenceRule || null, reminderAt: op.data?.reminderAt ? new Date(op.data.reminderAt) : null, deletedAt: op.data?.deletedAt ? new Date(op.data.deletedAt) : null, lastModifiedByDeviceId: deviceId || null, isShared: !!op.data?.isShared } });
          if (Array.isArray(op.data?.collaborators) && op.data.collaborators.length > 0) {
            const users = await tx.user.findMany({ where: { email: { in: op.data.collaborators as string[] } }, select: { id: true } });
            if (users.length) {
              await tx.noteCollaborator.createMany({ data: users.map(u => ({ noteId: created.id, userId: u.id })), skipDuplicates: true });
            }
          }
          const change = await tx.change.create({ data: { userId, entity: 'note', entityId: created.id, op: 'upsert', deviceId: deviceId || null, snapshotJson: JSON.stringify(created) } });
          applied.push({ id: created.id, serverChangeSeq: Number(change.id), updatedAt: created.updatedAt.toISOString() });
        }
        continue;
      }
      // Update (owner or collaborator)
      const incomingUpdated = new Date(op.updatedAt).getTime();
      const serverUpdated = new Date(accessibleNote.updatedAt).getTime();
      if (incomingUpdated <= serverUpdated) {
        conflicts.push({ id: accessibleNote.id, serverVersion: serverUpdated, note: accessibleNote });
      } else {
        const updated = await tx.note.update({ where: { id: accessibleNote.id }, data: { title: op.data?.title ?? accessibleNote.title, content: op.data?.content ?? accessibleNote.content, color: op.data?.color ?? accessibleNote.color, posX: op.data?.position?.x ?? accessibleNote.posX, posY: op.data?.position?.y ?? accessibleNote.posY, width: op.data?.size?.w ?? accessibleNote.width, height: op.data?.size?.h ?? accessibleNote.height, zIndex: op.data?.zIndex ?? accessibleNote.zIndex, pinned: op.data?.pinned ?? accessibleNote.pinned, archived: op.data?.archived ?? accessibleNote.archived, dueAt: op.data?.dueAt ? new Date(op.data.dueAt) : accessibleNote.dueAt, recurrenceRule: op.data?.recurrenceRule ?? accessibleNote.recurrenceRule, reminderAt: op.data?.reminderAt ? new Date(op.data.reminderAt) : accessibleNote.reminderAt, deletedAt: op.data?.deletedAt ? new Date(op.data.deletedAt) : accessibleNote.deletedAt, lastModifiedByDeviceId: deviceId || accessibleNote.lastModifiedByDeviceId, isShared: op.data?.isShared ?? accessibleNote.isShared } });
        if (Array.isArray(op.data?.collaborators) && op.data.collaborators.length > 0) {
          const users = await tx.user.findMany({ where: { email: { in: op.data.collaborators as string[] } }, select: { id: true } });
          if (users.length) {
            await tx.noteCollaborator.createMany({ data: users.map(u => ({ noteId: updated.id, userId: u.id })), skipDuplicates: true });
          }
        }
        // Record change under owner's userId so owner stream sees it
        const change = await tx.change.create({ data: { userId: accessibleNote.userId, entity: 'note', entityId: updated.id, op: 'upsert', deviceId: deviceId || null, snapshotJson: JSON.stringify(updated) } });
        applied.push({ id: updated.id, serverChangeSeq: Number(change.id), updatedAt: updated.updatedAt.toISOString() });
      }
    }

    // Include notes shared with this user (collaborator rows). For MVP, we stream own changes; shared reads handled client via dedicated fetch later.
    const changes = await tx.change.findMany({ where: { userId, id: { gt: BigInt(clientCursor) } }, orderBy: { id: 'asc' }, take: 500 });
    const noteIds = Array.from(new Set(changes.filter(c => c.entity === 'note').map(c => c.entityId)));
    let prefs: any[] = []
    try {
      const prefsModel = (tx as any).noteUserPrefs
      if (noteIds.length && prefsModel?.findMany) {
        prefs = await prefsModel.findMany({ where: { userId, noteId: { in: noteIds } } })
      }
    } catch {}
    const prefsMap = new Map(prefs.map((p: any) => [p.noteId, p]));
    const newCursor = changes.length ? Number(changes[changes.length - 1].id) : clientCursor;
    return { applied, conflicts, changes: changes.map(c => ({ serverChangeSeq: Number(c.id), type: c.op, entity: c.entity, id: c.entityId, note: JSON.parse(c.snapshotJson), prefs: prefsMap.get(c.entityId) || null })), newCursor };
  });
}


