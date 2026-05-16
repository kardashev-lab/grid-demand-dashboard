// express app, kept separate from index.ts so tests don't start a server

import path from 'path';
import express from 'express';
import cors from 'cors';
import { getLatest, getHistory } from './store';

export function createApp(staticDir?: string) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Lightweight path for platform probes (Railway). Keeps checks off /api/* and SPA fallbacks.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  app.head('/health', (_req, res) => {
    res.status(200).end();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });
  app.head('/api/health', (_req, res) => {
    res.status(200).end();
  });

  app.get('/api/demand', (_req, res) => {
    res.json(getLatest());
  });

  app.get('/api/demand/history', (_req, res) => {
    res.json(getHistory());
  });

  app.get('/api/demand/:region', (req, res) => {
    const region = req.params.region.toUpperCase();
    const latest = getLatest();
    if (!latest[region]) {
      res.status(404).json({ error: `No data for region: ${region}` });
      return;
    }
    res.json(latest[region]);
  });

  if (staticDir) {
    const root = path.resolve(staticDir);
    app.use(express.static(root));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(root, 'index.html'), (err) => next(err));
    });
  }

  return app;
}
