const apiBase = 'http://localhost:3000/api/tasks';

// Show or hide custom category input
document.getElementById('category').addEventListener('change', (e) => {
    const customCategoryInput = document.getElementById('custom-category');
    if (e.target.value === 'Other') {
        customCategoryInput.style.display = 'block';
    } else {
        customCategoryInput.style.display = 'none';
    }
});

// Schedule Pomodoro for a task
function schedulePomodoro(startDate, taskId) {
    const currentTime = new Date().getTime();
    const startTime = new Date(startDate).getTime();
if (isNaN(startTime)) {
    console.warn('Invalid start date. Skipping Pomodoro setup.');
    return;
}


    const delay = startTime - currentTime;

    if (delay > 0) {
        setTimeout(() => {
            const startTimer = confirm(`Would you like to start the Pomodoro timer for Task ID: ${taskId} now?`);
            if (startTimer) {
                startPomodoroTimer(taskId);
            }
        }, delay);
    } else {
        console.warn('Start date is in the past. Skipping timer setup.');
    }
}

// Start Pomodoro Timer
function startPomodoroTimer(taskId) {
    let remainingTime = 25 * 60; // Default to 25 minutes
    let timerInterval;

    const timerContainer = document.createElement('div');
    timerContainer.id = `pomodoro-timer-${taskId}`;
    timerContainer.className = 'pomodoro-timer';
    timerContainer.innerHTML = `
        <p>Task ${taskId} Timer - Remaining: <span id="timer-display-${taskId}"></span></p>
        <button id="pause-${taskId}" class="btn btn-warning">Pause</button>
        <button id="resume-${taskId}" class="btn btn-success" style="display: none;">Resume</button>
        <button id="stop-${taskId}" class="btn btn-danger">Stop</button>
    `;
    document.body.appendChild(timerContainer);

    function updateTimerDisplay() {
        const minutes = Math.floor(remainingTime / 60);
        const seconds = remainingTime % 60;
        document.getElementById(`timer-display-${taskId}`).textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    function startInterval() {
        timerInterval = setInterval(() => {
            if (remainingTime > 0) {
                remainingTime--;
                updateTimerDisplay();
            } else {
                clearInterval(timerInterval);
                alert(`Task ${taskId} Pomodoro session complete!`);
                timerContainer.remove();
            }
        }, 1000);
    }

    // Initialize Timer
    updateTimerDisplay();
    startInterval();

    // Pause Timer
    document.getElementById(`pause-${taskId}`).addEventListener('click', () => {
        clearInterval(timerInterval);
        document.getElementById(`pause-${taskId}`).style.display = 'none';
        document.getElementById(`resume-${taskId}`).style.display = 'inline-block';
    });

    // Resume Timer
    document.getElementById(`resume-${taskId}`).addEventListener('click', () => {
        startInterval();
        document.getElementById(`resume-${taskId}`).style.display = 'none';
        document.getElementById(`pause-${taskId}`).style.display = 'inline-block';
    });

    // Stop Timer
    document.getElementById(`stop-${taskId}`).addEventListener('click', () => {
        clearInterval(timerInterval);
        timerContainer.remove();
    });
}

// Fetch and display tasks
async function fetchTasks() {
    try {
        const response = await fetch(apiBase);
        const tasks = await response.json();
        const taskList = document.getElementById('task-list');
        taskList.innerHTML = tasks
            .map(
                (task) => `
                <tr class="${getPriorityClass(task.priority)}">
                    <th scope="row">
                        <input type="checkbox" id="checkbox-${task._id}">
                    </th>
                    <td>${task.title}</td>
                    <td>${task.start_date ? new Date(task.start_date).toLocaleString() : 'No Start Date'}</td>
                    <td>${task.end_date ? new Date(task.end_date).toLocaleString() : 'No Due Date'}</td>
                    <td>${task.priority}</td>
                </tr>
            `
            )
            .join('');
        
    } catch (error) {
        console.error('Error fetching tasks:', error);
    }
}

document.getElementById('task-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('title').value;
    const description = document.getElementById('description').value;
    const start_date = document.getElementById('start').value;
    const end_date = document.getElementById('end').value;
    const priority = document.getElementById('priority').value;
    const category =
        document.getElementById('category').value === 'Other'
            ? document.getElementById('custom-category').value || 'Uncategorized'
            : document.getElementById('category').value;
    const pomodoroYes = document.getElementById('pomoyes').checked;
    const repeat = document.getElementById('repeat').value;

    const task = { title, description, start_date, end_date, priority, category, repeat };
    console.log('Submitting task:', task);

    try {
        const response = await fetch(apiBase, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(task),
        });

        if (response.ok) {
            const savedTask = await response.json();
            console.log('Task added successfully:', savedTask);
            document.getElementById('task-form').reset();
            fetchTasks(); // Refresh the task list
            if (pomodoroYes) {
                schedulePomodoro(start_date, savedTask._id); // Schedule Pomodoro
            }
        } else {
            console.error('Failed to add task:', await response.text());
        }
    } catch (error) {
        console.error('Error adding task:', error);
    }
});

// Get priority class
function getPriorityClass(priority) {
    if (priority === 'High') return 'priority-high';
    if (priority === 'Medium') return 'priority-medium';
    if (priority === 'Low') return 'priority-low';
    return '';
}

// Initial Fetch of Tasks
fetchTasks();
document.addEventListener('DOMContentLoaded', () => {
   

    // Fetch and update the task sections
    // Fetch and update tasks sections, delete tasks if necessary
async function fetchAndUpdateTaskProgress() {
    try {
        const response = await fetch(apiBase);
        const tasks = await response.json();

        const toDoTable = document.getElementById('todo-tasks');
        const inProgressTable = document.getElementById('in-progress-tasks');
        const doneTable = document.getElementById('done-tasks');

        // Clear all sections
        [toDoTable, inProgressTable, doneTable].forEach(table => (table.innerHTML = ''));

        const currentTime = new Date().getTime();

        tasks.forEach(async (task) => {
            const startTime = new Date(task.start_date).getTime();
            const endTime = task.end_date ? new Date(task.end_date).getTime() : Infinity;

            if (task.done) {
                // Handle repeated tasks (delete non-repeating ones)
                if (task.repeat === 'No Repeat') {
                    await deleteTaskIfExpired(task, currentTime); // Delete task if expired or marked as done and non-repeating
                } else {
                    addTaskToSection(task, doneTable, 'Done');
                }
            } else if (currentTime >= startTime && currentTime <= endTime) {
                addTaskToSection(task, inProgressTable, 'In Progress');
            } else {
                addTaskToSection(task, toDoTable, 'To-Do');
            }
        });
    } catch (error) {
        console.error('Error fetching tasks:', error);
    }
}

// Delete task from database if its end date has passed or if it's done and non-repeating
async function deleteTaskIfExpired(task, currentTime) {
    try {
        const endTime = new Date(task.end_date).getTime();
        if (endTime <= currentTime) {
            await deleteTask(task._id);
        }
    } catch (error) {
        console.error('Failed to delete task:', error);
    }
}

// Delete task from backend
async function deleteTask(taskId) {
    try {
        const response = await fetch(`${apiBase}/${taskId}`, { method: 'DELETE' });
        if (!response.ok) throw new Error(await response.text());
    } catch (error) {
        console.error('Failed to delete task:', error);
    }
}

// Continue with other code...


    // Add task to the respective section
    function addTaskToSection(task, sectionElement, status) {
        const row = document.createElement('tr');
        row.className = getPriorityClass(task.priority);

        row.innerHTML = `
            <td>
                <input type="checkbox" id="checkbox-${task._id}" ${status === 'Done' ? 'checked' : ''}>
            </td>
            <td>${task.title}</td>
            <td>${task.repeat}</td>
        `;

        const checkbox = row.querySelector(`#checkbox-${task._id}`);
        checkbox.addEventListener('change', async () => {
            if (checkbox.checked) {
                const confirmMove = confirm(`Move "${task.title}" to Done?`);
                if (confirmMove) {
                    await updateTaskStatus(task._id, true);
                    fetchAndUpdateTaskProgress(); // Refresh the UI
                } else {
                    checkbox.checked = false; // Revert if not confirmed
                }
            }
        });

        sectionElement.appendChild(row);
    }

    // Schedule task repetition
    function scheduleRepetition(task, delay) {
        setTimeout(async () => {
            await updateTaskStatus(task._id, false); // Move back to "To-Do"
            fetchAndUpdateTaskProgress(); // Refresh UI
        }, delay);
    }

    // Update task status in the backend
    async function updateTaskStatus(taskId, isDone) {
        try {
            const response = await fetch(`${apiBase}/${taskId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ done: isDone }),
            });

            if (!response.ok) throw new Error(await response.text());
        } catch (error) {
            console.error('Failed to update task status:', error);
        }
    }

    // Handle task repetition logic
    async function handleTaskRepetition(task) {
        if (task.repeat === 'No Repeat') return;

        const currentTime = new Date().getTime();
        const endDate = new Date(task.end_date).getTime();

        if (currentTime >= endDate) return;

        const newTask = createRepeatedTask(task);
        await saveTaskToBackend(newTask);
    }

    // Create a new repeated task instance
    function createRepeatedTask(task) {
        const newStartDate = new Date(task.start_date);
        const newEndDate = new Date(task.end_date);

        if (task.repeat === 'Daily') {
            newStartDate.setDate(newStartDate.getDate() + 1);
            newEndDate.setDate(newEndDate.getDate() + 1);
        } else if (task.repeat === 'Weekly') {
            newStartDate.setDate(newStartDate.getDate() + 7);
            newEndDate.setDate(newEndDate.getDate() + 7);
        } else if (task.repeat === 'Monthly') {
            newStartDate.setMonth(newStartDate.getMonth() + 1);
            newEndDate.setMonth(newEndDate.getMonth() + 1);
        }

        return {
            ...task,
            start_date: newStartDate,
            end_date: newEndDate,
            done: false,
        };
    }

    // Save a task to the backend
    async function saveTaskToBackend(task) {
        try {
            const response = await fetch(apiBase, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(task),
            });

            if (!response.ok) throw new Error(await response.text());
        } catch (error) {
            console.error('Failed to save task:', error);
        }
    }

    // Delete task from backend
    /*async function deleteTask(taskId) {
        try {
            const response = await fetch(`${apiBase}/${taskId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error(await response.text());
        } catch (error) {
            console.error('Failed to delete task:', error);
        }
    }
*/
    // Monitor expired tasks and update sections
    function monitorExpiredTasks() {
        setInterval(async () => {
            const response = await fetch(apiBase);
            const tasks = await response.json();
            const currentTime = new Date().getTime();

            for (const task of tasks) {
                if (!task.done && task.end_date && new Date(task.end_date).getTime() <= currentTime) {
                    await updateTaskStatus(task._id, true); // Mark as done
                }
            }

            fetchAndUpdateTaskProgress(); // Refresh the UI
        }, 60000);
    }

    // Initialize the task system
    fetchAndUpdateTaskProgress();
    monitorExpiredTasks();
});

document.getElementById('darkModeToggle').addEventListener('change', function () {
    document.body.classList.toggle('dark-mode', this.checked);
  });

  
async function fetchAndVisualizeTaskData() {
    try {
        const response = await fetch(apiBase);
        const tasks = await response.json();

        const today = new Date();
        const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay())); // Sunday

        const dailyStats = { ToDo: 0, InProgress: 0, Done: 0 };
        const weeklyStats = { ToDo: 0, InProgress: 0, Done: 0 };

        const currentTime = new Date().getTime();

        for (const task of tasks) {
            const startDate = new Date(task.start_date).getTime();
            const endDate = task.end_date ? new Date(task.end_date).getTime() : Infinity;

            if (task.done) {
                if (new Date(task.start_date).toDateString() === new Date().toDateString()) {
                    dailyStats.Done++;
                }
                if (new Date(task.start_date) >= startOfWeek) {
                    weeklyStats.Done++;
                }
            } else if (currentTime >= startDate && currentTime <= endDate) {
                if (new Date(task.start_date).toDateString() === new Date().toDateString()) {
                    dailyStats.InProgress++;
                }
                if (new Date(task.start_date) >= startOfWeek) {
                    weeklyStats.InProgress++;
                }
            } else {
                if (new Date(task.start_date).toDateString() === new Date().toDateString()) {
                    dailyStats.ToDo++;
                }
                if (new Date(task.start_date) >= startOfWeek) {
                    weeklyStats.ToDo++;
                }
            }
        }

        const dailyTotal = dailyStats.ToDo + dailyStats.InProgress + dailyStats.Done;
        const weeklyTotal = weeklyStats.ToDo + weeklyStats.InProgress + weeklyStats.Done;

        const dailyPercentages = {
            ToDo: ((dailyStats.ToDo / dailyTotal) * 100).toFixed(2),
            InProgress: ((dailyStats.InProgress / dailyTotal) * 100).toFixed(2),
            Done: ((dailyStats.Done / dailyTotal) * 100).toFixed(2),
        };

        const weeklyPercentages = {
            ToDo: ((weeklyStats.ToDo / weeklyTotal) * 100).toFixed(2),
            InProgress: ((weeklyStats.InProgress / weeklyTotal) * 100).toFixed(2),
            Done: ((weeklyStats.Done / weeklyTotal) * 100).toFixed(2),
        };

        renderDailyBarChart(dailyPercentages);
        renderWeeklyPieChart(weeklyPercentages);
    } catch (error) {
        console.error('Error fetching tasks:', error);
    }
}

// Render daily bar chart
function renderDailyBarChart(percentages) {
    const ctx = document.getElementById('dailyProgressChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['To-Do', 'In Progress', 'Done'],
            datasets: [
                {
                    label: 'Task Distribution (%)',
                    data: [percentages.ToDo, percentages.InProgress, percentages.Done],
                    backgroundColor: ['#f39c12', '#3498db', '#2ecc71'],
                    borderWidth: 1,
                },
            ],
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                },
            },
        },
    });
}

// Render weekly pie chart
function renderWeeklyPieChart(percentages) {
    const ctx = document.getElementById('weeklyProgressChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['To-Do', 'In Progress', 'Done'],
            datasets: [
                {
                    data: [percentages.ToDo, percentages.InProgress, percentages.Done],
                    backgroundColor: ['#f39c12', '#3498db', '#2ecc71'],
                },
            ],
        },
    });
}

// Initialize visualization
fetchAndVisualizeTaskData();

document.addEventListener('DOMContentLoaded', function () {
    const calendarElement = document.getElementById('taskPlannerCalendar');
    const taskListElement = document.getElementById('taskListViewer');

    // Initialize FullCalendar
    const calendar = new FullCalendar.Calendar(calendarElement, {
        initialView: 'dayGridMonth',
        dateClick: function (info) {
            const selectedDate = info.dateStr; // Get selected date in YYYY-MM-DD format
            loadTasksForDate(selectedDate);
        },
    });

    // Render the calendar
    calendar.render();

    // Fetch tasks for a specific date
    async function loadTasksForDate(date) {
        try {
            const response = await fetch(`${apiBase}?date=${date}`);
            if (response.ok) {
                const tasks = await response.json();
                updateTaskViewer(tasks);
            } else {
                console.error(`Error fetching tasks: ${response.status}`);
                taskListElement.innerHTML = '<li>Error fetching tasks</li>';
            }
        } catch (error) {
            console.error('Error fetching tasks:', error);
            taskListElement.innerHTML = '<li>Error fetching tasks</li>';
        }
    }

    // Update task list UI
    function updateTaskViewer(tasks) {
        const taskListElement = document.getElementById('taskListViewer');
        taskListElement.innerHTML = ''; // Clear previous tasks
    
        if (tasks.length === 0) {
            taskListElement.innerHTML = '<p class="no-tasks">No tasks available for this date</p>';
            return;
        }
    
        tasks.forEach((task) => {
            const taskCard = document.createElement('div');
            taskCard.className = 'col-md-12'; // Adjust for full-width cards
            taskCard.innerHTML = `
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title">${task.title}</h5>
                        
                        <p class="card-text"><strong>End:</strong> ${
                            task.end_date ? new Date(task.end_date).toLocaleString() : 'Not set'
                        }</p>
                    </div>
                    <div class="card-footer">
                        <button class="btn btn-primary btn-sm">View Details</button>
                    </div>
                </div>
            `;
            taskListElement.appendChild(taskCard);
        });
    }
})
/*
document.addEventListener("DOMContentLoaded", () => {
    const toggleButton = document.getElementById("toggleTaskFormBtn");
    const taskFormContainer = document.getElementById("taskFormContainer");

    toggleButton.addEventListener("click", () => {
        if (taskFormContainer.style.display === "none") {
            taskFormContainer.style.display = "block";
            toggleButton.textContent = "Hide Task Form";
        } else {
            taskFormContainer.style.display = "none";
            toggleButton.textContent = "Add New Task";
        }
    });
});
*/
document.addEventListener('DOMContentLoaded', () => {
    const taskViewer = document.getElementById('selectedTaskViewer');
    const closeTaskViewer = document.getElementById('closeTaskViewer');

    // Hide task viewer on close button click
    closeTaskViewer.addEventListener('click', () => {
        taskViewer.style.display = 'none';
    });
    document.getElementById('taskPlannerCalendar').addEventListener('click', () => {
        taskViewer.style.display = 'block';
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const startPomodoro = document.getElementById('startPomodoro');
    const timerDisplay = document.getElementById('timerDisplay');
    const pausePomodoro = document.getElementById('pausePomodoro');
    const resetPomodoro = document.getElementById('resetPomodoro');
    const pomodoroTimer = document.getElementById('pomodoroTimer');

    let timerInterval;
    let isRunning = false;
    let timeLeft = 25 * 60; // Default Pomodoro time in seconds

    // Update timer display
    function updateDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplay.textContent = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    // Start timer
    startPomodoro.addEventListener('click', () => {
        if (!isRunning) {
            pomodoroTimer.style.display = 'block'; // Show timer UI
            timerInterval = setInterval(() => {
                if (timeLeft > 0) {
                    timeLeft--;
                    updateDisplay();
                } else {
                    clearInterval(timerInterval);
                    alert('Pomodoro complete! Take a short break.');
                }
            }, 1000);
            isRunning = true;
        }
    });

    // Pause timer
    pausePomodoro.addEventListener('click', () => {
        if (isRunning) {
            clearInterval(timerInterval);
            isRunning = false;
        }
    });

    // Reset timer
    resetPomodoro.addEventListener('click', () => {
        clearInterval(timerInterval);
        timeLeft = 25 * 60; // Reset to 25 minutes
        updateDisplay();
        isRunning = false;
    });

    // Initialize timer display
    updateDisplay();
});
document.addEventListener('DOMContentLoaded', () => {
    // Display current date and time
    const currentDateTimeElement = document.getElementById('currentDateTime');
    function updateDateTime() {
        const now = new Date();
        currentDateTimeElement.textContent = now.toLocaleString();
    }
    setInterval(updateDateTime, 1000);

    // Fetch a random quote
    const quoteText = document.getElementById('quoteText');
    const quoteAuthor = document.getElementById('quoteAuthor');
    async function fetchQuote() {
        try {
            const response = await fetch('https://type.fit/api/quotes');
            const quotes = await response.json();
            const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
            quoteText.textContent = randomQuote.text;
            quoteAuthor.textContent = randomQuote.author || 'Unknown';
        } catch (error) {
            console.error('Error fetching quote:', error);
        }
    }
    fetchQuote();
/*
    // Fetch and render tasks as cards
    async function fetchTasks() {
        try {
            const response = await fetch(apiBase);
            const tasks = await response.json();
            const taskCards = document.getElementById('taskCards');
            taskCards.innerHTML = tasks
                .map(
                    (task) => `
                    <div class="col-md-4 mb-4">
                        <div class="card shadow">
                            <div class="card-body">
                                <h5 class="card-title">${task.title}</h5>
                                <p class="card-text text-muted">${task.description || 'No description'}</p>
                                <p class="card-text"><strong>Priority:</strong> ${task.priority}</p>
                                <p class="card-text">
                                    <strong>Due:</strong> ${
                                        task.end_date
                                            ? new Date(task.end_date).toLocaleString()
                                            : 'No due date'
                                    }
                                </p>
                            </div>
                        </div>
                    </div>
                `
                )
                .join('');
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    }
    fetchTasks(); */
});
const renderTasksForSelectedDate = (tasks) => {
    const taskListViewer = document.getElementById('taskListViewer');
    taskListViewer.innerHTML = tasks
        .map(
            (task) => `
            <div class="col-md-6">
                <div class="card task-card">
                    <div class="card-body">
                        <h5 class="task-card-title">${task.title}</h5>
                        <span class="${getPriorityClass(task.priority)}">${task.priority}</span>
                        <p class="task-card-text">
                            <strong>Start:</strong> ${
                                task.start_date ? new Date(task.start_date).toLocaleString() : 'No Start Date'
                            }
                        </p>
                        <p class="task-card-text">
                            <strong>Due:</strong> ${
                                task.end_date ? new Date(task.end_date).toLocaleString() : 'No Due Date'
                            }
                        </p>
                        <p class="task-card-text">${task.description || 'No Description'}</p>
                    </div>
                </div>
            </div>
        `
        )
        .join('');
};
