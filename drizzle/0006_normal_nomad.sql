CREATE TABLE "sprints" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"project_id" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" varchar(1000),
	"status" varchar(20) DEFAULT 'planning' NOT NULL,
	"start_date" timestamp,
	"end_date" timestamp,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "work_logs" ADD COLUMN "sprint_id" varchar(50);--> statement-breakpoint
ALTER TABLE "work_logs" ADD COLUMN "work_type" varchar(30);
