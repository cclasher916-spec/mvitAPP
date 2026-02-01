-- 1. Enable Read Access for Departments, Years, Sections (Required for Signup)
CREATE POLICY "Enable read access for all users" ON "public"."departments" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."years" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."sections" FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON "public"."teams" FOR SELECT USING (true);

-- 2. Insert Department: AIML
DO $$
DECLARE
  dept_id UUID;
  year_id UUID;
  sec_id UUID;
BEGIN
  -- Insert/Get Department
  INSERT INTO departments (name, code)
  VALUES ('Artificial Intelligence and Machine Learning', 'AIML')
  ON CONFLICT (code) DO UPDATE SET code=EXCLUDED.code
  RETURNING id INTO dept_id;

  -- Insert/Get Year 3 (derived from Batch 2023-2027 => 3rd year in 2026)
  INSERT INTO years (year_number, department_id)
  VALUES (3, dept_id)
  ON CONFLICT (year_number, department_id) DO UPDATE SET year_number=EXCLUDED.year_number
  RETURNING id INTO year_id;

  -- Insert/Get Section A
  INSERT INTO sections (name, year_id)
  VALUES ('A', year_id)
  ON CONFLICT (name, year_id) DO UPDATE SET name=EXCLUDED.name
  RETURNING id INTO sec_id;
  
  RAISE NOTICE 'Created Structure: Dept %, Year %, Section %', dept_id, year_id, sec_id;
END $$;
