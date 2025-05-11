import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SpendingModule } from './modules/spending/spending.module';
import { ConfigModule } from '@nestjs/config';
import { TelegramService } from './shared/adapters/telegram/telegram.service';

@Module({
  imports: [SpendingModule, ConfigModule.forRoot({ isGlobal: true })],
  controllers: [AppController],
  providers: [AppService, TelegramService],
})
export class AppModule {}
