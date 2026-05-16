// API tests, seeded via updateDemand directly so no Redis needed

import request from 'supertest';
import { createApp } from '../app';
import { updateDemand } from '../store';

const app = createApp();

const CAISO_READING = {
  region: 'CAISO',
  value: 32500,
  unit: 'MW',
  timestamp: '2024-06-01T18:00:00.000Z',
};

const ERCOT_READING = {
  region: 'ERCOT',
  value: 67000,
  unit: 'MW',
  timestamp: '2024-06-01T18:00:00.000Z',
};

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.timestamp).toBe('string');
  });
});

describe('GET /api/demand', () => {
  it('returns empty object before any data arrives', async () => {
    const res = await request(app).get('/api/demand');
    expect(res.status).toBe(200);
  });

  it('returns seeded readings after updateDemand calls', async () => {
    updateDemand(CAISO_READING);
    updateDemand(ERCOT_READING);

    const res = await request(app).get('/api/demand');
    expect(res.status).toBe(200);
    expect(res.body.CAISO.value).toBe(32500);
    expect(res.body.ERCOT.value).toBe(67000);
    expect(res.body.CAISO.unit).toBe('MW');
  });
});

describe('GET /api/demand/history', () => {
  it('returns history arrays per region', async () => {
    updateDemand(CAISO_READING);

    const res = await request(app).get('/api/demand/history');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.CAISO)).toBe(true);
    expect(res.body.CAISO.length).toBeGreaterThan(0);
    expect(res.body.CAISO[0].value).toBe(32500);
  });
});

describe('GET /api/demand/:region', () => {
  it('returns 200 for a known region (lowercase input)', async () => {
    updateDemand(CAISO_READING);

    const res = await request(app).get('/api/demand/caiso');
    expect(res.status).toBe(200);
    expect(res.body.region).toBe('CAISO');
    expect(res.body.value).toBe(32500);
  });

  it('returns 404 for an unknown region', async () => {
    const res = await request(app).get('/api/demand/UNKNOWN');
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/No data for region/);
  });
});
