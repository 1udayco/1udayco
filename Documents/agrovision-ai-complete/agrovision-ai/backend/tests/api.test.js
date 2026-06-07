const request = require('supertest');
const { app } = require('../src/index');

describe('Health Check', () => {
  it('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Auth Routes', () => {
  it('POST /api/auth/login with missing fields returns 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'not-valid' });
    expect(res.statusCode).toBe(400);
  });

  it('GET /api/auth/me without token returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });
});

describe('Weather Route', () => {
  it('GET /api/weather returns weather data', async () => {
    const res = await request(app).get('/api/weather?city=Mumbai');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('current');
    expect(res.body).toHaveProperty('forecast');
    expect(res.body).toHaveProperty('ai_predictions');
  });
});
