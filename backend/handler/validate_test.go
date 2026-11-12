package handler

import (
	"testing"

	"pawhome/store"
)

func TestValidateRegister(t *testing.T) {
	cases := []struct {
		name, email, pw, full, phone, wantField string
	}{
		{"ok", " User@Example.com ", "password1", "สมชาย ใจดี", "081-234-5678", ""},
		{"bad email", "nope", "password1", "สมชาย", "", "email"},
		{"short password", "a@b.co", "123", "สมชาย", "", "password"},
		{"password over 72 bytes", "a@b.co", string(make([]byte, 80)), "สมชาย", "", "password"},
		{"short name", "a@b.co", "password1", "ก", "", "fullName"},
		{"bad phone", "a@b.co", "password1", "สมชาย", "abc", "phone"},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			e, p, f, ph := c.email, c.pw, c.full, c.phone
			got := validateRegister(&e, &p, &f, &ph)
			if c.wantField == "" && got != nil || c.wantField != "" && (got == nil || got.Field != c.wantField) {
				t.Fatalf("got %+v, want field %q", got, c.wantField)
			}
		})
	}
	e, p, f, ph := " User@Example.com ", "password1", "x y", ""
	validateRegister(&e, &p, &f, &ph)
	if e != "user@example.com" {
		t.Fatalf("อีเมลต้องถูกทำให้เป็นตัวพิมพ์เล็กและตัดช่องว่าง: %q", e)
	}
}

func TestValidatePet(t *testing.T) {
	ok := store.PetInput{Name: "ข้าวปุ้น", Species: "dog", AgeMonths: 12}
	if p := validatePet(&ok, true); p != nil || ok.Status != "available" || ok.Sex != "unknown" {
		t.Fatalf("ต้องผ่านและเติมค่าเริ่มต้น: %+v %+v", p, ok)
	}
	bad := map[string]store.PetInput{
		"name":      {Name: " ", Species: "dog"},
		"species":   {Name: "x", Species: "dragon"},
		"ageMonths": {Name: "x", Species: "cat", AgeMonths: 601},
		"imageUrl":  {Name: "x", Species: "cat", ImageURL: "javascript:alert(1)"},
		"status":    {Name: "x", Species: "cat", Status: "adopted"},
	}
	for field, in := range bad {
		in := in
		if p := validatePet(&in, true); p == nil || p.Field != field {
			t.Errorf("field %s: got %+v", field, p)
		}
	}
	upd := store.PetInput{Name: "x", Species: "cat", Status: "adopted"}
	if p := validatePet(&upd, false); p != nil {
		t.Errorf("ตอนแก้ไขไม่ตรวจ status (ถูกเมินที่ store): %+v", p)
	}
}

func TestValidateApplication(t *testing.T) {
	good := store.ApplicationInput{Reason: "ต้องการรับเลี้ยงและดูแลสัตว์", HousingType: "house"}
	if p := validateApplication(&good, "0812345678"); p != nil || good.ContactPhone != "0812345678" {
		t.Fatalf("ต้องใช้เบอร์ในโปรไฟล์เป็นค่าเริ่มต้น: %+v %+v", p, good)
	}
	for field, in := range map[string]store.ApplicationInput{
		"contactPhone": {Reason: "ต้องการรับเลี้ยงและดูแลสัตว์", HousingType: "house"},
		"reason":       {ContactPhone: "0812345678", Reason: "สั้น", HousingType: "house"},
		"housingType":  {ContactPhone: "0812345678", Reason: "ต้องการรับเลี้ยงและดูแลสัตว์", HousingType: "castle"},
	} {
		in := in
		if p := validateApplication(&in, ""); p == nil || p.Field != field {
			t.Errorf("field %s: got %+v", field, p)
		}
	}
}
