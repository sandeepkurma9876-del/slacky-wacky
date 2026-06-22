const request = require('supertest');
const { app: serverApp } = require('./server');
const db = require('./db');

describe('Database Tests', () => {
  beforeAll(() => {
    // Clear history before tests
    db.clearHistory('test_user');
  });

  test('should add and retrieve message history', () => {
    db.addMessage('test_user', 'user', 'hello');
    db.addMessage('test_user', 'assistant', 'hi there');
    const history = db.getHistory('test_user');
    expect(history.length).toBe(2);
    expect(history[0]).toEqual({ role: 'user', content: 'hello' });
    expect(history[1]).toEqual({ role: 'assistant', content: 'hi there' });
  });

  test('should limit history retrieval', () => {
    db.clearHistory('test_user');
    for (let i = 0; i < 15; i++) {
        db.addMessage('test_user', 'user', `msg ${i}`);
    }
    const history = db.getHistory('test_user', 10);
    expect(history.length).toBe(10);
    expect(history[0].content).toBe('msg 5');
    expect(history[9].content).toBe('msg 14');
  });
});

describe('Express Server Tests', () => {
    test('GET /health should return status ok', async () => {
        const res = await request(serverApp).get('/health');
        expect(res.statusCode).toBe(200);
        expect(res.body.status).toBe('ok');
    });

    test('GET / should return HTML landing page', async () => {
        const res = await request(serverApp).get('/');
        expect(res.statusCode).toBe(200);
        expect(res.text).toContain('slacky-wacky - The Ultimate AI Slack Bot');
    });

    test('GET /dashboard should return HTML dashboard', async () => {
        const res = await request(serverApp).get('/dashboard');
        expect(res.statusCode).toBe(200);
        expect(res.text).toContain('Slack Bot Live Dashboard');
    });
});
