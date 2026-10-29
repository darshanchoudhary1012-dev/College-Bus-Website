const loginOverlay = document.getElementById("loginOverlay");
const adminMainContent = document.getElementById("adminMainContent");
const loginError = document.getElementById("loginError");
const adminTableBody = document.getElementById("adminTableBody");
const busForm = document.getElementById("addBusForm");
const formTitle = document.getElementById("formTitle");
const cancelEditButton = document.getElementById("cancelEditButton");
const submitButton = busForm.querySelector('button[type="submit"]');
let editingBusId = null;

function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

async function apiRequest(url, options = {}) {
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

function showAdmin() {
    loginOverlay.style.display = "none";
    adminMainContent.style.display = "block";
}

async function verifyPassword() {
    loginError.style.display = "none";
    try {
        await apiRequest("/api/admin/login", {
            method: "POST",
            body: JSON.stringify({ password: document.getElementById("adminPasswordInput").value })
        });
        showAdmin();
        await loadAdminBuses();
    } catch (error) {
        loginError.textContent = error.message;
        loginError.style.display = "block";
    }
}

async function logoutAdmin() {
    try {
        await apiRequest("/api/admin/logout", { method: "POST" });
        location.reload();
    } catch (error) {
        alert(`Could not log out: ${error.message}`);
    }
}

async function loadAdminBuses() {
    try {
        const buses = await apiRequest("/api/buses");
        if (buses.length === 0) {
            adminTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">No buses found. Add one using the form above.</td></tr>';
            return;
        }
        adminTableBody.innerHTML = buses.map(bus => `
            <tr>
                <td><strong>${escapeHtml(bus.no)}</strong></td>
                <td><code>${escapeHtml(bus.plate)}</code></td>
                <td><strong>${escapeHtml(bus.driverName)}</strong><br><small>${escapeHtml(bus.driverContact)}</small></td>
                <td><small>${bus.stops.map(escapeHtml).join(" → ")}</small></td>
                <td>${escapeHtml(bus.dest)}</td>
                <td class="admin-actions">
                    <button class="btn-edit" data-edit-bus-id="${bus.id}">Edit</button>
                    <button class="btn-delete" data-delete-bus-id="${bus.id}">Delete</button>
                </td>
            </tr>
        `).join("");
    } catch (error) {
        adminTableBody.innerHTML = `<tr><td colspan="6" style="color: #dc3545;">${escapeHtml(error.message)}</td></tr>`;
    }
}

function resetBusForm() {
    busForm.reset();
    document.getElementById("busDest").value = "Bansal College Campus";
    editingBusId = null;
    formTitle.textContent = "Manually Add New Bus Route & Driver Details";
    submitButton.textContent = "Save & Publish Bus Route";
    cancelEditButton.style.display = "none";
}

async function editBus(id) {
    try {
        const buses = await apiRequest("/api/buses");
        const bus = buses.find(item => item.id === id);
        if (!bus) throw new Error("Bus route not found. Refresh the list and try again.");

        document.getElementById("busNo").value = bus.no;
        document.getElementById("busPlate").value = bus.plate;
        document.getElementById("driverName").value = bus.driverName;
        document.getElementById("driverContact").value = bus.driverContact;
        document.getElementById("busStops").value = bus.stops.join(", ");
        document.getElementById("busDest").value = bus.dest;
        editingBusId = bus.id;
        formTitle.textContent = `Correct Bus Details: ${bus.no}`;
        submitButton.textContent = "Save Changes";
        cancelEditButton.style.display = "block";
        busForm.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
        alert(`Could not load bus details: ${error.message}`);
    }
}

async function addNewBus(event) {
    event.preventDefault();
    const stops = document.getElementById("busStops").value
        .split(",")
        .map(stop => stop.trim())
        .filter(Boolean);

    try {
        const isEditing = editingBusId !== null;
        await apiRequest(isEditing ? `/api/buses/${editingBusId}` : "/api/buses", {
            method: isEditing ? "PUT" : "POST",
            body: JSON.stringify({
                no: document.getElementById("busNo").value.trim(),
                plate: document.getElementById("busPlate").value.trim(),
                driverName: document.getElementById("driverName").value.trim(),
                driverContact: document.getElementById("driverContact").value.trim(),
                stops,
                dest: document.getElementById("busDest").value.trim()
            })
        });
        resetBusForm();
        const successMessage = document.getElementById("successMsg");
        successMessage.textContent = isEditing
            ? "Bus details corrected successfully and updated on the student portal."
            : "Bus details added successfully and are now visible on the student portal.";
        successMessage.style.display = "block";
        await loadAdminBuses();
        window.setTimeout(() => { successMessage.style.display = "none"; }, 3000);
    } catch (error) {
        alert(`Could not save bus details: ${error.message}`);
    }
}

async function deleteBus(id) {
    if (!confirm("Are you sure you want to delete this bus route?")) return;
    try {
        if (editingBusId === id) resetBusForm();
        await apiRequest(`/api/buses/${id}`, { method: "DELETE" });
        await loadAdminBuses();
    } catch (error) {
        alert(`Could not delete bus route: ${error.message}`);
    }
}

busForm.addEventListener("submit", addNewBus);
cancelEditButton.addEventListener("click", resetBusForm);
document.getElementById("adminPasswordInput").addEventListener("keydown", event => {
    if (event.key === "Enter") verifyPassword();
});
adminTableBody.addEventListener("click", event => {
    const editButton = event.target.closest("[data-edit-bus-id]");
    if (editButton) {
        editBus(Number(editButton.dataset.editBusId));
        return;
    }
    const deleteButton = event.target.closest("[data-delete-bus-id]");
    if (deleteButton) deleteBus(Number(deleteButton.dataset.deleteBusId));
});

apiRequest("/api/admin/session")
    .then(() => {
        showAdmin();
        return loadAdminBuses();
    })
    .catch(error => {
        loginOverlay.style.display = "flex";
        if (error.status !== 401) {
            loginError.textContent = error.message;
            loginError.style.display = "block";
        }
    });
