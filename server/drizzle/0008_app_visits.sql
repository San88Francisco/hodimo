CREATE TABLE "app_visits" (
	"user_id" uuid NOT NULL,
	"opened_at" timestamp with time zone NOT NULL,
	CONSTRAINT "app_visits_user_id_opened_at_pk" PRIMARY KEY("user_id","opened_at")
);
--> statement-breakpoint
ALTER TABLE "app_visits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_visits" ADD CONSTRAINT "app_visits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_visits_opened_at_idx" ON "app_visits" USING btree ("opened_at");