-- Create per-user preferences table for notes
CREATE TABLE IF NOT EXISTS "NoteUserPrefs" (
    "noteId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "isList" BOOLEAN NOT NULL DEFAULT false,
    "colorOverride" TEXT,
    "collapsed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NoteUserPrefs_pkey" PRIMARY KEY ("noteId", "userId"),
    CONSTRAINT "NoteUserPrefs_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "Note"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "NoteUserPrefs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Index for fast lookups by user
CREATE INDEX IF NOT EXISTS "NoteUserPrefs_userId_idx" ON "NoteUserPrefs"("userId");


