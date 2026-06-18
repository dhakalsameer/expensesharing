// App.jsx
import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { contractABI } from "./abi";

const CONTRACT_ADDRESS = "0xfa4e88f0a0d7cdfc6472ed91da5672def7fc9b9f";

function Expapp() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [networkError, setNetworkError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);

  // Form states
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

  // UI states
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

  // Check and switch to Sepolia network
  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: SEPOLIA_CHAIN_ID }],
      });
    } catch (switchError) {
      // If Sepolia is not added to MetaMask
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

  // Initialize ethers
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

      // First, try to switch to Sepolia
      await switchToSepolia();

      const providerInstance = await initEthers();
      if (!providerInstance) {
        setIsLoading(false);
        return;
      }

      await providerInstance.send("eth_requestAccounts", []);
      const signerInstance = await providerInstance.getSigner();
      const address = await signerInstance.getAddress();

      // Get network info
      const network = await providerInstance.getNetwork();
      console.log("🌐 Network:", network);
      const chainId = Number(network.chainId);

      // Check if we're on Sepolia
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

      // Debug: List all functions in the contract
      console.log("🔍 Contract functions:");
      const functions = Object.keys(contractInstance).filter(
        (key) =>
          typeof contractInstance[key] === "function" && !key.startsWith("_"),
      );
      console.log("Available functions:", functions);
      setDebugInfo((prev) => prev + ` | Functions: ${functions.join(", ")}`);

      // Check contract balance
      const balance = await providerInstance.getBalance(CONTRACT_ADDRESS);
      const ethBalance = parseFloat(ethers.formatEther(balance)).toFixed(4);
      console.log("💰 Contract ETH Balance:", ethBalance);
      setDebugInfo((prev) => prev + ` | Contract Balance: ${ethBalance} ETH`);

      // Load data after connection
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
    setNetworkError("");
    setDataLoaded(false);
    setError("");
    setDebugInfo("");
  }, []);

  // Get contract balance
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

  // Load expenses from contract
  const loadExpenses = useCallback(async (contractInstance) => {
    if (!contractInstance) {
      console.log("No contract instance");
      return;
    }

    try {
      setRefreshing(true);
      setError("");
      console.log("🔄 Loading expenses from Sepolia blockchain...");
      console.log("📋 Contract address:", CONTRACT_ADDRESS);

      // Try to get length
      let totalCount = 0;
      try {
        console.log("📞 Calling getLength()...");
        const length = await contractInstance.getLength();
        totalCount = Number(length);
        console.log(`📊 getLength() returned: ${totalCount}`);
        setDebugInfo((prev) => prev + ` | Total Expenses: ${totalCount}`);
      } catch (err) {
        console.log("⚠️ getLength() failed:", err.message);
        totalCount = 0;
      }

      if (totalCount === 0) {
        console.log("📭 No expenses found");
        setExpenses([]);
        setTotalExpenses(0);
        setTotalAmount(0);
        setPendingCount(0);
        setBadDebtors([]);
        setDataLoaded(true);
        setRefreshing(false);
        setDebugInfo((prev) => prev + " | No expenses found");
        return;
      }

      const expenseList = [];
      let totalAmt = 0;
      let pending = 0;
      const debtors = [];

      // Load all expenses
      console.log(`📥 Loading ${totalCount} expenses...`);
      for (let i = 0; i < totalCount; i++) {
        try {
          console.log(`📞 Calling getExpense(${i})...`);
          const exp = await contractInstance.getExpense(i);
          console.log(`✅ Expense ${i}:`, {
            expname: exp.expname,
            paidby: exp.paidby,
            amt: exp.amt.toString(),
            status: exp.status,
          });

          // Convert amounts from Wei to ETH
          const amtEth = parseFloat(ethers.formatEther(exp.amt));
          const shareAmountEth = parseFloat(
            ethers.formatEther(exp.shareamount),
          );

          totalAmt += amtEth;

          // Count pending expenses
          if (Number(exp.status) === 0) pending++;

          const statusText =
            ["⏳ Pending", "✅ Paid", "❌ Rejected", "⚠️ Bad Debt"][
              Number(exp.status)
            ] || "Unknown";

          expenseList.push({
            id: i,
            expname: exp.expname || "Unknown",
            paidby: exp.paidby || "Unknown",
            person1: exp.person1 || "Unknown",
            person2: exp.person2 || "Unknown",
            paddress: exp.paddress || "Unknown",
            amt: amtEth,
            shareamount: shareAmountEth,
            status: Number(exp.status),
            statusText,
            shareAmount: shareAmountEth.toFixed(4),
          });

          // Track bad debtors
          if (Number(exp.status) === 3) {
            debtors.push({
              name: exp.paidby || "Unknown",
              address: exp.paddress || "Unknown",
              amount: amtEth,
            });
          }
        } catch (err) {
          console.error(`❌ Error loading expense ${i}:`, err);
        }
      }

      // Sort expenses by ID (newest first)
      expenseList.reverse();

      // Set all states
      setExpenses(expenseList);
      setTotalExpenses(expenseList.length);
      setTotalAmount(totalAmt);
      setPendingCount(pending);
      setBadDebtors(debtors);
      setDataLoaded(true);

      console.log("✅ Expenses loaded successfully:", {
        total: expenseList.length,
        amount: totalAmt.toFixed(4) + " ETH",
        pending: pending,
        badDebtors: debtors.length,
      });
      setDebugInfo(
        (prev) => prev + ` | Loaded: ${expenseList.length} expenses`,
      );
    } catch (error) {
      console.error("❌ Failed to load expenses:", error);
      setError("Failed to load expenses: " + error.message);
      setDataLoaded(true);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Update split amount
  const updateSplitAmount = useCallback((value) => {
    const amt = parseFloat(value) || 0;
    const split = (amt / 3).toFixed(4);
    setSplitAmount(split);
    return split;
  }, []);

  // Handle amount change
  const handleAmountChange = (e) => {
    const value = e.target.value;
    setAmount(value);
    updateSplitAmount(value);
  };

  // Add expense
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

      // Convert amount to Wei
      const amt = ethers.parseEther(amount);
      const statusValue = parseInt(status);

      console.log("📝 Adding expense on Sepolia:", {
        expname: expenseName,
        paidby: paidBy,
        person1,
        person2,
        paddress: location || "Unknown Location",
        amt: amount,
        status: statusValue,
      });

      // Call the addExpense function on the contract
      const tx = await contract.addExpense(
        expenseName,
        paidBy,
        person1,
        person2,
        location || "Unknown Location",
        amt,
        statusValue,
        { value: amt },
      );

      console.log("⏳ Waiting for transaction...", tx.hash);
      await tx.wait();
      console.log("✅ Transaction confirmed!", tx.hash);

      // Clear form
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

      // Reload data
      await loadExpenses(contract);
      await getContractBalance(provider);

      alert("✅ Expense Added Successfully!");
    } catch (error) {
      console.error("❌ Failed to add expense:", error);
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
  ]);

  // Handle status change
  const handleStatusChange = (e) => {
    const value = e.target.value;
    setStatus(value);
    setShowBadDebt(value === "3");
    if (value !== "3") {
      setBadDebtPerson("");
      setBadDebtAddress("");
    }
  };

  // Format address for display
  const formatAddress = (address) => {
    if (!address) return "";
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // Auto-connect on mount if MetaMask is available
  useEffect(() => {
    initEthers();

    // Listen for account changes
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

  // Load expenses when contract changes
  useEffect(() => {
    if (contract && isConnected && isCorrectNetwork) {
      console.log("🔄 Contract connected on Sepolia, loading expenses...");
      loadExpenses(contract);
      getContractBalance(provider);

      // Refresh data every 15 seconds
      const interval = setInterval(() => {
        if (contract && isConnected && isCorrectNetwork) {
          console.log("🔄 Auto-refreshing data...");
          loadExpenses(contract);
          getContractBalance(provider);
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
  ]);

  // Manual refresh function
  const handleRefresh = useCallback(() => {
    if (contract && isConnected && isCorrectNetwork) {
      loadExpenses(contract);
      getContractBalance(provider);
    }
  }, [
    contract,
    isConnected,
    isCorrectNetwork,
    loadExpenses,
    getContractBalance,
    provider,
  ]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 p-6">
      <div className="w-full max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-orange-100 rounded-full mb-3">
              <i className="fas fa-users text-orange-600 text-2xl"></i>
            </div>
            <h1 className="text-3xl font-bold text-slate-800">
              💰 Expense Sharing DApp
            </h1>
            <p className="text-slate-500 text-sm mt-2">
              Split expenses with friends on Sepolia blockchain
            </p>
            {isConnected && isCorrectNetwork && (
              <span className="inline-block mt-2 px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                ✅ Connected to Sepolia
              </span>
            )}
          </div>

          {/* Wallet Connection */}
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

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Add Expense Form */}
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

              {/* Bad Debt Section */}
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
                    <option value="payer">Payer (Who paid)</option>
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
                  "Add Expense & Send ETH"
                )}
              </button>
            </div>
          </div>

          {/* Right: Expenses List & Stats */}
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

            {/* Stats Summary */}
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
                    {expenses.filter((exp) => exp.status === 3).length}
                  </span>
                </div>
              </div>
              {!dataLoaded && isConnected && isCorrectNetwork && (
                <div className="mt-3 text-center text-sm text-blue-500">
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Loading data from Sepolia...
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
                        <span className="font-semibold text-red-700">
                          {debtor.name}
                        </span>
                        <span className="text-sm font-bold text-red-600">
                          {debtor.amount.toFixed(3)} ETH
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Address: {formatAddress(debtor.address)}
                      </div>
                    </div>
                  ))
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
                        <div className="font-bold text-slate-800">
                          {exp.expname}
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
                        💰 {exp.amt.toFixed(3)} ETH | 👤 Paid by: {exp.paidby}
                      </div>
                      <div className="text-xs text-slate-500">
                        👥 {exp.person1} & {exp.person2} owe {exp.shareAmount}{" "}
                        ETH each
                      </div>
                      <div className="text-xs text-slate-500">
                        📍 {exp.paddress}
                      </div>
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
                <li>3️⃣ ETH is sent to contract when adding expense</li>
                <li>4️⃣ Each person owes 33.33% of total amount</li>
                <li>5️⃣ Select "Bad Debt" to mark someone who didn't pay</li>
                <li>⚠️ Make sure you're on Sepolia network!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Expapp;
