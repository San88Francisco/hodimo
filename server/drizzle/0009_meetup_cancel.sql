ALTER TABLE "meetups" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "meetups" ADD COLUMN "cancel_reason" text;