CREATE TABLE public._ut_rooms_stage (
  campus text, building text, building_order integer,
  floor_label text, floor_order integer, name text, room_order integer
);
GRANT ALL ON public._ut_rooms_stage TO service_role;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    GRANT SELECT, INSERT ON public._ut_rooms_stage TO sandbox_exec;
  END IF;
END $$;
ALTER TABLE public._ut_rooms_stage ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sandbox_exec') THEN
    CREATE POLICY "stage loader" ON public._ut_rooms_stage FOR ALL TO sandbox_exec USING (true) WITH CHECK (true);
  END IF;
END $$;
COMMENT ON TABLE public._ut_rooms_stage IS 'Temporary staging for Doshisha classroom import';