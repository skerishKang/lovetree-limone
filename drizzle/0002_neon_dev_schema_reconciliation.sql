-- One-time, data-preserving reconciliation for the existing Neon development DB.
--
-- The database was provisioned with the tables from 0000/0001 but without the
-- enum types, constraints, indexes, client_key columns, or migration history.
-- This repair is intentionally guarded and idempotent. It must not be used for
-- production, and it deliberately does not create fake __drizzle_migrations
-- rows because the 0000/0001 history was never applied by Drizzle.
DO $$
BEGIN
  IF to_regtype('public.comment_status') IS NULL THEN
    EXECUTE 'CREATE TYPE public.comment_status AS ENUM (''visible'', ''deleted'')';
  END IF;
  IF to_regtype('public.reaction_type') IS NULL THEN
    EXECUTE 'CREATE TYPE public.reaction_type AS ENUM (''like'', ''love'', ''laugh'', ''wow'', ''sad'', ''angry'')';
  END IF;
  IF to_regtype('public.social_outcome') IS NULL THEN
    EXECUTE 'CREATE TYPE public.social_outcome AS ENUM (''ok'', ''duplicate'', ''not_found'', ''forbidden'', ''rate_limited'', ''error'')';
  END IF;
  IF to_regtype('public.source_type') IS NULL THEN
    EXECUTE 'CREATE TYPE public.source_type AS ENUM (''youtube'', ''video'', ''song'', ''book'', ''person'', ''travel'', ''other'', ''link'')';
  END IF;
  IF to_regtype('public.visibility') IS NULL THEN
    EXECUTE 'CREATE TYPE public.visibility AS ENUM (''private'', ''unlisted'', ''public'')';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'memories' AND column_name = 'client_key'
  ) THEN
    EXECUTE 'ALTER TABLE public.memories ADD COLUMN client_key text';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'trees' AND column_name = 'client_key'
  ) THEN
    EXECUTE 'ALTER TABLE public.trees ADD COLUMN client_key text';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.trees
    WHERE owner_id IS NULL OR title IS NULL OR memo IS NULL OR artist IS NULL
       OR visibility IS NULL OR keywords IS NULL OR created_at IS NULL OR updated_at IS NULL
  ) THEN
    RAISE EXCEPTION 'trees has NULL values in columns that must become NOT NULL; no rows were changed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.memories
    WHERE id IS NULL OR tree_id IS NULL OR title IS NULL OR memo IS NULL OR artist IS NULL
       OR source IS NULL OR source_url IS NULL OR source_type IS NULL OR thumbnail IS NULL
       OR emotion_tags IS NULL OR timestamp IS NULL OR visibility IS NULL
       OR created_at IS NULL OR updated_at IS NULL
  ) THEN
    RAISE EXCEPTION 'memories has NULL values in required columns; no rows were changed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.comments WHERE status IS NULL OR status NOT IN ('visible', 'deleted')) THEN
    RAISE EXCEPTION 'comments.status contains NULL or an unsupported enum value; no rows were changed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.memories WHERE source_type NOT IN ('youtube', 'video', 'song', 'book', 'person', 'travel', 'other', 'link')) THEN
    RAISE EXCEPTION 'memories.source_type contains an unsupported enum value; no rows were changed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.memories WHERE visibility NOT IN ('private', 'unlisted', 'public')) THEN
    RAISE EXCEPTION 'memories.visibility contains an unsupported enum value; no rows were changed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.reactions WHERE type IS NULL OR type NOT IN ('like', 'love', 'laugh', 'wow', 'sad', 'angry')) THEN
    RAISE EXCEPTION 'reactions.type contains NULL or an unsupported enum value; no rows were changed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.social_audit_log WHERE outcome_code IS NULL OR outcome_code NOT IN ('ok', 'duplicate', 'not_found', 'forbidden', 'rate_limited', 'error')) THEN
    RAISE EXCEPTION 'social_audit_log.outcome_code contains NULL or an unsupported enum value; no rows were changed';
  END IF;
  IF EXISTS (SELECT 1 FROM public.trees WHERE visibility NOT IN ('private', 'unlisted', 'public')) THEN
    RAISE EXCEPTION 'trees.visibility contains an unsupported enum value; no rows were changed';
  END IF;

  IF coalesce((SELECT udt_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'comments' AND column_name = 'status'), '') <> 'comment_status' THEN
    EXECUTE 'ALTER TABLE public.comments ALTER COLUMN status DROP DEFAULT';
    EXECUTE 'ALTER TABLE public.comments ALTER COLUMN status TYPE public.comment_status USING status::text::public.comment_status';
  END IF;
  IF coalesce((SELECT udt_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'memories' AND column_name = 'source_type'), '') <> 'source_type' THEN
    EXECUTE 'ALTER TABLE public.memories ALTER COLUMN source_type DROP DEFAULT';
    EXECUTE 'ALTER TABLE public.memories ALTER COLUMN source_type TYPE public.source_type USING source_type::text::public.source_type';
  END IF;
  IF coalesce((SELECT udt_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'memories' AND column_name = 'visibility'), '') <> 'visibility' THEN
    EXECUTE 'ALTER TABLE public.memories ALTER COLUMN visibility DROP DEFAULT';
    EXECUTE 'ALTER TABLE public.memories ALTER COLUMN visibility TYPE public.visibility USING visibility::text::public.visibility';
  END IF;
  IF coalesce((SELECT udt_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reactions' AND column_name = 'type'), '') <> 'reaction_type' THEN
    EXECUTE 'ALTER TABLE public.reactions ALTER COLUMN type DROP DEFAULT';
    EXECUTE 'ALTER TABLE public.reactions ALTER COLUMN type TYPE public.reaction_type USING type::text::public.reaction_type';
  END IF;
  IF coalesce((SELECT udt_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'social_audit_log' AND column_name = 'outcome_code'), '') <> 'social_outcome' THEN
    EXECUTE 'ALTER TABLE public.social_audit_log ALTER COLUMN outcome_code DROP DEFAULT';
    EXECUTE 'ALTER TABLE public.social_audit_log ALTER COLUMN outcome_code TYPE public.social_outcome USING outcome_code::text::public.social_outcome';
  END IF;
  IF coalesce((SELECT udt_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'trees' AND column_name = 'visibility'), '') <> 'visibility' THEN
    EXECUTE 'ALTER TABLE public.trees ALTER COLUMN visibility DROP DEFAULT';
    EXECUTE 'ALTER TABLE public.trees ALTER COLUMN visibility TYPE public.visibility USING visibility::text::public.visibility';
  END IF;

  EXECUTE 'ALTER TABLE public.trees ALTER COLUMN id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.trees ALTER COLUMN owner_id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.trees ALTER COLUMN title DROP DEFAULT';
  EXECUTE $stmt$ALTER TABLE public.trees ALTER COLUMN memo SET DEFAULT ''$stmt$;
  EXECUTE $stmt$ALTER TABLE public.trees ALTER COLUMN artist SET DEFAULT ''$stmt$;
  EXECUTE 'ALTER TABLE public.trees ALTER COLUMN visibility SET DEFAULT ''public''::public.visibility';
  EXECUTE 'ALTER TABLE public.trees ALTER COLUMN group_name DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.trees ALTER COLUMN keywords SET DEFAULT ''[]''::jsonb';
  EXECUTE 'ALTER TABLE public.trees ALTER COLUMN created_at SET DEFAULT now()';
  EXECUTE 'ALTER TABLE public.trees ALTER COLUMN updated_at SET DEFAULT now()';
  EXECUTE 'ALTER TABLE public.trees ALTER COLUMN client_key DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.trees ALTER COLUMN owner_id SET NOT NULL';
  EXECUTE 'ALTER TABLE public.trees ALTER COLUMN title SET NOT NULL';
  EXECUTE 'ALTER TABLE public.trees ALTER COLUMN memo SET NOT NULL';
  EXECUTE 'ALTER TABLE public.trees ALTER COLUMN artist SET NOT NULL';
  EXECUTE 'ALTER TABLE public.trees ALTER COLUMN visibility SET NOT NULL';
  EXECUTE 'ALTER TABLE public.trees ALTER COLUMN keywords SET NOT NULL';
  EXECUTE 'ALTER TABLE public.trees ALTER COLUMN created_at SET NOT NULL';
  EXECUTE 'ALTER TABLE public.trees ALTER COLUMN updated_at SET NOT NULL';

  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN tree_id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN client_key DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN parent_id DROP DEFAULT';
  EXECUTE $stmt$ALTER TABLE public.memories ALTER COLUMN title SET DEFAULT ''$stmt$;
  EXECUTE $stmt$ALTER TABLE public.memories ALTER COLUMN memo SET DEFAULT ''$stmt$;
  EXECUTE $stmt$ALTER TABLE public.memories ALTER COLUMN artist SET DEFAULT ''$stmt$;
  EXECUTE $stmt$ALTER TABLE public.memories ALTER COLUMN source SET DEFAULT ''$stmt$;
  EXECUTE $stmt$ALTER TABLE public.memories ALTER COLUMN source_url SET DEFAULT ''$stmt$;
  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN source_type SET DEFAULT ''youtube''::public.source_type';
  EXECUTE $stmt$ALTER TABLE public.memories ALTER COLUMN thumbnail SET DEFAULT ''$stmt$;
  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN emotion_tags SET DEFAULT ''[]''::jsonb';
  EXECUTE $stmt$ALTER TABLE public.memories ALTER COLUMN timestamp SET DEFAULT ''$stmt$;
  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN visibility SET DEFAULT ''public''::public.visibility';
  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN channel_id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN channel_name DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN channel_url DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN created_at SET DEFAULT now()';
  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN updated_at SET DEFAULT now()';
  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN id SET NOT NULL';
  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN tree_id SET NOT NULL';
  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN title SET NOT NULL';
  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN memo SET NOT NULL';
  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN artist SET NOT NULL';
  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN source SET NOT NULL';
  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN source_url SET NOT NULL';
  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN source_type SET NOT NULL';
  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN thumbnail SET NOT NULL';
  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN emotion_tags SET NOT NULL';
  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN timestamp SET NOT NULL';
  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN visibility SET NOT NULL';
  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN created_at SET NOT NULL';
  EXECUTE 'ALTER TABLE public.memories ALTER COLUMN updated_at SET NOT NULL';

  EXECUTE 'ALTER TABLE public.comments ALTER COLUMN id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.comments ALTER COLUMN memory_id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.comments ALTER COLUMN owner_id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.comments ALTER COLUMN body DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.comments ALTER COLUMN status SET DEFAULT ''visible''::public.comment_status';
  EXECUTE 'ALTER TABLE public.comments ALTER COLUMN deleted_at DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.comments ALTER COLUMN deleted_by DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.comments ALTER COLUMN created_at SET DEFAULT now()';
  EXECUTE 'ALTER TABLE public.comments ALTER COLUMN updated_at SET DEFAULT now()';

  EXECUTE 'ALTER TABLE public.reactions ALTER COLUMN id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.reactions ALTER COLUMN memory_id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.reactions ALTER COLUMN owner_id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.reactions ALTER COLUMN type DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.reactions ALTER COLUMN created_at SET DEFAULT now()';

  EXECUTE 'ALTER TABLE public.tree_comments ALTER COLUMN id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.tree_comments ALTER COLUMN tree_id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.tree_comments ALTER COLUMN owner_id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.tree_comments ALTER COLUMN body DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.tree_comments ALTER COLUMN target_kind SET DEFAULT ''tree''';
  EXECUTE 'ALTER TABLE public.tree_comments ALTER COLUMN target_id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.tree_comments ALTER COLUMN created_at SET DEFAULT now()';
  EXECUTE 'ALTER TABLE public.tree_comments ALTER COLUMN updated_at SET DEFAULT now()';

  EXECUTE 'ALTER TABLE public.tree_likes ALTER COLUMN id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.tree_likes ALTER COLUMN tree_id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.tree_likes ALTER COLUMN owner_id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.tree_likes ALTER COLUMN created_at SET DEFAULT now()';
  EXECUTE 'ALTER TABLE public.tree_likes ALTER COLUMN deleted_at DROP DEFAULT';

  EXECUTE 'ALTER TABLE public.tree_social_counts ALTER COLUMN tree_id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.tree_social_counts ALTER COLUMN like_count SET DEFAULT 0';
  EXECUTE 'ALTER TABLE public.tree_social_counts ALTER COLUMN view_count SET DEFAULT 0';
  EXECUTE 'ALTER TABLE public.tree_social_counts ALTER COLUMN updated_at SET DEFAULT now()';

  EXECUTE 'ALTER TABLE public.tree_view_dedup_events ALTER COLUMN id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.tree_view_dedup_events ALTER COLUMN tree_id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.tree_view_dedup_events ALTER COLUMN actor_key DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.tree_view_dedup_events ALTER COLUMN actor_kind DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.tree_view_dedup_events ALTER COLUMN counted_window_start DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.tree_view_dedup_events ALTER COLUMN source DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.tree_view_dedup_events ALTER COLUMN created_at SET DEFAULT now()';

  EXECUTE 'ALTER TABLE public.social_idempotency ALTER COLUMN id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.social_idempotency ALTER COLUMN actor_id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.social_idempotency ALTER COLUMN operation DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.social_idempotency ALTER COLUMN idempotency_key DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.social_idempotency ALTER COLUMN request_fingerprint DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.social_idempotency ALTER COLUMN target_memory_id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.social_idempotency ALTER COLUMN target_kind DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.social_idempotency ALTER COLUMN target_id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.social_idempotency ALTER COLUMN result_id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.social_idempotency ALTER COLUMN result_state SET DEFAULT ''pending''';
  EXECUTE 'ALTER TABLE public.social_idempotency ALTER COLUMN result_payload DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.social_idempotency ALTER COLUMN created_at SET DEFAULT now()';

  EXECUTE 'ALTER TABLE public.social_rate_limits ALTER COLUMN id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.social_rate_limits ALTER COLUMN scope DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.social_rate_limits ALTER COLUMN actor_id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.social_rate_limits ALTER COLUMN memory_id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.social_rate_limits ALTER COLUMN window_start DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.social_rate_limits ALTER COLUMN request_count SET DEFAULT 1';
  EXECUTE 'ALTER TABLE public.social_rate_limits ALTER COLUMN created_at SET DEFAULT now()';

  EXECUTE 'ALTER TABLE public.social_audit_log ALTER COLUMN id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.social_audit_log ALTER COLUMN actor_id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.social_audit_log ALTER COLUMN memory_id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.social_audit_log ALTER COLUMN action DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.social_audit_log ALTER COLUMN outcome_code DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.social_audit_log ALTER COLUMN request_key_hash DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.social_audit_log ALTER COLUMN target_kind DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.social_audit_log ALTER COLUMN target_id DROP DEFAULT';
  EXECUTE 'ALTER TABLE public.social_audit_log ALTER COLUMN created_at SET DEFAULT now()';

  IF EXISTS (SELECT 1 FROM public.comments c LEFT JOIN public.memories m ON m.id = c.memory_id WHERE m.id IS NULL) OR
     EXISTS (SELECT 1 FROM public.memories m LEFT JOIN public.trees t ON t.id = m.tree_id WHERE t.id IS NULL) OR
     EXISTS (SELECT 1 FROM public.memories m LEFT JOIN public.memories p ON p.id = m.parent_id WHERE m.parent_id IS NOT NULL AND p.id IS NULL) OR
     EXISTS (SELECT 1 FROM public.reactions r LEFT JOIN public.memories m ON m.id = r.memory_id WHERE m.id IS NULL) OR
     EXISTS (SELECT 1 FROM public.social_audit_log l LEFT JOIN public.memories m ON m.id = l.memory_id WHERE m.id IS NULL) OR
     EXISTS (SELECT 1 FROM public.social_idempotency i LEFT JOIN public.memories m ON m.id = i.target_memory_id WHERE m.id IS NULL) OR
     EXISTS (SELECT 1 FROM public.social_rate_limits l LEFT JOIN public.memories m ON m.id = l.memory_id WHERE l.memory_id IS NOT NULL AND m.id IS NULL) OR
     EXISTS (SELECT 1 FROM public.tree_comments c LEFT JOIN public.trees t ON t.id = c.tree_id WHERE t.id IS NULL) OR
     EXISTS (SELECT 1 FROM public.tree_likes l LEFT JOIN public.trees t ON t.id = l.tree_id WHERE t.id IS NULL) OR
     EXISTS (SELECT 1 FROM public.tree_social_counts c LEFT JOIN public.trees t ON t.id = c.tree_id WHERE t.id IS NULL) OR
     EXISTS (SELECT 1 FROM public.tree_view_dedup_events e LEFT JOIN public.trees t ON t.id = e.tree_id WHERE t.id IS NULL) THEN
    RAISE EXCEPTION 'foreign-key orphan rows detected; no constraints were added';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND conname = 'comments_memory_id_memories_id_fk') THEN
    EXECUTE 'ALTER TABLE public.comments ADD CONSTRAINT comments_memory_id_memories_id_fk FOREIGN KEY (memory_id) REFERENCES public.memories(id) ON DELETE CASCADE ON UPDATE NO ACTION';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND conname = 'memories_tree_id_trees_id_fk') THEN
    EXECUTE 'ALTER TABLE public.memories ADD CONSTRAINT memories_tree_id_trees_id_fk FOREIGN KEY (tree_id) REFERENCES public.trees(id) ON DELETE CASCADE ON UPDATE NO ACTION';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND conname = 'memories_parent_id_memories_id_fk') THEN
    EXECUTE 'ALTER TABLE public.memories ADD CONSTRAINT memories_parent_id_memories_id_fk FOREIGN KEY (parent_id) REFERENCES public.memories(id) ON DELETE SET NULL ON UPDATE NO ACTION';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND conname = 'reactions_memory_id_memories_id_fk') THEN
    EXECUTE 'ALTER TABLE public.reactions ADD CONSTRAINT reactions_memory_id_memories_id_fk FOREIGN KEY (memory_id) REFERENCES public.memories(id) ON DELETE CASCADE ON UPDATE NO ACTION';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND conname = 'social_audit_log_memory_id_memories_id_fk') THEN
    EXECUTE 'ALTER TABLE public.social_audit_log ADD CONSTRAINT social_audit_log_memory_id_memories_id_fk FOREIGN KEY (memory_id) REFERENCES public.memories(id) ON DELETE CASCADE ON UPDATE NO ACTION';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND conname = 'social_idempotency_target_memory_id_memories_id_fk') THEN
    EXECUTE 'ALTER TABLE public.social_idempotency ADD CONSTRAINT social_idempotency_target_memory_id_memories_id_fk FOREIGN KEY (target_memory_id) REFERENCES public.memories(id) ON DELETE CASCADE ON UPDATE NO ACTION';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND conname = 'social_rate_limits_memory_id_memories_id_fk') THEN
    EXECUTE 'ALTER TABLE public.social_rate_limits ADD CONSTRAINT social_rate_limits_memory_id_memories_id_fk FOREIGN KEY (memory_id) REFERENCES public.memories(id) ON DELETE CASCADE ON UPDATE NO ACTION';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND conname = 'tree_comments_tree_id_trees_id_fk') THEN
    EXECUTE 'ALTER TABLE public.tree_comments ADD CONSTRAINT tree_comments_tree_id_trees_id_fk FOREIGN KEY (tree_id) REFERENCES public.trees(id) ON DELETE CASCADE ON UPDATE NO ACTION';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND conname = 'tree_likes_tree_id_trees_id_fk') THEN
    EXECUTE 'ALTER TABLE public.tree_likes ADD CONSTRAINT tree_likes_tree_id_trees_id_fk FOREIGN KEY (tree_id) REFERENCES public.trees(id) ON DELETE CASCADE ON UPDATE NO ACTION';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND conname = 'tree_social_counts_tree_id_trees_id_fk') THEN
    EXECUTE 'ALTER TABLE public.tree_social_counts ADD CONSTRAINT tree_social_counts_tree_id_trees_id_fk FOREIGN KEY (tree_id) REFERENCES public.trees(id) ON DELETE CASCADE ON UPDATE NO ACTION';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE connamespace = 'public'::regnamespace AND conname = 'tree_view_dedup_events_tree_id_trees_id_fk') THEN
    EXECUTE 'ALTER TABLE public.tree_view_dedup_events ADD CONSTRAINT tree_view_dedup_events_tree_id_trees_id_fk FOREIGN KEY (tree_id) REFERENCES public.trees(id) ON DELETE CASCADE ON UPDATE NO ACTION';
  END IF;

  EXECUTE 'CREATE INDEX IF NOT EXISTS comments_memory_id_idx ON public.comments USING btree (memory_id)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS comments_owner_id_idx ON public.comments USING btree (owner_id)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS memories_tree_id_idx ON public.memories USING btree (tree_id)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS memories_visibility_created_at_idx ON public.memories USING btree (visibility, created_at)';
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS memories_tree_client_key_uniq ON public.memories USING btree (tree_id, client_key)';
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS reactions_memory_owner_type_uniq ON public.reactions USING btree (memory_id, owner_id, type)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS reactions_memory_id_idx ON public.reactions USING btree (memory_id)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS social_audit_log_memory_id_idx ON public.social_audit_log USING btree (memory_id)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS social_audit_log_actor_id_idx ON public.social_audit_log USING btree (actor_id)';
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS social_idempotency_actor_op_key_uniq ON public.social_idempotency USING btree (actor_id, operation, idempotency_key)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS social_idempotency_target_memory_idx ON public.social_idempotency USING btree (target_memory_id)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS social_rate_limits_scope_actor_idx ON public.social_rate_limits USING btree (scope, actor_id)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS tree_comments_tree_id_idx ON public.tree_comments USING btree (tree_id)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS tree_comments_owner_id_idx ON public.tree_comments USING btree (owner_id)';
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS tree_likes_tree_owner_uniq ON public.tree_likes USING btree (tree_id, owner_id)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS tree_likes_tree_id_idx ON public.tree_likes USING btree (tree_id)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS tree_view_dedup_tree_actor_idx ON public.tree_view_dedup_events USING btree (tree_id, actor_kind, actor_key)';
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS tree_view_dedup_event_uniq ON public.tree_view_dedup_events USING btree (tree_id, actor_kind, actor_key, counted_window_start)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS trees_owner_id_idx ON public.trees USING btree (owner_id)';
  EXECUTE 'CREATE INDEX IF NOT EXISTS trees_visibility_created_at_idx ON public.trees USING btree (visibility, created_at)';
  EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS trees_owner_client_key_uniq ON public.trees USING btree (owner_id, client_key)';
END
$$;
