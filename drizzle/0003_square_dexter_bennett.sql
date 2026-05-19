CREATE TABLE "work_logs" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"project_id" varchar(50) NOT NULL,
	"employee_id" varchar(50) NOT NULL,
	"execution_date" timestamp NOT NULL,
	"content" text NOT NULL,
	"is_unlocked" boolean DEFAULT false NOT NULL,
	"unlocked_by" varchar(50),
	"unlocked_at" timestamp,
	"unlock_reason" text,
	"version" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
