import { Module } from '@nestjs/common';
import { SpendingService } from './spending.service';
import { SheetsService } from '../../shared/adapters/sheet/sheets.service';

@Module({
  controllers: [],
  providers: [SpendingService, SheetsService],
  exports: [SpendingService],
})
export class SpendingModule {}
