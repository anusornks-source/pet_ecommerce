/**
 * One-time migration: change marketing_assets.type from varchar to enum.
 * Run: npx tsx scripts/migrate-marketing-asset-type.ts
 */
import "dotenv/config";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

async function main() {
  const url = new URL(process.env.DATABASE_URL!);
  url.searchParams.delete("sslmode");
  const pool = new pg.Pool({
    connectionString: url.toString(),
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MarketingAssetType') THEN
        CREATE TYPE "MarketingAssetType" AS ENUM ('IMAGE', 'VIDEO', 'PDF');
        ALTER TABLE "marketing_assets" ALTER COLUMN "type" TYPE "MarketingAssetType" USING "type"::"MarketingAssetType";
      END IF;
    END $$;
  `);

  console.log("Migration complete: marketing_assets.type is now MarketingAssetType enum");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
