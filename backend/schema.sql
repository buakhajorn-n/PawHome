-- PawHome database schema (PostgreSQL 14+ / Supabase)
-- รันใน Supabase Dashboard > SQL Editor ครั้งเดียวสำหรับฐานข้อมูลใหม่ (ห้ามรันซ้ำบนฐานข้อมูลที่มีข้อมูลแล้ว)
-- 3 ตารางหลัก: users, pets, adoption_applications

BEGIN;

-- ---------------------------------------------------------------------------
-- users: สมาชิกและผู้ดูแลระบบ (role = member | admin)
-- ---------------------------------------------------------------------------
CREATE TABLE users (
    id             BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    full_name      VARCHAR(100) NOT NULL,
    email          VARCHAR(254) NOT NULL,
    password_hash  TEXT         NOT NULL,                 -- bcrypt เท่านั้น ห้ามเก็บรหัสผ่านจริง
    phone          VARCHAR(20)  NOT NULL DEFAULT '',
    role           VARCHAR(10)  NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
-- อีเมลไม่ซ้ำโดยไม่สนตัวพิมพ์เล็ก/ใหญ่
CREATE UNIQUE INDEX uq_users_email ON users (lower(email));

-- ---------------------------------------------------------------------------
-- pets: ข้อมูลสัตว์ ไม่ลบแถวทิ้ง ใช้ status = 'hidden' แทน เพื่อไม่ให้ประวัติการรับเลี้ยงหาย
-- ---------------------------------------------------------------------------
CREATE TABLE pets (
    id             BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    species        VARCHAR(10)  NOT NULL CHECK (species IN ('dog', 'cat', 'other')),
    breed          VARCHAR(100) NOT NULL DEFAULT '',
    age_months     INTEGER      NOT NULL DEFAULT 0 CHECK (age_months BETWEEN 0 AND 600),
    sex            VARCHAR(10)  NOT NULL DEFAULT 'unknown' CHECK (sex IN ('male', 'female', 'unknown')),
    description    TEXT         NOT NULL DEFAULT '',
    health_status  TEXT         NOT NULL DEFAULT '',
    vaccinated     BOOLEAN      NOT NULL DEFAULT FALSE,
    sterilized     BOOLEAN      NOT NULL DEFAULT FALSE,
    image_url      TEXT         NOT NULL DEFAULT '',
    status         VARCHAR(10)  NOT NULL DEFAULT 'available'
                   CHECK (status IN ('available', 'reserved', 'adopted', 'hidden')),
    created_by     BIGINT       REFERENCES users (id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_pets_status_created ON pets (status, created_at DESC);
CREATE INDEX idx_pets_species ON pets (species);

-- ---------------------------------------------------------------------------
-- adoption_applications: คำขอรับเลี้ยง
-- สถานะ: pending -> approved -> completed | pending -> rejected | pending -> cancelled
-- ---------------------------------------------------------------------------
CREATE TABLE adoption_applications (
    id              BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pet_id          BIGINT       NOT NULL REFERENCES pets (id)  ON DELETE RESTRICT,
    applicant_id    BIGINT       NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    contact_phone   VARCHAR(20)  NOT NULL,
    reason          TEXT         NOT NULL,
    housing_type    VARCHAR(10)  NOT NULL CHECK (housing_type IN ('house', 'condo', 'apartment', 'other')),
    has_experience  BOOLEAN      NOT NULL DEFAULT FALSE,
    has_other_pets  BOOLEAN      NOT NULL DEFAULT FALSE,
    care_plan       TEXT         NOT NULL DEFAULT '',
    status          VARCHAR(10)  NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled', 'completed')),
    admin_note      TEXT         NOT NULL DEFAULT '',
    reviewed_by     BIGINT       REFERENCES users (id) ON DELETE SET NULL,
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX idx_apps_applicant ON adoption_applications (applicant_id, created_at DESC);
CREATE INDEX idx_apps_pet       ON adoption_applications (pet_id);
CREATE INDEX idx_apps_status    ON adoption_applications (status, created_at DESC);

-- สมาชิกคนเดียวส่งคำขอ pending ซ้ำสำหรับสัตว์ตัวเดียวกันไม่ได้ (Unique Partial Index)
CREATE UNIQUE INDEX uq_apps_one_pending_per_user_pet
    ON adoption_applications (pet_id, applicant_id) WHERE status = 'pending';

-- สัตว์ 1 ตัวมีคำขอสถานะ approved ได้แค่ 1 รายการ: ด่านสุดท้ายกันอนุมัติซ้ำ
-- แม้ Admin 2 คนกดพร้อมกัน (โค้ด Go ล็อกแถวไว้อีกชั้นหนึ่งแล้ว)
CREATE UNIQUE INDEX uq_apps_one_approved_per_pet
    ON adoption_applications (pet_id) WHERE status = 'approved';

-- ---------------------------------------------------------------------------
-- Supabase: เปิด RLS โดยไม่สร้าง policy
-- Go API เชื่อมต่อด้วย role postgres (ข้าม RLS) แต่ anon key ของ Supabase จะอ่าน/เขียนตารางเหล่านี้ตรง ๆ ไม่ได้
-- ---------------------------------------------------------------------------
ALTER TABLE users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE adoption_applications ENABLE ROW LEVEL SECURITY;

COMMIT;
