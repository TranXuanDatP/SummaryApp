CREATE TABLE "projects" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" varchar(1000),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
