ALTER TABLE "meetups" DROP CONSTRAINT "meetups_capacity_check";--> statement-breakpoint
ALTER TABLE "meetups" ALTER COLUMN "capacity" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "meetups" ADD CONSTRAINT "meetups_capacity_check" CHECK ("meetups"."capacity" is null or "meetups"."capacity" between 2 and 100);