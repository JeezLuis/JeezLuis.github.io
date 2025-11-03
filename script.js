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

function capitalize(s) {
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function populateUserDatalist(datalistEl, users) {
    datalistEl.innerHTML = '';
    Array.from(users).sort((a, b) => a.localeCompare(b)).forEach(user => {
        const opt = document.createElement('option');
        opt.value = capitalize(user);
        datalistEl.appendChild(opt);
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

const userInput = document.getElementById('userInput');
const userList = document.getElementById('userList');
const taskList = document.getElementById('taskList');

let tasksByUser = new Map();
let lowerToKey = new Map();

function updateFromInput() {
    const val = (userInput.value || '').trim().toLowerCase();
    const key = lowerToKey.get(val);
    if (key) {
        renderTasks(taskList, tasksByUser.get(key));
    } else {
        taskList.innerHTML = '';
    }
}

userInput.addEventListener('input', updateFromInput);
userInput.addEventListener('change', updateFromInput);

(async function init() {
    try {
        const rows = await loadCSV('tasks.csv');
        tasksByUser = groupTasksByUser(rows);
        populateUserDatalist(userList, tasksByUser.keys());
        // Build case-insensitive lookup from displayed (capitalized) values and raw keys
        lowerToKey = new Map();
        for (const key of tasksByUser.keys()) {
            lowerToKey.set(key.toLowerCase(), key);
            lowerToKey.set(capitalize(key).toLowerCase(), key);
        }
    } catch (err) {
        console.error(err);
        renderTasks(taskList, [`Error: ${err.message}`]);
    }
})();