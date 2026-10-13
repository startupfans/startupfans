ALTER TABLE "users" ADD COLUMN "handle" text;--> statement-breakpoint
DO $$
DECLARE
  member record;
  suffix_number bigint;
  suffix text;
  candidate text;
BEGIN
  FOR member IN
    WITH sanitized AS (
      SELECT "id", "created_at",
        left(regexp_replace(lower(split_part(btrim("email"), '@', 1)), '[^a-z0-9_]', '', 'g'), 24) AS base
      FROM "users" WHERE "handle" IS NULL
    ), bases AS (
      SELECT "id", "created_at", CASE WHEN length(base) < 3 THEN rpad(base, 3, '_') ELSE base END AS base
      FROM sanitized
    )
    SELECT "id", base,
      row_number() OVER (PARTITION BY lower(base) ORDER BY "created_at", "id") AS ordinal
    FROM bases ORDER BY "created_at", "id"
  LOOP
    suffix_number := member.ordinal;
    LOOP
      suffix := CASE WHEN suffix_number = 1 THEN '' ELSE suffix_number::text END;
      candidate := left(member.base, 24 - length(suffix)) || suffix;
      EXIT WHEN candidate NOT IN (
        'admin', 'startupfans', 'me', 'login', 'feed', 'start', 'api', 's', 'u',
        'join', 'settings', 'team', 'fans', 'following'
      ) AND NOT EXISTS (SELECT 1 FROM "users" WHERE lower("handle") = candidate);
      suffix_number := suffix_number + 1;
    END LOOP;
    UPDATE "users" SET "handle" = candidate WHERE "id" = member.id;
  END LOOP;
END $$;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "handle" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "users_handle_unique" ON "users" USING btree (lower("handle"));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_handle_check" CHECK (char_length("users"."handle") between 3 and 24 and "users"."handle" ~ '^[a-z0-9_]+$' and "users"."handle" = lower("users"."handle"));
