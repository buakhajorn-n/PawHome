package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	_ "github.com/joho/godotenv/autoload" // โหลด .env ให้เองถ้ามีไฟล์ (ในเครื่อง) บน Render ไม่มีไฟล์ก็เงียบ

	"pawhome/auth"
	"pawhome/handler"
	"pawhome/mw"
	"pawhome/store"
)

func main() {
	secret := os.Getenv("JWT_SECRET")
	if len(secret) < 32 {
		log.Fatal("JWT_SECRET ต้องมีและยาวอย่างน้อย 32 ตัวอักษร (สุ่มด้วย: openssl rand -hex 32)")
	}

	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		databaseURL = "postgres://postgres:secret@127.0.0.1:5432/pawhome?sslmode=disable"
		log.Println("DATABASE_URL is not set; using local pawhome database")
	}
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		log.Fatal("DATABASE_URL อ่านไม่ออก ", err)
	}
	// Supabase pooler (โหมด transaction พอร์ต 6543) ไม่รองรับ prepared statement
	// ใช้ simple protocol จึงใช้ได้ทั้งพอร์ต 5432 และ 6543
	cfg.ConnConfig.DefaultQueryExecMode = pgx.QueryExecModeSimpleProtocol
	pool, err := pgxpool.NewWithConfig(context.Background(), cfg)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()
	if err := pool.Ping(context.Background()); err != nil {
		log.Fatal("ต่อฐานข้อมูลไม่ติด ", err)
	}

	st := &store.Store{Pool: pool}
	ensureAdmin(st)

	tickets := &auth.Issuer{Secret: []byte(secret), TTL: ticketTTL()}
	h := &handler.Handler{Store: st, Tickets: tickets}
	mux := newMux(h, tickets)

	origins := strings.Split(os.Getenv("ALLOWED_ORIGINS"), ",")
	port := os.Getenv("PORT") // Render ส่งมาให้ ในเครื่องไม่มีก็ใช้ 8080
	if port == "" {
		port = "8080"
	}
	log.Println("PawHome API ฟังอยู่ที่ :"+port, "ต้อนรับ", origins)
	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           mw.Logging(mw.CORS(origins, mux)),
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      30 * time.Second,
	}
	log.Fatal(srv.ListenAndServe())
}

// ticketTTL อายุตั๋ว: ค่าเริ่มต้น 12 ชั่วโมง ปรับได้ด้วย TOKEN_TTL_HOURS
func ticketTTL() time.Duration {
	if v := os.Getenv("TOKEN_TTL_HOURS"); v != "" {
		if d, err := time.ParseDuration(v + "h"); err == nil && d > 0 {
			return d
		}
		log.Println("TOKEN_TTL_HOURS ไม่ถูกต้อง ใช้ค่าเริ่มต้น 12 ชั่วโมง")
	}
	return 12 * time.Hour
}

// ensureAdmin สร้างบัญชี admin จาก ADMIN_EMAIL / ADMIN_PASSWORD (Render ฟรีไม่มี shell ให้รันคำสั่ง)
func ensureAdmin(st *store.Store) {
	email := strings.ToLower(strings.TrimSpace(os.Getenv("ADMIN_EMAIL")))
	password := os.Getenv("ADMIN_PASSWORD")
	if email == "" {
		return
	}
	if len(password) < 8 || len(password) > 72 {
		log.Fatal("ADMIN_PASSWORD ต้องยาว 8-72 ตัวอักษร")
	}
	hash, err := auth.HashPassword(password)
	if err != nil {
		log.Fatal(err)
	}
	name := os.Getenv("ADMIN_NAME")
	if name == "" {
		name = "PawHome Admin"
	}
	if err := st.EnsureAdmin(context.Background(), email, hash, name); err != nil {
		log.Fatal("สร้างบัญชี admin ไม่สำเร็จ ", err)
	}
	log.Println("บัญชี admin พร้อมใช้งาน:", email)
}

func newMux(h *handler.Handler, tickets *auth.Issuer) *http.ServeMux {
	// login = ต้องมีตั๋ว, member = ตั๋ว + บทบาท member, admin = ตั๋ว + บทบาท admin (ตรวจตั๋วก่อนเสมอ ค่อยดูบทบาท)
	login := func(next http.HandlerFunc) http.HandlerFunc { return mw.RequireLogin(tickets, next) }
	member := func(next http.HandlerFunc) http.HandlerFunc { return login(mw.RequireRole("member", next)) }
	admin := func(next http.HandlerFunc) http.HandlerFunc { return login(mw.RequireRole("admin", next)) }
	limited := func(next http.HandlerFunc) http.HandlerFunc { return mw.RateLimit(30, time.Minute, next) }

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	// Guest: ไม่ต้องมีตั๋ว
	mux.HandleFunc("POST /api/auth/register", limited(h.Register))
	mux.HandleFunc("POST /api/auth/login", limited(h.Login))
	mux.HandleFunc("GET /api/pets", h.ListPets)
	mux.HandleFunc("GET /api/pets/{id}", h.GetPet)

	// ทุกคนที่ login แล้ว (member หรือ admin)
	mux.HandleFunc("GET /api/auth/me", login(h.Me))
	mux.HandleFunc("PATCH /api/auth/profile", login(h.UpdateProfile))
	mux.HandleFunc("PATCH /api/auth/password", login(h.ChangePassword))

	// Member: คำขอรับเลี้ยง (เลขผู้สมัครมาจากตั๋วเสมอ)
	mux.HandleFunc("POST /api/pets/{id}/applications", member(h.Apply))
	mux.HandleFunc("GET /api/me/applications", member(h.MyApplications))
	mux.HandleFunc("PATCH /api/me/applications/{id}/cancel", member(h.CancelApplication))

	// หลังบ้าน: ทุกเส้นทางใต้ /api/admin ผ่าน admin(...) ไม่มีข้อยกเว้น
	mux.HandleFunc("GET /api/admin/dashboard", admin(h.AdminStats))
	mux.HandleFunc("GET /api/admin/pets", admin(h.AdminListPets))
	mux.HandleFunc("GET /api/admin/pets/{id}", admin(h.AdminGetPet))
	mux.HandleFunc("POST /api/admin/pets", admin(h.AdminCreatePet))
	mux.HandleFunc("PATCH /api/admin/pets/{id}", admin(h.AdminUpdatePet))
	mux.HandleFunc("PATCH /api/admin/pets/{id}/status", admin(h.AdminSetPetStatus))
	mux.HandleFunc("GET /api/admin/applications", admin(h.AdminListApplications))
	mux.HandleFunc("PATCH /api/admin/applications/{id}/review", admin(h.AdminReviewApplication))
	mux.HandleFunc("PATCH /api/admin/applications/{id}/complete", admin(h.AdminCompleteApplication))

	return mux
}
