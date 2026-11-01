 function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

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

function getBuses() {
    const saved = localStorage.getItem("busesData");
    if (!saved) {
        localStorage.setItem("busesData", JSON.stringify(defaultBuses));
        return defaultBuses;
    }
    return JSON.parse(saved);
}

function saveBuses(buses) {
    localStorage.setItem("busesData", JSON.stringify(buses));
}

const adminLoginOverlay = document.getElementById("adminLoginOverlay");
const adminMainContent = document.getElementById("adminMainContent");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminPasswordInput = document.getElementById("adminPassword");
const adminLoginError = document.getElementById("adminLoginError");
const busForm = document.getElementById("busForm");
const formTitle = document.getElementById("formTitle");
const cancelEditBtn = document.getElementById("cancelEdit");
const busesList = document.getElementById("adminBusList");

let editingBusId = null;

function showAdminContent() {
    if (adminLoginOverlay) adminLoginOverlay.style.display = "none";
    if (adminMainContent) adminMainContent.style.display = "block";
    renderAdminBuses();
}

function showAdminLogin(message = "") {
    if (adminMainContent) adminMainContent.style.display = "none";
    if (adminLoginOverlay) adminLoginOverlay.style.display = "flex";
    if (adminLoginError) {
        adminLoginError.textContent = message;
        adminLoginError.style.display = message ? "block" : "none";
    }
}

adminLoginForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    const password = adminPasswordInput ? adminPasswordInput.value : "";
    if (password === "admin123") {
        localStorage.setItem("adminSession", "true");
        if (adminPasswordInput) adminPasswordInput.value = "";
        showAdminContent();
    } else {
        showAdminLogin("Incorrect password. Please try again.");
    }
});

document.getElementById("adminLogoutButton")?.addEventListener("click", () => {
    localStorage.removeItem("adminSession");
    showAdminLogin("Logged out successfully.");
});

function renderAdminBuses() {
    const buses = getBuses();
    if (!busesList) return;

    if (buses.length === 0) {
        busesList.innerHTML = "<p>No bus routes added yet.</p>";
        return;
    }

    busesList.innerHTML = buses.map(bus => `
        <div class="bus-card" style="border: 1px solid #ccc; padding: 12px; margin-bottom: 12px; border-radius: 6px;">
            <h3>${escapeHtml(bus.no)} - ${escapeHtml(bus.plate)}</h3>
            <p><strong>Driver:</strong> ${escapeHtml(bus.driverName)} (${escapeHtml(bus.driverContact)})</p>
            <p><strong>Stops:</strong> ${bus.stops.map(s => escapeHtml(s)).join(", ")}</p>
            <p><strong>Destination:</strong> ${escapeHtml(bus.dest)}</p>
            <button onclick="editBus(${bus.id})" style="background: #2196F3; color: white; border: none; padding: 6px 12px; cursor: pointer; border-radius: 4px; margin-right: 5px;">Edit</button>
            <button onclick="deleteBus(${bus.id})" style="background: #f44336; color: white; border: none; padding: 6px 12px; cursor: pointer; border-radius: 4px;">Delete</button>
        </div>
    `).join("");
}

busForm?.addEventListener("submit", (e) => {
    e.preventDefault();
    
    const no = document.getElementById("busNo").value.trim();
    const plate = document.getElementById("busPlate").value.trim();
    const driverName = document.getElementById("driverName").value.trim();
    const driverContact = document.getElementById("driverContact").value.trim();
    const dest = document.getElementById("busDest").value.trim() || "Bansal College Campus";
    const stopsRaw = document.getElementById("busStops").value;
    const stops = stopsRaw.split(",").map(s => s.trim()).filter(s => s.length > 0);

    if (!no || !plate || !driverName || !driverContact || stops.length === 0) {
        alert("Please fill in all required fields.");
        return;
    }

    let buses = getBuses();

    if (editingBusId) {
        buses = buses.map(b => b.id === editingBusId ? { id: editingBusId, no, plate, driverName, driverContact, stops, dest } : b);
        editingBusId = null;
        if (formTitle) formTitle.textContent = "Add New Bus Route";
        if (cancelEditBtn) cancelEditBtn.style.display = "none";
    } else {
        const newBus = { id: Date.now(), no, plate, driverName, driverContact, stops, dest };
        buses.push(newBus);
    }

    saveBuses(buses);
    busForm.reset();
    renderAdminBuses();
});

window.editBus = function(id) {
    const buses = getBuses();
    const bus = buses.find(b => b.id === id);
    if (!bus) return;

    editingBusId = id;
    document.getElementById("busNo").value = bus.no;
    document.getElementById("busPlate").value = bus.plate;
    document.getElementById("driverName").value = bus.driverName;
    document.getElementById("driverContact").value = bus.driverContact;
    document.getElementById("busDest").value = bus.dest;
    document.getElementById("busStops").value = bus.stops.join(", ");

    if (formTitle) formTitle.textContent = "Edit Bus Route";
    if (cancelEditBtn) cancelEditBtn.style.display = "inline-block";
};

window.deleteBus = function(id) {
    if (!confirm("Are you sure you want to delete this bus route?")) return;
    let buses = getBuses();
    buses = buses.filter(b => b.id !== id);
    saveBuses(buses);
    renderAdminBuses();
};

cancelEditBtn?.addEventListener("click", () => {
    editingBusId = null;
    busForm.reset();
    if (formTitle) formTitle.textContent = "Add New Bus Route";
    cancelEditBtn.style.display = "none";
});

if (localStorage.getItem("adminSession") === "true") {
    showAdminContent();
} else {
    showAdminLogin();
}
