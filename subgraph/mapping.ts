import { BigInt, Bytes } from "@graphprotocol/graph-ts";
import {
  ExpenseAdded as ExpenseAddedEvent,
  StatusUpdated as StatusUpdatedEvent,
  ParticipantPaid as ParticipantPaidEvent,
  PaymentRequested as PaymentRequestedEvent,
  PaymentCompleted as PaymentCompletedEvent,
  PaymentRefunded as PaymentRefundedEvent,
} from "./generated/Storage/Storage";
import {
  ExpenseAdded,
  StatusUpdated,
  ParticipantPaid,
  PaymentRequested,
  PaymentCompleted,
  PaymentRefunded,
} from "./generated/schema";

function eventId(hash: Bytes, logIndex: BigInt): string {
  return hash.toHexString() + "/" + logIndex.toString();
}

export function handleExpenseAdded(event: ExpenseAddedEvent): void {
  const id = event.params.id.toString();
  let entity = ExpenseAdded.load(id);
  if (!entity) entity = new ExpenseAdded(id);
  entity.expenseId = event.params.id;
  entity.expname = event.params.expname;
  entity.amt = event.params.amt;
  entity.participantCount = event.params.participantCount;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleStatusUpdated(event: StatusUpdatedEvent): void {
  const entity = new StatusUpdated(eventId(event.transaction.hash, event.logIndex));
  entity.expense = event.params.id.toString();
  const s = event.params.newStatus;
  entity.newStatus = s == 0 ? "pending" : s == 1 ? "paid" : s == 2 ? "rejected" : "badDebt";
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handleParticipantPaid(event: ParticipantPaidEvent): void {
  const entity = new ParticipantPaid(eventId(event.transaction.hash, event.logIndex));
  entity.expense = event.params.expenseId.toString();
  entity.participant = event.params.participant;
  entity.amount = event.params.amount;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handlePaymentRequested(event: PaymentRequestedEvent): void {
  const entity = new PaymentRequested(eventId(event.transaction.hash, event.logIndex));
  entity.requestId = event.params.requestId;
  entity.from = event.params.from;
  entity.to = event.params.to;
  entity.amount = event.params.amount;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handlePaymentCompleted(event: PaymentCompletedEvent): void {
  const entity = new PaymentCompleted(eventId(event.transaction.hash, event.logIndex));
  entity.requestId = event.params.requestId;
  entity.from = event.params.from;
  entity.to = event.params.to;
  entity.amount = event.params.amount;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}

export function handlePaymentRefunded(event: PaymentRefundedEvent): void {
  const entity = new PaymentRefunded(eventId(event.transaction.hash, event.logIndex));
  entity.requestId = event.params.requestId;
  entity.debtor = event.params.debtor;
  entity.refundAmount = event.params.refundAmount;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.save();
}
