// Main Expense Sharing App - NFT.Storage Version with Dynamic Participants

import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { contractABI } from "./abi";
import { nftABI } from "./nftABI";
import { NFTStorage, Blob } from "nft.storage";
import "globalthis/auto";

// sepolia and nft contract address
const CONTRACT_ADDRESS = "0x5e8013685a6fd02D54C500A8cDaf200Cf46cF7a0";
const NFT_CONTRACT_ADDRESS = "0xB8B77bDfFb937714493eFB7F94801A07AA1e1a8a";
const SEPOLIA_CHAIN_ID = "0xaa36a7";

// this is storage where ntf is beieng stroed form nft.storage
const NFT_STORAGE_TOKEN = "a51e2152.69296186cb8c49db991b66c5b4d63254";
const nftStorage = new NFTStorage({ token: NFT_STORAGE_TOKEN });

// image for the nft
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%236C63FF'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='white' text-anchor='middle' dominant-baseline='central'%3E💰 Expense NFT%3C/text%3E%3C/svg%3E";

function App() {
  // for the wallet, here are the state of metawallet
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [walletAddress, setWalletAddress] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [networkError, setNetworkError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);

  // tese are the payment state form the user
  const [requestRecipient, setRequestRecipient] = useState("");
  const [requestAmount, setRequestAmount] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [showRequests, setShowRequests] = useState(false);
  const [requestLoading, setRequestLoading] = useState(false);

  // for handling dynamic participants
  const [expenseName, setExpenseName] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [payerAddress, setPayerAddress] = useState("");
  const [participants, setParticipants] = useState([
    { name: "", address: "" },
    { name: "", address: "" },
  ]);
  const [location, setLocation] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("0");
  const [badDebtPerson, setBadDebtPerson] = useState("");
  const [badDebtAddress, setBadDebtAddress] = useState("");
  const [participantCount, setParticipantCount] = useState(2);

  // this are the state of the edxpense app
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
  const [uploading, setUploading] = useState(false);

  // non fungiblle token state
  const [userNFTs, setUserNFTs] = useState([]);
  const [nftContract, setNftContract] = useState(null);
  const [nftImage, setNftImage] = useState(null);
  const [nftImageFile, setNftImageFile] = useState(null);
  const [selectedExpenseForNFT, setSelectedExpenseForNFT] = useState("");
  const [mintingNFT, setMintingNFT] = useState(false);

  // for the seepolia to be used
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

  // here init ether
  const initEthers = useCallback(async () => {
    if (window.ethereum) {
      try {
        const providerInstance = new ethers.providers.Web3Provider(
          window.ethereum,
        );
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

  // nft.st0rage uplloading function
  const uploadToNFTStorage = useCallback(async (file) => {
    try {
      const cid = await nftStorage.storeBlob(file);
      const url = `https://${cid}.ipfs.nftstorage.link/${file.name}`;
      console.log("✅ File uploaded to NFT.Storage:", url);
      return url;
    } catch (error) {
      console.error("❌ Upload to NFT.Storage failed:", error);
      throw error;
    }
  }, []);

  const uploadMetadataToNFTStorage = useCallback(async (metadata) => {
    try {
      const metadataBlob = new Blob([JSON.stringify(metadata)], {
        type: "application/json",
      });
      const metadataFile = new File([metadataBlob], "metadata.json");
      const cid = await nftStorage.storeBlob(metadataFile);
      const url = `https://${cid}.ipfs.nftstorage.link/metadata.json`;
      console.log("✅ Metadata uploaded to NFT.Storage:", url);
      return url;
    } catch (error) {
      console.error("❌ Metadata upload failed:", error);
      throw error;
    }
  }, []);

  // loaidng the nft of user from nft.storage
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
            if (
              tokenURI.includes("QmPlaceholder") ||
              tokenURI.includes("via.placeholder") ||
              tokenURI.includes("data:image")
            ) {
              nfts.push({
                tokenId: tokenId.toString(),
                image: PLACEHOLDER_IMAGE,
                metadata: { name: "Expense NFT" },
              });
              continue;
            }
            // fetching the metamask
            let metadata = { name: "Expense NFT" };
            let image = PLACEHOLDER_IMAGE;
            try {
              const response = await fetch(tokenURI);
              if (response.ok) {
                metadata = await response.json();
                image = metadata.image || PLACEHOLDER_IMAGE;
              } else {
                console.log(
                  `⚠️ Failed to fetch metadata for token ${tokenId}, using placeholder`,
                );
                image = PLACEHOLDER_IMAGE;
              }
            } catch (err) {
              console.log(
                `⚠️ Error fetching metadata for token ${tokenId}, using placeholder`,
              );
              image = PLACEHOLDER_IMAGE;
            }
            nfts.push({
              tokenId: tokenId.toString(),
              tokenURI,
              metadata,
              image: image,
            });
          } catch (err) {
            console.error("Error loading NFT:", err);
            nfts.push({
              tokenId: tokenIds[i].toString(),
              image: PLACEHOLDER_IMAGE,
              metadata: { name: "Expense NFT" },
            });
          }
        }
        setUserNFTs(nfts);
      } catch (error) {
        console.error("Failed to load NFTs:", error);
        setUserNFTs([]);
      }
    },
    [walletAddress],
  );

  // loading expenses
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
          const amtEth = parseFloat(ethers.utils.formatEther(exp.amt));
          totalAmt += amtEth;
          const statusValue = Number(exp.status);
          if (statusValue === 0) pending++;
          let statusText = "⏳ Pending";
          if (statusValue === 1) statusText = "✅ Paid";
          else if (statusValue === 2) statusText = "❌ Rejected";
          else if (statusValue === 3) statusText = "⚠️ Bad Debt";
          // Get participants
          let participants = [];
          let participantNames = [];
          try {
            const [addresses, names] =
              await contractInstance.getParticipants(i);
            participants = addresses;
            participantNames = names;
          } catch (err) {
            console.log("Could not fetch participants for expense", i);
          }
          // Check for bad debtors
          if (statusValue === 3 || statusValue === 0) {
            try {
              const badDebtorsList = await contractInstance.getBadDebtors(i);
              for (let j = 0; j < badDebtorsList.length; j++) {
                const nameIndex = participants.indexOf(badDebtorsList[j]);
                debtors.push({
                  name:
                    nameIndex >= 0
                      ? participantNames[nameIndex] || `Participant ${j + 1}`
                      : `Participant ${j + 1}`,
                  address: badDebtorsList[j],
                  amount: parseFloat(
                    ethers.utils.formatEther(exp.shareamount || 0),
                  ),
                  expname: exp.expname || "Unknown",
                  role: "Participant",
                });
              }
            } catch (err) {
              console.log("Could not fetch bad debtors for expense", i);
            }
          }
          const shareAmountEth = parseFloat(
            ethers.utils.formatEther(exp.shareamount || 0),
          );
          expenseList.push({
            id: i,
            expname: exp.expname || "Unknown",
            paidby: exp.paidby || "Unknown",
            payerAddress: exp.payerAddress || "Unknown",
            paddress: exp.paddress || "Unknown",
            amt: amtEth,
            shareamount: shareAmountEth,
            status: statusValue,
            statusText: statusText,
            shareAmount:
              participants.length > 0
                ? (amtEth / (participants.length + 1)).toFixed(4)
                : "0",
            participantCount: participants.length,
            participants: participants,
            participantNames: participantNames,
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

  // loading the pament state and other
  const loadPaymentRequests = useCallback(
    async (contractInstance) => {
      if (!contractInstance) return;
      try {
        if (typeof contractInstance.getPaymentRequestCount !== "function") {
          console.log("ℹ️ Payment requests not supported by this contract");
          setAllRequests([]);
          setPendingRequests([]);
          return;
        }
        const totalRequests = await contractInstance.getPaymentRequestCount();
        const requests = [];
        for (let i = 0; i < Number(totalRequests); i++) {
          try {
            const req = await contractInstance.getPaymentRequest(i);
            const amountEth = parseFloat(ethers.utils.formatEther(req.amount));
            requests.push({
              id: i,
              from: req.from,
              to: req.to,
              amount: amountEth,
              reason: req.reason,
              isPaid: req.isPaid,
              timestamp: new Date(
                Number(req.timestamp) * 1000,
              ).toLocaleString(),
            });
          } catch (err) {
            console.error(`Error loading request ${i}:`, err);
          }
        }
        setAllRequests(requests);
        if (walletAddress) {
          const pending =
            await contractInstance.getPendingRequests(walletAddress);
          const pendingList = [];
          for (let i = 0; i < pending.length; i++) {
            const amountEth = parseFloat(
              ethers.utils.formatEther(pending[i].amount),
            );
            pendingList.push({
              from: pending[i].from,
              amount: amountEth,
              reason: pending[i].reason,
              isPaid: pending[i].isPaid,
              timestamp: new Date(
                Number(pending[i].timestamp) * 1000,
              ).toLocaleString(),
            });
          }
          setPendingRequests(pendingList);
        }
        console.log(`✅ Loaded ${requests.length} payment requests`);
      } catch (error) {
        console.log("ℹ️ Payment requests not available");
        setAllRequests([]);
        setPendingRequests([]);
      }
    },
    [walletAddress],
  );

  // connect wallet
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
      const signerInstance = providerInstance.getSigner();
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
      const checksumAddress = ethers.utils.getAddress(CONTRACT_ADDRESS);
      const contractInstance = new ethers.Contract(
        checksumAddress,
        contractABI,
        signerInstance,
      );
      setSigner(signerInstance);
      setContract(contractInstance);
      setWalletAddress(address);
      setIsConnected(true);
      const nftContractInstance = new ethers.Contract(
        NFT_CONTRACT_ADDRESS,
        nftABI,
        signerInstance,
      );
      setNftContract(nftContractInstance);
      await loadUserNFTs(nftContractInstance);
      const balance = await providerInstance.getBalance(CONTRACT_ADDRESS);
      const ethBalance = parseFloat(ethers.utils.formatEther(balance)).toFixed(
        4,
      );
      setDebugInfo((prev) => prev + ` | Balance: ${ethBalance} ETH`);
      await loadExpenses(contractInstance);
      await loadPaymentRequests(contractInstance);
      await getContractBalance(providerInstance);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      setError("Failed to connect wallet: " + error.message);
      setIsLoading(false);
    }
  }, [initEthers, loadPaymentRequests, loadUserNFTs]);

  // discconnect wallet
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

  // importing to mmetamask (NFT)
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

  // minting the nft
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
      setUploading(true);
      const expense = expenses.find(
        (e) => e.id === parseInt(selectedExpenseForNFT),
      );
      if (!expense) {
        alert("Expense not found");
        return;
      }
      let imageUrl = PLACEHOLDER_IMAGE;
      if (nftImageFile) {
        try {
          imageUrl = await uploadToNFTStorage(nftImageFile);
          console.log("✅ Image uploaded to NFT.Storage:", imageUrl);
        } catch (uploadError) {
          console.error("Image upload failed:", uploadError);
        }
      }
      let participantList = "";
      if (expense.participantNames && expense.participantNames.length > 0) {
        participantList = expense.participantNames.join(", ");
      } else {
        participantList = `${expense.participantCount} participants`;
      }
      const metadata = {
        name: `Expense: ${expense.expname}`,
        description: `${expense.paidby} paid ${expense.amt.toFixed(4)} ETH for ${expense.expname}. Shared with ${expense.participantCount} participants: ${participantList}.`,
        image: imageUrl,
        attributes: [
          { trait_type: "Expense Name", value: expense.expname },
          { trait_type: "Amount", value: `${expense.amt.toFixed(4)} ETH` },
          { trait_type: "Paid By", value: expense.paidby },
          { trait_type: "Participants", value: expense.participantCount },
          { trait_type: "Location", value: expense.paddress || "Unknown" },
          { trait_type: "Date", value: new Date().toLocaleDateString() },
        ],
      };
      let metadataUrl = PLACEHOLDER_IMAGE;
      try {
        metadataUrl = await uploadMetadataToNFTStorage(metadata);
        console.log("✅ Metadata uploaded to NFT.Storage:", metadataUrl);
      } catch (uploadError) {
        console.error("Metadata upload failed:", uploadError);
      }
      setUploading(false);
      const tx = await nftContract.mintExpenseNFT(
        walletAddress,
        metadataUrl,
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
      setUploading(false);
    }
  }, [
    nftContract,
    isConnected,
    walletAddress,
    selectedExpenseForNFT,
    expenses,
    nftImageFile,
    loadUserNFTs,
    uploadToNFTStorage,
    uploadMetadataToNFTStorage,
  ]);

  // ===== GET CONTRACT BALANCE =====
  const getContractBalance = useCallback(async (providerInstance) => {
    if (!providerInstance) return;
    try {
      const balance = await providerInstance.getBalance(CONTRACT_ADDRESS);
      const ethBalance = parseFloat(ethers.utils.formatEther(balance)).toFixed(
        4,
      );
      setContractBalance(ethBalance);
    } catch (error) {
      console.error("Failed to get contract balance:", error);
    }
  }, []);

  // spliting the amount in friends equally
  const updateSplitAmount = useCallback(() => {
    const amt = parseFloat(amount) || 0;
    const totalPeople = participants.length + 1;
    const split =
      totalPeople > 0 && amt > 0 ? (amt / totalPeople).toFixed(4) : "0.0000";
    setSplitAmount(split);
    return split;
  }, [amount, participants]);

  useEffect(() => {
    updateSplitAmount();
  }, [amount, participants, updateSplitAmount]);

  const handleAmountChange = (e) => {
    const value = e.target.value;
    setAmount(value);
  };

  // Handle participant changes
  const handleParticipantChange = (index, field, value) => {
    const newParticipants = [...participants];
    newParticipants[index][field] = value;
    setParticipants(newParticipants);
  };

  // Add participant
  const addParticipant = () => {
    if (participants.length < 10) {
      setParticipants([...participants, { name: "", address: "" }]);
      setParticipantCount(participants.length + 1);
    } else {
      alert("Maximum 10 participants allowed");
    }
  };

  // Remove participant
  const removeParticipant = (index) => {
    if (participants.length > 1) {
      const newParticipants = participants.filter((_, i) => i !== index);
      setParticipants(newParticipants);
      setParticipantCount(newParticipants.length);
    } else {
      alert("At least 1 participant required");
    }
  };

  //adding new expenses
  const addExpense = useCallback(async () => {
    if (!contract || !isConnected) {
      alert("Please connect wallet first");
      return;
    }
    if (!expenseName || !paidBy || !amount || !payerAddress) {
      alert("Please fill all required fields including payer's wallet address");
      return;
    }
    const validParticipants = participants.filter((p) => p.name && p.address);
    if (validParticipants.length === 0) {
      alert("Please add at least one participant with name and address");
      return;
    }
    if (parseFloat(amount) <= 0) {
      alert("Amount must be greater than 0");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const amt = ethers.utils.parseEther(amount);
      const statusValue = parseInt(status);
      const participantAddresses = validParticipants.map((p) => p.address);
      const participantNames = validParticipants.map((p) => p.name);
      console.log("Status value:", statusValue);
      console.log("Participants:", participantAddresses);
      const tx = await contract.addExpense(
        expenseName,
        paidBy,
        payerAddress,
        participantAddresses,
        participantNames,
        location || "Unknown",
        amt,
        statusValue,
      );
      await tx.wait();
      setExpenseName("");
      setPaidBy("");
      setPayerAddress("");
      setParticipants([
        { name: "", address: "" },
        { name: "", address: "" },
      ]);
      setLocation("");
      setAmount("");
      setSplitAmount("0");
      setStatus("0");
      setShowBadDebt(false);
      setBadDebtPerson("");
      setBadDebtAddress("");
      setParticipantCount(2);
      await loadExpenses(contract);
      await loadPaymentRequests(contract);
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
    payerAddress,
    participants,
    amount,
    status,
    location,
    provider,
    loadExpenses,
    loadPaymentRequests,
    getContractBalance,
    nftContract,
    loadUserNFTs,
  ]);

  // Mark participant as paid
  const markParticipantPaid = useCallback(
    async (expenseId, participantAddress) => {
      if (!contract || !isConnected) {
        alert("Please connect wallet first");
        return;
      }
      try {
        setLoading(true);
        const tx = await contract.markParticipantPaid(
          expenseId,
          participantAddress,
        );
        await tx.wait();
        await loadExpenses(contract);
        alert("✅ Participant marked as paid!");
      } catch (error) {
        console.error("Failed to mark participant as paid:", error);
        alert("Failed: " + (error.reason || error.message));
      } finally {
        setLoading(false);
      }
    },
    [contract, isConnected, loadExpenses],
  );

  // Request payment from payer for a specific expense
  const requestPaymentFromPayer = useCallback(
    async (expenseId) => {
      if (!contract || !isConnected) {
        alert("Please connect wallet first");
        return;
      }
      try {
        setLoading(true);
        const tx = await contract.requestPaymentFromPayer(expenseId);
        await tx.wait();
        await loadPaymentRequests(contract);
        alert("✅ Payment request sent to the payer!");
      } catch (error) {
        console.error("❌ Failed to request payment:", error);
        alert("Failed to request payment: " + (error.reason || error.message));
      } finally {
        setLoading(false);
      }
    },
    [contract, isConnected, loadPaymentRequests],
  );

  // status channge hadling
  const handleStatusChange = (e) => {
    const value = e.target.value;
    setStatus(value);
    setShowBadDebt(value === "3");
    if (value !== "3") {
      setBadDebtPerson("");
      setBadDebtAddress("");
    }
  };

  // =format address
  const formatAddress = (address) => {
    if (!address) return "";
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // handling payment rewuest
  const handleRequestPayment = useCallback(async () => {
    if (!contract || !isConnected) {
      alert("Please connect wallet");
      return;
    }
    if (!requestRecipient || !requestAmount || !requestReason) {
      alert("Please fill all fields");
      return;
    }
    try {
      setRequestLoading(true);
      const amt = ethers.utils.parseEther(requestAmount);
      const tx = await contract.requestPayment(
        requestRecipient,
        amt,
        requestReason,
      );
      await tx.wait();
      await loadPaymentRequests(contract);
      setRequestRecipient("");
      setRequestAmount("");
      setRequestReason("");
      alert("✅ Payment request sent!");
    } catch (error) {
      console.error("❌ Failed to request payment:", error);
      alert("Failed to request payment: " + (error.reason || error.message));
    } finally {
      setRequestLoading(false);
    }
  }, [
    contract,
    isConnected,
    requestRecipient,
    requestAmount,
    requestReason,
    loadPaymentRequests,
  ]);

  //  PAY REQUEST
  const payRequest = useCallback(
    async (requestId, amount) => {
      if (!contract || !isConnected) {
        alert("Please connect wallet");
        return;
      }
      try {
        setLoading(true);
        const amt = ethers.utils.parseEther(amount.toString());
        const tx = await contract.payRequest(requestId, { value: amt });
        await tx.wait();
        await loadPaymentRequests(contract);
        alert("✅ Payment sent successfully!");
      } catch (error) {
        console.error("❌ Failed to pay:", error);
        alert("Failed to pay: " + (error.reason || error.message));
      } finally {
        setLoading(false);
      }
    },
    [contract, isConnected, loadPaymentRequests],
  );

  //  USE EFFECTS
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

              {/* Participant Count Selector */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <label className="text-sm font-semibold text-blue-700 block mb-2">
                  Number of Participants
                </label>
                <div className="flex gap-2 items-center">
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={participants.length}
                    onChange={(e) => {
                      const count = parseInt(e.target.value);
                      const currentCount = participants.length;
                      if (count > currentCount) {
                        const newParticipants = [...participants];
                        for (let i = currentCount; i < count; i++) {
                          newParticipants.push({ name: "", address: "" });
                        }
                        setParticipants(newParticipants);
                        setParticipantCount(count);
                      } else if (count < currentCount && count >= 1) {
                        setParticipants(participants.slice(0, count));
                        setParticipantCount(count);
                      }
                    }}
                    className="flex-1"
                    disabled={!isConnected || !isCorrectNetwork}
                  />
                  <span className="font-bold text-blue-700 min-w-[30px] text-center">
                    {participants.length}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Slide to adjust number of participants (minimum 1)
                </p>
              </div>

              {/* Dynamic Participants */}
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-semibold text-blue-700">
                    Participants Who Owe Money ({participants.length} people)
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={addParticipant}
                      disabled={
                        !isConnected ||
                        !isCorrectNetwork ||
                        participants.length >= 10
                      }
                      className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
                    >
                      <i className="fas fa-plus"></i> Add
                    </button>
                  </div>
                </div>

                {participants.map((participant, index) => (
                  <div
                    key={index}
                    className="mt-2 p-2 bg-white rounded border border-blue-200"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder={`Participant ${index + 1} name`}
                          className="w-full border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={participant.name}
                          onChange={(e) =>
                            handleParticipantChange(
                              index,
                              "name",
                              e.target.value,
                            )
                          }
                          disabled={!isConnected || !isCorrectNetwork}
                        />
                        <input
                          type="text"
                          placeholder="Wallet address"
                          className="w-full border rounded-lg p-2 mt-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={participant.address}
                          onChange={(e) =>
                            handleParticipantChange(
                              index,
                              "address",
                              e.target.value,
                            )
                          }
                          disabled={!isConnected || !isCorrectNetwork}
                        />
                      </div>
                      {participants.length > 1 && (
                        <button
                          onClick={() => removeParticipant(index)}
                          disabled={!isConnected || !isCorrectNetwork}
                          className="text-red-500 hover:text-red-700 ml-2 mt-1 disabled:opacity-50"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Owes: {splitAmount} ETH
                    </div>
                  </div>
                ))}
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
                  Total: {amount || "0"} ETH (split equally between payer +{" "}
                  {participants.length} participants = {participants.length + 1}{" "}
                  people total)
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
                    {participants.map((p, idx) => (
                      <option key={idx} value={`participant${idx}`}>
                        {p.name || `Participant ${idx + 1}`}
                      </option>
                    ))}
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

            {/* Payment Requests Section */}
            <div className="bg-purple-50 rounded-2xl shadow-xl p-6 border-2 border-purple-200">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-purple-700 flex items-center gap-2">
                  <i className="fas fa-hand-holding-usd"></i> Payment Requests
                  {pendingRequests.length > 0 && (
                    <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                      {pendingRequests.length}
                    </span>
                  )}
                </h3>
                <button
                  onClick={() => setShowRequests(!showRequests)}
                  className="text-purple-600 hover:text-purple-800"
                >
                  <i
                    className={`fas fa-chevron-${showRequests ? "up" : "down"}`}
                  ></i>
                </button>
              </div>

              {showRequests && (
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded-lg border border-purple-200">
                    <h4 className="font-semibold text-purple-800 text-sm mb-2">
                      Request Payment
                    </h4>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Friend's wallet address (0x...)"
                        className="w-full border rounded p-2 text-sm"
                        value={requestRecipient}
                        onChange={(e) => setRequestRecipient(e.target.value)}
                        disabled={!isConnected || !isCorrectNetwork}
                      />
                      <input
                        type="number"
                        step="0.001"
                        placeholder="Amount (ETH)"
                        className="w-full border rounded p-2 text-sm"
                        value={requestAmount}
                        onChange={(e) => setRequestAmount(e.target.value)}
                        disabled={!isConnected || !isCorrectNetwork}
                      />
                      <input
                        type="text"
                        placeholder="Reason (e.g., Dinner share)"
                        className="w-full border rounded p-2 text-sm"
                        value={requestReason}
                        onChange={(e) => setRequestReason(e.target.value)}
                        disabled={!isConnected || !isCorrectNetwork}
                      />
                      <button
                        onClick={handleRequestPayment}
                        disabled={
                          requestLoading || !isConnected || !isCorrectNetwork
                        }
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded text-sm"
                      >
                        {requestLoading ? "Sending..." : "Request Payment"}
                      </button>
                    </div>
                  </div>

                  {pendingRequests.length > 0 && (
                    <div className="bg-white p-3 rounded-lg border border-purple-200 max-h-40 overflow-y-auto">
                      <h4 className="font-semibold text-purple-800 text-sm mb-2">
                        You Owe
                      </h4>
                      {pendingRequests.map((req, index) => (
                        <div
                          key={index}
                          className="border-b border-gray-100 py-2 last:border-0"
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-sm font-semibold">
                                {req.reason}
                              </p>
                              <p className="text-xs text-gray-500">
                                From: {formatAddress(req.from)} | Amount:{" "}
                                {req.amount.toFixed(3)} ETH
                              </p>
                            </div>
                            <button
                              onClick={() => payRequest(index, req.amount)}
                              disabled={loading}
                              className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
                            >
                              Pay
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {allRequests.length > 0 && (
                    <div className="bg-white p-3 rounded-lg border border-purple-200 max-h-40 overflow-y-auto">
                      <h4 className="font-semibold text-purple-800 text-sm mb-2">
                        Request History
                      </h4>
                      {allRequests.map((req, index) => (
                        <div
                          key={index}
                          className={`border-b border-gray-100 py-1 last:border-0 ${req.isPaid ? "bg-green-50" : ""}`}
                        >
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold">{req.reason}</span>
                            <span
                              className={
                                req.isPaid
                                  ? "text-green-600"
                                  : "text-yellow-600"
                              }
                            >
                              {req.isPaid ? "✅ Paid" : "⏳ Pending"}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatAddress(req.from)} → {formatAddress(req.to)}{" "}
                            | {req.amount.toFixed(3)} ETH
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
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
                              {debtor.role || "Participant"}
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
                        {exp.expname} - {exp.amt.toFixed(4)} ETH (
                        {exp.participantCount} participants)
                      </option>
                    ))}
                </select>

                <button
                  onClick={mintExpenseNFT}
                  disabled={
                    mintingNFT ||
                    uploading ||
                    !selectedExpenseForNFT ||
                    !isConnected ||
                    !isCorrectNetwork
                  }
                  className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 ${
                    mintingNFT ||
                    uploading ||
                    !selectedExpenseForNFT ||
                    !isConnected ||
                    !isCorrectNetwork
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  } text-white font-semibold`}
                >
                  {uploading ? (
                    <>
                      <i className="fas fa-cloud-upload-alt fa-spin"></i>
                      Uploading to IPFS...
                    </>
                  ) : mintingNFT ? (
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
                          {exp.payerAddress && (
                            <div className="text-xs text-blue-600 mt-0.5">
                              <i className="fas fa-user mr-1"></i>
                              Payer Wallet: {formatAddress(exp.payerAddress)}
                            </div>
                          )}
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
                        <span className="mx-2">•</span>
                        👥{" "}
                        <span className="font-medium">
                          {exp.participantCount}
                        </span>{" "}
                        participants
                      </div>
                      <div className="text-xs text-slate-500">
                        Each owes:{" "}
                        <span className="font-medium">{exp.shareAmount}</span>{" "}
                        ETH
                      </div>
                      {exp.participantNames &&
                        exp.participantNames.length > 0 && (
                          <div className="text-xs text-slate-400 mt-1">
                            Participants: {exp.participantNames.join(", ")}
                          </div>
                        )}
                      {exp.status === 3 && (
                        <div className="mt-1 text-xs text-red-600 bg-red-100 p-1 rounded">
                          <i className="fas fa-exclamation-triangle mr-1"></i>
                          Bad Debt: Some participants haven't paid their shares
                        </div>
                      )}

                      {/* Request Payment Button - Show only for pending expenses and if user is a participant */}
                      {(exp.status === 0 || exp.status === 3) &&
                        isConnected && (
                          <div className="mt-2 flex gap-2 flex-wrap">
                            {exp.participants &&
                              exp.participants.includes(walletAddress) && (
                                <button
                                  onClick={() =>
                                    requestPaymentFromPayer(exp.id)
                                  }
                                  disabled={loading}
                                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs flex items-center gap-1"
                                >
                                  <i className="fas fa-hand-holding-usd"></i>
                                  Request Payment
                                </button>
                              )}
                            {/* Mark as paid button for payer only */}
                            {exp.payerAddress &&
                              exp.payerAddress.toLowerCase() ===
                                walletAddress.toLowerCase() && (
                                <div className="flex gap-1 flex-wrap">
                                  {exp.participants &&
                                    exp.participants.map((participant, idx) => (
                                      <button
                                        key={idx}
                                        onClick={() =>
                                          markParticipantPaid(
                                            exp.id,
                                            participant,
                                          )
                                        }
                                        disabled={loading}
                                        className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs"
                                      >
                                        Mark{" "}
                                        {exp.participantNames[idx] ||
                                          `P${idx + 1}`}{" "}
                                        Paid
                                      </button>
                                    ))}
                                </div>
                              )}
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
                <li>1️⃣ Enter expense details (Payer + dynamic participants)</li>
                <li>2️⃣ Add wallet addresses for each participant</li>
                <li>3️⃣ Add expense to the blockchain</li>
                <li>4️⃣ Each person owes an equal share of total amount</li>
                <li>5️⃣ Select "Bad Debt" to mark someone who didn't pay</li>
                <li>6️⃣ Participants can request payment from the payer</li>
                <li>7️⃣ Payer can mark individual participants as paid</li>
                <li>8️⃣ Mint NFT receipt for paid expenses</li>
                <li>9️⃣ Click "Import to MetaMask" to view your NFTs</li>
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
