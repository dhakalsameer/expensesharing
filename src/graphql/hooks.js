import { useQuery } from "@apollo/client/react";
import {
  GET_EXPENSES,
  GET_EXPENSE_BY_ID,
  GET_EXPENSES_FULL,
  GET_PAYMENT_REQUESTS,
  GET_REQUESTS_BY_USER,
  GET_PARTICIPANT_PAYMENTS,
  GET_USER_EXPENSES,
} from "./queries";

export function useExpenses(first = 10) {
  return useQuery(GET_EXPENSES, { variables: { first } });
}

export function useExpenseById(id) {
  return useQuery(GET_EXPENSE_BY_ID, {
    variables: { id },
    skip: !id,
  });
}

export function useExpensesFull(first = 10) {
  return useQuery(GET_EXPENSES_FULL, { variables: { first } });
}

export function usePaymentRequests(first = 10) {
  return useQuery(GET_PAYMENT_REQUESTS, {
    variables: { first },
  });
}

export function useRequestsByUser(address) {
  return useQuery(GET_REQUESTS_BY_USER, {
    variables: { address: address?.toLowerCase() },
    skip: !address,
  });
}

export function useParticipantPayments(expenseId) {
  return useQuery(GET_PARTICIPANT_PAYMENTS, {
    variables: { expenseId: String(expenseId) },
    skip: expenseId === undefined || expenseId === null,
  });
}

export function useUserExpenses(user) {
  return useQuery(GET_USER_EXPENSES, {
    variables: { user: user?.toLowerCase() },
    skip: !user,
  });
}
