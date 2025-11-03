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
    const nameIdx = header.indexOf('name');
    if (nameIdx === -1) throw new Error('CSV must have a "name" header');

    // All columns except "name" are task columns (supports any number of task columns)
    const taskIdxs = header
        .map((h, i) => ({ h, i }))
        .filter(({ i }) => i !== nameIdx)
        .map(({ i }) => i);

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(',').map(c => c.trim());
        const user = cols[nameIdx];
        if (!user) continue;

        for (const ti of taskIdxs) {
            const task = cols[ti] || '';
            if (task) rows.push({ user, task });
        }
    }
    return rows;
}

function parseDescriptionsCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length === 0) return new Map();
    
    const header = lines[0].split(',').map(h => h.trim());
    const tareaIdx = header.findIndex(h => h.toLowerCase() === 'tarea');
    const detalleIdx = header.findIndex(h => h.toLowerCase() === 'detalle');
    const diaIdx = header.findIndex(h => h.toLowerCase() === 'dia');
    
    if (tareaIdx === -1 || detalleIdx === -1 || diaIdx === -1) {
        throw new Error('descriptions.csv must have "Tarea", "Detalle", and "Dia" columns');
    }
    
    const map = new Map();
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Handle CSV with quoted fields that may contain commas
        const cols = [];
        let current = '';
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                cols.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        cols.push(current.trim()); // Last column
        
        const tarea = cols[tareaIdx] || '';
        const detalle = cols[detalleIdx] || '';
        const dia = cols[diaIdx] || '';
        
        if (tarea) {
            map.set(tarea, { detalle, dia });
        }
    }
    return map;
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

function renderTasks(listEl, tasks, descriptionsMap) {
    listEl.innerHTML = '';
    (tasks || []).forEach(task => {
        const li = document.createElement('li');
        li.textContent = task;
        li.setAttribute('role', 'button');
        li.setAttribute('tabindex', '0');
        li.classList.add('task-item');
        
        // Add click/tap handler
        li.addEventListener('click', () => showTaskDetails(task, descriptionsMap));
        li.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showTaskDetails(task, descriptionsMap);
            }
        });
        
        listEl.appendChild(li);
    });
}

function showTaskDetails(taskName, descriptionsMap) {
    const modal = document.getElementById('modalOverlay');
    const taskNameEl = document.getElementById('modalTaskName');
    const timeEl = document.getElementById('modalTime');
    const descEl = document.getElementById('modalDescription');
    
    const details = descriptionsMap.get(taskName);
    
    taskNameEl.textContent = taskName;
    timeEl.textContent = details ? details.dia : 'Tiempo no especificado';
    descEl.textContent = details ? details.detalle : 'Descripción no disponible';
    
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('modalOverlay');
    modal.setAttribute('aria-hidden', 'true');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

const userInput = document.getElementById('userInput');
const userList = document.getElementById('userList');
const taskList = document.getElementById('taskList');

let tasksByUser = new Map();
let lowerToKey = new Map();
let descriptionsMap = new Map();

function updateFromInput() {
    const val = (userInput.value || '').trim().toLowerCase();
    const key = lowerToKey.get(val);
    if (key) {
        renderTasks(taskList, tasksByUser.get(key), descriptionsMap);
    } else {
        taskList.innerHTML = '';
    }
}

userInput.addEventListener('input', updateFromInput);
userInput.addEventListener('change', updateFromInput);

// Modal close handlers
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.querySelector('.modal-close');

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay.classList.contains('active')) {
        closeModal();
    }
});

(async function init() {
    try {
        // Load both CSVs in parallel
        const [tasksRows, descriptionsText] = await Promise.all([
            loadCSV('tasks.csv'),
            fetch('descriptions.csv', { cache: 'no-store' }).then(r => r.ok ? r.text() : Promise.reject(new Error('Failed to load descriptions.csv')))
        ]);
        
        tasksByUser = groupTasksByUser(tasksRows);
        descriptionsMap = parseDescriptionsCSV(descriptionsText);
        
        populateUserDatalist(userList, tasksByUser.keys());
        // Build case-insensitive lookup from displayed (capitalized) values and raw keys
        lowerToKey = new Map();
        for (const key of tasksByUser.keys()) {
            lowerToKey.set(key.toLowerCase(), key);
            lowerToKey.set(capitalize(key).toLowerCase(), key);
        }
    } catch (err) {
        console.error('Error loading data:', err);
        renderTasks(taskList, [`Error: ${err.message}`], new Map());
    }
})();