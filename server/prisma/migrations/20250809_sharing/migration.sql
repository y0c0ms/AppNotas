-- Sharing support
ALTER TABLE "Note" ADD COLUMN IF NOT EXISTS "isShared" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS "NoteCollaborator" (
  "noteId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  CONSTRAINT "NoteCollaborator_pkey" PRIMARY KEY ("noteId", "userId"),
  CONSTRAINT "NoteCollaborator_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "NoteCollaborator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "NoteCollaborator_userId_idx" ON "NoteCollaborator"("userId");


