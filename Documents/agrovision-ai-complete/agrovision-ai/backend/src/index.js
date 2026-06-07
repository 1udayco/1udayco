require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const { createServer } = require('http');
const { Server } = require('socket.io');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const logger = require('./utils/logger');
const authRoutes = require('./routes/auth');
const diseaseRoutes = require('./routes/disease');
const weatherRoutes = require('./routes/weather');
const recommendRoutes = require('./routes/recommend');
const chatbotRoutes = require('./routes/chatbot');
const analyticsRoutes = require('./routes/analytics');
const reportRoutes = require('./routes/report');
const userRoutes = require('./routes/users');
const marketplaceRoutes = require('./routes/marketplace');
const forumRoutes = require('./routes/forum');
const { setupSocketIO } = require('./services/socketService');
const { startCronJobs } = require('./services/cronService');

const app = express();
const httpServer = createServer(app);

// ─── Socket.IO ─────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', methods: ['GET', 'POST'] },
});
setupSocketIO(io);
app.set('io', io);

// ─── Middleware ─────────────────────────────────────────
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Rate Limiting ─────────────────────────────────────
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100, message: { error: 'Too many requests' } });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Too many auth attempts' } });
app.use('/api', limiter);
app.use('/api/auth', authLimiter);

// ─── Swagger Docs ──────────────────────────────────────
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'AgroVision AI API', version: '1.0.0', description: 'Full-stack AI agriculture platform API' },
    servers: [{ url: `http://localhost:${process.env.PORT || 4000}` }],
    components: {
      securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    },
  },
  apis: ['./src/routes/*.js'],
});
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ─── Routes ─────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/disease', diseaseRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/recommend', recommendRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/report', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/forum', forumRoutes);

// ─── Health check ──────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'AgroVision AI Backend', version: '1.0.0', timestamp: new Date() });
});

// ─── 404 handler ───────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// ─── Error handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

// ─── Start ─────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

function startServer() {
  httpServer.listen(PORT, () => {
    logger.info(`🚀 AgroVision AI Backend running on port ${PORT}`);
    logger.info(`📚 API Docs: http://localhost:${PORT}/api/docs`);
    startCronJobs();
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { app, httpServer, startServer };
