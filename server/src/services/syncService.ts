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
      const existing = await tx.note.findFirst({ where: { userId, id: op.id } });
      if (op.type === 'delete') {
        if (existing) {
          const updated = await tx.note.update({ where: { id: existing.id }, data: { deletedAt: new Date(op.updatedAt), lastModifiedByDeviceId: deviceId } });
          const change = await tx.change.create({ data: { userId, entity: 'note', entityId: updated.id, op: 'delete', deviceId: deviceId || null, snapshotJson: JSON.stringify(updated) } });
          applied.push({ id: updated.id, serverChangeSeq: Number(change.id), updatedAt: updated.updatedAt.toISOString() });
        }
        continue;
      }
      // upsert
      if (!existing) {
        const created = await tx.note.create({ data: { userId, id: op.id, title: op.data?.title || '', content: op.data?.content || '', color: op.data?.color || '#fff59d', posX: op.data?.position?.x || 0, posY: op.data?.position?.y || 0, width: op.data?.size?.w || 300, height: op.data?.size?.h || 200, zIndex: op.data?.zIndex || 0, pinned: !!op.data?.pinned, archived: !!op.data?.archived, dueAt: op.data?.dueAt ? new Date(op.data.dueAt) : null, recurrenceRule: op.data?.recurrenceRule || null, reminderAt: op.data?.reminderAt ? new Date(op.data.reminderAt) : null, deletedAt: op.data?.deletedAt ? new Date(op.data.deletedAt) : null, lastModifiedByDeviceId: deviceId || null } });
        const change = await tx.change.create({ data: { userId, entity: 'note', entityId: created.id, op: 'upsert', deviceId: deviceId || null, snapshotJson: JSON.stringify(created) } });
        applied.push({ id: created.id, serverChangeSeq: Number(change.id), updatedAt: created.updatedAt.toISOString() });
      } else {
        // LWW based on updatedAt; server's existing wins if newer
        const incomingUpdated = new Date(op.updatedAt).getTime();
        const serverUpdated = new Date(existing.updatedAt).getTime();
        if (incomingUpdated <= serverUpdated) {
          conflicts.push({ id: existing.id, serverVersion: serverUpdated, note: existing });
        } else {
          const updated = await tx.note.update({ where: { id: existing.id }, data: { title: op.data?.title ?? existing.title, content: op.data?.content ?? existing.content, color: op.data?.color ?? existing.color, posX: op.data?.position?.x ?? existing.posX, posY: op.data?.position?.y ?? existing.posY, width: op.data?.size?.w ?? existing.width, height: op.data?.size?.h ?? existing.height, zIndex: op.data?.zIndex ?? existing.zIndex, pinned: op.data?.pinned ?? existing.pinned, archived: op.data?.archived ?? existing.archived, dueAt: op.data?.dueAt ? new Date(op.data.dueAt) : existing.dueAt, recurrenceRule: op.data?.recurrenceRule ?? existing.recurrenceRule, reminderAt: op.data?.reminderAt ? new Date(op.data.reminderAt) : existing.reminderAt, deletedAt: op.data?.deletedAt ? new Date(op.data.deletedAt) : existing.deletedAt, lastModifiedByDeviceId: deviceId || existing.lastModifiedByDeviceId } });
          const change = await tx.change.create({ data: { userId, entity: 'note', entityId: updated.id, op: 'upsert', deviceId: deviceId || null, snapshotJson: JSON.stringify(updated) } });
          applied.push({ id: updated.id, serverChangeSeq: Number(change.id), updatedAt: updated.updatedAt.toISOString() });
        }
      }
    }

    const changes = await tx.change.findMany({ where: { userId, id: { gt: BigInt(clientCursor) } }, orderBy: { id: 'asc' }, take: 500 });
    const newCursor = changes.length ? Number(changes[changes.length - 1].id) : clientCursor;
    return { applied, conflicts, changes: changes.map(c => ({ serverChangeSeq: Number(c.id), type: c.op, entity: c.entity, id: c.entityId, note: JSON.parse(c.snapshotJson) })), newCursor };
  });
}


