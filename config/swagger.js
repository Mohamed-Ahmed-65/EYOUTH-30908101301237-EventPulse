const swaggerJsdoc = require('swagger-jsdoc');

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'EventPulse API',
      version: '1.0.0',
      description:
        'Event management backend for EYOUTH-30908101301237-EventPulse. REST endpoints plus Socket.io rooms for live admin announcements.',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Local' },
      { url: 'https://eyouth-30908101301237-eventpulse.vercel.app', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'fail' },
            message: { type: 'string' },
            errors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' },
                },
              },
            },
          },
        },
        Category: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
          },
        },
        Event: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            date: { type: 'string', format: 'date-time' },
            city: { type: 'string' },
            capacity: { type: 'integer' },
            registrationCount: { type: 'integer' },
            category: { $ref: '#/components/schemas/Category' },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'attendee'] },
          },
        },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Service and database health',
          responses: {
            200: { description: 'API is up' },
            503: { description: 'Database is not connected' },
          },
        },
      },
      '/auth/register': {
        post: {
          tags: ['Auth'],
          summary: 'Register an attendee',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    password: { type: 'string', minLength: 8 },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Created' },
            409: { description: 'Email already registered' },
            422: { description: 'Validation error' },
          },
        },
      },
      '/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Login and receive a JWT',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'password'],
                  properties: {
                    email: { type: 'string' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'OK' },
            401: { description: 'Invalid credentials' },
          },
        },
      },
      '/events': {
        get: {
          tags: ['Events'],
          summary: 'List events with filters, search, sort, and pagination',
          parameters: [
            { name: 'category', in: 'query', schema: { type: 'string' } },
            { name: 'city', in: 'query', schema: { type: 'string' } },
            { name: 'startDate', in: 'query', schema: { type: 'string', format: 'date-time' } },
            { name: 'endDate', in: 'query', schema: { type: 'string', format: 'date-time' } },
            { name: 'search', in: 'query', schema: { type: 'string' } },
            {
              name: 'sort',
              in: 'query',
              schema: { type: 'string', enum: ['date', 'popularity'] },
            },
            { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 10 } },
          ],
          responses: { 200: { description: 'Paginated event list' } },
        },
        post: {
          tags: ['Events'],
          summary: 'Create an event (admin)',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'description', 'date', 'city', 'capacity', 'category'],
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    date: { type: 'string', format: 'date-time' },
                    city: { type: 'string' },
                    capacity: { type: 'integer', minimum: 1 },
                    category: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: 'Created' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
            422: { description: 'Validation error' },
          },
        },
      },
      '/events/{id}': {
        get: {
          tags: ['Events'],
          summary: 'Get a single event',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'OK' },
            404: { description: 'Not found' },
          },
        },
        put: {
          tags: ['Events'],
          summary: 'Update an event (admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Event' },
              },
            },
          },
          responses: {
            200: { description: 'OK' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
            404: { description: 'Not found' },
          },
        },
        delete: {
          tags: ['Events'],
          summary: 'Delete an event (admin)',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Deleted' },
            401: { description: 'Unauthorized' },
            403: { description: 'Forbidden' },
            404: { description: 'Not found' },
          },
        },
      },
      '/events/{id}/announcements': {
        get: {
          tags: ['Announcements'],
          summary: 'List persisted announcements for an event',
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'OK' },
            404: { description: 'Event not found' },
          },
        },
      },
      '/registrations': {
        get: {
          tags: ['Registrations'],
          summary: 'List registrations for the current user',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'OK' },
            401: { description: 'Unauthorized' },
          },
        },
        post: {
          tags: ['Registrations'],
          summary: 'Register the current user for an event',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['eventId'],
                  properties: { eventId: { type: 'string' } },
                },
              },
            },
          },
          responses: {
            201: { description: 'Created' },
            401: { description: 'Unauthorized' },
            404: { description: 'Event not found' },
            409: { description: 'Full or already registered' },
          },
        },
      },
      '/registrations/{id}': {
        delete: {
          tags: ['Registrations'],
          summary: 'Cancel a registration you own',
          security: [{ bearerAuth: [] }],
          parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
          responses: {
            200: { description: 'Cancelled' },
            401: { description: 'Unauthorized' },
            403: { description: 'Not the owner' },
            404: { description: 'Not found' },
          },
        },
      },
    },
  },
  apis: [],
});

module.exports = swaggerSpec;
