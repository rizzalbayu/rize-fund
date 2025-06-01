export class userStateModel {
  step?: string;
  category?: string;
  name?: string;
  command?: string;
}

export class userSpendModel {
  spendName?: string;
  nominal?: string;
  timestamp?: string;
  category?: string;
}

export class categoryModel {
  name: string;
  subcategories: string[];
}
