import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Context } from 'telegraf';
import { SheetsService } from '../../shared/adapters/sheet/sheets.service';
import { USER_STATUS } from '../../shared/constants/user-status.constant';
import { userSpendModel, userStateModel } from './spending.model';
import { BOT_REPLY } from '../../shared/constants/bot-reply.constant';
import { BOT_COMMAND } from '../../shared/constants/bot-command.constant';
import { calculateRekap } from '../../shared/utils/calculate-total.util';
import { buildCategoryKeyboard } from '../../shared/utils/category.util';

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

    if (message && message.startsWith('/')) {
      await this.handleTextCommand(chatId, message, ctx, userStates);
      return;
    }

    const userState = userStates?.get(chatId);
    if (!userState?.step) return;
    //handle text when using command
    switch (userState.command) {
      case BOT_COMMAND.SPENDING_MONEY:
        await this.spendingMoneyProcess(
          chatId,
          message,
          ctx,
          userStates,
          userState,
        );
        break;
    }
  }

  async handleTextCommand(
    chatId: number,
    message: string,
    ctx: Context,
    userStates: Map<number, userStateModel>,
  ) {
    switch (message) {
      case BOT_COMMAND.SPENDING_MONEY:
        await this.spendingMoney(chatId, ctx, userStates);
        break;

      case BOT_COMMAND.CHAT_ID:
        return ctx.reply(BOT_REPLY.USER_CHATID(ctx.chat?.id || 0), {
          parse_mode: 'Markdown',
        });

      case BOT_COMMAND.RECAP_PERIODIC:
        await this.recapPeriodic(chatId, ctx);
        break;

      case BOT_COMMAND.RECAP_CATEGORY:
        await this.recapCategory(chatId, ctx);
        break;

      case BOT_COMMAND.CANCEL_ACTION:
        userStates.set(chatId, {
          step: USER_STATUS.IDLE,
          command: BOT_COMMAND.BOT_START,
        });
        return ctx.reply(BOT_REPLY.PICK_CATEGORY, {
          reply_markup: {
            keyboard: [
              ['/pengeluaran', '/rekap'],
              ['/rekap-category'],
              ['/batal'],
            ],
            one_time_keyboard: true,
            resize_keyboard: true,
          },
        });

      default:
        break;
    }
  }

  async recapPeriodic(chatId: number, ctx: Context) {
    const rows = await this.sheetService.getAllRows(chatId);
    if (!rows || rows.length === 0) {
      return ctx.reply(BOT_REPLY.NO_RECORD);
    }

    const rekap = calculateRekap(rows);
    return ctx.reply(
      `📊 Rekap Pengeluaran:\n\n` +
        `📅 Hari ini: Rp ${rekap.today}\n` +
        `📆 Kemarin: Rp ${rekap.yesterday}\n` +
        `🗓️ 1 Minggu Terakhir: Rp ${rekap.week1}\n` +
        `🗓️ 1 Bulan Terakhir: Rp ${rekap.month}`,
      { parse_mode: 'Markdown' },
    );
  }

  async recapCategory(chatId: number, ctx: Context) {
    const rows = await this.sheetService.getAllRows(chatId);
    if (!rows || rows.length === 0) {
      return ctx.reply(BOT_REPLY.NO_RECORD);
    }

    const result = 'test';
  }

  async spendingMoney(
    chatId: number,
    ctx: Context,
    userStates: Map<number, userStateModel>,
  ) {
    const userState = userStates?.get(chatId);
    if (!userState?.step) return;
    userStates.set(chatId, {
      ...userState,
      step: USER_STATUS.AWAITING_NAME,
      command: BOT_COMMAND.SPENDING_MONEY,
    });
    return ctx.reply(BOT_REPLY.INPUT_SPENDING);
  }

  async spendingMoneyProcess(
    chatId: number,
    message: string | undefined,
    ctx: Context,
    userStates: Map<number, userStateModel>,
    currentUserState: userStateModel,
  ) {
    switch (currentUserState?.step) {
      case USER_STATUS.AWAITING_NAME:
        userStates.set(chatId, {
          ...currentUserState,
          name: message,
          step: USER_STATUS.AWAITING_CATEGORY,
          command: BOT_COMMAND.SPENDING_MONEY,
        });

        const keyboard = buildCategoryKeyboard();
        return ctx.reply(BOT_REPLY.PICK_CATEGORY, {
          reply_markup: {
            keyboard: keyboard,
            one_time_keyboard: true,
            resize_keyboard: true,
          },
        });

      case USER_STATUS.AWAITING_CATEGORY:
        userStates.set(chatId, {
          ...currentUserState,
          category: message,
          step: USER_STATUS.AWAITING_NOMINAL,
          command: BOT_COMMAND.SPENDING_MONEY,
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
          spendName: currentUserState.name,
          nominal: message,
          timestamp,
          category: currentUserState.category,
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
}
