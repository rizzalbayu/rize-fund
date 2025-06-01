import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import { google } from 'googleapis';
import * as path from 'path';
import { userSpendModel } from '../../../modules/spending/spending.model';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SheetsService {
  private sheetsClient;

  constructor(private readonly configService: ConfigService) {
    const keyFilePath = path.resolve(
      process.cwd(),
      'src/credentials/google.json',
    );
    const credentials = JSON.parse(fs.readFileSync(keyFilePath, 'utf-8'));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheetsClient = google.sheets({ version: 'v4', auth });
  }

  async appendRow(chatId: number, values: userSpendModel) {
    const spreadsheetId = this.getSheetByChatId(chatId);
    if (!spreadsheetId) {
      return false;
    }
    const range = 'Sheet1!A:D'; //Sheet and column for input

    const row = [
      values.spendName,
      values.nominal || 0,
      values.timestamp,
      values.category,
    ];

    await this.sheetsClient.spreadsheets.values.append({
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });
    return true;
  }

  getSheetByChatId(chatId: number) {
    //get spereadsheetid base on chatid
    const allowedUsers = this.configService.get<string>('USER_SHEETS');
    const allowedUser = allowedUsers
      ?.split('|')
      .find((user) => user.startsWith(chatId.toString()));
    return allowedUser?.split(':')[1];
  }
  async getAllRows(chatId: number) {
    const spreadsheetId = this.getSheetByChatId(chatId);
    const range = 'Sheet1!A:D';

    const res = await this.sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    return res.data.values || [];
  }

  async getRowsByStartDateAndCategories(chatId: number, startDate: string) {
    const spreadsheetId = this.getSheetByChatId(chatId);
    const range = 'Sheet1!A:D';
    const res = await this.sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = (res.data.values as string[][]) || [];
    const parsedStart = parseDate(startDate);
    if (!parsedStart) return [];
    const now = new Date();
    if (parsedStart > now) return [];
    const result: Record<string, number> = {};

    for (const row of rows) {
      const [spendName, nominal, timestamp, category]: string[] = row;
      const data: userSpendModel = {
        spendName,
        nominal,
        timestamp,
        category,
      };
      const nominalNumber = parseInt(data.nominal as string);
      //check if data row not valid
      if (!data.category || isNaN(nominalNumber) || !data.timestamp) continue;

      if (!result[data.category]) result[data.category] = 0;
      result[data.category] += nominalNumber;
      const rowDate = parseDate(data.timestamp);

      if (rowDate && rowDate >= parsedStart && rowDate <= now) {
        if (!result[data.category]) result[data.category] = 0;
        result[data.category] += nominalNumber;
      }
    }

    return Object.entries(result).map(([category, total]) => ({
      category,
      total,
    }));
  }
}
function parseDate(str: string): Date | null {
  const [dd, mm, yyyy] = str.split('/');
  const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00+07:00`);
  return isNaN(d.getTime()) ? null : d;
}
