package handler

import (
	"net/http"

	"pawhome/mw"
	"pawhome/store"
)

// respondApplication ส่งคำขอล่าสุด (พร้อมข้อมูล JOIN) กลับไปให้หน้าเว็บ
func (h *Handler) respondApplication(w http.ResponseWriter, r *http.Request, id int64) {
	a, err := h.Store.GetApplication(r.Context(), id)
	if err != nil {
		storeError(w, err, "APPLICATION_NOT_FOUND", "ไม่พบคำขอรับเลี้ยง")
		return
	}
	writeJSON(w, http.StatusOK, a)
}

// Apply สมาชิกส่งคำขอรับเลี้ยง เลขผู้สมัครมาจากตั๋วเท่านั้น (ถูกครอบด้วย RequireRole("member") ใน main.go)
func (h *Handler) Apply(w http.ResponseWriter, r *http.Request) {
	petID, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "BAD_ID", "เลขสัตว์ต้องเป็นตัวเลข")
		return
	}
	memberID, ok := mw.MemberID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "NO_TOKEN", "กรุณาเข้าสู่ระบบก่อน")
		return
	}
	var in store.ApplicationInput
	if !decode(w, r, &in) {
		return
	}
	me, err := h.Store.MemberByID(r.Context(), memberID)
	if err != nil {
		storeError(w, err, "MEMBER_GONE", "ไม่พบบัญชีนี้แล้ว กรุณาเข้าสู่ระบบใหม่")
		return
	}
	if p := validateApplication(&in, me.Phone); p != nil {
		writeFieldError(w, p)
		return
	}
	a, err := h.Store.CreateApplication(r.Context(), petID, memberID, in)
	if err != nil {
		storeError(w, err, "PET_NOT_FOUND", "ไม่พบสัตว์ที่ต้องการ")
		return
	}
	writeJSON(w, http.StatusCreated, a)
}

func (h *Handler) MyApplications(w http.ResponseWriter, r *http.Request) {
	memberID, ok := mw.MemberID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "NO_TOKEN", "กรุณาเข้าสู่ระบบก่อน")
		return
	}
	items, err := h.Store.ListApplicationsByMember(r.Context(), memberID)
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) CancelApplication(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "BAD_ID", "เลขคำขอต้องเป็นตัวเลข")
		return
	}
	memberID, ok := mw.MemberID(r.Context())
	if !ok {
		writeError(w, http.StatusUnauthorized, "NO_TOKEN", "กรุณาเข้าสู่ระบบก่อน")
		return
	}
	if err := h.Store.CancelApplication(r.Context(), memberID, id); err != nil {
		storeError(w, err, "APPLICATION_NOT_FOUND", "ไม่พบคำขอรับเลี้ยง")
		return
	}
	h.respondApplication(w, r, id)
}
