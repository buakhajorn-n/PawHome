package store

import (
	"context"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

type Pet struct {
	ID           int64     `json:"id"`
	Name         string    `json:"name"`
	Species      string    `json:"species"`
	Breed        string    `json:"breed"`
	AgeMonths    int       `json:"ageMonths"`
	Sex          string    `json:"sex"`
	Description  string    `json:"description"`
	HealthStatus string    `json:"healthStatus"`
	Vaccinated   bool      `json:"vaccinated"`
	Sterilized   bool      `json:"sterilized"`
	ImageURL     string    `json:"imageUrl"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"createdAt"`
}

// PetInput คือฟิลด์ที่ admin แก้ได้ (ไม่รวม status ซึ่งเปลี่ยนผ่าน SetPetStatus / workflow คำขอ)
type PetInput struct {
	Name         string `json:"name"`
	Species      string `json:"species"`
	Breed        string `json:"breed"`
	AgeMonths    int    `json:"ageMonths"`
	Sex          string `json:"sex"`
	Description  string `json:"description"`
	HealthStatus string `json:"healthStatus"`
	Vaccinated   bool   `json:"vaccinated"`
	Sterilized   bool   `json:"sterilized"`
	ImageURL     string `json:"imageUrl"`
	Status       string `json:"status"` // ใช้เฉพาะตอนสร้าง: available | hidden
}

type PetFilter struct {
	Query    string
	Species  string
	Sex      string
	MinAge   *int
	MaxAge   *int
	Statuses []string // ว่าง = ทุกสถานะ (ใช้ฝั่ง admin)
}

const petCols = `id, name, species, breed, age_months, sex, description, health_status,
                 vaccinated, sterilized, image_url, status, created_at`

func scanPet(row pgx.Row) (Pet, error) {
	var p Pet
	err := row.Scan(&p.ID, &p.Name, &p.Species, &p.Breed, &p.AgeMonths, &p.Sex, &p.Description,
		&p.HealthStatus, &p.Vaccinated, &p.Sterilized, &p.ImageURL, &p.Status, &p.CreatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Pet{}, ErrNotFound
	}
	return p, err
}

// escapeLike กันผู้ใช้พิมพ์ % หรือ _ เพื่อเปลี่ยนความหมายของการค้นหา
func escapeLike(s string) string {
	return strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(s)
}

// ListPets ค่าจากผู้ใช้ทุกตัวเดินทางผ่าน $1 $2 ... แยกจากคำสั่ง SQL เสมอ
func (s *Store) ListPets(ctx context.Context, f PetFilter) ([]Pet, error) {
	var where []string
	var args []any
	arg := func(v any) string {
		args = append(args, v)
		return "$" + strconv.Itoa(len(args))
	}
	if len(f.Statuses) > 0 {
		ph := make([]string, len(f.Statuses))
		for i, st := range f.Statuses {
			ph[i] = arg(st)
		}
		where = append(where, "status IN ("+strings.Join(ph, ", ")+")")
	}
	if f.Species != "" {
		where = append(where, "species = "+arg(f.Species))
	}
	if f.Sex != "" {
		where = append(where, "sex = "+arg(f.Sex))
	}
	if f.MinAge != nil {
		where = append(where, "age_months >= "+arg(*f.MinAge))
	}
	if f.MaxAge != nil {
		where = append(where, "age_months <= "+arg(*f.MaxAge))
	}
	if q := strings.TrimSpace(f.Query); q != "" {
		n := arg("%" + escapeLike(q) + "%")
		where = append(where, "(name ILIKE "+n+" OR breed ILIKE "+n+")")
	}
	sql := `SELECT ` + petCols + ` FROM pets`
	if len(where) > 0 {
		sql += ` WHERE ` + strings.Join(where, " AND ")
	}
	sql += ` ORDER BY created_at DESC, id DESC LIMIT 200`

	rows, err := s.Pool.Query(ctx, sql, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Pet{}
	for rows.Next() {
		var p Pet
		if err := rows.Scan(&p.ID, &p.Name, &p.Species, &p.Breed, &p.AgeMonths, &p.Sex, &p.Description,
			&p.HealthStatus, &p.Vaccinated, &p.Sterilized, &p.ImageURL, &p.Status, &p.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (s *Store) GetPet(ctx context.Context, id int64) (Pet, error) {
	return scanPet(s.Pool.QueryRow(ctx, `SELECT `+petCols+` FROM pets WHERE id = $1`, id))
}

func (s *Store) CreatePet(ctx context.Context, in PetInput, adminID int64) (Pet, error) {
	return scanPet(s.Pool.QueryRow(ctx,
		`INSERT INTO pets (name, species, breed, age_months, sex, description, health_status,
                           vaccinated, sterilized, image_url, status, created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         RETURNING `+petCols,
		in.Name, in.Species, in.Breed, in.AgeMonths, in.Sex, in.Description, in.HealthStatus,
		in.Vaccinated, in.Sterilized, in.ImageURL, in.Status, adminID))
}

func (s *Store) UpdatePet(ctx context.Context, id int64, in PetInput) (Pet, error) {
	return scanPet(s.Pool.QueryRow(ctx,
		`UPDATE pets SET name=$2, species=$3, breed=$4, age_months=$5, sex=$6, description=$7,
                         health_status=$8, vaccinated=$9, sterilized=$10, image_url=$11, updated_at=now()
         WHERE id = $1 RETURNING `+petCols,
		id, in.Name, in.Species, in.Breed, in.AgeMonths, in.Sex, in.Description, in.HealthStatus,
		in.Vaccinated, in.Sterilized, in.ImageURL))
}

// SetPetStatus เปลี่ยนสถานะสัตว์โดย admin
// ถ้ามีคำขอ approved ค้างอยู่ ห้ามข้ามขั้นตอน ต้องไปยืนยันส่งมอบ/ปฏิเสธที่หน้าคำขอก่อน
func (s *Store) SetPetStatus(ctx context.Context, id int64, status string) (Pet, error) {
	var out Pet
	err := s.inTx(ctx, func(tx pgx.Tx) error {
		var current string
		err := tx.QueryRow(ctx, `SELECT status FROM pets WHERE id = $1 FOR UPDATE`, id).Scan(&current)
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		if err != nil {
			return err
		}
		if current != status {
			var has bool
			if err := tx.QueryRow(ctx,
				`SELECT EXISTS(SELECT 1 FROM adoption_applications WHERE pet_id = $1 AND status = 'approved')`,
				id).Scan(&has); err != nil {
				return err
			}
			if has {
				return ErrHasApproval
			}
		}
		out, err = scanPet(tx.QueryRow(ctx,
			`UPDATE pets SET status = $2, updated_at = now() WHERE id = $1 RETURNING `+petCols, id, status))
		return err
	})
	return out, err
}
