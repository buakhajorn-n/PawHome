package handler

import (
	"net/mail"
	"net/url"
	"regexp"
	"strings"
	"unicode/utf8"

	"pawhome/store"
)

// problem คือผลการตรวจข้อมูลที่ไม่ผ่าน: ฟังก์ชัน validate* เป็น pure function ทดสอบได้โดยไม่ต้องมีฐานข้อมูล
type problem struct{ Field, Code, Message string }

var phoneRe = regexp.MustCompile(`^[0-9+\-\s()]{8,20}$`)

func validEmail(e string) bool {
	if e == "" || len(e) > 254 {
		return false
	}
	a, err := mail.ParseAddress(e)
	return err == nil && a.Address == e && strings.Contains(e[strings.LastIndex(e, "@")+1:], ".")
}

func checkPassword(p string) *problem {
	if utf8.RuneCountInString(p) < 8 || len(p) > 72 {
		return &problem{"password", "BAD_PASSWORD", "รหัสผ่านต้องยาว 8 ตัวอักษรขึ้นไป และไม่เกิน 72 ไบต์"}
	}
	return nil
}

func checkProfile(name, phone string) *problem {
	if n := utf8.RuneCountInString(name); n < 2 || n > 100 {
		return &problem{"fullName", "BAD_NAME", "ต้องมีชื่อ-นามสกุล ยาว 2-100 ตัวอักษร"}
	}
	if phone != "" && !phoneRe.MatchString(phone) {
		return &problem{"phone", "BAD_PHONE", "เบอร์โทรศัพท์ไม่ถูกต้อง"}
	}
	return nil
}

func oneOf(v string, allowed ...string) bool {
	for _, a := range allowed {
		if v == a {
			return true
		}
	}
	return false
}

// validateRegister ตัดช่องว่าง/ปรับอีเมลเป็นตัวพิมพ์เล็กให้ด้วย
func validateRegister(email, password, fullName, phone *string) *problem {
	*email = strings.ToLower(strings.TrimSpace(*email))
	*fullName = strings.TrimSpace(*fullName)
	*phone = strings.TrimSpace(*phone)
	if !validEmail(*email) {
		return &problem{"email", "BAD_EMAIL", "รูปแบบอีเมลไม่ถูกต้อง"}
	}
	if p := checkPassword(*password); p != nil {
		return p
	}
	return checkProfile(*fullName, *phone)
}

func validatePet(in *store.PetInput, creating bool) *problem {
	in.Name = strings.TrimSpace(in.Name)
	in.Breed = strings.TrimSpace(in.Breed)
	in.Description = strings.TrimSpace(in.Description)
	in.HealthStatus = strings.TrimSpace(in.HealthStatus)
	in.ImageURL = strings.TrimSpace(in.ImageURL)
	if in.Sex == "" {
		in.Sex = "unknown"
	}
	if creating && in.Status == "" {
		in.Status = "available"
	}
	switch {
	case in.Name == "" || utf8.RuneCountInString(in.Name) > 100:
		return &problem{"name", "BAD_NAME", "ต้องมีชื่อสัตว์ และยาวไม่เกิน 100 ตัวอักษร"}
	case !oneOf(in.Species, "dog", "cat", "other"):
		return &problem{"species", "BAD_SPECIES", "ประเภทต้องเป็น dog, cat หรือ other"}
	case !oneOf(in.Sex, "male", "female", "unknown"):
		return &problem{"sex", "BAD_SEX", "เพศต้องเป็น male, female หรือ unknown"}
	case in.AgeMonths < 0 || in.AgeMonths > 600:
		return &problem{"ageMonths", "BAD_AGE", "อายุต้องอยู่ระหว่าง 0-600 เดือน"}
	case utf8.RuneCountInString(in.Breed) > 100:
		return &problem{"breed", "BAD_BREED", "สายพันธุ์ยาวเกินไป"}
	case utf8.RuneCountInString(in.Description) > 5000 || utf8.RuneCountInString(in.HealthStatus) > 2000:
		return &problem{"description", "BAD_TEXT", "ข้อความยาวเกินไป"}
	case creating && !oneOf(in.Status, "available", "hidden"):
		return &problem{"status", "BAD_STATUS", "สถานะเริ่มต้นเลือกได้เฉพาะ available หรือ hidden"}
	}
	if in.ImageURL != "" {
		u, err := url.Parse(in.ImageURL)
		if err != nil || len(in.ImageURL) > 1000 || (u.Scheme != "http" && u.Scheme != "https") || u.Host == "" {
			return &problem{"imageUrl", "BAD_IMAGE", "รูปภาพต้องเป็น URL ที่ขึ้นต้นด้วย http:// หรือ https://"}
		}
	}
	return nil
}

func validateApplication(in *store.ApplicationInput, memberPhone string) *problem {
	in.ContactPhone = strings.TrimSpace(in.ContactPhone)
	if in.ContactPhone == "" {
		in.ContactPhone = memberPhone
	}
	in.Reason = strings.TrimSpace(in.Reason)
	in.CarePlan = strings.TrimSpace(in.CarePlan)
	switch {
	case !phoneRe.MatchString(in.ContactPhone):
		return &problem{"contactPhone", "BAD_PHONE", "กรุณากรอกเบอร์โทรศัพท์ที่ติดต่อได้"}
	case utf8.RuneCountInString(in.Reason) < 10 || utf8.RuneCountInString(in.Reason) > 2000:
		return &problem{"reason", "BAD_REASON", "กรุณาอธิบายเหตุผลที่ต้องการรับเลี้ยง (10-2000 ตัวอักษร)"}
	case !oneOf(in.HousingType, "house", "condo", "apartment", "other"):
		return &problem{"housingType", "BAD_HOUSING", "กรุณาเลือกลักษณะที่อยู่อาศัย"}
	case utf8.RuneCountInString(in.CarePlan) > 2000:
		return &problem{"carePlan", "BAD_CARE_PLAN", "แนวทางการดูแลยาวเกินไป"}
	}
	return nil
}
