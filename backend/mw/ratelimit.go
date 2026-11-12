package mw

import (
	"encoding/json"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

// RateLimit จำกัดจำนวนคำขอต่อ IP ในแต่ละช่วงเวลา ใช้กับ login / register กันเดารหัสผ่านรัว ๆ
func RateLimit(max int, window time.Duration, next http.HandlerFunc) http.HandlerFunc {
	type bucket struct {
		count int
		reset time.Time
	}
	var mu sync.Mutex
	buckets := map[string]*bucket{}
	return func(w http.ResponseWriter, r *http.Request) {
		ip := clientIP(r)
		now := time.Now()
		mu.Lock()
		b := buckets[ip]
		if b == nil || now.After(b.reset) {
			b = &bucket{reset: now.Add(window)}
			buckets[ip] = b
			if len(buckets) > 10000 { // กัน memory โตไม่หยุด
				for k, v := range buckets {
					if now.After(v.reset) {
						delete(buckets, k)
					}
				}
			}
		}
		b.count++
		over := b.count > max
		mu.Unlock()
		if over {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusTooManyRequests)
			json.NewEncoder(w).Encode(map[string]any{
				"error": map[string]string{"code": "RATE_LIMITED", "message": "ลองบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่"},
			})
			return
		}
		next(w, r)
	}
}

// clientIP: บน Render คำขอผ่าน proxy จึงอ่าน IP จริงจาก X-Forwarded-For
func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		return strings.TrimSpace(strings.Split(xff, ",")[0])
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
