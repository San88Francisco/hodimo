ALTER TABLE "meetups" ADD COLUMN "announced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "meetups" ADD COLUMN "reminded_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bot_access" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "notify_new_meetups" boolean DEFAULT true NOT NULL;--> statement-breakpoint
-- Уже опубліковані події не анонсуємо заднім числом.
UPDATE "meetups" SET "announced_at" = now() WHERE "status" = 'approved';
