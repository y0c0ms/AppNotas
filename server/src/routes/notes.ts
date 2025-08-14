import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../prisma/client.js';

const router = Router();

// List own notes + shared notes
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const own = await prisma.note.findMany({ where: { userId, deletedAt: null }, orderBy: { updatedAt: 'desc' }, include: { user: { select: { email: true } } } });
    const shared = await prisma.note.findMany({ where: { deletedAt: null, collaborators: { some: { userId } } }, orderBy: { updatedAt: 'desc' }, include: { user: { select: { email: true } } } });
    let prefs: any[] = []
    try {
      const prefsModel = (prisma as any).noteUserPrefs
      if (prefsModel?.findMany) prefs = await prefsModel.findMany({ where: { userId } })
    } catch {}
    const map = new Map(prefs.map((p: any) => [String(p.noteId), p]));
    const attach = (n: any) => ({ ...n, prefs: map.get(n.id) || null });
    console.log('[NOTES] user', userId, 'own:', own.length, 'shared:', shared.length, 'prefs:', prefs.length)
    res.json({ own: own.map(attach), shared: shared.map(attach) });
  } catch (e) { next(e); }
});

// Toggle sharing and manage collaborators
router.post('/:id/share', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const noteId = req.params.id;
    const { isShared, addCollaborators = [], removeCollaborators = [] } = req.body || {};
    console.log('[SHARE]', { userId, noteId, isShared, addCount: addCollaborators.length, removeCount: removeCollaborators.length })
    // Try owner first
    const note = await prisma.note.findFirst({ where: { id: noteId, userId } });
    // If not owner, allow self-removal (collaborator leave via this endpoint)
    if (!note) {
      if (Array.isArray(removeCollaborators) && removeCollaborators.length) {
        const me = await prisma.user.findUnique({ where: { id: userId }, select: { email: true, id: true } });
        if (me && removeCollaborators.includes(me.email)) {
          await prisma.noteCollaborator.deleteMany({ where: { noteId, userId } });
          return res.json({ ok: true });
        }
      }
      return res.status(403).json({ error: 'forbidden' });
    }

    if (typeof isShared === 'boolean') {
      await prisma.note.update({ where: { id: noteId }, data: { isShared } });
    }
    if (Array.isArray(addCollaborators) && addCollaborators.length) {
      const users = await prisma.user.findMany({ where: { email: { in: addCollaborators } }, select: { id: true } });
      await prisma.noteCollaborator.createMany({ data: users.map(u => ({ noteId, userId: u.id })), skipDuplicates: true });
    }
    if (Array.isArray(removeCollaborators) && removeCollaborators.length) {
      const users = await prisma.user.findMany({ where: { email: { in: removeCollaborators } }, select: { id: true } });
      await prisma.noteCollaborator.deleteMany({ where: { noteId, userId: { in: users.map(u => u.id) } } });
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Collaborator leaves a shared note (explicit endpoint)
router.post('/:id/leave', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const noteId = req.params.id;
    await prisma.noteCollaborator.deleteMany({ where: { noteId, userId } });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Update per-user preferences for a note
router.post('/:id/prefs', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const noteId = req.params.id;
    const { pinned, isList, colorOverride, collapsed } = req.body || {};
    // Ensure user can see the note (owner or collaborator)
    const canAccess = await prisma.note.findFirst({ where: { id: noteId, OR: [{ userId }, { collaborators: { some: { userId } } }] }, select: { id: true } });
    if (!canAccess) return res.status(404).json({ error: 'not_found' });
    try {
      const prefsModel = (prisma as any).noteUserPrefs
      if (!prefsModel?.upsert) return res.json({ ok: true })
      await prefsModel.upsert({
      where: { noteId_userId: { noteId, userId } },
      update: { pinned: pinned ?? undefined, isList: isList ?? undefined, colorOverride: typeof colorOverride === 'string' ? colorOverride : undefined, collapsed: collapsed ?? undefined },
      create: { noteId, userId, pinned: !!pinned, isList: !!isList, colorOverride: typeof colorOverride === 'string' ? colorOverride : null, collapsed: !!collapsed }
      })
      const updated = await prefsModel.findUnique({ where: { noteId_userId: { noteId, userId } } })
      res.json({ ok: true, prefs: updated });
    } catch (e) {
      // If the prefs table does not exist yet, do not fail the whole request
      res.json({ ok: true })
    }
  } catch (e) { next(e); }
});

export default router;


