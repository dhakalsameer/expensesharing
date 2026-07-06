Expense Sharing App
<div align="center">
A decentralized expense sharing application built on the Ethereum blockchain. This app allows users to track, split, and manage shared expenses seamlessly with friends and groups using smart contract technology.

🏗️ Architecture Design
text
┌─────────────────────────────────────────────────────────────┐
│                      USER BROWSER                          │
│              (React + MetaMask Wallet)                      │
│                     ethers.js (Web3 Calls)                  │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND LAYER                          │
│                   (React App - UI Logic)                    │
│                                                             │
│  • User Authentication (Login/Register)                    │
│  • Dashboard & Expense Management                          │
│  • Real-time Balance Updates                               │
│  • NFT-based Expense Tracking                              │
│  • Notification System                                     │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   SMART CONTRACT                           │
│               INTERACTION LAYER                            │
│                                                             │
│  • Contract Deployment & Management                        │
│  • Transaction Broadcasting                                │
│  • Event Listening & State Updates                         │
│  • IPFS/Pinata Integration for Storage                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              SMART CONTRACT LAYER                          │
│           (Expense Manager - Solidity)                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               CORE FUNCTIONS                       │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │  ✓ Add Expenses                                    │   │
│  │  ✓ Split Logic (Equal/Percentage/Custom)          │   │
│  │  ✓ Balance Tracking & Settlement                   │   │
│  │  ✓ Payment Requests & Approvals                    │   │
│  │  ✓ Friend Management                               │   │
│  │  ✓ NFT Minting for Expenses                        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   BLOCKCHAIN NETWORK                       │
│              (Ethereum / Sepolia Testnet)                   │
│                                                             │
│  • Transaction Validation                                   │
│  • Consensus Mechanism                                     │
│  • Permanent & Transparent Record                          │
└─────────────────────────────────────────────────────────────┘
🚀 Features
User Authentication: Secure login and registration using MetaMask wallet

Expense Management: Add, edit, and track shared expenses

Smart Split Logic: Split expenses equally, by percentage, or custom amounts

Balance Tracking: Real-time balance updates and settlement management

Payment Requests: Request and approve payments from friends

Friend Management: Add and manage friends for expense sharing

NFT Integration: Mint NFTs for expense records and verification

Notifications: Real-time alerts for payments and updates

IPFS Storage: Decentralized storage for expense data using IPFS/Pinata

🛠️ Tech Stack
Frontend
React.js - UI Framework

Ethers.js - Ethereum interaction

MetaMask - Wallet integration

Tailwind CSS - Styling

Vite - Build tool

Smart Contracts
Solidity - Smart contract development

Foundry - Development framework

OpenZeppelin - Secure contract libraries

Storage
IPFS - Decentralized file storage

Pinata - IPFS pinning service

Blockchain
Ethereum - Mainnet

Sepolia - Testnet

📦 Installation
Prerequisites
Node.js (v16+)

MetaMask Extension

Git

Setup
Clone the repository

bash
git clone https://github.com/Pratikeeyyyy/metaapk.git
cd metaapk
Install dependencies

bash
npm install
Environment Variables
Create a .env file in the root directory:

env
VITE_CONTRACT_ADDRESS=your_contract_address
VITE_INFURA_API_KEY=your_infura_key
VITE_PINATA_API_KEY=your_pinata_key
VITE_PINATA_SECRET_KEY=your_pinata_secret
Run the application

bash
npm run dev
Build for production

bash
npm run build
📝 Smart Contract Deployment
Deploy to Sepolia Testnet
bash
forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast --verify
Deploy NFT Contract
bash
forge script script/DeployNft.s.sol --rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY --broadcast --verify
🔄 Workflow
User connects wallet via MetaMask

Creates/joins groups for expense sharing

Adds expenses with split details

Smart contract processes and records transactions

Balances are updated in real-time

Users settle balances through the app

NFTs are minted as proof of expense records

📊 Database Schema
Smart Contract Storage
solidity
struct Expense {
    uint256 id;
    address payer;
    uint256 amount;
    string description;
    address[] participants;
    uint256[] shares;
    bool settled;
    uint256 timestamp;
}

struct User {
    address wallet;
    string name;
    string email;
    uint256 balance;
    address[] friends;
}
🔐 Security Features
MetaMask authentication

Smart contract security audits

Secure environment variables

Input validation

Reentrancy protection

Access control modifiers

🌐 Live Demo
Visit the live application at: https://github.com/Pratikeeyyyy/metaapk

📱 Screenshots
Feature	Screenshot
Dashboard	-
Add Expense	-
Split View	-
NFT Gallery	-
🤝 Contributing
Fork the repository

Create a feature branch (git checkout -b feature/AmazingFeature)

Commit your changes (git commit -m 'Add some AmazingFeature')

Push to the branch (git push origin feature/AmazingFeature)

Open a Pull Request

📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

👤 Author
Pratik Pangeni

GitHub: @Pratikeeyyyy

Email: pratikpangeni7283444259@gmail.com

🙏 Acknowledgments
OpenZeppelin for secure contract libraries

Foundry for smart contract development framework

Ethereum community for decentralized vision

All contributors and users of the application

📞 Support
For support, email pratikpangeni7283444259@gmail.com or raise an issue in the GitHub repository.

🔧 Foundry Development
Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.

Foundry consists of:

Forge: Ethereum testing framework (like Truffle, Hardhat and DappTools).

Cast: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.

Anvil: Local Ethereum node, akin to Ganache, Hardhat Network.

Chisel: Fast, utilitarian, and verbose solidity REPL.

Documentation
https://book.getfoundry.sh/

Usage
Build
shell
forge build
Test
shell
forge test
Format
shell
forge fmt
Gas Snapshots
shell
forge snapshot
Anvil
shell
anvil
Deploy
shell
forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
Cast
shell
cast <subcommand>
Help
shell
forge --help
anvil --help
cast --help
<div align="center">
Built with ❤️ on Ethereum

</div> </div>
