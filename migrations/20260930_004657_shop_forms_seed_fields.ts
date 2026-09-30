import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_reviews_tags" AS ENUM('quality', 'shipment', 'grip', 'size', 'pack');
  ALTER TYPE "public"."enum_leads_type" ADD VALUE 'pricelist';
  ALTER TYPE "public"."enum_leads_type" ADD VALUE 'cart';
  CREATE TABLE "reviews_tags" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_reviews_tags",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  ALTER TABLE "customers" ALTER COLUMN "phone" DROP NOT NULL;
  ALTER TABLE "categories" ADD COLUMN "short" varchar;
  ALTER TABLE "categories" ADD COLUMN "description" varchar;
  ALTER TABLE "reviews" ADD COLUMN "color_label" varchar;
  ALTER TABLE "reviews" ADD COLUMN "size_label" varchar;
  ALTER TABLE "reviews" ADD COLUMN "order_date" timestamp(3) with time zone;
  ALTER TABLE "reviews" ADD COLUMN "shipped" boolean DEFAULT false;
  ALTER TABLE "reviews" ADD COLUMN "shipped_at" timestamp(3) with time zone;
  ALTER TABLE "reviews" ADD COLUMN "recommends" boolean;
  ALTER TABLE "reviews_tags" ADD CONSTRAINT "reviews_tags_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."reviews"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "reviews_tags_order_idx" ON "reviews_tags" USING btree ("order");
  CREATE INDEX "reviews_tags_parent_idx" ON "reviews_tags" USING btree ("parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "reviews_tags" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "reviews_tags" CASCADE;
  ALTER TABLE "leads" ALTER COLUMN "type" SET DATA TYPE text;
  DROP TYPE "public"."enum_leads_type";
  CREATE TYPE "public"."enum_leads_type" AS ENUM('feedback', 'calculation', 'samples', 'consultation', 'product-request');
  ALTER TABLE "leads" ALTER COLUMN "type" SET DATA TYPE "public"."enum_leads_type" USING "type"::"public"."enum_leads_type";
  ALTER TABLE "customers" ALTER COLUMN "phone" SET NOT NULL;
  ALTER TABLE "categories" DROP COLUMN "short";
  ALTER TABLE "categories" DROP COLUMN "description";
  ALTER TABLE "reviews" DROP COLUMN "color_label";
  ALTER TABLE "reviews" DROP COLUMN "size_label";
  ALTER TABLE "reviews" DROP COLUMN "order_date";
  ALTER TABLE "reviews" DROP COLUMN "shipped";
  ALTER TABLE "reviews" DROP COLUMN "shipped_at";
  ALTER TABLE "reviews" DROP COLUMN "recommends";
  DROP TYPE "public"."enum_reviews_tags";`)
}
