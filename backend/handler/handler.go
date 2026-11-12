package handler

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"

	"pawhome/auth"
	"pawhome/store"
)

type Handler struct {
	Store   *store.Store
	Tickets *auth.Issuer
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]any{
		"error": map[string]string{"code": code, "message": message},
	})
}

// writeFieldError เหมือน writeError แต่บอกด้วยว่าช่องไหนผิด ให้ฟอร์มขึ้นกรอบแดงถูกช่อง
func writeFieldError(w http.ResponseWriter, v *problem) {
	writeJSON(w, http.StatusBadRequest, map[string]any{
		"error": map[string]string{"code": v.Code, "message": v.Message, "field": v.Field},
	})
}

// internal จดรายละเอียดไว้ใน log ฝั่งเรา แต่บอกผู้ใช้แค่ว่าระบบขัดข้อง
func internal(w http.ResponseWriter, err error) {
	log.Printf("internal error: %v", err)
	writeError(w, http.StatusInternalServerError, "INTERNAL", "ระบบขัดข้อง ลองใหม่อีกครั้ง")
}

func pathID(r *http.Request, name string) (int64, bool) {
	id, err := strconv.ParseInt(r.PathValue(name), 10, 64)
	return id, err == nil && id > 0
}

// decode อ่าน JSON จาก body (จำกัด 1MB) ถ้าอ่านไม่ได้ตอบ 400 ให้เลย
func decode(w http.ResponseWriter, r *http.Request, v any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, 1<<20)
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		writeError(w, http.StatusBadRequest, "BAD_JSON", "อ่านกล่อง JSON ไม่ออก")
		return false
	}
	return true
}

// storeError แปลง error ของชั้น store เป็นคำตอบ HTTP ที่ผู้ใช้เข้าใจ
func storeError(w http.ResponseWriter, err error, notFoundCode, notFoundMsg string) {
	var pu *store.PetUnavailableError
	switch {
	case errors.Is(err, store.ErrNotFound):
		writeError(w, http.StatusNotFound, notFoundCode, notFoundMsg)
	case errors.As(err, &pu):
		msg := "สัตว์ตัวนี้ถูกจองหรือรับเลี้ยงไปแล้ว"
		if pu.Status == "adopted" {
			msg = "สัตว์ตัวนี้ได้รับการรับเลี้ยงแล้ว"
		} else if pu.Status == "reserved" {
			msg = "สัตว์ตัวนี้ถูกจองแล้ว ไม่สามารถอนุมัติหรือส่งคำขอซ้ำได้"
		}
		writeError(w, http.StatusConflict, "PET_NOT_AVAILABLE", msg)
	case errors.Is(err, store.ErrDuplicate):
		writeError(w, http.StatusConflict, "DUPLICATE_PENDING", "คุณมีคำขอที่รอพิจารณาสำหรับสัตว์ตัวนี้อยู่แล้ว")
	case errors.Is(err, store.ErrWrongState):
		writeError(w, http.StatusConflict, "WRONG_STATE", "สถานะของคำขอไม่ตรงกับการดำเนินการนี้ (อาจมีผู้ดูแลคนอื่นจัดการไปแล้ว)")
	case errors.Is(err, store.ErrAlreadyApprove):
		writeError(w, http.StatusConflict, "ALREADY_APPROVED", "สัตว์ตัวนี้มีคำขอที่อนุมัติแล้ว")
	case errors.Is(err, store.ErrHasApproval):
		writeError(w, http.StatusConflict, "HAS_APPROVAL", "สัตว์ตัวนี้มีคำขอที่อนุมัติแล้ว กรุณายืนยันส่งมอบหรือปฏิเสธคำขอก่อน")
	default:
		internal(w, err)
	}
}

// notFoundIfHidden: สัตว์ที่ซ่อนอยู่ตอบ 404 เหมือนไม่มีตัวตน (err == nil แปลว่าพบแต่ถูกซ่อน)
func notFoundIfHidden(err error) error {
	if err != nil {
		return err
	}
	return store.ErrNotFound
}
