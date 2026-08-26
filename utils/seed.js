require('dotenv').config();

const { connectDB } = require('../config/db');
const Category = require('../models/Category');
const Event = require('../models/Event');
const User = require('../models/User');

const CATEGORIES = [
  {
    name: 'Technology',
    description: 'Talks, workshops, and meetups around software and hardware.',
  },
  {
    name: 'Music',
    description: 'Concerts, open mics, and live performances.',
  },
  {
    name: 'Business',
    description: 'Networking, pitch nights, and industry roundtables.',
  },
];

async function upsertCategories() {
  const docs = [];
  for (const item of CATEGORIES) {
    const category = await Category.findOneAndUpdate(
      { name: item.name },
      { $setOnInsert: item },
      { new: true, upsert: true }
    );
    docs.push(category);
  }
  return docs;
}

async function upsertAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@eventpulse.local').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'AdminPass123';

  let admin = await User.findOne({ email });
  if (!admin) {
    admin = await User.create({ email, password, role: 'admin' });
  } else if (admin.role !== 'admin') {
    admin.role = 'admin';
    await admin.save();
  }
  return admin;
}

async function upsertEvents(categories) {
  const tech = categories.find((c) => c.name === 'Technology');
  const music = categories.find((c) => c.name === 'Music');

  const seeds = [
    {
      name: 'Nile Tech Summit',
      description: 'A day of product talks and lightning demos for builders in Cairo.',
      date: new Date('2026-10-12T09:00:00.000Z'),
      city: 'Cairo',
      capacity: 120,
      category: tech._id,
    },
    {
      name: 'Alexandria Jazz Night',
      description: 'An evening of live jazz by the Mediterranean.',
      date: new Date('2026-11-05T18:30:00.000Z'),
      city: 'Alexandria',
      capacity: 80,
      category: music._id,
    },
  ];

  const events = [];
  for (const item of seeds) {
    const event = await Event.findOneAndUpdate(
      { name: item.name },
      { $setOnInsert: item },
      { new: true, upsert: true }
    );
    events.push(event);
  }
  return events;
}

async function seed() {
  await connectDB();
  const categories = await upsertCategories();
  const admin = await upsertAdmin();
  const events = await upsertEvents(categories);

  console.log(`Seed complete: ${categories.length} categories, ${events.length} events, admin ${admin.email}`);
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { seed };
