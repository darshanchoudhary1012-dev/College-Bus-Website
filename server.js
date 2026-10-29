const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");
const { DatabaseSync } = require("node:sqlite");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const sessions = new Map();
const studentSessions = new Map();
const defaultBuses = [
    {
        no: "Bus 45",
        plate: "MP 09 AB 1234",
        driverName: "Ramesh Sharma",
        driverContact: "+91 98765 43210",
        stops: ["Vijay Nagar", "Bapat Square", "Radisson", "College", "Rajwada"],
        dest: "Bansal College Campus"
    },
    {
        no: "Bus 12",
        plate: "MP 09 CD 5678",
        driverName: "Suresh Verma",
        driverContact: "+91 98765 12345",
        stops: ["Station", "Rajwada", "Mhow Naka", "College"],
        dest: "Bansal College Campus"
    },
    {
        no: "Bus 08",
        plate: "MP 09 EF 9012",
        driverName: "Vikram Singh",
        driverContact: "+91 98765 67890",
        stops: ["Bhawarkua", "Tower Square", "Sapna Sangeeta", "College"],
        dest: "Bansal College Campus"
    },
    {
        no: "Bus 46",
        plate: "MP 09 GH 3456",
        driverName: "Anil Patel",
        driverContact: "+91 98765 98765",
        stops: ["Hawa Bangla", "Cat Road", "Rau Rangwasa", "Ranjit Hanuman", "60 Fit Footi kothi"],
        dest: "Bansal College Campus"
    }
];

const dataDirectory = path.join(ROOT, "data");
fs.mkdirSync(dataDirectory, { recursive: true });
const database = new DatabaseSync(path.join(dataDirectory, "buses.sqlite"));
database.exec(`
    CREATE TABLE IF NOT EXISTS buses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        no TEXT NOT NULL,
        plate TEXT NOT NULL,
        driverName TEXT NOT NULL,
        driverContact TEXT NOT NULL,
        stops TEXT NOT NULL,
        dest TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        roll_no TEXT NOT NULL UNIQUE,
        password_salt TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
`);

const seeded = database.prepare("SELECT value FROM app_settings WHERE key = 'buses_seeded'").get();
if (!seeded) {
    const insertBus = database.prepare(
        "INSERT INTO buses (no, plate, driverName, driverContact, stops, dest) VALUES (?, ?, ?, ?, ?, ?)"
    );
    database.exec("BEGIN");
    try {
        for (const bus of defaultBuses) {
            insertBus.run(
                bus.no,
                bus.plate,
                bus.driverName,
                bus.driverContact,
                JSON.stringify(bus.stops),
                bus.dest
            );
        }
        database.prepare("INSERT INTO app_settings (key, value) VALUES ('buses_seeded', 'true')").run();
        database.exec("COMMIT");
    } catch (error) {
        database.exec("ROLLBACK");
        throw error;
    }
}

function sendJson(response, statusCode, data) {
    response.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
    });
    response.end(JSON.stringify(data));
}

function readJson(request) {
    return new Promise((resolve, reject) => {
        let body = "";
        request.on("data", chunk => {
            body += chunk;
            if (body.length > 64 * 1024) {
                reject(Object.assign(new Error("Request body is too large"), { statusCode: 413 }));
                request.destroy();
            }
        });
        request.on("end", () => {
            try {
                resolve(JSON.parse(body || "{}"));
            } catch {
                reject(Object.assign(new Error("Invalid JSON body"), { statusCode: 400 }));
            }
        });
        request.on("error", reject);
    });
}

function getSessionToken(request, cookieName = "bus_admin_session") {
    const cookieHeader = request.headers.cookie || "";
    const sessionCookie = cookieHeader.split(";").map(value => value.trim())
        .find(value => value.startsWith(`${cookieName}=`));
    return sessionCookie ? sessionCookie.slice(cookieName.length + 1) : "";
}

function isAdmin(request) {
    const token = getSessionToken(request);
    const expiresAt = sessions.get(token);
    if (!expiresAt) return false;
    if (expiresAt <= Date.now()) {
        sessions.delete(token);
        return false;
    }
    return true;
}

function isStudent(request) {
    const token = getSessionToken(request, "bus_student_session");
    const student = studentSessions.get(token);
    if (!student) return false;
    if (student.expiresAt <= Date.now()) {
        studentSessions.delete(token);
        return false;
    }
    return true;
}

function getStudent(request) {
    if (!isStudent(request)) return null;
    const token = getSessionToken(request, "bus_student_session");
    return studentSessions.get(token) || null;
}

function createStudentSession(response, student) {
    const token = crypto.randomBytes(32).toString("hex");
    studentSessions.set(token, {
        expiresAt: Date.now() + SESSION_TTL_MS,
        id: student.id,
        name: student.name,
        rollNo: student.roll_no
    });
    response.setHeader("Set-Cookie", `bus_student_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`);
}

function studentSessionInfo(request) {
    const student = getStudent(request);
    return student ? { authenticated: true, name: student.name, rollNo: student.rollNo } : null;
}

function requireAdmin(request, response) {
    if (isAdmin(request)) return true;
    sendJson(response, 401, { error: "Please log in as an admin." });
    return false;
}

function validateBus(bus) {
    const fields = ["no", "plate", "driverName", "driverContact", "dest"];
    if (!bus || typeof bus !== "object" || Array.isArray(bus)) return "Invalid bus details.";
    for (const field of fields) {
        if (typeof bus[field] !== "string" || !bus[field].trim() || bus[field].trim().length > 120) {
            return `Please provide a valid ${field}.`;
        }
    }
    if (!Array.isArray(bus.stops) || bus.stops.length === 0 || bus.stops.length > 100) {
        return "Add between 1 and 100 bus stops.";
    }
    if (bus.stops.some(stop => typeof stop !== "string" || !stop.trim() || stop.trim().length > 120)) {
        return "Every bus stop must contain 1 to 120 characters.";
    }
    return null;
}

function mapBus(row) {
    return {
        id: row.id,
        no: row.no,
        plate: row.plate,
        driverName: row.driverName,
        driverContact: row.driverContact,
        stops: JSON.parse(row.stops),
        dest: row.dest
    };
}

const publicFiles = new Map([
    ["/", ["index.html", "text/html; charset=utf-8"]],
    ["/index.html", ["index.html", "text/html; charset=utf-8"]],
    ["/admin.html", ["admin.html", "text/html; charset=utf-8"]],
    ["/style.css", ["style.css", "text/css; charset=utf-8"]],
    ["/script.js", ["script.js", "text/javascript; charset=utf-8"]],
    ["/admin.js", ["admin.js", "text/javascript; charset=utf-8"]],
    ["/image.png", ["image.png", "image/png"]]
]);

const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    const { pathname } = url;

    try {
        if (pathname === "/api/buses" && request.method === "GET") {
            if (!isAdmin(request) && !isStudent(request)) {
                sendJson(response, 401, { error: "Please log in to view bus routes." });
                return;
            }
            const rows = database.prepare("SELECT * FROM buses ORDER BY id").all();
            sendJson(response, 200, rows.map(mapBus));
            return;
        }

        if (pathname === "/api/student/session" && request.method === "GET") {
            const student = studentSessionInfo(request);
            sendJson(response, student ? 200 : 401, student || { authenticated: false });
            return;
        }

        if (pathname === "/api/student/register" && request.method === "POST") {
            const body = await readJson(request);
            if (!body || typeof body !== "object" || Array.isArray(body)) {
                sendJson(response, 400, { error: "Provide valid student account details." });
                return;
            }
            const name = typeof body.name === "string" ? body.name.trim() : "";
            const rollNo = typeof body.rollNo === "string" ? body.rollNo.trim().toUpperCase() : "";
            const password = typeof body.password === "string" ? body.password : "";
            if (!name || name.length > 100) {
                sendJson(response, 400, { error: "Enter your name (up to 100 characters)." });
                return;
            }
            if (!rollNo || rollNo.length > 40) {
                sendJson(response, 400, { error: "Enter a valid college roll number (up to 40 characters)." });
                return;
            }
            if (password.length < 8 || password.length > 128) {
                sendJson(response, 400, { error: "Password must be between 8 and 128 characters." });
                return;
            }
            const existingStudent = database.prepare("SELECT id FROM students WHERE roll_no = ?").get(rollNo);
            if (existingStudent) {
                sendJson(response, 409, { error: "An account with this roll number already exists. Please log in." });
                return;
            }
            const salt = crypto.randomBytes(16).toString("hex");
            const passwordHash = crypto.scryptSync(password, salt, 64).toString("hex");
            const result = database.prepare(
                "INSERT INTO students (name, roll_no, password_salt, password_hash) VALUES (?, ?, ?, ?)"
            ).run(name, rollNo, salt, passwordHash);
            const student = database.prepare("SELECT id, name, roll_no FROM students WHERE id = ?")
                .get(Number(result.lastInsertRowid));
            createStudentSession(response, student);
            sendJson(response, 201, { authenticated: true, name: student.name, rollNo: student.roll_no });
            return;
        }

        if (pathname === "/api/student/login" && request.method === "POST") {
            const body = await readJson(request);
            if (!body || typeof body !== "object" || Array.isArray(body)) {
                sendJson(response, 400, { error: "Enter your roll number and password." });
                return;
            }
            const rollNo = typeof body.rollNo === "string" ? body.rollNo.trim().toUpperCase() : "";
            const password = typeof body.password === "string" ? body.password : "";
            if (!rollNo || password.length > 128) {
                sendJson(response, 401, { error: "Invalid roll number or password." });
                return;
            }
            const student = rollNo
                ? database.prepare("SELECT id, name, roll_no, password_salt, password_hash FROM students WHERE roll_no = ?").get(rollNo)
                : null;
            const salt = student ? student.password_salt : "invalid-student-login-salt";
            const submittedHash = crypto.scryptSync(password, salt, 64);
            const expectedHash = student
                ? Buffer.from(student.password_hash, "hex")
                : Buffer.alloc(64);
            const valid = student
                && expectedHash.length === submittedHash.length
                && crypto.timingSafeEqual(expectedHash, submittedHash);
            if (!valid) {
                sendJson(response, 401, { error: "Invalid roll number or password." });
                return;
            }
            createStudentSession(response, student);
            sendJson(response, 200, { authenticated: true, name: student.name, rollNo: student.roll_no });
            return;
        }

        if (pathname === "/api/student/logout" && request.method === "POST") {
            studentSessions.delete(getSessionToken(request, "bus_student_session"));
            response.setHeader("Set-Cookie", "bus_student_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
            sendJson(response, 200, { authenticated: false });
            return;
        }

        if (pathname === "/api/admin/session" && request.method === "GET") {
            const authenticated = isAdmin(request);
            sendJson(response, authenticated ? 200 : 401, { authenticated });
            return;
        }

        if (pathname === "/api/admin/login" && request.method === "POST") {
            const body = await readJson(request);
            const submittedPassword = typeof body.password === "string" ? body.password : "";
            const expected = Buffer.from(ADMIN_PASSWORD);
            const submitted = Buffer.from(submittedPassword);
            const valid = expected.length === submitted.length && crypto.timingSafeEqual(expected, submitted);
            if (!valid) {
                sendJson(response, 401, { error: "Incorrect password. Please try again." });
                return;
            }
            const token = crypto.randomBytes(32).toString("hex");
            sessions.set(token, Date.now() + SESSION_TTL_MS);
            response.setHeader("Set-Cookie", `bus_admin_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_MS / 1000}`);
            sendJson(response, 200, { authenticated: true });
            return;
        }

        if (pathname === "/api/admin/logout" && request.method === "POST") {
            sessions.delete(getSessionToken(request));
            response.setHeader("Set-Cookie", "bus_admin_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0");
            sendJson(response, 200, { authenticated: false });
            return;
        }

        if (pathname === "/api/buses" && request.method === "POST") {
            if (!requireAdmin(request, response)) return;
            const bus = await readJson(request);
            const validationError = validateBus(bus);
            if (validationError) {
                sendJson(response, 400, { error: validationError });
                return;
            }
            const result = database.prepare(
                "INSERT INTO buses (no, plate, driverName, driverContact, stops, dest) VALUES (?, ?, ?, ?, ?, ?)"
            ).run(
                bus.no.trim(),
                bus.plate.trim(),
                bus.driverName.trim(),
                bus.driverContact.trim(),
                JSON.stringify(bus.stops.map(stop => stop.trim())),
                bus.dest.trim()
            );
            const savedBus = database.prepare("SELECT * FROM buses WHERE id = ?").get(Number(result.lastInsertRowid));
            sendJson(response, 201, mapBus(savedBus));
            return;
        }

        const busMatch = pathname.match(/^\/api\/buses\/(\d+)$/);
        if (busMatch && request.method === "PUT") {
            if (!requireAdmin(request, response)) return;
            const bus = await readJson(request);
            const validationError = validateBus(bus);
            if (validationError) {
                sendJson(response, 400, { error: validationError });
                return;
            }
            const result = database.prepare(
                "UPDATE buses SET no = ?, plate = ?, driverName = ?, driverContact = ?, stops = ?, dest = ? WHERE id = ?"
            ).run(
                bus.no.trim(),
                bus.plate.trim(),
                bus.driverName.trim(),
                bus.driverContact.trim(),
                JSON.stringify(bus.stops.map(stop => stop.trim())),
                bus.dest.trim(),
                Number(busMatch[1])
            );
            if (result.changes === 0) {
                sendJson(response, 404, { error: "Bus route not found." });
                return;
            }
            const updatedBus = database.prepare("SELECT * FROM buses WHERE id = ?").get(Number(busMatch[1]));
            sendJson(response, 200, mapBus(updatedBus));
            return;
        }

        if (busMatch && request.method === "DELETE") {
            if (!requireAdmin(request, response)) return;
            const result = database.prepare("DELETE FROM buses WHERE id = ?").run(Number(busMatch[1]));
            if (result.changes === 0) {
                sendJson(response, 404, { error: "Bus route not found." });
                return;
            }
            sendJson(response, 200, { deleted: true });
            return;
        }

        if (pathname.startsWith("/api/")) {
            sendJson(response, 404, { error: "API endpoint not found." });
            return;
        }

        const file = publicFiles.get(pathname);
        if (!file || request.method !== "GET") {
            response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Not found");
            return;
        }
        response.writeHead(200, {
            "Content-Type": file[1],
            "X-Content-Type-Options": "nosniff"
        });
        fs.createReadStream(path.join(ROOT, file[0])).pipe(response);
    } catch (error) {
        if (response.headersSent || response.destroyed) return;
        const statusCode = error.statusCode || 500;
        if (statusCode >= 500) console.error("Request failed:", error);
        sendJson(response, statusCode, {
            error: statusCode >= 500 ? "An unexpected server error occurred." : error.message
        });
    }
});

server.listen(PORT, () => {
    console.log(`College bus website is running at http://localhost:${PORT}`);
    if (ADMIN_PASSWORD === "admin123") {
        console.warn("Using the default admin password. Set ADMIN_PASSWORD before deployment.");
    }
});
