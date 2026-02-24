export type ExternalBudgetTransaction = {
  id: string;
  amount: number;
  currency: string;
  bookedAt: string;
  description: string;
};

export interface BudgetProviderAdapter {
  name: string;
  syncTransactions(groupId: string): Promise<ExternalBudgetTransaction[]>;
}

export class PlaceholderBudgetAdapter implements BudgetProviderAdapter {
  name = "placeholder";

  async syncTransactions(): Promise<ExternalBudgetTransaction[]> {
    return [];
  }
}
