import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { prisma } from '../prisma/client.js';

const router = Router();

// List own notes + shared notes
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const own = await prisma.note.findMany({ where: { userId, deletedAt: null }, orderBy: { updatedAt: 'desc' } });
    const shared = await prisma.note.findMany({
      where: { deletedAt: null, collaborators: { some: { userId } } },
      orderBy: { updatedAt: 'desc' }
    });
    res.json({ own, shared });
  } catch (e) { next(e); }
});

// Toggle sharing and manage collaborators
router.post('/:id/share', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.userId;
    const noteId = req.params.id;
    const { isShared, addCollaborators = [], removeCollaborators = [] } = req.body || {};
    // Ensure ownership
    const note = await prisma.note.findFirst({ where: { id: noteId, userId } });
    if (!note) return res.status(404).json({ error: 'not_found' });

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

export default router;


