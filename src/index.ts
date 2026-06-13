import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { taskRoutes } from './routes/taskRoutes';
import { ruleRoutes } from './routes/ruleRoutes';
import { resultRoutes } from './routes/resultRoutes';
import { alertRoutes } from './routes/alertRoutes';
import { issueRoutes } from './routes/issueRoutes';
import { scheduler } from './scheduler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/tasks', taskRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/issues', issueRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  scheduler.start();
});