-- PawHome seed: สัตว์ตัวอย่างสำหรับทดสอบ/สาธิต (รันหลัง schema.sql)
-- บัญชี Admin ไม่ได้สร้างที่นี่ ระบบสร้างให้อัตโนมัติจาก ADMIN_EMAIL / ADMIN_PASSWORD ตอนเริ่ม server

INSERT INTO pets (name, species, breed, age_months, sex, description, health_status, vaccinated, sterilized, image_url, status) VALUES
 ('ข้าวปุ้น', 'dog',   'ไทยหลังอาน',   18, 'male',   'ขี้อ้อน ชอบเดินเล่นตอนเย็น เข้ากับเด็กได้ดี',            'แข็งแรง ตรวจพยาธิแล้ว',          TRUE,  TRUE,  'https://i.postimg.cc/DZ1ZsjHn/92cd53ecf225adf6.jpg', 'available'),
 ('มะลิ',     'cat',   'วิเชียรมาศ',    8, 'female', 'แมวสาวเรียบร้อย ใช้กระบะทรายเป็น ชอบนอนตักคน',            'แข็งแรง',                          TRUE,  FALSE, 'https://i.postimg.cc/63C3RjgX/05d63eb3852d09e4.jpg', 'available'),
 ('ถุงทอง',   'dog',   'ผสมโกลเด้น',   36, 'male',   'ใจดี ฉลาด ฝึกคำสั่งพื้นฐานแล้ว เหมาะกับบ้านที่มีพื้นที่',  'เคยเป็นโรคผิวหนัง รักษาหายแล้ว', TRUE,  TRUE,  'https://i.postimg.cc/PJhqMbnk/dec706b0ad5635c6.jpg', 'available'),
 ('นุ่น',     'cat',   'ขาวมณี',        4, 'female', 'ลูกแมวซนมาก กินเก่ง ชอบเล่นลูกบอล',                         'แข็งแรง รอฉีดวัคซีนเข็มที่ 2',    FALSE, FALSE, 'https://i.postimg.cc/sX5XS6qj/27356a69ae7c0498.jpg', 'available'),
 ('โบ๊ท',     'other', 'กระต่ายแคระ',  12, 'male',   'กระต่ายเชื่อง กินหญ้าและผักสด ไม่กัด',                     'แข็งแรง',                          FALSE, FALSE, 'https://i.postimg.cc/63C3RjgK/871f1d021e56ceac.jpg', 'available'),
 ('ลัคกี้',   'dog',   'ชิวาวา',       60, 'female', 'สุนัขสูงวัย สงบ เหมาะกับคอนโด ไม่เห่าบ่อย',                'ตรวจสุขภาพประจำปีแล้ว',          TRUE,  TRUE,  'https://i.postimg.cc/gjd0Kybb/f885a9d35902a2e9.jpg', 'available');
