type BudgetMetaExpense = {
  kind: "expense";
  participantIds: string[];
  note?: string;
};

type BudgetMetaSettlement = {
  kind: "settlement";
  receiverId: string;
  note?: string;
};

export type BudgetMeta = BudgetMetaExpense | BudgetMetaSettlement;

const META_PREFIX = "FM_META:";

export function encodeBudgetMeta(meta: BudgetMeta) {
  return `${META_PREFIX}${JSON.stringify(meta)}`;
}

export function parseBudgetMeta(description: string | null | undefined): BudgetMeta | null {
  if (!description || !description.startsWith(META_PREFIX)) return null;
  try {
    return JSON.parse(description.slice(META_PREFIX.length)) as BudgetMeta;
  } catch {
    return null;
  }
}

type BalanceRow = { userId: string; userName: string; value: number };
type EntryLite = {
  id: string;
  type: "DEPOSIT" | "EXPENSE";
  amount: number;
  paidById: string;
  description: string | null;
};

export function calculateSplitwiseBalances(
  members: Array<{ userId: string; user: { name: string } }>,
  entries: EntryLite[],
) {
  const balances = new Map<string, BalanceRow>(
    members.map((m) => [m.userId, { userId: m.userId, userName: m.user.name, value: 0 }]),
  );

  const add = (userId: string, delta: number) => {
    const row = balances.get(userId);
    if (!row) return;
    row.value += delta;
    balances.set(userId, row);
  };

  for (const entry of entries) {
    const meta = parseBudgetMeta(entry.description);

    if (entry.type === "EXPENSE") {
      const participants =
        meta?.kind === "expense" && meta.participantIds.length
          ? meta.participantIds
          : members.map((m) => m.userId);
      const share = entry.amount / Math.max(1, participants.length);
      add(entry.paidById, entry.amount);
      for (const participantId of participants) {
        add(participantId, -share);
      }
      continue;
    }

    if (entry.type === "DEPOSIT" && meta?.kind === "settlement") {
      add(entry.paidById, entry.amount);
      add(meta.receiverId, -entry.amount);
    }
  }

  return [...balances.values()];
}

export type Settlement = { from: string; to: string; amount: number };

export function calculateSettlements(
  balances: Array<{ userName: string; value: number }>,
): Settlement[] {
  const debtors = balances
    .filter((b) => b.value < -0.01)
    .map((b) => ({ ...b, value: Math.abs(b.value) }));
  const creditors = balances
    .filter((b) => b.value > 0.01)
    .map((b) => ({ ...b }));

  const result: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].value, creditors[j].value);
    if (amount > 0.01) {
      result.push({ from: debtors[i].userName, to: creditors[j].userName, amount });
    }
    debtors[i].value -= amount;
    creditors[j].value -= amount;
    if (debtors[i].value <= 0.01) i += 1;
    if (creditors[j].value <= 0.01) j += 1;
  }
  return result;
}
