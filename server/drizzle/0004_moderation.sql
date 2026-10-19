CREATE TYPE "public"."meetup_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user'::text;--> statement-breakpoint
-- Роль «організатор» прибрано: наявні організатори стають звичайними користувачами.
UPDATE "users" SET "role" = 'user' WHERE "role" = 'organizer';--> statement-breakpoint
DROP TYPE "public"."user_role";--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user'::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "meetups" ADD COLUMN "status" "meetup_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
-- Події, створені до модерації, лишаються видимими.
UPDATE "meetups" SET "status" = 'approved';--> statement-breakpoint
ALTER TABLE "meetups" ADD COLUMN "reject_reason" text;--> statement-breakpoint
CREATE INDEX "meetups_status_idx" ON "meetups" USING btree ("status");