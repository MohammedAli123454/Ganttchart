CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"wbs_node_id" integer NOT NULL,
	"code" text NOT NULL,
	"description" text NOT NULL,
	"man_hours" numeric(10, 2) DEFAULT '0',
	"progress" numeric(5, 2) DEFAULT '0',
	"start_date" timestamp,
	"finish_date" timestamp,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wbs_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"parent_id" integer,
	"wbs_code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"level" integer DEFAULT 0 NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"color" text DEFAULT '#3b82f6',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_wbs_node_id_wbs_nodes_id_fk" FOREIGN KEY ("wbs_node_id") REFERENCES "public"."wbs_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wbs_nodes" ADD CONSTRAINT "wbs_nodes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;