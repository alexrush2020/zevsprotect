import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "categories" ADD COLUMN "guid1c" varchar;
  CREATE UNIQUE INDEX "categories_guid1c_idx" ON "categories" USING btree ("guid1c");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "categories_guid1c_idx";
  ALTER TABLE "categories" DROP COLUMN "guid1c";`)
}
