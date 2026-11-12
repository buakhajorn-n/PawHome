package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type Member struct {
	ID           int64     `json:"id"`
	Email        string    `json:"email"`
	FullName     string    `json:"fullName"`
	Phone        string    `json:"phone"`
	Role         string    `json:"role"`
	CreatedAt    time.Time `json:"createdAt"`
	PasswordHash string    `json:"-"` // ไม่มีวันออกไปกับ JSON
}

const memberCols = `id, email, full_name, phone, role, created_at, password_hash`

func scanMember(row pgx.Row) (Member, error) {
	var m Member
	err := row.Scan(&m.ID, &m.Email, &m.FullName, &m.Phone, &m.Role, &m.CreatedAt, &m.PasswordHash)
	if errors.Is(err, pgx.ErrNoRows) {
		return Member{}, ErrNotFound
	}
	return m, err
}

// CreateMember สมัครสมาชิกใหม่ role เป็น member เสมอ (ค่า default ของตาราง)
func (s *Store) CreateMember(ctx context.Context, email, hash, fullName, phone string) (Member, error) {
	m, err := scanMember(s.Pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash, full_name, phone)
         VALUES ($1, $2, $3, $4)
         RETURNING `+memberCols, email, hash, fullName, phone))
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return Member{}, ErrEmailTaken
	}
	return m, err
}

func (s *Store) MemberByEmail(ctx context.Context, email string) (Member, error) {
	return scanMember(s.Pool.QueryRow(ctx,
		`SELECT `+memberCols+` FROM users WHERE lower(email) = $1`, email))
}

func (s *Store) MemberByID(ctx context.Context, id int64) (Member, error) {
	return scanMember(s.Pool.QueryRow(ctx,
		`SELECT `+memberCols+` FROM users WHERE id = $1`, id))
}

func (s *Store) UpdateProfile(ctx context.Context, id int64, fullName, phone string) (Member, error) {
	return scanMember(s.Pool.QueryRow(ctx,
		`UPDATE users SET full_name = $2, phone = $3, updated_at = now()
         WHERE id = $1 RETURNING `+memberCols, id, fullName, phone))
}

func (s *Store) UpdatePassword(ctx context.Context, id int64, hash string) error {
	tag, err := s.Pool.Exec(ctx,
		`UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`, id, hash)
	if err == nil && tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return err
}

// EnsureAdmin สร้างบัญชี admin ตอนเริ่ม server (Render ฟรีไม่มี shell)
// ถ้ามีอีเมลนี้อยู่แล้ว: ไม่แตะรหัสผ่าน แค่ทำให้แน่ใจว่าเป็น admin
func (s *Store) EnsureAdmin(ctx context.Context, email, hash, fullName string) error {
	_, err := s.Pool.Exec(ctx,
		`INSERT INTO users (email, password_hash, full_name, role)
         VALUES ($1, $2, $3, 'admin')
         ON CONFLICT (lower(email)) DO UPDATE SET role = 'admin', updated_at = now()`,
		email, hash, fullName)
	return err
}
