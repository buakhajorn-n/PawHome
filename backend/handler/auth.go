package handler

import (
	"errors"
	"net/http"
	"strings"

	"pawhome/auth"
	"pawhome/mw"
	"pawhome/store"
)

type registerReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"fullName"`
	Phone    string `json:"phone"`
}

// Register สมัครสมาชิก: role ถูกกำหนดที่ฐานข้อมูลเป็น member เสมอ ไม่รับค่า role จาก client
func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req registerReq
	if !decode(w, r, &req) {
		return
	}
	if p := validateRegister(&req.Email, &req.Password, &req.FullName, &req.Phone); p != nil {
		writeFieldError(w, p)
		return
	}
	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		internal(w, err)
		return
	}
	m, err := h.Store.CreateMember(r.Context(), req.Email, hash, req.FullName, req.Phone)
	if errors.Is(err, store.ErrEmailTaken) {
		writeFieldError(w, &problem{"email", "EMAIL_TAKEN", "อีเมลนี้มีบัญชีอยู่แล้ว"})
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, m)
}

type loginReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginReq
	if !decode(w, r, &req) {
		return
	}
	email := strings.ToLower(strings.TrimSpace(req.Email))
	m, err := h.Store.MemberByEmail(r.Context(), email)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusUnauthorized, "BAD_CREDENTIALS", "อีเมลหรือรหัสผ่านไม่ถูกต้อง")
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	if !auth.CheckPassword(m.PasswordHash, req.Password) {
		writeError(w, http.StatusUnauthorized, "BAD_CREDENTIALS", "อีเมลหรือรหัสผ่านไม่ถูกต้อง")
		return
	}
	token, err := h.Tickets.Issue(m.ID, m.Role)
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "member": m})
}

// Me ตอบข้อมูลของคนที่ถือตั๋ว เลขสมาชิกมาจากตั๋วที่ RequireLogin ตรวจแล้วเท่านั้น
func (h *Handler) Me(w http.ResponseWriter, r *http.Request) {
	id, ok := mw.MemberID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "NO_TOKEN", "กรุณาเข้าสู่ระบบก่อน")
		return
	}
	m, err := h.Store.MemberByID(r.Context(), id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusUnauthorized, "MEMBER_GONE", "ไม่พบบัญชีนี้แล้ว กรุณาเข้าสู่ระบบใหม่")
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, m)
}

type profileReq struct {
	FullName string `json:"fullName"`
	Phone    string `json:"phone"`
}

func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	id, _ := mw.MemberID(r.Context())
	var req profileReq
	if !decode(w, r, &req) {
		return
	}
	req.FullName, req.Phone = strings.TrimSpace(req.FullName), strings.TrimSpace(req.Phone)
	if p := checkProfile(req.FullName, req.Phone); p != nil {
		writeFieldError(w, p)
		return
	}
	m, err := h.Store.UpdateProfile(r.Context(), id, req.FullName, req.Phone)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusUnauthorized, "MEMBER_GONE", "ไม่พบบัญชีนี้แล้ว กรุณาเข้าสู่ระบบใหม่")
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, m)
}

type passwordReq struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

func (h *Handler) ChangePassword(w http.ResponseWriter, r *http.Request) {
	id, _ := mw.MemberID(r.Context())
	var req passwordReq
	if !decode(w, r, &req) {
		return
	}
	if p := checkPassword(req.NewPassword); p != nil {
		p.Field = "newPassword"
		writeFieldError(w, p)
		return
	}
	m, err := h.Store.MemberByID(r.Context(), id)
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusUnauthorized, "MEMBER_GONE", "ไม่พบบัญชีนี้แล้ว กรุณาเข้าสู่ระบบใหม่")
		return
	}
	if err != nil {
		internal(w, err)
		return
	}
	if !auth.CheckPassword(m.PasswordHash, req.CurrentPassword) {
		writeFieldError(w, &problem{"currentPassword", "BAD_CREDENTIALS", "รหัสผ่านปัจจุบันไม่ถูกต้อง"})
		return
	}
	hash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		internal(w, err)
		return
	}
	if err := h.Store.UpdatePassword(r.Context(), id, hash); err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}
