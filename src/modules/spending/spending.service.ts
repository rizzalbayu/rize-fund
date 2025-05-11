import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Context } from 'telegraf';
import { SheetsService } from '../../shared/adapters/sheet/sheets.service';
import { USER_STATUS } from '../../shared/constants/user-status.constant';
import { userSpendModel, userStateModel } from './spending.model';
import { BOT_REPLY } from '../../shared/constants/bot-reply.constant';
import { calculateRekap } from '../../shared/utils/calculate-total';

@Injectable()
export class SpendingService {
  constructor(
    private configService: ConfigService,
    private sheetService: SheetsService,
  ) {}

  async handleTextMessage(
    ctx: Context,
    userStates: Map<number, userStateModel>,
  ) {
    const chatId = ctx.chat?.id || 0;
    const message = (ctx.message as { text?: string })?.text;

    if (message && message.startsWith('/'))
      await this.handleTextCommand(chatId, message, ctx, userStates);

    const userState = userStates?.get(chatId);
    if (!userState?.step) return;

    switch (userState?.step) {
      case USER_STATUS.AWAITING_NAME:
        userStates.set(chatId, {
          ...userState,
          name: message,
          step: USER_STATUS.AWAITING_CATEGORY,
        });
        return ctx.reply(BOT_REPLY.PICK_CATEGORY, {
          reply_markup: {
            keyboard: [
              ['Belanja', 'Makanan & Minuman', 'Tagihan'],
              ['Kegiatan', 'Simpanan', 'Kesehatan'],
              ['Hiburan', 'Transportasi', 'Lainnya'],
            ],
            one_time_keyboard: true,
            resize_keyboard: true,
          },
        });

      case USER_STATUS.AWAITING_CATEGORY:
        userStates.set(chatId, {
          ...userState,
          category: message,
          step: USER_STATUS.AWAITING_NOMINAL,
        });
        return ctx.reply(BOT_REPLY.INPUT_NOMINAL);

      case USER_STATUS.AWAITING_NOMINAL: {
        if (isNaN(Number(message))) {
          return ctx.reply(BOT_REPLY.NOMINAL_NUMBER);
        }

        const now = new Date();
        const timestamp = now.toLocaleString('en-GB', {
          timeZone: 'Asia/Jakarta',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });

        const userSpend: userSpendModel = {
          spendName: userState.name,
          nominal: message,
          timestamp,
          category: userState.category,
        };

        const sendData = await this.sheetService.appendRow(chatId, userSpend);
        if (sendData) {
          await ctx.reply(BOT_REPLY.SUCCESS_SAVE);
        } else {
          await ctx.reply(BOT_REPLY.NOT_REGISTERED);
        }

        return userStates.delete(chatId);
      }

      default:
        return ctx.reply(BOT_REPLY.DEFAULT_REPLY);
    }
  }

  async handleTextCommand(
    chatId: number,
    message: string,
    ctx: Context,
    userStates: Map<number, userStateModel>,
  ) {
    switch (message) {
      case '/chatid':
        return ctx.reply(BOT_REPLY.USER_CHATID(ctx.chat?.id || 0), {
          parse_mode: 'Markdown',
        });

      case '/reset':
        userStates.delete(chatId);
        break;

      case '/rekap':
        const rows = await this.sheetService.getAllRows(chatId);
        if (!rows || rows.length === 0) {
          return ctx.reply(BOT_REPLY.NO_RECORD);
        }

        const result = calculateRekap(rows);
        return ctx.reply(
          `📊 Rekap Pengeluaran:\n\n` +
            `📅 Hari ini: Rp ${result.today}\n` +
            `📆 Kemarin: Rp ${result.yesterday}\n` +
            `🗓️ 1 Minggu Terakhir: Rp ${result.week1}\n` +
            `🗓️ 1 Bulan Terakhir: Rp ${result.month}`,
          { parse_mode: 'Markdown' },
        );
        break;

      default:
        break;
    }
  }
}
