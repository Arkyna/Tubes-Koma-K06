const API_URL = "https://backend-service-255243454378.asia-southeast2.run.app";

async function loadReports() {
    const res = await fetch(`${API_URL}/reports`);
    const data = await res.json();

    const container = document.getElementById("reports");

    if (data.length === 0) {
        container.innerHTML = "<p>No reports yet.</p>";
        return;
    }

    container.innerHTML = data.map(r => `
        <div>
            <h3>${r.title}</h3>
            <p>${r.description}</p>
            <p><strong>${r.facility}</strong> — ${r.status}</p>
        </div>
    `).join("");
}

loadReports();
