CREATE TYPE "public"."outbox_status" AS ENUM('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED');--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"full_name" varchar(200) NOT NULL,
	"role" varchar(20) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"is_deleted" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" varchar(36) PRIMARY KEY NOT NULL,
	"aggregate_id" varchar(36) NOT NULL,
	"aggregate_type" varchar(100) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"payload" text NOT NULL,
	"status" "outbox_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"last_error" text
);
--> statement-breakpoint
CREATE INDEX "idx_outbox_status_created" ON "outbox" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_outbox_aggregate" ON "outbox" USING btree ("aggregate_id");--> statement-breakpoint
CREATE INDEX "idx_outbox_event_type" ON "outbox" USING btree ("event_type");