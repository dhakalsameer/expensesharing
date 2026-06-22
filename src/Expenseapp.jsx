// Main Expense Sharing App
import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { contractABI } from "./abi";
import { nftABI } from "./nftABI";
// Anvil Addresses
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const NFT_CONTRACT_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
// Main Storage Contract
// const CONTRACT_ADDRESS = "0x59698cC3f177CCa3c5b95A7dac71A5B3e51B6Bec";
// const NFT_CONTRACT_ADDRESS = "0xB6dCcFE0c246c3B101EDaEe5e1116c6bAEA9d120";
// const SEPOLIA_CHAIN_ID = "0xaa36a7";

function App() {
  // Wallet connection states
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [networkError, setNetworkError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);

  // Form inputs
  const [expenseName, setExpenseName] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [payerAddress, setPayerAddress] = useState("");
  const [person1, setPerson1] = useState("");
  const [person1Address, setPerson1Address] = useState("");
  const [person2, setPerson2] = useState("");
  const [person2Address, setPerson2Address] = useState("");
  const [location, setLocation] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("0");
  const [badDebtPerson, setBadDebtPerson] = useState("");
  const [badDebtAddress, setBadDebtAddress] = useState("");

  // App states
  const [expenses, setExpenses] = useState([]);
  const [contractBalance, setContractBalance] = useState("0");
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [badDebtors, setBadDebtors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [splitAmount, setSplitAmount] = useState("0");
  const [showBadDebt, setShowBadDebt] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState("");

  // NFT states
  const [userNFTs, setUserNFTs] = useState([]);
  const [nftContract, setNftContract] = useState(null);
  const [nftImage, setNftImage] = useState(null);
  const [nftImageFile, setNftImageFile] = useState(null);
  const [selectedExpenseForNFT, setSelectedExpenseForNFT] = useState("");
  const [mintingNFT, setMintingNFT] = useState(false);

  // Switch to Sepolia network
  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: SEPOLIA_CHAIN_ID,
                chainName: "Sepolia Test Network",
                nativeCurrency: {
                  name: "Sepolia ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
                rpcUrls: ["https://sepolia.infura.io/v3/"],
                blockExplorerUrls: ["https://sepolia.etherscan.io/"],
              },
            ],
          });
        } catch (addError) {
          console.error("Failed to add Sepolia network:", addError);
          setNetworkError("Please add Sepolia network to MetaMask");
        }
      }
    }
  };

  // Setup ethers provider
  const initEthers = useCallback(async () => {
    if (window.ethereum) {
      try {
        const providerInstance = new ethers.BrowserProvider(window.ethereum);
        setProvider(providerInstance);
        setNetworkError("");
        return providerInstance;
      } catch (error) {
        console.error("Failed to initialize provider:", error);
        setNetworkError("Failed to connect to Ethereum network");
        return null;
      }
    } else {
      setNetworkError("Please install MetaMask");
      return null;
    }
  }, []);

  // Connect wallet
  const connectWallet = useCallback(async () => {
    try {
      if (!window.ethereum) {
        alert("Please install MetaMask");
        return;
      }

      setIsLoading(true);
      setError("");
      setDebugInfo("");
      await switchToSepolia();

      const providerInstance = await initEthers();
      if (!providerInstance) {
        setIsLoading(false);
        return;
      }

      await providerInstance.send("eth_requestAccounts", []);
      const signerInstance = await providerInstance.getSigner();
      const address = await signerInstance.getAddress();

      const network = await providerInstance.getNetwork();
      const chainId = Number(network.chainId);

      if (chainId !== 11155111) {
        setNetworkError("Please switch to Sepolia network");
        setIsLoading(false);
        return;
      }

      setIsCorrectNetwork(true);
      setDebugInfo(`Network: Sepolia (Chain ID: ${chainId})`);

      const checksumAddress = ethers.getAddress(CONTRACT_ADDRESS);
      const contractInstance = new ethers.Contract(
        checksumAddress,
        contractABI,
        signerInstance,
      );

      setSigner(signerInstance);
      setContract(contractInstance);
      setWalletAddress(address);
      setIsConnected(true);

      // Initialize NFT contract
      const nftContractInstance = new ethers.Contract(
        NFT_CONTRACT_ADDRESS,
        nftABI,
        signerInstance,
      );
      setNftContract(nftContractInstance);
      await loadUserNFTs(nftContractInstance);

      const balance = await providerInstance.getBalance(CONTRACT_ADDRESS);
      const ethBalance = parseFloat(ethers.formatEther(balance)).toFixed(4);
      setDebugInfo((prev) => prev + ` | Balance: ${ethBalance} ETH`);

      await loadExpenses(contractInstance);
      await getContractBalance(providerInstance);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      setError("Failed to connect wallet: " + error.message);
      setIsLoading(false);
    }
  }, [initEthers]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setContract(null);
    setWalletAddress("");
    setIsConnected(false);
    setIsCorrectNetwork(false);
    setExpenses([]);
    setContractBalance("0");
    setTotalExpenses(0);
    setTotalAmount(0);
    setPendingCount(0);
    setBadDebtors([]);
    setUserNFTs([]);
    setNetworkError("");
    setDataLoaded(false);
    setError("");
    setDebugInfo("");
    setNftImage(null);
    setNftImageFile(null);
    setSelectedExpenseForNFT("");
  }, []);

  // Load user NFTs
  const loadUserNFTs = useCallback(
    async (nftContractInstance) => {
      if (!nftContractInstance || !walletAddress) return;

      try {
        const tokenIds = await nftContractInstance.getUserNFTs(walletAddress);
        const nfts = [];

        for (let i = 0; i < tokenIds.length; i++) {
          try {
            const tokenId = tokenIds[i];
            const tokenURI = await nftContractInstance.tokenURI(tokenId);
            const response = await fetch(tokenURI);
            const metadata = await response.json();

            nfts.push({
              tokenId: tokenId.toString(),
              tokenURI,
              metadata,
              image:
                metadata.image ||
                "https://via.placeholder.com/400x400/6C63FF/FFFFFF?text=Expense+NFT",
            });
          } catch (err) {
            console.error("Error loading NFT:", err);
          }
        }

        setUserNFTs(nfts);
      } catch (error) {
        console.error("Failed to load NFTs:", error);
      }
    },
    [walletAddress],
  );

  // Import NFT to MetaMask
  const importNFTToMetaMask = useCallback(async () => {
    if (!window.ethereum) {
      alert("Please install MetaMask");
      return;
    }

    try {
      if (userNFTs.length === 0) {
        alert("You don't have any NFTs yet. Mint an expense NFT first!");
        return;
      }

      const tokenId = userNFTs[0].tokenId;

      const wasAdded = await window.ethereum.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC721",
          options: {
            address: NFT_CONTRACT_ADDRESS,
            tokenId: tokenId,
          },
        },
      });

      if (wasAdded) {
        alert("✅ NFT added to MetaMask!");
      } else {
        alert("❌ User rejected the request");
      }
    } catch (error) {
      console.error("Failed to import NFT:", error);
      alert("Failed to import NFT: " + error.message);
    }
  }, [userNFTs]);

  // Mint NFT for an expense
  const mintExpenseNFT = useCallback(async () => {
    if (!nftContract || !isConnected) {
      alert("Please connect wallet first");
      return;
    }

    if (!selectedExpenseForNFT) {
      alert("Please select an expense");
      return;
    }

    try {
      setMintingNFT(true);

      const expense = expenses.find(
        (e) => e.id === parseInt(selectedExpenseForNFT),
      );
      if (!expense) {
        alert("Expense not found");
        return;
      }

      // Create metadata (using placeholder for now)
      const tokenURI = "https://ipfs.io/ipfs/QmPlaceholder/";

      // Mint NFT
      const tx = await nftContract.mintExpenseNFT(
        walletAddress,
        tokenURI,
        expense.id,
        expense.expname,
      );

      await tx.wait();

      alert("✅ NFT Minted Successfully!");

      setSelectedExpenseForNFT("");
      setNftImage(null);
      setNftImageFile(null);

      await loadUserNFTs(nftContract);
    } catch (error) {
      console.error("Failed to mint NFT:", error);
      alert("Failed to mint NFT: " + (error.reason || error.message));
    } finally {
      setMintingNFT(false);
    }
  }, [
    nftContract,
    isConnected,
    walletAddress,
    selectedExpenseForNFT,
    expenses,
    loadUserNFTs,
  ]);

  // Get contract ETH balance
  const getContractBalance = useCallback(async (providerInstance) => {
    if (!providerInstance) return;
    try {
      const balance = await providerInstance.getBalance(CONTRACT_ADDRESS);
      const ethBalance = parseFloat(ethers.formatEther(balance)).toFixed(4);
      setContractBalance(ethBalance);
    } catch (error) {
      console.error("Failed to get contract balance:", error);
    }
  }, []);

  // Load all expenses from the contract
  const loadExpenses = useCallback(async (contractInstance) => {
    if (!contractInstance) return;

    try {
      setRefreshing(true);

      const length = await contractInstance.getLength();
      const totalCount = Number(length);

      if (totalCount === 0) {
        setExpenses([]);
        setTotalExpenses(0);
        setTotalAmount(0);
        setPendingCount(0);
        setBadDebtors([]);
        setDataLoaded(true);
        setRefreshing(false);
        return;
      }

      const expenseList = [];
      let totalAmt = 0;
      let pending = 0;
      const debtors = [];

      for (let i = 0; i < totalCount; i++) {
        try {
          const exp = await contractInstance.getExpense(i);
          const amtEth = parseFloat(ethers.formatEther(exp.amt));
          totalAmt += amtEth;

          const statusValue = Number(exp.status);

          if (statusValue === 0) pending++;

          let statusText = "⏳ Pending";
          if (statusValue === 1) statusText = "✅ Paid";
          else if (statusValue === 2) statusText = "❌ Rejected";
          else if (statusValue === 3) statusText = "⚠️ Bad Debt";

          if (statusValue === 3) {
            const shareAmount = amtEth / 3;
            debtors.push({
              name: exp.person1 || "Unknown",
              address: exp.person1Address || "Unknown",
              amount: shareAmount,
              expname: exp.expname || "Unknown",
              role: "person1",
            });
            debtors.push({
              name: exp.person2 || "Unknown",
              address: exp.person2Address || "Unknown",
              amount: shareAmount,
              expname: exp.expname || "Unknown",
              role: "person2",
            });
          }

          const shareAmountEth = parseFloat(
            ethers.formatEther(exp.shareamount || 0),
          );

          expenseList.push({
            id: i,
            expname: exp.expname || "Unknown",
            paidby: exp.paidby || "Unknown",
            person1: exp.person1 || "Unknown",
            person2: exp.person2 || "Unknown",
            paddress: exp.paddress || "Unknown",
            amt: amtEth,
            shareamount: shareAmountEth,
            status: statusValue,
            statusText: statusText,
            shareAmount: (amtEth / 3).toFixed(4),
          });
        } catch (err) {
          console.error(`Error loading expense ${i}:`, err);
        }
      }

      expenseList.reverse();

      setExpenses(expenseList);
      setTotalExpenses(expenseList.length);
      setTotalAmount(totalAmt);
      setPendingCount(pending);
      setBadDebtors(debtors);
      setDataLoaded(true);
    } catch (error) {
      console.error("Failed to load expenses:", error);
      setDataLoaded(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Calculate split amount
  const updateSplitAmount = useCallback((value) => {
    const amt = parseFloat(value) || 0;
    const split = (amt / 3).toFixed(4);
    setSplitAmount(split);
    return split;
  }, []);

  // Handle amount input change
  const handleAmountChange = (e) => {
    const value = e.target.value;
    setAmount(value);
    updateSplitAmount(value);
  };

  // Add a new expense
  const addExpense = useCallback(async () => {
    if (!contract || !isConnected) {
      alert("Please connect wallet first");
      return;
    }

    if (!expenseName || !paidBy || !person1 || !person2 || !amount) {
      alert("Please fill all required fields");
      return;
    }

    if (parseFloat(amount) <= 0) {
      alert("Amount must be greater than 0");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const amt = ethers.parseEther(amount);
      const statusValue = parseInt(status);

      const tx = await contract.addExpense(
        expenseName,
        paidBy,
        person1,
        person2,
        location || "Unknown",
        amt,
        statusValue,
      );

      await tx.wait();

      // Clear form after successful submission
      setExpenseName("");
      setPaidBy("");
      setPayerAddress("");
      setPerson1("");
      setPerson1Address("");
      setPerson2("");
      setPerson2Address("");
      setLocation("");
      setAmount("");
      setSplitAmount("0");
      setStatus("0");
      setShowBadDebt(false);
      setBadDebtPerson("");
      setBadDebtAddress("");

      await loadExpenses(contract);
      await getContractBalance(provider);

      if (nftContract) {
        await loadUserNFTs(nftContract);
      }

      alert("Expense Added Successfully!");
    } catch (error) {
      console.error("Failed to add expense:", error);
      setError("Transaction failed: " + (error.reason || error.message));
      alert("Transaction failed: " + (error.reason || error.message));
    } finally {
      setLoading(false);
    }
  }, [
    contract,
    isConnected,
    expenseName,
    paidBy,
    person1,
    person2,
    amount,
    status,
    location,
    provider,
    loadExpenses,
    getContractBalance,
    nftContract,
    loadUserNFTs,
  ]);

  // Handle status dropdown change
  const handleStatusChange = (e) => {
    const value = e.target.value;
    setStatus(value);
    setShowBadDebt(value === "3");
    if (value !== "3") {
      setBadDebtPerson("");
      setBadDebtAddress("");
    }
  };

  // Truncate wallet address for display
  const formatAddress = (address) => {
    if (!address) return "";
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Setup wallet event listeners
  useEffect(() => {
    initEthers();

    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          connectWallet();
        }
      };
      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener(
            "accountsChanged",
            handleAccountsChanged,
          );
          window.ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, [initEthers, connectWallet, disconnectWallet]);

  // Load expenses when contract connects
  useEffect(() => {
    if (contract && isConnected && isCorrectNetwork) {
      loadExpenses(contract);
      getContractBalance(provider);

      const interval = setInterval(() => {
        if (contract && isConnected && isCorrectNetwork) {
          loadExpenses(contract);
          getContractBalance(provider);
          if (nftContract) {
            loadUserNFTs(nftContract);
          }
        }
      }, 15000);

      return () => clearInterval(interval);
    }
  }, [
    contract,
    isConnected,
    isCorrectNetwork,
    loadExpenses,
    getContractBalance,
    provider,
    nftContract,
    loadUserNFTs,
  ]);

  // Manual refresh
  const handleRefresh = useCallback(() => {
    if (contract && isConnected && isCorrectNetwork) {
      loadExpenses(contract);
      getContractBalance(provider);
      if (nftContract) {
        loadUserNFTs(nftContract);
      }
    }
  }, [
    contract,
    isConnected,
    isCorrectNetwork,
    loadExpenses,
    getContractBalance,
    provider,
    nftContract,
    loadUserNFTs,
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-6">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-orange-100 rounded-full mb-3">
              <i className="fas fa-users text-orange-600 text-2xl"></i>
            </div>
            <h1 className="text-3xl font-bold text-slate-800">
              💰 Expense Sharing DApp
            </h1>
            <p className="text-slate-500 text-sm mt-2">
              Split expenses with friends on Sepolia
            </p>
            {isConnected && isCorrectNetwork && (
              <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                ✅ Connected to Sepolia
              </span>
            )}
          </div>

          {/* NFT Import Button */}
          {isConnected && isCorrectNetwork && (
            <div className="mb-4 p-4 bg-purple-50 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h4 className="font-semibold text-purple-700 flex items-center gap-2">
                    <i className="fas fa-cube"></i> Your NFTs
                    {userNFTs.length > 0 && (
                      <span className="bg-purple-600 text-white text-xs px-2 py-0.5 rounded-full">
                        {userNFTs.length}
                      </span>
                    )}
                  </h4>
                  <p className="text-xs text-purple-600 mt-1">
                    {userNFTs.length > 0
                      ? `You have ${userNFTs.length} expense receipt NFT${userNFTs.length > 1 ? "s" : ""}`
                      : "No NFTs yet. Mint an expense NFT!"}
                  </p>
                </div>
                {userNFTs.length > 0 && (
                  <button
                    onClick={importNFTToMetaMask}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
                  >
                    <i className="fas fa-download"></i>
                    Import to MetaMask
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Debug info */}
          {debugInfo && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs">
              <strong className="text-blue-700">🔍 Debug:</strong>
              <div className="text-blue-600 mt-1 break-all font-mono">
                {debugInfo}
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              {error}
            </div>
          )}

          {networkError && (
            <div className="mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              {networkError}
            </div>
          )}

          {/* Wallet Connection Buttons */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={connectWallet}
              disabled={isConnected || isLoading}
              className={`flex-1 min-w-[200px] text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                isConnected
                  ? "bg-green-600 cursor-not-allowed"
                  : isLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-orange-500 hover:bg-orange-600"
              }`}
            >
              <i className="fas fa-plug"></i>
              <span>
                {isConnected
                  ? "Wallet Connected"
                  : isLoading
                    ? "Connecting..."
                    : "Connect Wallet"}
              </span>
            </button>
            <button
              onClick={disconnectWallet}
              disabled={!isConnected}
              className={`flex-1 min-w-[200px] text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2 ${
                !isConnected
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-900 hover:bg-blue-800"
              }`}
            >
              <i className="fas fa-unlink"></i>
              <span>Disconnect</span>
            </button>
          </div>

          <div className="text-center text-sm text-slate-500 mt-3">
            <i
              className={`fas fa-circle text-xs ${isConnected && isCorrectNetwork ? "text-green-500" : "text-gray-400"}`}
            ></i>
            <span>
              {isConnected && isCorrectNetwork
                ? ` Connected to Sepolia: ${formatAddress(walletAddress)}`
                : isConnected && !isCorrectNetwork
                  ? " ⚠️ Wrong network! Please switch to Sepolia"
                  : " Wallet Not Connected"}
            </span>
          </div>
        </div>

        {/* Main Content - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Add Expense Form */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-slate-700 mb-4">
              <i className="fas fa-plus-circle text-green-600"></i> Add Expense
            </h2>

            <div className="space-y-3">
              <input
                type="text"
                placeholder="Expense Name (e.g., Dinner, Movie, Groceries)"
                className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={expenseName}
                onChange={(e) => setExpenseName(e.target.value)}
                disabled={!isConnected || !isCorrectNetwork}
              />

              {/* Payer */}
              <div className="bg-orange-50 p-3 rounded-lg">
                <label className="text-sm font-semibold text-orange-700">
                  Who Paid?
                </label>
                <input
                  type="text"
                  placeholder="Enter payer's name (e.g., John)"
                  className="w-full border rounded-lg p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  disabled={!isConnected || !isCorrectNetwork}
                />
                <input
                  type="text"
                  placeholder="Payer's Wallet Address (0x...)"
                  className="w-full border rounded-lg p-2 mt-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  value={payerAddress}
                  onChange={(e) => setPayerAddress(e.target.value)}
                  disabled={!isConnected || !isCorrectNetwork}
                />
              </div>

              {/* Participants */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <label className="text-sm font-semibold text-blue-700">
                  Participants Who Owe Money (2 people)
                </label>

                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Person 1 name (owes money)"
                    className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={person1}
                    onChange={(e) => setPerson1(e.target.value)}
                    disabled={!isConnected || !isCorrectNetwork}
                  />
                  <input
                    type="text"
                    placeholder="Person 1 wallet address"
                    className="w-full border rounded-lg p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={person1Address}
                    onChange={(e) => setPerson1Address(e.target.value)}
                    disabled={!isConnected || !isCorrectNetwork}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Owes: {splitAmount} ETH
                  </div>
                </div>

                <div className="mt-3">
                  <input
                    type="text"
                    placeholder="Person 2 name (owes money)"
                    className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={person2}
                    onChange={(e) => setPerson2(e.target.value)}
                    disabled={!isConnected || !isCorrectNetwork}
                  />
                  <input
                    type="text"
                    placeholder="Person 2 wallet address"
                    className="w-full border rounded-lg p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={person2Address}
                    onChange={(e) => setPerson2Address(e.target.value)}
                    disabled={!isConnected || !isCorrectNetwork}
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Owes: {splitAmount} ETH
                  </div>
                </div>
              </div>

              <input
                type="text"
                placeholder="Location of expense"
                className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={!isConnected || !isCorrectNetwork}
              />
              <input
                type="number"
                step="0.001"
                min="0.001"
                placeholder="Total Amount (ETH)"
                className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={amount}
                onChange={handleAmountChange}
                disabled={!isConnected || !isCorrectNetwork}
              />

              {/* Split Preview */}
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="font-semibold text-green-700">
                  💰 Split Preview:
                </p>
                <p className="text-xl font-bold text-green-600">
                  {splitAmount} ETH per person
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Total: {amount || "0"} ETH (split equally between payer + 2
                  participants = 3 people total)
                </p>
              </div>

              {/* Status Dropdown */}
              <select
                className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-orange-500"
                value={status}
                onChange={handleStatusChange}
                disabled={!isConnected || !isCorrectNetwork}
              >
                <option value="0">⏳ Pending</option>
                <option value="1">✅ Paid</option>
                <option value="2">❌ Rejected</option>
                <option value="3">⚠️ Bad Debt</option>
              </select>

              {/* Bad Debt Section - Shows only when Bad Debt is selected */}
              {showBadDebt && (
                <div className="bg-red-50 p-3 rounded-lg border-2 border-red-300 animate-fadeIn">
                  <label className="text-sm font-semibold text-red-700 flex items-center gap-2">
                    <i className="fas fa-exclamation-triangle"></i> Mark as Bad
                    Debt
                  </label>
                  <select
                    className="w-full border rounded-lg p-2 mt-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={badDebtPerson}
                    onChange={(e) => setBadDebtPerson(e.target.value)}
                    disabled={!isConnected || !isCorrectNetwork}
                  >
                    <option value="">Select who has bad debt</option>
                    <option value="person1">Person 1</option>
                    <option value="person2">Person 2</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Bad Debtor's Wallet Address"
                    className="w-full border rounded-lg p-2 mt-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                    value={badDebtAddress}
                    onChange={(e) => setBadDebtAddress(e.target.value)}
                    disabled={!isConnected || !isCorrectNetwork}
                  />
                  <p className="text-xs text-red-600 mt-2">
                    ⚠️ This person will be marked as having bad debt.
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={addExpense}
                disabled={loading || !isConnected || !isCorrectNetwork}
                className={`w-full text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                  loading || !isConnected || !isCorrectNetwork
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                }`}
              >
                <i className="fas fa-save"></i>
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Processing...
                  </>
                ) : !isConnected ? (
                  "Connect Wallet First"
                ) : !isCorrectNetwork ? (
                  "Switch to Sepolia"
                ) : (
                  "Add Expense"
                )}
              </button>
            </div>
          </div>

          {/* Right Column - Stats and Expenses */}
          <div className="space-y-6">
            {/* Contract Balance */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl shadow-xl p-6 text-white">
              <h3 className="text-lg font-bold">
                <i className="fas fa-landmark"></i> Contract Balance
              </h3>
              <p className="text-3xl font-bold mt-2">{contractBalance} ETH</p>
              <p className="text-sm opacity-90 mt-2">
                Total ETH locked in contract
              </p>
            </div>

            {/* Summary Stats */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-slate-700">
                  <i className="fas fa-chart-simple"></i> Summary
                </h3>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing || !isConnected || !isCorrectNetwork}
                  className="text-blue-500 hover:text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i
                    className={`fas fa-sync-alt ${refreshing ? "fa-spin" : ""}`}
                  ></i>
                </button>
              </div>
              <div className="mt-3 space-y-3">
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-slate-600">Total Expenses:</span>
                  <span className="font-bold text-slate-800 text-lg">
                    {expenses.length}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-slate-600">Total Amount:</span>
                  <span className="font-bold text-green-600 text-lg">
                    {expenses.reduce((sum, exp) => sum + exp.amt, 0).toFixed(4)}{" "}
                    ETH
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-100 pb-2">
                  <span className="text-slate-600">Pending:</span>
                  <span className="font-bold text-yellow-600 text-lg">
                    {expenses.filter((exp) => exp.status === 0).length}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Bad Debtors:</span>
                  <span className="font-bold text-red-600 text-lg">
                    {badDebtors.length}
                  </span>
                </div>
              </div>
              {!dataLoaded && isConnected && isCorrectNetwork && (
                <div className="mt-3 text-center text-sm text-blue-500">
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Loading data...
                </div>
              )}
              {dataLoaded &&
                isConnected &&
                isCorrectNetwork &&
                expenses.length === 0 && (
                  <div className="mt-3 text-center text-sm text-gray-500">
                    No expenses found. Add your first expense!
                  </div>
                )}
              {!isConnected && (
                <div className="mt-3 text-center text-sm text-gray-400">
                  Connect wallet to view summary
                </div>
              )}
            </div>

            {/* Bad Debtors List */}
            <div className="bg-red-50 rounded-2xl shadow-xl p-6 border-2 border-red-200">
              <h3 className="text-lg font-bold text-red-700 flex items-center gap-2">
                <i className="fas fa-skull"></i> Bad Debtors
                {badDebtors.length > 0 && (
                  <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
                    {badDebtors.length}
                  </span>
                )}
              </h3>
              <div className="mt-3 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                {!isConnected || !isCorrectNetwork ? (
                  <div className="text-center text-red-400 py-4">
                    <p>Connect to Sepolia to view</p>
                  </div>
                ) : badDebtors.length === 0 ? (
                  <div className="text-center text-red-400 py-4">
                    <i className="fas fa-check-circle text-2xl mb-2 block"></i>
                    <p>No bad debtors yet</p>
                  </div>
                ) : (
                  badDebtors.map((debtor, index) => (
                    <div
                      key={index}
                      className="bg-white p-3 rounded-lg border border-red-200 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-red-700">
                              {debtor.name}
                            </span>
                            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">
                              {debtor.role === "person1"
                                ? "Person 1"
                                : "Person 2"}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            <i className="fas fa-wallet mr-1"></i>
                            {debtor.address && debtor.address !== "Unknown"
                              ? formatAddress(debtor.address)
                              : "No wallet address provided"}
                          </div>
                          {debtor.expname && (
                            <div className="text-xs text-gray-400 mt-1">
                              <i className="fas fa-tag mr-1"></i>{" "}
                              {debtor.expname}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-red-600">
                            {debtor.amount
                              ? debtor.amount.toFixed(4)
                              : "0.0000"}{" "}
                            ETH
                          </span>
                          <div className="text-xs text-gray-400">owes</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* NFT Minting Section */}
            <div className="bg-purple-50 rounded-2xl shadow-xl p-6 border-2 border-purple-200">
              <h3 className="text-lg font-bold text-purple-700 flex items-center gap-2">
                <i className="fas fa-crown"></i> Mint NFT Receipt
                {userNFTs.length > 0 && (
                  <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                    {userNFTs.length}
                  </span>
                )}
              </h3>

              <div className="mt-3 space-y-3">
                {/* Image Upload */}
                <div
                  className="border-2 border-dashed border-purple-300 rounded-lg p-4 text-center cursor-pointer hover:border-purple-500 transition-colors"
                  onClick={() =>
                    document.getElementById("nftImageInput").click()
                  }
                >
                  <input
                    type="file"
                    id="nftImageInput"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setNftImageFile(file);
                        const reader = new FileReader();
                        reader.onload = (e) => setNftImage(e.target.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                    disabled={!isConnected || !isCorrectNetwork}
                  />
                  {nftImage ? (
                    <img
                      src={nftImage}
                      alt="NFT"
                      className="w-32 h-32 mx-auto rounded-lg object-cover"
                    />
                  ) : (
                    <div className="py-4">
                      <i className="fas fa-cloud-upload-alt text-4xl text-purple-400"></i>
                      <p className="text-sm text-gray-500 mt-2">
                        Upload receipt image (optional)
                      </p>
                    </div>
                  )}
                </div>

                {/* Expense Selection */}
                <select
                  className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  value={selectedExpenseForNFT}
                  onChange={(e) => setSelectedExpenseForNFT(e.target.value)}
                  disabled={!isConnected || !isCorrectNetwork}
                >
                  <option value="">Select a paid expense for NFT</option>
                  {expenses
                    .filter((exp) => exp.status === 1)
                    .map((exp) => (
                      <option key={exp.id} value={exp.id}>
                        {exp.expname} - {exp.amt.toFixed(4)} ETH
                      </option>
                    ))}
                </select>

                {/* Mint Button */}
                <button
                  onClick={mintExpenseNFT}
                  disabled={
                    mintingNFT ||
                    !selectedExpenseForNFT ||
                    !isConnected ||
                    !isCorrectNetwork
                  }
                  className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 ${
                    mintingNFT ||
                    !selectedExpenseForNFT ||
                    !isConnected ||
                    !isCorrectNetwork
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  } text-white font-semibold`}
                >
                  {mintingNFT ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Minting...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-magic"></i>
                      Mint NFT
                    </>
                  )}
                </button>

                {/* NFT Count Display */}
                {userNFTs.length > 0 && (
                  <div className="text-center text-sm text-purple-600 mt-2">
                    <i className="fas fa-check-circle mr-1"></i>
                    You have {userNFTs.length} NFT
                    {userNFTs.length > 1 ? "s" : ""} in your collection
                  </div>
                )}
              </div>
            </div>

            {/* Expenses List */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-700">
                  <i className="fas fa-list text-blue-600"></i> Recent Expenses
                  {expenses.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-slate-500">
                      ({expenses.length} total)
                    </span>
                  )}
                </h2>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing || !isConnected || !isCorrectNetwork}
                  className="text-blue-500 hover:text-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <i
                    className={`fas fa-sync-alt ${refreshing ? "fa-spin" : ""}`}
                  ></i>
                </button>
              </div>
              <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                {!isConnected || !isCorrectNetwork ? (
                  <div className="text-center text-slate-400 py-8">
                    <i className="fas fa-wallet text-4xl mb-2 block"></i>
                    <p>Connect to Sepolia to view expenses</p>
                  </div>
                ) : expenses.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">
                    <i className="fas fa-receipt text-4xl mb-2 block"></i>
                    <p>No expenses yet</p>
                    <p className="text-xs mt-1">Add your first expense!</p>
                  </div>
                ) : (
                  expenses.map((exp) => (
                    <div
                      key={exp.id}
                      className={`bg-gray-50 rounded-lg p-3 border mb-2 transition-all hover:shadow-md ${
                        exp.status === 3
                          ? "border-red-400 bg-red-50"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-slate-800">
                            {exp.expname}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5">
                            <i className="fas fa-map-pin mr-1"></i>{" "}
                            {exp.paddress || "No location"}
                          </div>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            exp.status === 0
                              ? "bg-yellow-100 text-yellow-700"
                              : exp.status === 1
                                ? "bg-green-100 text-green-700"
                                : exp.status === 2
                                  ? "bg-red-100 text-red-700"
                                  : "bg-red-200 text-red-800"
                          }`}
                        >
                          {exp.statusText}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600 mt-1">
                        💰{" "}
                        <span className="font-medium">
                          {exp.amt.toFixed(4)} ETH
                        </span>
                        <span className="mx-2">•</span>
                        👤 Paid by:{" "}
                        <span className="font-medium">{exp.paidby}</span>
                      </div>
                      <div className="text-xs text-slate-500">
                        👥 <span className="font-medium">{exp.person1}</span> &{" "}
                        <span className="font-medium">{exp.person2}</span>
                        owe{" "}
                        <span className="font-medium">
                          {exp.shareAmount}
                        </span>{" "}
                        ETH each
                      </div>
                      {exp.status === 3 && (
                        <div className="mt-1 text-xs text-red-600 bg-red-100 p-1 rounded">
                          <i className="fas fa-exclamation-triangle mr-1"></i>
                          Bad Debt: {exp.person1} & {exp.person2} haven't paid
                          their shares
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* How it works */}
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-200">
              <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                <i className="fas fa-info-circle"></i> How it works
              </h4>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>
                  1️⃣ Enter expense details (Payer + 2 participants = 3 total
                  people)
                </li>
                <li>2️⃣ Add wallet addresses for each person</li>
                <li>3️⃣ Add expense to the blockchain</li>
                <li>4️⃣ Each person owes 33.33% of total amount</li>
                <li>5️⃣ Select "Bad Debt" to mark someone who didn't pay</li>
                <li>6️⃣ Mint NFT receipt for paid expenses</li>
                <li>7️⃣ Click "Import to MetaMask" to view your NFTs</li>
                <li>⚠️ Make sure you're on Sepolia network!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
