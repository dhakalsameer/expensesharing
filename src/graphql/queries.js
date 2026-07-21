import { gql } from "@apollo/client/core";

export const GET_EXPENSES = gql`
  query GetExpenses($first: Int, $skip: Int) {
    expenseAddeds(first: $first, skip: $skip, orderBy: id, orderDirection: desc) {
      id
      expname
      amt
      participantCount
    }
  }
`;

export const GET_EXPENSE_BY_ID = gql`
  query GetExpenseById($id: ID!) {
    expenseAdded(id: $id) {
      id
      expname
      amt
      participantCount
    }
    statusUpdateds(where: { expense: $id }, orderBy: blockNumber, orderDirection: desc, first: 1) {
      newStatus
    }
  }
`;

export const GET_STATUS_UPDATES = gql`
  query GetStatusUpdates($expenseId: String!) {
    statusUpdateds(
      where: { expense: $expenseId }
      orderBy: blockNumber
      orderDirection: desc
    ) {
      id
      newStatus
      blockNumber
    }
  }
`;

export const GET_PAYMENT_REQUESTS = gql`
  query GetPaymentRequests($first: Int, $skip: Int) {
    paymentRequesteds(first: $first, skip: $skip, orderBy: blockNumber, orderDirection: desc) {
      id
      requestId
      from
      to
      amount
    }
  }
`;

export const GET_REQUESTS_BY_USER = gql`
  query GetRequestsByUser($address: Bytes!) {
    paymentRequesteds(
      where: { from: $address }
      orderBy: blockNumber
      orderDirection: desc
    ) {
      id
      requestId
      from
      to
      amount
    }
    paymentRequesteds(
      where: { to: $address }
      orderBy: blockNumber
      orderDirection: desc
    ) {
      id
      requestId
      from
      to
      amount
    }
    paymentCompleteds(
      where: { from: $address }
      orderBy: blockNumber
      orderDirection: desc
    ) {
      id
      requestId
      from
      to
      amount
    }
  }
`;

export const GET_PARTICIPANT_PAYMENTS = gql`
  query GetParticipantPayments($expenseId: String!) {
    participantPaids(
      where: { expenseId: $expenseId }
      orderBy: blockNumber
      orderDirection: asc
    ) {
      id
      participant
      amount
    }
  }
`;

export const GET_EXPENSES_FULL = gql`
  query GetExpensesFull($first: Int) {
    expenseAddeds(first: $first, orderBy: id, orderDirection: desc) {
      id
      expname
      amt
      participantCount
      statuses: statusUpdateds(orderBy: blockNumber, orderDirection: desc, first: 1) {
        newStatus
      }
      payments: participantPaids(orderBy: blockNumber, orderDirection: asc) {
        participant
        amount
      }
    }
  }
`;

export const GET_USER_EXPENSES = gql`
  query GetUserExpenses($user: Bytes!) {
    participantPaids(where: { participant: $user }) {
      expenseId
      amount
    }
    paymentRequesteds(where: { from: $user }) {
      requestId
      to
      amount
    }
    paymentRequesteds(where: { to: $user }) {
      requestId
      from
      amount
      isPaid
    }
  }
`;
