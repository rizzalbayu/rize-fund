import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Telegraf } from 'telegraf';
import { SpendingService } from '../../../modules/spending/spending.service';
import { USER_STATUS } from '../../constants/user-status.constant';
import { userStateModel } from '../../../modules/spending/spending.model';
import { BOT_REPLY } from '../../constants/bot-reply.constant';
import { BOT_COMMAND } from '../../constants/bot-command.constant';

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

  async onModuleInit() {
    this.registerCommands();
    this.registerHandlers();
    const commands = [
      { command: 'start', description: 'Mulai bot' },
      { command: 'chatid', description: 'Lihat chat ID' },
      { command: 'batal', description: 'Batalkan proses' },
    ];

    await this.botTele.telegram.setMyCommands(commands);
    await this.botTele.launch();
  }

  private registerCommands() {
    this.botTele.start(async (ctx) => {
      await ctx.reply(BOT_REPLY.PICK_MENU, {
        reply_markup: {
          keyboard: [
            ['/pengeluaran', '/rekap'],
            ['/rekap-kategori'],
            ['/batal'],
          ],
          one_time_keyboard: true,
          resize_keyboard: true,
        },
      });
      this.userStates.set(ctx.chat.id, {
        step: USER_STATUS.IDLE,
        command: BOT_COMMAND.BOT_START,
      });
    });
  }
  private registerHandlers() {
    this.botTele.on('text', async (ctx) => {
      await this.spendingService.handleTextMessage(ctx, this.userStates);
    });
  }
}
