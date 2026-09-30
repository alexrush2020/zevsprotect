import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_settings_b24_stage_map_payment_status" AS ENUM('pending', 'invoiced', 'paid', 'failed');
  CREATE TABLE "home_stats" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"value" numeric NOT NULL,
  	"suffix" varchar,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "home_advantages" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "home_terms" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "home_reviews" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"company" varchar NOT NULL,
  	"city" varchar,
  	"line" varchar,
  	"text" varchar NOT NULL,
  	"fact" varchar
  );
  
  CREATE TABLE "home_stamps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL
  );
  
  CREATE TABLE "about_why_lead" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "about_geo" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"detail" varchar NOT NULL
  );
  
  CREATE TABLE "settings_contacts_desks" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"phone" varchar,
  	"email" varchar NOT NULL
  );
  
  ALTER TABLE "home" ADD COLUMN "about_title" varchar;
  ALTER TABLE "home" ADD COLUMN "about_text" varchar;
  ALTER TABLE "home" ADD COLUMN "reviews_title" varchar;
  ALTER TABLE "home" ADD COLUMN "cta_title" varchar;
  ALTER TABLE "home" ADD COLUMN "cta_text" varchar;
  ALTER TABLE "about" ADD COLUMN "capacity" numeric;
  ALTER TABLE "about" ADD COLUMN "models_count" numeric;
  ALTER TABLE "about" ADD COLUMN "regions" numeric;
  ALTER TABLE "settings_b24_stage_map" ADD COLUMN "payment_status" "enum_settings_b24_stage_map_payment_status";
  ALTER TABLE "settings" ADD COLUMN "contacts_hours" varchar;
  ALTER TABLE "home_stats" ADD CONSTRAINT "home_stats_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_advantages" ADD CONSTRAINT "home_advantages_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_terms" ADD CONSTRAINT "home_terms_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_reviews" ADD CONSTRAINT "home_reviews_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "home_stamps" ADD CONSTRAINT "home_stamps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."home"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_why_lead" ADD CONSTRAINT "about_why_lead_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_geo" ADD CONSTRAINT "about_geo_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "settings_contacts_desks" ADD CONSTRAINT "settings_contacts_desks_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."settings"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "home_stats_order_idx" ON "home_stats" USING btree ("_order");
  CREATE INDEX "home_stats_parent_id_idx" ON "home_stats" USING btree ("_parent_id");
  CREATE INDEX "home_advantages_order_idx" ON "home_advantages" USING btree ("_order");
  CREATE INDEX "home_advantages_parent_id_idx" ON "home_advantages" USING btree ("_parent_id");
  CREATE INDEX "home_terms_order_idx" ON "home_terms" USING btree ("_order");
  CREATE INDEX "home_terms_parent_id_idx" ON "home_terms" USING btree ("_parent_id");
  CREATE INDEX "home_reviews_order_idx" ON "home_reviews" USING btree ("_order");
  CREATE INDEX "home_reviews_parent_id_idx" ON "home_reviews" USING btree ("_parent_id");
  CREATE INDEX "home_stamps_order_idx" ON "home_stamps" USING btree ("_order");
  CREATE INDEX "home_stamps_parent_id_idx" ON "home_stamps" USING btree ("_parent_id");
  CREATE INDEX "about_why_lead_order_idx" ON "about_why_lead" USING btree ("_order");
  CREATE INDEX "about_why_lead_parent_id_idx" ON "about_why_lead" USING btree ("_parent_id");
  CREATE INDEX "about_geo_order_idx" ON "about_geo" USING btree ("_order");
  CREATE INDEX "about_geo_parent_id_idx" ON "about_geo" USING btree ("_parent_id");
  CREATE INDEX "settings_contacts_desks_order_idx" ON "settings_contacts_desks" USING btree ("_order");
  CREATE INDEX "settings_contacts_desks_parent_id_idx" ON "settings_contacts_desks" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "home_stats" CASCADE;
  DROP TABLE "home_advantages" CASCADE;
  DROP TABLE "home_terms" CASCADE;
  DROP TABLE "home_reviews" CASCADE;
  DROP TABLE "home_stamps" CASCADE;
  DROP TABLE "about_why_lead" CASCADE;
  DROP TABLE "about_geo" CASCADE;
  DROP TABLE "settings_contacts_desks" CASCADE;
  ALTER TABLE "home" DROP COLUMN "about_title";
  ALTER TABLE "home" DROP COLUMN "about_text";
  ALTER TABLE "home" DROP COLUMN "reviews_title";
  ALTER TABLE "home" DROP COLUMN "cta_title";
  ALTER TABLE "home" DROP COLUMN "cta_text";
  ALTER TABLE "about" DROP COLUMN "capacity";
  ALTER TABLE "about" DROP COLUMN "models_count";
  ALTER TABLE "about" DROP COLUMN "regions";
  ALTER TABLE "settings_b24_stage_map" DROP COLUMN "payment_status";
  ALTER TABLE "settings" DROP COLUMN "contacts_hours";
  DROP TYPE "public"."enum_settings_b24_stage_map_payment_status";`)
}
