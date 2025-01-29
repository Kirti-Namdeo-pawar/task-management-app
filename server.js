const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/task_management')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Error connecting to MongoDB:', err));

// Define Task Schema
const taskSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    completed: { type: Boolean, default: false },
    start_date: { type: Date, required: true },
    end_date: { type: Date, required: true },
    priority: { type: String, required: true },
    category: { type: String, default: 'None' },
    done: { type: Boolean, default: false }, // Ensure this field is included for task status
    repeat: { type: String, enum: ['No Repeat', 'Daily', 'Weekly', 'Monthly'], default: 'No Repeat' },
});

const Task = mongoose.model('Task', taskSchema);

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// Route to serve pomodoro.html
app.get('/pomodoro', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pomodoro.html'));
});
// Route to serve pomodoro.html
app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});
// API Routes

// Get all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        const tasks = await Task.find();
        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// Add a new task
app.post('/api/tasks', async (req, res) => {
    try {
        const taskData = req.body;
        taskData.repeat = taskData.repeat || 'No Repeat'; // Default to 'No Repeat'
        
        const task = new Task(taskData);
        await task.save();
        res.status(201).json(task);
    } catch (error) {
        res.status(400).json({ error: 'Failed to add task', details: error.message });
    }
});



// Update a task
app.put('/api/tasks/:id', async (req, res) => {
    try {
        const task = await Task.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(task);
    } catch (error) {
        res.status(400).json({ error: 'Failed to update task' });
    }
});

// Delete a task
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const task = await Task.findByIdAndDelete(req.params.id);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// Update task status (mark as done)
// Example function to mark a task as done and handle repetition
/*app.patch('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { done } = req.body;

        const updatedTask = await Task.findByIdAndUpdate(
            id,
            { done },
            { new: true }
        );

        if (!updatedTask) return res.status(404).send('Task not found');

        // If the task is done and not repeating, delete it
        if (done && updatedTask.repeat === 'No Repeat') {
            await Task.findByIdAndDelete(id);
            console.log(`Deleted completed task: ${updatedTask.title}`);
        } else if (done && updatedTask.repeat !== 'No Repeat') {
            await handleTaskRepetition(updatedTask); // Handle repeating tasks
        }

        res.status(200).json(updatedTask);
    } catch (error) {
        res.status(500).send('Error updating task status');
    }
});
*/
// Function to delete expired or completed tasks
async function deleteExpiredOrCompletedTasks() {
    const currentTime = new Date();
    try {
        console.log("Running task deletion at:", currentTime);

        const tasksToDelete = await Task.find({
            $or: [
                { end_date: { $lte: currentTime }, repeat: 'No Repeat' }, // Expired tasks
                { done: true, repeat: 'No Repeat' }, // Completed non-repeating tasks
            ],
        });

        if (tasksToDelete.length === 0) {
            console.log("No tasks found for deletion.");
            return;
        }

        console.log(`Found ${tasksToDelete.length} tasks for deletion.`);

        for (const task of tasksToDelete) {
            await Task.findByIdAndDelete(task._id);
            console.log(`Deleted task: ${task.title}`);
        }
    } catch (error) {
        console.error('Error deleting tasks:', error);
    }
}

// Call this function every hour
setInterval(deleteExpiredOrCompletedTasks, 3600000); // Check once an hour


// Update task status (mark as done)
app.patch('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { done } = req.body;

        const updatedTask = await Task.findByIdAndUpdate(
            id,
            { done },
            { new: true }
        );

        if (!updatedTask) return res.status(404).send('Task not found');

        console.log(`Task marked as done: ${updatedTask.title}`);

        // If the task is done and not repeating, delete it immediately
        if (done && updatedTask.repeat === 'No Repeat') {
            await Task.findByIdAndDelete(id);
            console.log(`Deleted completed task: ${updatedTask.title}`);
        } else if (done && updatedTask.repeat !== 'No Repeat') {
            await handleTaskRepetition(updatedTask); // Handle repeating tasks
        }

        res.status(200).json(updatedTask);
    } catch (error) {
        console.error('Error updating task status:', error);
        res.status(500).send('Error updating task status');
    }
});


app.get('/api/test-delete', async (req, res) => {
    try {
        await deleteExpiredOrCompletedTasks();
        res.send('Task deletion run successfully.');
    } catch (error) {
        res.status(500).send('Error running task deletion.');
    }
});

// Start Server
app.listen(3000, () => console.log('Server running on http://localhost:3000'));
