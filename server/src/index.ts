import express, { Request, Response } from 'express';
import path from 'path';

const app = express();
// Use the PORT environment variable provided by Replit, or default to 3001
const PORT = process.env.PORT || 3001;

// --- API Routes ---
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).send({ status: 'Integrated server is running' });
});

// --- Static Asset Serving ---
// This serves the built React app from the client/dist folder
app.use(express.static(path.join(__dirname, '..', '..', 'client', 'dist')));

// --- Client-Side Routing Fallback ---
// For any request that doesn't match an API route or a static file,
// send the main index.html file. This is crucial for React Router.
app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '..', '..', 'client', 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`KGCPR Integrated Server is now listening on port ${PORT}`);
});