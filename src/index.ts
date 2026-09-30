import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { authController } from './controllers/auth.controller';
import { userController } from './controllers/user.controller';
import { roomController } from './controllers/room.controller';
import { bookingController } from './controllers/booking.controller';
import { reportController } from './controllers/report.controller';
import { notificationController } from './controllers/notification.controller';
import { uploadController } from './controllers/upload.controller';
import { departmentController } from './controllers/department.controller';
import { checkSupabaseConnection } from './config/supabase';
import path from 'path';

const port = Number(process.env.PORT) || 3001;

const app = new Elysia()
  .use(
    cors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'apikey']
    })
  )
  .use(
    swagger({
      documentation: {
        info: {
          title: 'Meeting Room Booking API (ระบบจองห้องประชุม)',
          version: '1.0.0',
          description: 'RESTful API for Meeting Room Booking with Layered Architecture (Elysia + Supabase)'
        },
        tags: [
          { name: 'Auth', description: 'Authentication and Registration' },
          { name: 'Users', description: 'User management & Admin approval' },
          { name: 'Rooms', description: 'Meeting room catalog & equipment' },
          { name: 'Departments', description: 'Department management (CRUD by Admin)' },
          { name: 'Bookings', description: 'Bookings, calendar & schedule conflict validation' },
          { name: 'Reports', description: 'Admin booking reports & summary' },
          { name: 'Notifications', description: 'User alerts & simulated email notifications' }
        ]
      },
      path: '/docs'
    })
  )
  .get('/', () => ({
    name: 'Meeting Room Booking API',
    status: 'online',
    version: '1.0.0',
    documentation: '/docs'
  }))
  .get('/uploads/*', async ({ params, set }) => {
    const rawParam = params['*'] || '';
    const safeName = path.basename(rawParam);
    const filePath = path.join(process.cwd(), 'uploads', safeName);
    const file = Bun.file(filePath);
    if (await file.exists()) {
      return file;
    }
    set.status = 404;
    return { error: 'File not found' };
  })
  .get('/api/health', async () => {
    const isSupabaseOk = await checkSupabaseConnection();
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      supabaseConnected: isSupabaseOk,
      schemaFile: 'backend/supabase/schema.sql'
    };
  })
  .get('/api/equipments', async () => {
    const { equipmentRepository } = await import('./repositories/equipment.repository');
    const equipments = await equipmentRepository.findAll();
    return { success: true, data: equipments };
  })
  .use(authController)
  .use(userController)
  .use(departmentController)
  .use(roomController)
  .use(bookingController)
  .use(reportController)
  .use(notificationController)
  .use(uploadController)
  .listen(port, async () => {
    console.log(`🚀 Meeting Room API server is running on http://localhost:${port}`);
    console.log(`📑 Swagger Documentation available at http://localhost:${port}/docs`);
    await checkSupabaseConnection();
  });

export type App = typeof app;
