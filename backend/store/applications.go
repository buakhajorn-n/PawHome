package store

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
)

type Application struct {
	ID            int64      `json:"id"`
	PetID         int64      `json:"petId"`
	ApplicantID   int64      `json:"applicantId"`
	ContactPhone  string     `json:"contactPhone"`
	Reason        string     `json:"reason"`
	HousingType   string     `json:"housingType"`
	HasExperience bool       `json:"hasExperience"`
	HasOtherPets  bool       `json:"hasOtherPets"`
	CarePlan      string     `json:"carePlan"`
	Status        string     `json:"status"`
	AdminNote     string     `json:"adminNote"`
	ReviewedAt    *time.Time `json:"reviewedAt"`
	CreatedAt     time.Time  `json:"createdAt"`

	// ข้อมูลที่ JOIN มาเพื่อแสดงผล
	PetName        string `json:"petName"`
	PetImageURL    string `json:"petImageUrl"`
	PetSpecies     string `json:"petSpecies"`
	PetStatus      string `json:"petStatus"`
	ApplicantName  string `json:"applicantName"`
	ApplicantEmail string `json:"applicantEmail"`
}

type ApplicationInput struct {
	ContactPhone  string `json:"contactPhone"`
	Reason        string `json:"reason"`
	HousingType   string `json:"housingType"`
	HasExperience bool   `json:"hasExperience"`
	HasOtherPets  bool   `json:"hasOtherPets"`
	CarePlan      string `json:"carePlan"`
}

const appSelect = `SELECT a.id, a.pet_id, a.applicant_id, a.contact_phone, a.reason, a.housing_type,
       a.has_experience, a.has_other_pets, a.care_plan, a.status, a.admin_note, a.reviewed_at, a.created_at,
       p.name, p.image_url, p.species, p.status, u.full_name, u.email
  FROM adoption_applications a
  JOIN pets  p ON p.id = a.pet_id
  JOIN users u ON u.id = a.applicant_id`

type rowScanner interface{ Scan(dest ...any) error }

func scanApp(row rowScanner) (Application, error) {
	var a Application
	err := row.Scan(&a.ID, &a.PetID, &a.ApplicantID, &a.ContactPhone, &a.Reason, &a.HousingType,
		&a.HasExperience, &a.HasOtherPets, &a.CarePlan, &a.Status, &a.AdminNote, &a.ReviewedAt, &a.CreatedAt,
		&a.PetName, &a.PetImageURL, &a.PetSpecies, &a.PetStatus, &a.ApplicantName, &a.ApplicantEmail)
	if errors.Is(err, pgx.ErrNoRows) {
		return Application{}, ErrNotFound
	}
	return a, err
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func (s *Store) GetApplication(ctx context.Context, id int64) (Application, error) {
	return scanApp(s.Pool.QueryRow(ctx, appSelect+` WHERE a.id = $1`, id))
}

func (s *Store) queryApps(ctx context.Context, sql string, args ...any) ([]Application, error) {
	rows, err := s.Pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Application{}
	for rows.Next() {
		a, err := scanApp(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

// ListApplicationsByMember คืนเฉพาะคำขอของสมาชิกคนนี้ (เลขสมาชิกมาจากตั๋ว ไม่ใช่จาก client)
func (s *Store) ListApplicationsByMember(ctx context.Context, memberID int64) ([]Application, error) {
	return s.queryApps(ctx, appSelect+` WHERE a.applicant_id = $1 ORDER BY a.created_at DESC, a.id DESC`, memberID)
}

// ListApplications สำหรับ admin: status ว่าง = ทุกสถานะ
func (s *Store) ListApplications(ctx context.Context, status string) ([]Application, error) {
	if status == "" {
		return s.queryApps(ctx, appSelect+` ORDER BY a.created_at DESC, a.id DESC LIMIT 500`)
	}
	return s.queryApps(ctx, appSelect+` WHERE a.status = $1 ORDER BY a.created_at DESC, a.id DESC LIMIT 500`, status)
}

// CreateApplication ส่งคำขอรับเลี้ยง (สถานะ pending)
// ล็อกแถวสัตว์ก่อนตรวจสถานะ เพื่อไม่ให้ admin กำลังอนุมัติคนอื่นอยู่ในจังหวะเดียวกัน
func (s *Store) CreateApplication(ctx context.Context, petID, memberID int64, in ApplicationInput) (Application, error) {
	var newID int64
	err := s.inTx(ctx, func(tx pgx.Tx) error {
		var status string
		err := tx.QueryRow(ctx, `SELECT status FROM pets WHERE id = $1 FOR UPDATE`, petID).Scan(&status)
		if errors.Is(err, pgx.ErrNoRows) || (err == nil && status == "hidden") {
			return ErrNotFound // สัตว์ที่ซ่อนอยู่ถือเป็นไม่มีตัวตนสำหรับสมาชิก
		}
		if err != nil {
			return err
		}
		if status != "available" {
			return &PetUnavailableError{Status: status}
		}
		var dup bool
		if err := tx.QueryRow(ctx,
			`SELECT EXISTS(SELECT 1 FROM adoption_applications
                            WHERE pet_id = $1 AND applicant_id = $2 AND status = 'pending')`,
			petID, memberID).Scan(&dup); err != nil {
			return err
		}
		if dup {
			return ErrDuplicate
		}
		err = tx.QueryRow(ctx,
			`INSERT INTO adoption_applications
               (pet_id, applicant_id, contact_phone, reason, housing_type, has_experience, has_other_pets, care_plan)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
			petID, memberID, in.ContactPhone, in.Reason, in.HousingType, in.HasExperience, in.HasOtherPets, in.CarePlan,
		).Scan(&newID)
		if isUniqueViolation(err) { // ด่านสุดท้ายคือ uq_apps_one_pending_per_user_pet
			return ErrDuplicate
		}
		return err
	})
	if err != nil {
		return Application{}, err
	}
	return s.GetApplication(ctx, newID)
}

// CancelApplication สมาชิกยกเลิกได้เฉพาะคำขอของตัวเองที่ยัง pending
func (s *Store) CancelApplication(ctx context.Context, memberID, appID int64) error {
	return s.inTx(ctx, func(tx pgx.Tx) error {
		var owner int64
		var status string
		err := tx.QueryRow(ctx,
			`SELECT applicant_id, status FROM adoption_applications WHERE id = $1 FOR UPDATE`, appID).Scan(&owner, &status)
		if errors.Is(err, pgx.ErrNoRows) || (err == nil && owner != memberID) {
			return ErrNotFound // ไม่เปิดเผยว่ามีคำขอของคนอื่นอยู่
		}
		if err != nil {
			return err
		}
		if status != "pending" {
			return ErrWrongState
		}
		_, err = tx.Exec(ctx, `UPDATE adoption_applications SET status = 'cancelled' WHERE id = $1`, appID)
		return err
	})
}

// lockAppAndPet ล็อกคำขอก่อน แล้วล็อกสัตว์ (ลำดับเดียวกันทุกฟังก์ชัน กัน deadlock)
func lockAppAndPet(ctx context.Context, tx pgx.Tx, appID int64) (petID int64, appStatus, petStatus, note string, err error) {
	err = tx.QueryRow(ctx,
		`SELECT pet_id, status, admin_note FROM adoption_applications WHERE id = $1 FOR UPDATE`, appID).
		Scan(&petID, &appStatus, &note)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, "", "", "", ErrNotFound
	}
	if err != nil {
		return
	}
	err = tx.QueryRow(ctx, `SELECT status FROM pets WHERE id = $1 FOR UPDATE`, petID).Scan(&petStatus)
	return
}

// ReviewApplication admin อนุมัติ (approve) หรือปฏิเสธ (reject)
//
//	approve: pending  -> approved  และสัตว์ available -> reserved
//	reject : pending|approved -> rejected  (ถ้าเคย approved สัตว์ reserved -> available)
func (s *Store) ReviewApplication(ctx context.Context, adminID, appID int64, action, note string) error {
	return s.inTx(ctx, func(tx pgx.Tx) error {
		petID, appStatus, petStatus, _, err := lockAppAndPet(ctx, tx, appID)
		if err != nil {
			return err
		}
		if action == "approve" {
			if appStatus != "pending" {
				return ErrWrongState
			}
			if petStatus != "available" {
				return &PetUnavailableError{Status: petStatus} // อนุมัติคนที่สองไม่ได้
			}
			_, err = tx.Exec(ctx,
				`UPDATE adoption_applications
                    SET status = 'approved', admin_note = $2, reviewed_by = $3, reviewed_at = now()
                  WHERE id = $1`, appID, note, adminID)
			if isUniqueViolation(err) {
				return ErrAlreadyApprove
			}
			if err != nil {
				return err
			}
			_, err = tx.Exec(ctx, `UPDATE pets SET status = 'reserved', updated_at = now() WHERE id = $1`, petID)
			return err
		}

		// reject
		if appStatus != "pending" && appStatus != "approved" {
			return ErrWrongState
		}
		if _, err = tx.Exec(ctx,
			`UPDATE adoption_applications
                SET status = 'rejected', admin_note = $2, reviewed_by = $3, reviewed_at = now()
              WHERE id = $1`, appID, note, adminID); err != nil {
			return err
		}
		if appStatus == "approved" && petStatus == "reserved" {
			_, err = tx.Exec(ctx, `UPDATE pets SET status = 'available', updated_at = now() WHERE id = $1`, petID)
		}
		return err
	})
}

// CompleteApplication admin ยืนยันส่งมอบ: คำขอ approved -> completed, สัตว์ reserved -> adopted
// และปฏิเสธคำขออื่นที่ค้างอยู่ของสัตว์ตัวเดียวกันโดยอัตโนมัติ
func (s *Store) CompleteApplication(ctx context.Context, adminID, appID int64) error {
	return s.inTx(ctx, func(tx pgx.Tx) error {
		petID, appStatus, petStatus, _, err := lockAppAndPet(ctx, tx, appID)
		if err != nil {
			return err
		}
		if appStatus != "approved" || petStatus != "reserved" {
			return ErrWrongState
		}
		if _, err = tx.Exec(ctx,
			`UPDATE adoption_applications SET status = 'completed', reviewed_by = $2, reviewed_at = now()
              WHERE id = $1`, appID, adminID); err != nil {
			return err
		}
		if _, err = tx.Exec(ctx, `UPDATE pets SET status = 'adopted', updated_at = now() WHERE id = $1`, petID); err != nil {
			return err
		}
		_, err = tx.Exec(ctx,
			`UPDATE adoption_applications
                SET status = 'rejected', admin_note = 'สัตว์ตัวนี้ได้รับการรับเลี้ยงโดยผู้สมัครรายอื่นแล้ว', reviewed_at = now()
              WHERE pet_id = $1 AND id <> $2 AND status IN ('pending', 'approved')`, petID, appID)
		return err
	})
}

type Stats struct {
	TotalPets             int64 `json:"totalPets"`
	AvailablePets         int64 `json:"availablePets"`
	ReservedPets          int64 `json:"reservedPets"`
	AdoptedPets           int64 `json:"adoptedPets"`
	HiddenPets            int64 `json:"hiddenPets"`
	TotalApplications     int64 `json:"totalApplications"`
	PendingApplications   int64 `json:"pendingApplications"`
	ApprovedApplications  int64 `json:"approvedApplications"`
	CompletedApplications int64 `json:"completedApplications"`
	Members               int64 `json:"members"`
}

// Stats รวมตัวเลขทั้งหมดในคำขอเดียวให้หน้า Dashboard ยิงครั้งเดียวจบ
func (s *Store) Stats(ctx context.Context) (Stats, error) {
	var st Stats
	err := s.Pool.QueryRow(ctx,
		`SELECT (SELECT count(*) FROM pets),
                (SELECT count(*) FROM pets WHERE status = 'available'),
                (SELECT count(*) FROM pets WHERE status = 'reserved'),
                (SELECT count(*) FROM pets WHERE status = 'adopted'),
                (SELECT count(*) FROM pets WHERE status = 'hidden'),
                (SELECT count(*) FROM adoption_applications),
                (SELECT count(*) FROM adoption_applications WHERE status = 'pending'),
                (SELECT count(*) FROM adoption_applications WHERE status = 'approved'),
                (SELECT count(*) FROM adoption_applications WHERE status = 'completed'),
                (SELECT count(*) FROM users WHERE role = 'member')`).
		Scan(&st.TotalPets, &st.AvailablePets, &st.ReservedPets, &st.AdoptedPets, &st.HiddenPets,
			&st.TotalApplications, &st.PendingApplications, &st.ApprovedApplications, &st.CompletedApplications,
			&st.Members)
	return st, err
}
