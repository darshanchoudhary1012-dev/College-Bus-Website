-- Exported from data/buses.sqlite. Run once in MySQL Workbench.
CREATE DATABASE IF NOT EXISTS college_bus CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE college_bus;

CREATE TABLE IF NOT EXISTS buses (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  no VARCHAR(120) NOT NULL,
  plate VARCHAR(120) NOT NULL,
  driverName VARCHAR(120) NOT NULL,
  driverContact VARCHAR(120) NOT NULL,
  stops JSON NOT NULL,
  dest VARCHAR(120) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS app_settings (
  `key` VARCHAR(255) NOT NULL PRIMARY KEY,
  `value` TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS students (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  roll_no VARCHAR(40) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL UNIQUE,
  password_salt CHAR(32) NOT NULL,
  password_hash CHAR(128) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO buses (id, no, plate, driverName, driverContact, stops, dest) VALUES
  (2, 'Bus 12', 'MP 09 CD 5678', 'Suresh Verma', '+91 98765 12345', '["Station","Rajwada","Mhow Naka","College"]', 'Bansal College Campus'),
  (3, 'Bus 08', 'MP 09 EF 9012', 'Vikram Singh', '+91 98765 67890', '["Bhawarkua","Tower Square","Sapna Sangeeta","College"]', 'Bansal College Campus'),
  (4, 'Bus 46', 'MP 09 GH 3456', 'Anil Patel', '+91 98765 98765', '["Hawa Bangla","Cat Road","Rau Rangwasa","Ranjit Hanuman","60 Fit Footi kothi"]', 'Bansal College Campus'),
  (9, 'Bus 40', 'MP09TG6784', 'Shankar Verma', '9564835835', '["Rau","Pithampure","Hawa Bangla","Rajendra Nager","Treasure Fantasy","Cat Square"]', 'Bansal College Campus'),
  (10, 'Bus 15', 'MP09GH8945', 'Rammohan Sharma', '9546644355', '["Footi Kothi","Hawa Bangla","Cat Square","Rajendra Nager","Annanpura Mandir","Mhow Naka","Treasure Fantasyy"]', 'Bansal College Campus');

INSERT INTO students (id, name, roll_no, password_salt, password_hash, created_at) VALUES
  (1, 'Darshan.Choudhary', '0829IT241012', '8037bd5723b40e6f0239fa2009e4d8fc', 'f0d7adf9274768738d2f4b431672327d36beb13457365060c8597ce821292a029c9cab97242b77ffe4c9e9d67c8e68d8df48697e3b2e5d60f57329d452f890ca', '2026-10-29 16:37:06'),
  (2, 'Rohan Jadhav', '0829CS246956', 'b85ca3fe833434f41037fcb092493557', '1253b63f352c85a63ed0861ff13a640c42363d8280dcfebe88b7e1674596a6249ff3cf896225e88a9c3ec07e5bcf908ed1fb2300ed02b29e02eb52bd67192c6e', '2026-10-29 17:18:17');

INSERT INTO app_settings (`key`, `value`) VALUES
  ('buses_seeded', 'true');

-- Verify transferred row counts.
SELECT 'buses' AS table_name, COUNT(*) AS total FROM buses
UNION ALL SELECT 'students', COUNT(*) FROM students
UNION ALL SELECT 'app_settings', COUNT(*) FROM app_settings;
