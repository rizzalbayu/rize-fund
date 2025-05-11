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
}
