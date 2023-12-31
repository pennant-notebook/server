import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
// import { fileURLToPath } from 'url';
// import { dirname } from 'path';
import { authRouter, apiRouter } from './routes';

const app = express();

app.use(cors());

app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Set-Cookie', ['SameSite=Strict;Secure;Path=/']);
  next();
});

app.use(express.json());

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

if (process.env.NODE_ENV !== 'development') {
  app.use(express.static(path.join(__dirname, '../../client/dist')));
}

app.use('/api', apiRouter);
app.use('/auth', authRouter);

app.post('/api/hocuspocus', (req: Request, res: Response) => {
  const event = req.body.event;
  const payload = req.body.payload;

  console.log(`Received ${event} event with payload:`, payload);

  res.status(200).send('OK');
});

if (process.env.NODE_ENV !== 'development') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => console.log(`Pennant Express cruising on port: ${PORT}`));
