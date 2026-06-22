// src/nftABI.js
export const nftABI = [
  {
    inputs: [
      { name: "to", type: "address", internalType: "address" },
      { name: "uri", type: "string", internalType: "string" },
      { name: "expenseId", type: "uint256", internalType: "uint256" },
      { name: "expname", type: "string", internalType: "string" },
    ],
    name: "mintExpenseNFT",
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "expenseId", type: "uint256", internalType: "uint256" }],
    name: "getNFTForExpense",
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address", internalType: "address" }],
    name: "getUserNFTs",
    outputs: [{ name: "", type: "uint256[]", internalType: "uint256[]" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getNFTCount",
    outputs: [{ name: "", type: "uint256", internalType: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "tokenId", type: "uint256", internalType: "uint256" }],
    name: "tokenURI",
    outputs: [{ name: "", type: "string", internalType: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "unpause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ name: "", type: "address", internalType: "address" }],
    stateMutability: "view",
    type: "function",
  },
];
