package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// error ที่ handler แปลงเป็น HTTP status (ไม่ให้รายละเอียด SQL รั่วไปถึงผู้ใช้)
var (
	ErrNotFound       = errors.New("not found")
	ErrEmailTaken     = errors.New("email taken")
	ErrDuplicate      = errors.New("duplicate pending application")
	ErrWrongState     = errors.New("wrong state")
	ErrHasApproval    = errors.New("pet has approved application")
	ErrAlreadyApprove = errors.New("pet already has approved application")
)

// PetUnavailableError: สัตว์ไม่อยู่ในสถานะที่รับคำขอ/อนุมัติได้ (reserved / adopted)
type PetUnavailableError struct{ Status string }

func (e *PetUnavailableError) Error() string { return fmt.Sprintf("pet is %s", e.Status) }

type Store struct {
	Pool *pgxpool.Pool
}

// inTx รันงานหลายคำสั่งเป็นก้อนเดียว: สำเร็จหมดหรือย้อนกลับหมด
// ใช้กับ "อนุมัติคำขอ + จองสัตว์" ที่ห้ามทำครึ่งเดียว
func (s *Store) inTx(ctx context.Context, fn func(tx pgx.Tx) error) error {
	tx, err := s.Pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) // ไม่เป็นไรถ้า commit ไปแล้ว
	if err := fn(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
