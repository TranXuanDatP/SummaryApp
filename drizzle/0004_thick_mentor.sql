CREATE TABLE "comments" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"work_log_id" varchar(50) NOT NULL,
	"author_id" varchar(50) NOT NULL,
	"content" text NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
