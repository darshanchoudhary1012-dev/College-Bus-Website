function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

const studentLoginOverlay = document.getElementById("studentLoginOverlay");
const studentMainContent = document.getElementById("studentMainContent");
const studentAuthForm = document.getElementById("studentAuthForm");
const studentLoginError = document.getElementById("studentLoginError");
const studentNameInput = document.getElementById("studentName");
const studentPasswordInput = document.getElementById("studentPassword");
let studentAuthMode = "login";

async function studentApiRequest(url, options = {}) {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });
    const data = await response.json();
    if (!response.ok) {
        const error = new Error(data.error || "Request failed.");
        error.status = response.status;
        throw error;
    }
    return data;
}

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

async function submitStudentAuth(event) {
    event.preventDefault();
    studentLoginError.style.display = "none";
    const isRegistering = studentAuthMode === "register";
    const body = {
        rollNo: document.getElementById("studentRollNo").value.trim(),
        password: studentPasswordInput.value
    };
    if (isRegistering) body.name = studentNameInput.value.trim();

    try {
        const student = await studentApiRequest(
            isRegistering ? "/api/student/register" : "/api/student/login",
            { method: "POST", body: JSON.stringify(body) }
        );
        studentAuthForm.reset();
        setStudentAuthMode("login");
        showStudent(student);
    } catch (error) {
        studentLoginError.textContent = error.message;
        studentLoginError.style.display = "block";
    }
}

async function searchBuses() {
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

    try {
        const response = await fetch("/api/buses");
        if (!response.ok) {
            const error = new Error("Could not load bus routes. Please try again.");
            error.status = response.status;
            throw error;
        }
        const buses = await response.json();
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
    } catch (requestError) {
        if (requestError.status === 401) {
            showStudentLogin("Your session expired. Please log in again.");
            return;
        }
        error.textContent = requestError.message;
        error.style.display = "block";
    }
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
document.getElementById("studentLogoutButton").addEventListener("click", async () => {
    try {
        await studentApiRequest("/api/student/logout", { method: "POST" });
        location.reload();
    } catch (error) {
        alert(`Could not log out: ${error.message}`);
    }
});

studentApiRequest("/api/student/session")
    .then(showStudent)
    .catch(error => {
        showStudentLogin(error.status === 401 ? "" : error.message);
    });
