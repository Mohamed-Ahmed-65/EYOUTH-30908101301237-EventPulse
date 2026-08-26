require('dotenv').config();

const http = require('http');
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const { connectDB, dbHealth } = require('./config/db');
const swaggerSpec = require('./config/swagger');

const authRoutes = require('./routes/authRoutes');
const eventRoutes = require('./routes/eventRoutes');
const registerRoutes = require('./routes/registerRoutes');
const msgRoutes = require('./routes/msgRoutes');

const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const attachSocket = require('./utils/socket');

const app = express();

app.use(cors());
app.use(express.json({ limit: '32kb' }));

app.use(async (req, res, next) => {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  if (mongoose.connection.readyState === 1) {
    return next();
  }

  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.get('/health', (req, res) => {
  const database = dbHealth();
  const healthy = database.connected;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    service: 'EYOUTH-30908101301237-EventPulse',
    uptime: process.uptime(),
    database,
  });
});

app.get('/api-docs', (req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EventPulse API Documentation</title>

  <link
    rel="stylesheet"
    href="https://unpkg.com/swagger-ui-dist@5.32.14/swagger-ui.css"
  >
</head>

<body>
  <div id="swagger-ui"></div>

  <script src="https://unpkg.com/swagger-ui-dist@5.32.14/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.32.14/swagger-ui-standalone-preset.js"></script>

  <script>
    window.onload = function () {
      window.ui = SwaggerUIBundle({
        url: '/api-docs.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: 'StandaloneLayout'
      });
    };
  </script>
</body>
</html>`);
});

app.get('/api-docs.json', (req, res) => {
  res.json(swaggerSpec);
});

app.use('/auth', authRoutes);

app.use('/events', msgRoutes);
app.use('/events', eventRoutes);

app.use('/registrations', registerRoutes);

app.use(notFound);
app.use(errorHandler);

async function startServer() {
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not set');
    process.exit(1);
  }

  await connectDB();

  const port = Number(process.env.PORT) || 3000;
  const server = http.createServer(app);

  attachSocket(server);

  server.listen(port, () => {
    console.log(`EventPulse listening on port ${port}`);
  });

  process.on('unhandledRejection', (err) => {
    console.error('unhandledRejection', err);
    server.close(() => process.exit(1));
  });

  process.on('uncaughtException', (err) => {
    console.error('uncaughtException', err);
    process.exit(1);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = app;