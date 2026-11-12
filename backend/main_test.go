package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"pawhome/auth"
	"pawhome/handler"
)

type apiResponse struct {
	Error struct {
		Code string `json:"code"`
	} `json:"error"`
}

func call(t *testing.T, api http.Handler, method, path, token, body string, wantStatus int) apiResponse {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	w := httptest.NewRecorder()
	api.ServeHTTP(w, req)
	if w.Code != wantStatus {
		t.Fatalf("%s %s: status = %d, want %d; body: %s", method, path, w.Code, wantStatus, w.Body)
	}
	if !strings.HasPrefix(w.Header().Get("Content-Type"), "application/json") {
		t.Fatalf("%s %s: expected JSON, got %q", method, path, w.Header().Get("Content-Type"))
	}
	var r apiResponse
	_ = json.Unmarshal(w.Body.Bytes(), &r)
	return r
}

// เทสต์ด่านสิทธิ์: ไม่ต้องมีฐานข้อมูล เพราะทุกคำขอเหล่านี้ถูกปฏิเสธก่อนถึง Store
func TestRoleGuards(t *testing.T) {
	tickets := &auth.Issuer{Secret: []byte("test-secret-with-at-least-32-characters"), TTL: time.Hour}
	api := newMux(&handler.Handler{Tickets: tickets}, tickets)
	member, _ := tickets.Issue(1, "member")
	admin, _ := tickets.Issue(2, "admin")

	adminRoutes := []struct{ method, path string }{
		{"GET", "/api/admin/dashboard"}, {"GET", "/api/admin/pets"}, {"GET", "/api/admin/pets/1"},
		{"POST", "/api/admin/pets"}, {"PATCH", "/api/admin/pets/1"}, {"PATCH", "/api/admin/pets/1/status"},
		{"GET", "/api/admin/applications"}, {"PATCH", "/api/admin/applications/1/review"},
		{"PATCH", "/api/admin/applications/1/complete"},
	}
	for _, rt := range adminRoutes {
		t.Run("admin "+rt.method+" "+rt.path, func(t *testing.T) {
			if got := call(t, api, rt.method, rt.path, "", "", 401); got.Error.Code != "NO_TOKEN" {
				t.Errorf("guest: %q", got.Error.Code)
			}
			if got := call(t, api, rt.method, rt.path, "bad.token.here", "", 401); got.Error.Code != "BAD_TOKEN" {
				t.Errorf("bad token: %q", got.Error.Code)
			}
			if got := call(t, api, rt.method, rt.path, member, "", 403); got.Error.Code != "FORBIDDEN" {
				t.Errorf("member: %q", got.Error.Code)
			}
		})
	}

	memberRoutes := []struct{ method, path string }{
		{"POST", "/api/pets/1/applications"}, {"GET", "/api/me/applications"}, {"PATCH", "/api/me/applications/1/cancel"},
	}
	for _, rt := range memberRoutes {
		t.Run("member "+rt.method+" "+rt.path, func(t *testing.T) {
			call(t, api, rt.method, rt.path, "", "", 401)
			// admin ส่งคำขอรับเลี้ยงไม่ได้
			call(t, api, rt.method, rt.path, admin, "", 403)
		})
	}
	for _, p := range []string{"/api/auth/me"} {
		call(t, api, "GET", p, "", "", 401)
	}
}

func TestBadInputRejectedBeforeDatabase(t *testing.T) {
	tickets := &auth.Issuer{Secret: []byte("test-secret-with-at-least-32-characters"), TTL: time.Hour}
	api := newMux(&handler.Handler{Tickets: tickets}, tickets)
	admin, _ := tickets.Issue(2, "admin")

	call(t, api, "GET", "/api/pets/abc", "", "", 400)
	call(t, api, "GET", "/api/pets?species=dragon", "", "", 400)
	call(t, api, "GET", "/api/pets?minAge=-3", "", "", 400)
	call(t, api, "GET", "/api/pets?status=hidden", "", "", 400) // hidden ไม่เปิดให้ guest ขอดู
	call(t, api, "POST", "/api/auth/register", "", `{"email":"x","password":"1"}`, 400)
	call(t, api, "POST", "/api/auth/register", "", `not json`, 400)
	call(t, api, "POST", "/api/admin/pets", admin, `{"name":"","species":"dog"}`, 400)
	call(t, api, "PATCH", "/api/admin/pets/1/status", admin, `{"status":"flying"}`, 400)
	call(t, api, "PATCH", "/api/admin/applications/1/review", admin, `{"action":"maybe"}`, 400)
	call(t, api, "PATCH", "/api/admin/applications/zero/complete", admin, "", 400)
}

func TestRateLimitOnLogin(t *testing.T) {
	tickets := &auth.Issuer{Secret: []byte("test-secret-with-at-least-32-characters"), TTL: time.Hour}
	api := newMux(&handler.Handler{Tickets: tickets}, tickets)
	last := 0
	for i := 0; i < 35; i++ {
		req := httptest.NewRequest("POST", "/api/auth/login", strings.NewReader(`not json`))
		w := httptest.NewRecorder()
		api.ServeHTTP(w, req)
		last = w.Code
	}
	if last != http.StatusTooManyRequests {
		t.Fatalf("ต้องโดน 429 หลังลองรัว ๆ ได้ %d", last)
	}
}
