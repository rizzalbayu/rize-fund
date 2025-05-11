import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { SpendingService } from '../../../modules/spending/spending.service';
import { USER_STATUS } from '../../constants/user-status.constant';
import { userStateModel } from '../../../modules/spending/spending.model';
import { BOT_REPLY } from '../../constants/bot-reply.constant';

@Injectable()
export class TelegramService implements OnModuleInit {
  private botTele: Telegraf;
  private userStates = new Map<number, userStateModel>();

  constructor(
    private spendingService: SpendingService,
    private configService: ConfigService,
  ) {
    const tokenTele: string = this.configService.get<string>(
      'TELEGRAM_TOKEN',
    ) as string;
    this.botTele = new Telegraf(tokenTele);
  }

  onModuleInit() {
    this.registerCommands();
    this.registerHandlers();
    this.botTele.launch();
  }

  private registerCommands() {
    this.botTele.start(async (ctx) => {
      await ctx.reply(BOT_REPLY.INPUT_SPENDING);
      this.userStates.set(ctx.chat.id, { step: USER_STATUS.AWAITING_NAME });
    });
  }
  private registerHandlers() {
    this.botTele.on('text', async (ctx) => {
      await this.spendingService.handleTextMessage(ctx, this.userStates);
    });
  }
}
