-- PawHome seed: สัตว์ตัวอย่างสำหรับทดสอบ/สาธิต (รันหลัง schema.sql)
-- บัญชี Admin ไม่ได้สร้างที่นี่ ระบบสร้างให้อัตโนมัติจาก ADMIN_EMAIL / ADMIN_PASSWORD ตอนเริ่ม server

INSERT INTO pets (name, species, breed, age_months, sex, description, health_status, vaccinated, sterilized, status) VALUES
 ('ข้าวปุ้น', 'dog',   'ไทยหลังอาน',   18, 'male',   'ขี้อ้อน ชอบเดินเล่นตอนเย็น เข้ากับเด็กได้ดี',            'แข็งแรง ตรวจพยาธิแล้ว',          TRUE,  TRUE,  'available'),
 ('มะลิ',     'cat',   'วิเชียรมาศ',    8, 'female', 'แมวสาวเรียบร้อย ใช้กระบะทรายเป็น ชอบนอนตักคน',            'แข็งแรง',                          TRUE,  FALSE, 'available'),
 ('ถุงทอง',   'dog',   'ผสมโกลเด้น',   36, 'male',   'ใจดี ฉลาด ฝึกคำสั่งพื้นฐานแล้ว เหมาะกับบ้านที่มีพื้นที่',  'เคยเป็นโรคผิวหนัง รักษาหายแล้ว', TRUE,  TRUE,  'available'),
 ('นุ่น',     'cat',   'ขาวมณี',        4, 'female', 'ลูกแมวซนมาก กินเก่ง ชอบเล่นลูกบอล',                         'แข็งแรง รอฉีดวัคซีนเข็มที่ 2',    FALSE, FALSE, 'available'),
 ('โบ๊ท',     'other', 'กระต่ายแคระ',  12, 'male',   'กระต่ายเชื่อง กินหญ้าและผักสด ไม่กัด',                     'แข็งแรง',                          FALSE, FALSE, 'available'),
 ('ลัคกี้',   'dog',   'ชิวาวา',       60, 'female', 'สุนัขสูงวัย สงบ เหมาะกับคอนโด ไม่เห่าบ่อย',                'ตรวจสุขภาพประจำปีแล้ว',          TRUE,  TRUE,  'available');
