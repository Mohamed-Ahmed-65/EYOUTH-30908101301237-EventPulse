const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../../server');
const User = require('../../models/User');
const Category = require('../../models/Category');
const Event = require('../../models/Event');

let mongod;

function tokenFor(user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

beforeAll(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  process.env.NODE_ENV = 'test';
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Event.createIndexes();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) await mongod.stop();
});

afterEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Event.deleteMany({}),
  ]);
});

async function seedUsersAndCategory() {
  const [admin, attendee, category] = await Promise.all([
    User.create({ email: 'admin@test.com', password: 'password123', role: 'admin' }),
    User.create({ email: 'guest@test.com', password: 'password123', role: 'attendee' }),
    Category.create({ name: 'Technology', description: 'Tech gatherings' }),
  ]);
  return { admin, attendee, category };
}

describe('Event API', () => {
  it('rejects event creation from an attendee', async () => {
    const { attendee, category } = await seedUsersAndCategory();

    const res = await request(app)
      .post('/events')
      .set('Authorization', `Bearer ${tokenFor(attendee)}`)
      .send({
        name: 'Secret meetup',
        description: 'Should not be created',
        date: '2026-09-01T10:00:00.000Z',
        city: 'Cairo',
        capacity: 20,
        category: category._id.toString(),
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/permission/i);
  });

  it('rejects event creation without a token', async () => {
    const res = await request(app).post('/events').send({ name: 'x' });
    expect(res.status).toBe(401);
  });

  it('returns 422 when required event fields are missing', async () => {
    const { admin } = await seedUsersAndCategory();

    const res = await request(app)
      .post('/events')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ name: 'Incomplete' });

    expect(res.status).toBe(422);
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBeGreaterThan(0);
    expect(res.body.errors[0]).toHaveProperty('field');
    expect(res.body.errors[0]).toHaveProperty('message');
  });

  it('creates an event for a valid admin payload', async () => {
    const { admin, category } = await seedUsersAndCategory();

    const res = await request(app)
      .post('/events')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({
        name: 'Nile Tech Summit',
        description: 'Talks and demos',
        date: '2026-10-12T09:00:00.000Z',
        city: 'Cairo',
        capacity: 100,
        category: category._id.toString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.event.name).toBe('Nile Tech Summit');
    expect(res.body.event.category).toMatchObject({
      name: 'Technology',
      description: 'Tech gatherings',
    });
    expect(res.body.event.password).toBeUndefined();
  });

  it('lists events with populated category details', async () => {
    const { admin, category } = await seedUsersAndCategory();
    await request(app)
      .post('/events')
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({
        name: 'Open Source Day',
        description: 'Contribute to OSS',
        date: '2026-08-20T09:00:00.000Z',
        city: 'Giza',
        capacity: 40,
        category: category._id.toString(),
      })
      .expect(201);

    const res = await request(app).get('/events');
    expect(res.status).toBe(200);
    expect(res.body.events).toHaveLength(1);
    expect(res.body.events[0].category.name).toBe('Technology');
    expect(res.body.meta).toMatchObject({
      totalEvents: 1,
      currentPage: 1,
      limit: 10,
    });
  });

  it('filters by city, category, and date range', async () => {
    const { category } = await seedUsersAndCategory();
    const music = await Category.create({ name: 'Music', description: 'Live music' });

    await Event.create([
      {
        name: 'Cairo Dev Conf',
        description: 'Engineering talks in Cairo',
        date: new Date('2026-09-10T09:00:00.000Z'),
        city: 'Cairo',
        capacity: 50,
        category: category._id,
      },
      {
        name: 'Alexandria Jazz',
        description: 'Evening jazz',
        date: new Date('2026-11-01T18:00:00.000Z'),
        city: 'Alexandria',
        capacity: 80,
        category: music._id,
      },
      {
        name: 'Cairo Winter Fair',
        description: 'Seasonal market',
        date: new Date('2026-12-15T12:00:00.000Z'),
        city: 'Cairo',
        capacity: 200,
        category: category._id,
      },
    ]);

    const byCity = await request(app).get('/events').query({ city: 'cairo' });
    expect(byCity.status).toBe(200);
    expect(byCity.body.events).toHaveLength(2);
    expect(byCity.body.events.every((e) => e.city.toLowerCase() === 'cairo')).toBe(true);

    const byCategory = await request(app)
      .get('/events')
      .query({ category: music._id.toString() });
    expect(byCategory.body.events).toHaveLength(1);
    expect(byCategory.body.events[0].name).toBe('Alexandria Jazz');

    const byDates = await request(app).get('/events').query({
      startDate: '2026-09-01T00:00:00.000Z',
      endDate: '2026-09-30T23:59:59.000Z',
    });
    expect(byDates.body.events).toHaveLength(1);
    expect(byDates.body.events[0].name).toBe('Cairo Dev Conf');
  });

  it('returns an empty list with pagination meta when search matches nothing', async () => {
    const { category } = await seedUsersAndCategory();
    await Event.create({
      name: 'Nile Tech Summit',
      description: 'Talks and demos',
      date: new Date('2026-10-12T09:00:00.000Z'),
      city: 'Cairo',
      capacity: 100,
      category: category._id,
    });

    const res = await request(app).get('/events').query({ search: 'zzzznonexistent' });
    expect(res.status).toBe(200);
    expect(res.body.events).toEqual([]);
    expect(res.body.meta.totalEvents).toBe(0);
  });

  it('returns 404 for a missing event id', async () => {
    const id = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/events/${id}`);
    expect(res.status).toBe(404);
  });
});
