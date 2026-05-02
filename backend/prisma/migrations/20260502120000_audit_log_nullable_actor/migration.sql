-- Make actorUserId nullable in AuditLog so system-generated entries
-- (alert engine, background workers) can be recorded without a user FK.

-- Drop the existing FK constraint
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_actorUserId_fkey";

-- Make the column nullable
ALTER TABLE "AuditLog" ALTER COLUMN "actorUserId" DROP NOT NULL;

-- Re-add FK as optional (only enforced when non-null)
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey"
  FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
