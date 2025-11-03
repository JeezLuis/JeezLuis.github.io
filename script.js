async function loadCSV(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    const text = await res.text();
    return parseCSV(text);
}

function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length === 0) return [];
    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const userIdx = header.indexOf('user');
    const taskIdx = header.indexOf('task');
    if (userIdx === -1 || taskIdx === -1) throw new Error('CSV must have "user" and "task" headers');

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        // Basic CSV split (no quoted fields). If you need quotes/commas in fields, consider a CSV lib.
        const cols = line.split(',').map(c => c.trim());
        const user = cols[userIdx];
        const task = cols[taskIdx];
        if (user) rows.push({ user, task });
    }
    return rows;
}

function groupTasksByUser(rows) {
    const map = new Map();
    rows.forEach(({ user, task }) => {
        if (!map.has(user)) map.set(user, []);
        if (task) map.get(user).push(task);
    });
    return map;
}

function populateUsers(selectEl, users) {
    // Clear existing (keep placeholder)
    selectEl.querySelectorAll('option:not([value=""])').forEach(opt => opt.remove());
    Array.from(users).sort((a, b) => a.localeCompare(b)).forEach(user => {
        const opt = document.createElement('option');
        opt.value = user;
        opt.textContent = user.charAt(0).toUpperCase() + user.slice(1);
        selectEl.appendChild(opt);
    });
}

function renderTasks(listEl, tasks) {
    listEl.innerHTML = '';
    (tasks || []).forEach(task => {
        const li = document.createElement('li');
        li.textContent = task;
        listEl.appendChild(li);
    });
}

const userSelect = document.getElementById('userSelect');
const taskList = document.getElementById('taskList');

let tasksByUser = new Map();

userSelect.addEventListener('change', function() {
    const selectedUser = userSelect.value;
    renderTasks(taskList, tasksByUser.get(selectedUser));
});

(async function init() {
    try {
        const rows = await loadCSV('tasks.csv');
        tasksByUser = groupTasksByUser(rows);
        populateUsers(userSelect, tasksByUser.keys());
    } catch (err) {
        console.error(err);
        renderTasks(taskList, [`Error: ${err.message}`]);
    }
})();