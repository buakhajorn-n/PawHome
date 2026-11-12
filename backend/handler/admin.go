package handler

import (
	"net/http"

	"pawhome/mw"
	"pawhome/store"
)

// ทุก handler ในไฟล์นี้ถูกครอบด้วย RequireLogin + RequireRole("admin") ใน main.go แล้ว
// แต่ "ใครเป็นคนกด" ยังอ่านจากตั๋วผ่าน mw.MemberID เสมอ

func (h *Handler) AdminStats(w http.ResponseWriter, r *http.Request) {
	st, err := h.Store.Stats(r.Context())
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, st)
}

func (h *Handler) AdminListPets(w http.ResponseWriter, r *http.Request) {
	f, p := petFilter(r)
	if p != nil {
		writeFieldError(w, p)
		return
	}
	items, err := h.Store.ListPets(r.Context(), f) // ไม่ใส่ Statuses = เห็นทุกสถานะ รวม hidden
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) AdminGetPet(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "BAD_ID", "เลขสัตว์ต้องเป็นตัวเลข")
		return
	}
	pet, err := h.Store.GetPet(r.Context(), id)
	if err != nil {
		storeError(w, err, "PET_NOT_FOUND", "ไม่พบสัตว์ที่ต้องการ")
		return
	}
	writeJSON(w, http.StatusOK, pet)
}

func (h *Handler) AdminCreatePet(w http.ResponseWriter, r *http.Request) {
	var in store.PetInput
	if !decode(w, r, &in) {
		return
	}
	if p := validatePet(&in, true); p != nil {
		writeFieldError(w, p)
		return
	}
	adminID, _ := mw.MemberID(r.Context())
	pet, err := h.Store.CreatePet(r.Context(), in, adminID)
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, pet)
}

func (h *Handler) AdminUpdatePet(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "BAD_ID", "เลขสัตว์ต้องเป็นตัวเลข")
		return
	}
	var in store.PetInput
	if !decode(w, r, &in) {
		return
	}
	if p := validatePet(&in, false); p != nil {
		writeFieldError(w, p)
		return
	}
	pet, err := h.Store.UpdatePet(r.Context(), id, in)
	if err != nil {
		storeError(w, err, "PET_NOT_FOUND", "ไม่พบสัตว์ที่ต้องการ")
		return
	}
	writeJSON(w, http.StatusOK, pet)
}

type statusReq struct {
	Status string `json:"status"`
}

func (h *Handler) AdminSetPetStatus(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "BAD_ID", "เลขสัตว์ต้องเป็นตัวเลข")
		return
	}
	var req statusReq
	if !decode(w, r, &req) {
		return
	}
	if !oneOf(req.Status, "available", "reserved", "adopted", "hidden") {
		writeFieldError(w, &problem{"status", "BAD_STATUS", "status ต้องเป็น available, reserved, adopted หรือ hidden"})
		return
	}
	pet, err := h.Store.SetPetStatus(r.Context(), id, req.Status)
	if err != nil {
		storeError(w, err, "PET_NOT_FOUND", "ไม่พบสัตว์ที่ต้องการ")
		return
	}
	writeJSON(w, http.StatusOK, pet)
}

func (h *Handler) AdminListApplications(w http.ResponseWriter, r *http.Request) {
	status := r.URL.Query().Get("status")
	if status != "" && !oneOf(status, "pending", "approved", "rejected", "cancelled", "completed") {
		writeFieldError(w, &problem{"status", "BAD_STATUS", "status ไม่ถูกต้อง"})
		return
	}
	items, err := h.Store.ListApplications(r.Context(), status)
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

type reviewReq struct {
	Action string `json:"action"` // approve | reject
	Note   string `json:"note"`
}

func (h *Handler) AdminReviewApplication(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "BAD_ID", "เลขคำขอต้องเป็นตัวเลข")
		return
	}
	var req reviewReq
	if !decode(w, r, &req) {
		return
	}
	if !oneOf(req.Action, "approve", "reject") {
		writeFieldError(w, &problem{"action", "BAD_ACTION", "action ต้องเป็น approve หรือ reject"})
		return
	}
	if len([]rune(req.Note)) > 2000 {
		writeFieldError(w, &problem{"note", "BAD_NOTE", "หมายเหตุยาวเกินไป"})
		return
	}
	adminID, _ := mw.MemberID(r.Context())
	if err := h.Store.ReviewApplication(r.Context(), adminID, id, req.Action, req.Note); err != nil {
		storeError(w, err, "APPLICATION_NOT_FOUND", "ไม่พบคำขอรับเลี้ยง")
		return
	}
	h.respondApplication(w, r, id)
}

func (h *Handler) AdminCompleteApplication(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "BAD_ID", "เลขคำขอต้องเป็นตัวเลข")
		return
	}
	adminID, _ := mw.MemberID(r.Context())
	if err := h.Store.CompleteApplication(r.Context(), adminID, id); err != nil {
		storeError(w, err, "APPLICATION_NOT_FOUND", "ไม่พบคำขอรับเลี้ยง")
		return
	}
	h.respondApplication(w, r, id)
}
