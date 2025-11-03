const tasks = {
    alice: ["Buy groceries", "Call Bob", "Finish report"],
    bob: ["Review PRs", "Update documentation"],
    carol: ["Plan meeting", "Send invoices", "Book flights"]
};

const userSelect = document.getElementById('userSelect');
const taskList = document.getElementById('taskList');

userSelect.addEventListener('change', function() {
    const selectedUser = userSelect.value;
    taskList.innerHTML = '';
    if (tasks[selectedUser]) {
        tasks[selectedUser].forEach(task => {
            const li = document.createElement('li');
            li.textContent = task;
            taskList.appendChild(li);
        });
    }
});