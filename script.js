 function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

// server.js ke defaultBuses se exact data
const busData = [
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

const studentLoginOverlay = document.getElementById("studentLoginOverlay");
const studentMainContent = document.getElementById("studentMainContent");
const studentAuthForm = document.getElementById("studentAuthForm");
const studentLoginError = document.getElementById("studentLoginError");
const studentNameInput = document.getElementById("studentName");
const studentPasswordInput = document.getElementById("studentPassword");
let studentAuthMode = "login";

function showStudent(student) {
    studentLoginOverlay.style.display = "none";
    studentMainContent.style.display = "block";
    document.getElementById("studentGreeting").textContent = `Logged in as ${student.name}`;
    document.getElementById("studentAccountBar").style.display = "block";
}

function showStudentLogin(message = "") {
    studentMainContent.style.display = "none";
    document.getElementById("studentAccountBar").style.display = "none";
    studentLoginOverlay.style.display = "flex";
    studentLoginError.textContent = message;
    studentLoginError.style.display = message ? "block" : "none";
}

function setStudentAuthMode(mode) {
    studentAuthMode = mode;
    const isRegistering = mode === "register";
    document.getElementById("studentLoginTitle").textContent = isRegistering ? "Create Student Account" : "Student Login";
    document.getElementById("studentAuthSubmit").textContent = isRegistering ? "Create Account" : "Login";
    document.getElementById("studentAuthPrompt").textContent = isRegistering ? "Already registered?" : "New student?";
    document.getElementById("studentModeToggle").textContent = isRegistering ? "Login" : "Create an account";
    studentNameInput.style.display = isRegistering ? "block" : "none";
    studentNameInput.required = isRegistering;
    studentPasswordInput.autocomplete = isRegistering ? "new-password" : "current-password";
    studentLoginError.style.display = "none";
    studentLoginError.textContent = "";
}

function submitStudentAuth(event) {
    event.preventDefault();
    studentLoginError.style.display = "none";

    const isRegistering = studentAuthMode === "register";
    const rollNo = document.getElementById("studentRollNo").value.trim().toUpperCase();
    const password = studentPasswordInput.value;
    const name = studentNameInput.value.trim();

    let registeredUsers = JSON.parse(localStorage.getItem("registeredUsers")) || [];

    if (isRegistering) {
        if (!name || name.length > 100) {
            studentLoginError.textContent = "Enter your name (up to 100 characters).";
            studentLoginError.style.display = "block";
            return;
        }
        if (password.length < 8 || password.length > 128) {
            studentLoginError.textContent = "Password must be between 8 and 128 characters.";
            studentLoginError.style.display = "block";
            return;
        }

        const exists = registeredUsers.some(u => u.rollNo === rollNo);
        if (exists) {
            studentLoginError.textContent = "An account with this roll number already exists. Please log in.";
            studentLoginError.style.display = "block";
            return;
        }

        const newStudent = { rollNo, password, name };
        registeredUsers.push(newStudent);
        localStorage.setItem("registeredUsers", JSON.stringify(registeredUsers));
        localStorage.setItem("currentStudent", JSON.stringify(newStudent));

        studentAuthForm.reset();
        setStudentAuthMode("login");
        showStudent(newStudent);
    } else {
        let foundUser = registeredUsers.find(u => u.rollNo === rollNo && u.password === password);

        // Backup Demo User
        if (!foundUser && rollNo === "12345" && password === "12345678") {
            foundUser = { rollNo: "12345", name: "Demo Student" };
        }

        if (foundUser) {
            localStorage.setItem("currentStudent", JSON.stringify(foundUser));
            studentAuthForm.reset();
            showStudent(foundUser);
        } else {
            studentLoginError.textContent = "Invalid roll number or password.";
            studentLoginError.style.display = "block";
        }
    }
}

function searchBuses() {
    const input = document.getElementById("stopInput").value.trim().toLowerCase();
    const tbody = document.getElementById("tableBody");
    const table = document.getElementById("busTable");
    const error = document.getElementById("errorMsg");

    tbody.innerHTML = "";
    error.style.display = "none";
    table.style.display = "none";

    if (!input) {
        alert("Please enter a destination or stop name.");
        return;
    }

    const matchingBuses = busData.filter(bus =>
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
    detailsRow.style.display = detailsRow.style.display === "none" ? "table-row" : "none";
}

document.getElementById("stopInput").addEventListener("keydown", event => {
    if (event.key === "Enter") searchBuses();
});

studentAuthForm.addEventListener("submit", submitStudentAuth);

document.getElementById("studentModeToggle").addEventListener("click", () => {
    setStudentAuthMode(studentAuthMode === "login" ? "register" : "login");
});

document.getElementById("studentLogoutButton").addEventListener("click", () => {
    localStorage.removeItem("currentStudent");
    showStudentLogin("Logged out successfully.");
});

// Auto Check session
const currentStudent = JSON.parse(localStorage.getItem("currentStudent"));
if (currentStudent) {
    showStudent(currentStudent);
} else {
    showStudentLogin();
}
