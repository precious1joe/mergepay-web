import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface ExpenseInput {
  description: string;
  amount: number;
  paidBy: string;
  splitBetween: string[];
  groupId?: string;
}

interface SettlementInput {
  from: string;
  to: string;
  amount: number;
  groupId?: string;
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newExpense: ExpenseInput) => {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExpense),
      });
      if (!res.ok) throw new Error('Failed to create expense');
      return res.json();
    },
    onMutate: async (newExpense) => {
      await queryClient.cancelQueries({ queryKey: ['expenses'] });
      const previousExpenses = queryClient.getQueryData(['expenses']);

      queryClient.setQueryData(['expenses'], (old: any[] = []) => [
        { id: 'temp-id-' + Date.now(), ...newExpense, createdAt: new Date().toISOString() },
        ...old,
      ]);

      return { previousExpenses };
    },
    onError: (err, _newExpense, context) => {
      if (context?.previousExpenses) {
        queryClient.setQueryData(['expenses'], context.previousExpenses);
      }
      toast.error('Failed to create expense. Please try again.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
    },
  });
}

export function useSettleBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settlement: SettlementInput) => {
      const res = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settlement),
      });
      if (!res.ok) throw new Error('Failed to settle balance');
      return res.json();
    },
    onMutate: async (settlement) => {
      await queryClient.cancelQueries({ queryKey: ['balances'] });
      const previousBalances = queryClient.getQueryData(['balances']);

      // Optimistically update balances or settlements if applicable
      queryClient.setQueryData(['balances'], (old: any) => {
        if (!old) return old;
        return old;
      });

      return { previousBalances };
    },
    onError: (err, _settlement, context) => {
      if (context?.previousBalances) {
        queryClient.setQueryData(['balances'], context.previousBalances);
      }
      toast.error('Failed to process settlement. Please try again.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Settlement recorded successfully!');
    },
  });
}
