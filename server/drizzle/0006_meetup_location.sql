ALTER TABLE "meetups" ADD COLUMN "lat" double precision;--> statement-breakpoint
ALTER TABLE "meetups" ADD COLUMN "lng" double precision;--> statement-breakpoint
ALTER TABLE "meetups" ADD CONSTRAINT "meetups_location_check" CHECK (("meetups"."lat" is null and "meetups"."lng" is null) or ("meetups"."lat" between -90 and 90 and "meetups"."lng" between -180 and 180));