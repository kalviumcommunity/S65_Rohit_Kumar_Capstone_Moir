import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import userRoutes from './routes/user.routes';
import connectDB from './config/db';
// No need for mongoose if you're not using it yet

const app = express();
const PORT = process.env.PORT || 3000;

// Configure CORS for cross-origin requests
app.use(cors({
  origin: '*', // Allow all origins for now
  methods: ['GET', 'POST'], // Allow GET and POST for now
}));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Routes
app.use('/api/users', userRoutes);

// Default route
app.get('/', (_req, res) => {
  res.send('MOIR API is running');
});

// Health check route
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to the database:', err);
  });

// Error handling middleware - note the parameter is renamed to _next since it's not used
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});