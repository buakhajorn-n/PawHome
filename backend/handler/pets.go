package handler

import (
	"net/http"
	"strconv"

	"pawhome/store"
)

func petFilter(r *http.Request) (store.PetFilter, *problem) {
	q := r.URL.Query()
	f := store.PetFilter{Query: q.Get("q"), Species: q.Get("species"), Sex: q.Get("sex")}
	if st := q.Get("status"); st != "" {
		f.Statuses = []string{st}
	}
	if f.Species != "" && !oneOf(f.Species, "dog", "cat", "other") {
		return f, &problem{"species", "BAD_SPECIES", "species ต้องเป็น dog, cat หรือ other"}
	}
	if f.Sex != "" && !oneOf(f.Sex, "male", "female", "unknown") {
		return f, &problem{"sex", "BAD_SEX", "sex ต้องเป็น male, female หรือ unknown"}
	}
	for key, dst := range map[string]**int{"minAge": &f.MinAge, "maxAge": &f.MaxAge} {
		if v := q.Get(key); v != "" {
			n, err := strconv.Atoi(v)
			if err != nil || n < 0 {
				return f, &problem{key, "BAD_AGE", key + " ต้องเป็นจำนวนเต็มเดือนที่ไม่ติดลบ"}
			}
			*dst = &n
		}
	}
	return f, nil
}

// ListPets (สาธารณะ) แสดงเฉพาะสัตว์ที่เปิดรับเลี้ยงหรือถูกจอง; hidden ไม่มีวันโผล่ที่นี่
func (h *Handler) ListPets(w http.ResponseWriter, r *http.Request) {
	f, p := petFilter(r)
	if p != nil {
		writeFieldError(w, p)
		return
	}
	if len(f.Statuses) == 0 {
		f.Statuses = []string{"available", "reserved"}
	} else if !oneOf(f.Statuses[0], "available", "reserved", "adopted") {
		writeFieldError(w, &problem{"status", "BAD_STATUS", "status ต้องเป็น available, reserved หรือ adopted"})
		return
	}
	items, err := h.Store.ListPets(r.Context(), f)
	if err != nil {
		internal(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"items": items})
}

func (h *Handler) GetPet(w http.ResponseWriter, r *http.Request) {
	id, ok := pathID(r, "id")
	if !ok {
		writeError(w, http.StatusBadRequest, "BAD_ID", "เลขสัตว์ต้องเป็นตัวเลข")
		return
	}
	pet, err := h.Store.GetPet(r.Context(), id)
	if err != nil || pet.Status == "hidden" {
		storeError(w, notFoundIfHidden(err), "PET_NOT_FOUND", "ไม่พบสัตว์ที่ต้องการ")
		return
	}
	writeJSON(w, http.StatusOK, pet)
}
