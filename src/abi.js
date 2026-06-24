// src/abi.js
export const contractABI = [
  {
    "type": "function",
    "name": "addExpense",
    "inputs": [
      { "name": "_expname", "type": "string" },
      { "name": "_paidby", "type": "string" },
      { "name": "_person1", "type": "string" },
      { "name": "_person2", "type": "string" },
      { "name": "_paddress", "type": "string" },
      { "name": "_amt", "type": "uint256" },
      { "name": "_status", "type": "uint8" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getExpense",
    "inputs": [{ "name": "_id", "type": "uint256" }],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          { "name": "expname", "type": "string" },
          { "name": "paidby", "type": "string" },
          { "name": "person1", "type": "string" },
          { "name": "person2", "type": "string" },
          { "name": "paddress", "type": "string" },
          { "name": "amt", "type": "uint256" },
          { "name": "shareamount", "type": "uint256" },
          { "name": "status", "type": "uint8" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getLength",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getStatus",
    "inputs": [],
    "outputs": [{ "name": "", "type": "string" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getShareAmount",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "updateexpense",
    "inputs": [
      { "name": "_expname", "type": "string" },
      { "name": "_paidby", "type": "string" },
      { "name": "_person1", "type": "string" },
      { "name": "_person2", "type": "string" },
      { "name": "_paddress", "type": "string" },
      { "name": "_amt", "type": "uint256" },
      { "name": "_status", "type": "uint8" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "updateStatus",
    "inputs": [{ "name": "_newStatus", "type": "uint8" }],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "resetexp",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  // ========== PAYMENT REQUEST FUNCTIONS ==========
  {
    "type": "function",
    "name": "requestPayment",
    "inputs": [
      { "name": "to", "type": "address" },
      { "name": "amount", "type": "uint256" },
      { "name": "reason", "type": "string" }
    ],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "payRequest",
    "inputs": [{ "name": "requestId", "type": "uint256" }],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "getPendingRequests",
    "inputs": [{ "name": "debtor", "type": "address" }],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "components": [
          { "name": "from", "type": "address" },
          { "name": "to", "type": "address" },
          { "name": "amount", "type": "uint256" },
          { "name": "reason", "type": "string" },
          { "name": "isPaid", "type": "bool" },
          { "name": "timestamp", "type": "uint256" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPaymentRequest",
    "inputs": [{ "name": "requestId", "type": "uint256" }],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          { "name": "from", "type": "address" },
          { "name": "to", "type": "address" },
          { "name": "amount", "type": "uint256" },
          { "name": "reason", "type": "string" },
          { "name": "isPaid", "type": "bool" },
          { "name": "timestamp", "type": "uint256" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPaymentRequestCount",
    "inputs": [],
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view"
  }
];