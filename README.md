
# 💸 Expense Sharing DApp

A decentralized application (DApp) that allows users to split, manage, and track shared expenses transparently using blockchain technology. Built using **Solidity, React, ethers.js, and MetaMask**, it ensures trustless and immutable expense tracking.

---

# 🚀 Features

- 🔗 Connect MetaMask wallet  
- ➕ Create shared expenses  
- 👥 Split expenses among participants  
- 📊 Track who owes whom  
- 💰 Real-time balance tracking  
- 🤝 Agreement-based auto deduction system  
- ❌ Rejection handling with permanent record storage  
- ⏳ Deadline-based payment tracking (3 days)  
- ⚠️ Bad debt classification system  
- ⛓️ Fully decentralized (no backend required)

---

# 💡 Advanced Business Logic Features

## 🤝 Agreement-Based Auto Deduction System

- Users can agree to automatic splitting of daily/recurring expenses  
- Smart contract stores consent rules  
- Auto-calculates and assigns shares  

---

## ❌ Rejection Handling System

- If a user rejects a valid expense:
  - No forced payment occurs  
  - Record is still permanently stored on blockchain  
  - Ensures transparency and accountability  

---

## ⏳ Deadline-Based Payments

- Every expense has a repayment deadline (default: 3 days)  
- If not paid → marked as **Pending Overdue**

---

## ⚠️ Bad Debt System

- If payment exceeds deadline:
  - Marked as **Bad Debt**
  - Shown in a separate dashboard section  
  - Helps identify defaulters clearly  

---

# 📸 System Architecture Diagram

             ┌────────────────────────────┐
             │      User Wallet          │
             │     (MetaMask)            │
             └──────────┬─────────────────┘
                        │
                        ▼
             ┌────────────────────────────┐
             │     React Frontend        │
             │   (Expense DApp UI)       │
             └──────────┬─────────────────┘
                        │
                        ▼
             ┌────────────────────────────┐
             │     ethers.js Layer       │
             │  (Web3 Interaction Layer) │
             └──────────┬─────────────────┘
                        │
                        ▼
             ┌────────────────────────────┐
             │ Smart Contract Layer      │
             │ ExpenseManager.sol        │
             │                            │
             │ - Add Expense             │
             │ - Split Logic             │
             │ - Agreement Tracking      │
             │ - Deadline Management     │
             │ - Bad Debt Detection      │
             └──────────┬─────────────────┘
                        │
                        ▼
             ┌────────────────────────────┐
             │ Ethereum Blockchain       │
             │ (Immutable Storage Layer) │
             └────────────────────────────┘

---

# 🔄 Data Flow

- User creates expense / accepts request  
- React UI sends transaction  
- Smart contract processes logic  
- Balances + agreement status stored on-chain  
- System checks deadlines  
- Updates status (Paid / Pending / Bad Debt)  
- Frontend displays updated results  

---

# ⚙️ Tech Stack

## Frontend
- React.js  
- Tailwind CSS  
- ethers.js  

## Blockchain
- Solidity  
- Ethereum Smart Contracts  
- MetaMask  

## Network
- Sepolia Testnet  

---

# 🧾 Smart Contract Overview

Handles:

- Expense creation  
- Participant agreement (accept/reject)  
- Balance tracking  
- Deadline tracking  
- Bad debt classification  

---

# 🧠 Core Logic Example

If A pays 100 ETH for 4 users:

- Each share = 25 ETH  
- If B accepts → balance updated  
- If C rejects → record stored but not enforced  
- If unpaid for 3+ days → marked as **Bad Debt**

---

# ⚠️ Bad Debt Section

The system maintains:

- Pending debts  
- Overdue payments  
- Bad debt list  

This helps visualize risk and unpaid liabilities clearly.

---

# 📦 Future Improvements

- 🔔 Notification system for due payments  
- 💳 ERC20 token support  
- 📊 Analytics dashboard  
- 🔄 Automatic escrow settlement  
- 📱 Mobile app version  
- 🤖 AI-based expense prediction  

---

# ⭐ Conclusion

The Expense Sharing DApp demonstrates how blockchain can solve real-world financial coordination problems by ensuring:

- Transparency  
- Trustless execution  
- Accountability  
- Immutable financial records  
>>>>>>> e4257c2f6d920a82c09b18620556aee782dc8bb2

testing :
  
>  >>>>>>  ## Foundry
**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
=======
