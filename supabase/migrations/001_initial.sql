-- Grief Closure MVP 초기 스키마
-- RLS: 모든 테이블에 user_id = auth.uid() 정책 적용

-- personas 테이블
CREATE TABLE IF NOT EXISTS personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('lover', 'pet', 'family')),
  name TEXT NOT NULL,
  personality TEXT NOT NULL DEFAULT '',
  loss_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  generated_image_url TEXT,
  UNIQUE (user_id) -- MVP: 사용자당 1개
);

ALTER TABLE personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "personas_select_own" ON personas
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "personas_insert_own" ON personas
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "personas_update_own" ON personas
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "personas_delete_own" ON personas
  FOR DELETE USING (user_id = auth.uid());

-- contact_limits 테이블
CREATE TABLE IF NOT EXISTS contact_limits (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  used_count INTEGER NOT NULL DEFAULT 0,
  weeks_since_start INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

ALTER TABLE contact_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "contact_limits_select_own" ON contact_limits
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "contact_limits_insert_own" ON contact_limits
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "contact_limits_update_own" ON contact_limits
  FOR UPDATE USING (user_id = auth.uid());

-- missions 테이블
CREATE TABLE IF NOT EXISTS missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('indoor', 'outdoor', 'meaningful-place')),
  text TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'completed', 'passed')) DEFAULT 'pending',
  pass_count INTEGER NOT NULL DEFAULT 0,
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE missions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "missions_select_own" ON missions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "missions_insert_own" ON missions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "missions_update_own" ON missions
  FOR UPDATE USING (user_id = auth.uid());

-- letters 테이블
CREATE TABLE IF NOT EXISTS letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_id UUID NOT NULL REFERENCES personas(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  trigger_type TEXT -- 'week7', 'week30', 'anniversary_YYYY', 'inactive3days'
);

ALTER TABLE letters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "letters_select_own" ON letters
  FOR SELECT USING (user_id = auth.uid());

-- letters INSERT는 Cron Job이 service_role_key(RLS 우회)로만 수행하므로
-- 일반 클라이언트에게 INSERT를 허용하는 정책을 제거한다.
-- service_role_key를 사용하는 서버 측 코드는 RLS를 우회하므로 별도 정책 불필요.

CREATE POLICY "letters_update_own" ON letters
  FOR UPDATE USING (user_id = auth.uid());

-- disclaimers 테이블
CREATE TABLE IF NOT EXISTS disclaimers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  agreed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_adult BOOLEAN NOT NULL DEFAULT FALSE
);

ALTER TABLE disclaimers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "disclaimers_select_own" ON disclaimers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "disclaimers_insert_own" ON disclaimers
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "disclaimers_update_own" ON disclaimers
  FOR UPDATE USING (user_id = auth.uid());

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_contact_limits_user_date ON contact_limits (user_id, date);
CREATE INDEX IF NOT EXISTS idx_missions_user_status ON missions (user_id, status);
CREATE INDEX IF NOT EXISTS idx_letters_user_read ON letters (user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_letters_trigger ON letters (user_id, trigger_type);
