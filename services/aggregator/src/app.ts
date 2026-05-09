// Express app split out from index.ts so we can import it in tests without starting a real server

import express from 'express';
import cors from 'cors';
import { getLatest, getHistory } from './store';

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/api/demand', (_req, res) => {
    res.json(getLatest());
  });

  app.get('/api/demand/history', (_req, res) => {
    res.json(getHistory());
  });

  // The region param comes in lowercase sometimes so we normalize it
  app.get('/api/demand/:region', (req, res) => {
    const region = req.params.region.toUpperCase();
    const latest = getLatest();
    if (!latest[region]) {
      res.status(404).json({ error: `No data for region: ${region}` });
      return;
    }
    res.json(latest[region]);
  });

  return app;
}
