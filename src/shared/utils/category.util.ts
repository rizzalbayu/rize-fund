import * as fs from 'fs';
import * as path from 'path';
import { categoryModel } from '../../modules/spending/spending.model';

export function buildCategoryKeyboard(): string[][] {
  const filePath = path.resolve(process.cwd(), 'src/config/categories.json');
  const file = fs.readFileSync(filePath, 'utf8');
  const categories: categoryModel[] = JSON.parse(file);

  const rows: string[][] = [];
  const maxCategoryColumn = 3;
  for (let i = 0; i < categories.length; i += maxCategoryColumn) {
    rows.push(
      categories.slice(i, i + maxCategoryColumn).map((cat) => cat.name),
    );
  }

  return rows;
}
