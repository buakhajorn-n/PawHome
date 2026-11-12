package auth

import (
	"testing"
	"time"
)

func TestIssueThenParse(t *testing.T) {
	iss := &Issuer{Secret: []byte("test-secret-with-at-least-32-characters"), TTL: time.Hour}
	tok, err := iss.Issue(42, "admin")
	if err != nil {
		t.Fatal(err)
	}
	id, role, err := iss.Parse(tok)
	if err != nil || id != 42 || role != "admin" {
		t.Fatalf("got id=%d role=%q err=%v", id, role, err)
	}
}

func TestParseRejectsWrongSecretExpiredAndGarbage(t *testing.T) {
	iss := &Issuer{Secret: []byte("test-secret-with-at-least-32-characters"), TTL: time.Hour}
	tok, _ := iss.Issue(1, "member")

	other := &Issuer{Secret: []byte("another-secret-with-at-least-32-chars!!"), TTL: time.Hour}
	if _, _, err := other.Parse(tok); err == nil {
		t.Fatal("ตั๋วที่เซ็นด้วย secret อื่นต้องไม่ผ่าน")
	}
	expired := &Issuer{Secret: iss.Secret, TTL: -time.Minute}
	old, _ := expired.Issue(1, "member")
	if _, _, err := iss.Parse(old); err == nil {
		t.Fatal("ตั๋วหมดอายุต้องไม่ผ่าน")
	}
	if _, _, err := iss.Parse("garbage"); err == nil {
		t.Fatal("ตั๋วมั่วต้องไม่ผ่าน")
	}
}

func TestPasswordHashing(t *testing.T) {
	hash, err := HashPassword("correct horse")
	if err != nil {
		t.Fatal(err)
	}
	if hash == "correct horse" || !CheckPassword(hash, "correct horse") || CheckPassword(hash, "wrong") {
		t.Fatal("bcrypt ทำงานผิดปกติ")
	}
}
