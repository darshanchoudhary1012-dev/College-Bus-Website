 function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// Server.js se default buses array
const defaultBuses = [
    {
        id: 1,
        no: "Bus 45",
        plate: "MP 09 AB 1234",
        driverName: "Ramesh Sharma",
        driverContact: "+91 98765 43210",
        stops: ["Vijay Nagar", "Bapat Square", "Radisson", "College", "Rajwada"],
        dest: "Bansal College Campus"
    },
    {
        id: 2,
        no: "Bus 12",
        plate: "MP 09 CD 5678",
        driverName: "Suresh Verma",
        driverContact: "+91 98765 12345",
        stops: ["Station", "Rajwada", "Mhow Naka", "College"],
        dest: "Bansal College Campus"
    },
    {
        id: 3,
        no: "Bus 08",
        plate: "MP 09 EF 9012",
        driverName: "Vikram Singh",
        driverContact: "+91 98765 67890",
        stops: ["Bhawarkua", "Tower Square", "Sapna Sangeeta", "College"],
        dest: "Bansal College Campus"
    },
    {
        id: 4,
        no: "Bus 46",
        plate: "MP 09 GH 3456",
        driverName: "Anil Patel",
        driverContact: "+91 98765 98765",
        stops: ["Hawa Bangla", "Cat Road", "Rau Rangwasa", "Ranjit Hanuman", "60 Fit Footi kothi"],
        dest: "Bansal College Campus"
    }
];

function getBusesData() {
    const saved = localStorage.getItem("busesData");
    if (!saved) {
        localStorage.setItem("busesData", JSON.stringify(defaultBuses));
        return defaultBuses;
    }
    return JSON.parse(saved);
}

const studentLoginOverlay = document.getElementById("studentLoginOverlay");
const studentMainContent = document.getElementById("studentMainContent");
const studentAuthForm = document.getElementById("studentAuthForm");
const studentLoginError = document.getElementById("studentLoginError");
const studentNameInput = document.getElementById("studentName");
const studentPasswordInput = document.getElementById("studentPassword");
let studentAuthMode = "login";

function showStudent(student) {
    if (studentLoginOverlay) studentLoginOverlay.style.display = "none";
    if (studentMainContent) studentMainContent.style.display = "block";
    const greeting = document.getElementById("studentGreeting");
    if (greeting) greeting.textContent = `Logged in as ${student.name}`;
    const accountBar = document.getElementById("studentAccountBar");
    if (accountBar) accountBar.style.display = "block";
}

function showStudentLogin(message = "") {
    if (studentMainContent) studentMainContent.style.display = "none";
    const accountBar = document.getElementById("studentAccountBar");
    if (accountBar) accountBar.style.display = "none";
    if (studentLoginOverlay) studentLoginOverlay.style.display = "flex";
    if (studentLoginError) {
        studentLoginError.textContent = message;
        studentLoginError.style.display = message ? "block" : "none";
    }
}

function setStudentAuthMode(mode) {
    studentAuthMode = mode;
    const isRegistering = mode === "register";
    const title = document.getElementById("studentLoginTitle");
    if (title) title.textContent = isRegistering ? "Create Student Account" : "Student Login";
    const submitBtn = document.getElementById("studentAuthSubmit");
    if (submitBtn) submitBtn.textContent = isRegistering ? "Create Account" : "Login";
    const prompt = document.getElementById("studentAuthPrompt");
    if (prompt) prompt.textContent = isRegistering ? "Already registered?" : "New student?";
    const toggleBtn = document.getElementById("studentModeToggle");
    if (toggleBtn) toggleBtn.textContent = isRegistering ? "Login" : "Create an account";
    
    if (studentNameInput) {
        studentNameInput.style.display = isRegistering ? "block" : "none";
        studentNameInput.required = isRegistering;
    }
    if (studentPasswordInput) {
        studentPasswordInput.autocomplete = isRegistering ? "new-password" : "current-password";
    }
    if (studentLoginError) {
        studentLoginError.style.display = "none";
        studentLoginError.textContent = "";
    }
}

function submitStudentAuth(event) {
    event.preventDefault();
    if (studentLoginError) studentLoginError.style.display = "none";

    const isRegistering = studentAuthMode === "register";
    const rollNo = document.getElementById("studentRollNo").value.trim().toUpperCase();
    const password = studentPasswordInput.value;
    const name = studentNameInput ? studentNameInput.value.trim() : "";

    let registeredUsers = JSON.parse(localStorage.getItem("registeredUsers")) || [];

    if (isRegistering) {
        if (!name || name.length > 100) {
            showStudentLogin("Enter your name (up to 100 characters).");
            return;
        }
        if (password.length < 8 || password.length > 128) {
            showStudentLogin("Password must be between 8 and 128 characters.");
            return;
        }

        const exists = registeredUsers.some(u => u.rollNo === rollNo);
        if (exists) {
            showStudentLogin("An account with this roll number already exists. Please log in.");
            return;
        }

        const newStudent = { rollNo, password, name };
        registeredUsers.push(newStudent);
        localStorage.setItem("registeredUsers", JSON.stringify(registeredUsers));
        localStorage.setItem("currentStudent", JSON.stringify(newStudent));

        if (studentAuthForm) studentAuthForm.reset();
        setStudentAuthMode("login");
        showStudent(newStudent);
    } else {
        let foundUser = registeredUsers.find(u => u.rollNo === rollNo && u.password === password);

        // Demo User
        if (!foundUser && rollNo === "12345" && password === "12345678") {
            foundUser = { rollNo: "12345", name: "Demo Student" };
        }

        if (foundUser) {
            localStorage.setItem("currentStudent", JSON.stringify(foundUser));
            if (studentAuthForm) studentAuthForm.reset();
            showStudent(foundUser);
        } else {
            showStudentLogin("Invalid roll number or password.");
        }
    }
}

function searchBuses() {
    const input = document.getElementById("stopInput").value.trim().toLowerCase();
    const tbody = document.getElementById("tableBody");
    const table = document.getElementById("busTable");
    const error = document.getElementById("errorMsg");

    if (!tbody || !table || !error) return;

    tbody.innerHTML = "";
    error.style.display = "none";
    table.style.display = "none";

    if (!input) {
        alert("Please enter a destination or stop name.");
        return;
    }

    const buses = getBusesData();
    const matchingBuses = buses.filter(bus =>
        bus.stops.some(stop => stop.toLowerCase().includes(input))
    );

    if (matchingBuses.length === 0) {
        error.textContent = "No buses found for this stop. Please try another name.";
        error.style.display = "block";
        return;
    }

    tbody.innerHTML = matchingBuses.map((bus, index) => {
        const stopsHtml = bus.stops.map(stop => {
            const highlighted = stop.toLowerCase().includes(input) ? " highlight" : "";
            return `<span class="stop-chip${highlighted}">${escapeHtml(stop)}</span>`;
        }).join("");
        const driverName = escapeHtml(bus.driverName || "Not Assigned");
        const driverContact = escapeHtml(bus.driverContact || "N/A");
        const plateNo = escapeHtml(bus.plate || "N/A");
        const safePhone = (bus.driverContact || "").replace(/[^\d+]/g, "");

        return `
            <tr>
                <td><strong>${escapeHtml(bus.no)}</strong></td>
                <td>${stopsHtml}</td>
                <td>${escapeHtml(bus.dest || "Bansal College Campus")}</td>
                <td><button class="btn-details" onclick="toggleDetails(${index})">View Details</button></td>
            </tr>
            <tr id="details-${index}" class="details-row" style="display: none;">
                <td colspan="4">
                    <div class="driver-card">
                        <p><strong>Vehicle No:</strong> <span class="plate-tag">${plateNo}</span></p>
                        <p><strong>Driver Name:</strong> ${driverName}</p>
                        <p><strong>Contact:</strong> <a href="tel:${escapeHtml(safePhone)}">${driverContact}</a></p>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
    table.style.display = "table";
}

function toggleDetails(index) {
    const detailsRow = document.getElementById(`details-${index}`);
    if (detailsRow) {
        detailsRow.style.display = detailsRow.style.display === "none" ? "table-row" : "none";
    }
}

document.getElementById("stopInput")?.addEventListener("keydown", event => {
    if (event.key === "Enter") searchBuses();
});

if (studentAuthForm) studentAuthForm.addEventListener("submit", submitStudentAuth);

document.getElementById("studentModeToggle")?.addEventListener("click", () => {
    setStudentAuthMode(studentAuthMode === "login" ? "register" : "login");
});

document.getElementById("studentLogoutButton")?.addEventListener("click", () => {
    localStorage.removeItem("currentStudent");
    showStudentLogin("Logged out successfully.");
});

const currentStudent = JSON.parse(localStorage.getItem("currentStudent"));
if (currentStudent) {
    showStudent(currentStudent);
} else {
    showStudentLogin();
}
