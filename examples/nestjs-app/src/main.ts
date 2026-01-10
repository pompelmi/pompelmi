import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for testing
  app.enableCors();
  
  await app.listen(3000);
  console.log('🚀 NestJS application with Pompelmi scanner is running on: http://localhost:3000');
  console.log('\nTest endpoints:');
  console.log('  POST /upload - Single file upload with automatic scanning');
  console.log('  POST /upload/multiple - Multiple files upload');
  console.log('  POST /upload/manual - Manual scanning without interceptor');
  console.log('\nTest with curl:');
  console.log('  npm run test:upload    - Upload a clean file');
  console.log('  npm run test:malware   - Upload EICAR test file (should be rejected)');
}

bootstrap();
