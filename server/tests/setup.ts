import "dotenv/config";
// Tests expect a real Postgres reachable at DATABASE_URL (see README ->
// Testing). We don't mock Prisma: these tests exist specifically to prove
// authorization holds through the real query layer, not through a stub
// that could silently drift from production behavior.
