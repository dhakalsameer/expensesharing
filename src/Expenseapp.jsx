
import React, { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { contractABI } from "./abi";
import { nftABI } from "./NftABI";
import { useExpensesFull, useRequestsByUser, useUserExpenses } from "./graphql/hooks";

// sepolia and nft contract address
const CONTRACT_ADDRESS = "0xA486A5B2C0d6d7F268727F4373a46E356c5242CD";
const NFT_CONTRACT_ADDRESS = "0xeB3a7f80b6D3961541F17623e08751eDC2d40986";
const SEPOLIA_CHAIN_ID = "0xaa36a7";

// image for the nft
const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect width='400' height='400' fill='%236C63FF'/%3E%3Ctext x='50%25' y='50%25' font-size='24' fill='white' text-anchor='middle' dominant-baseline='central'%3E💰 Expense NFT%3C/text%3E%3C/svg%3E";

function App() {
  // ─── GraphQL: toggle to use subgraph instead of on-chain RPC ───
  // Set VITE_USE_GRAPHQL=true in .env and deploy a subgraph first.
  // Then replace loadExpenses / loadPaymentRequests with these:
  //
  //   const { data, loading } = useExpensesFull(20);
  //   const { data: reqData } = useRequestsByUser(walletAddress);
  //
  // See src/graphql/ for queries, hooks, and the subgraph/ folder
  // for the deployment manifest.
  const useGraphQL = import.meta.env.VITE_USE_GRAPHQL === "true";

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
  const [nftImported, setNftImported] = useState(false);

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

  // ✅ NEW: Upload file using Pinata
  const uploadToPinata = useCallback(async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      const url = `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
      console.log("✅ File uploaded to Pinata:", url);
      return url;
    } catch (error) {
      console.error("❌ Upload to Pinata failed:", error);
      return PLACEHOLDER_IMAGE;
    }
  }, []);

  // ✅ NEW: Upload metadata using Pinata
  const uploadMetadataToPinata = useCallback(async (metadata) => {
    try {
      const response = await fetch(
        "https://api.pinata.cloud/pinning/pinJSONToIPFS",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
          },
          body: JSON.stringify(metadata),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Metadata upload failed");
      }

      const data = await response.json();
      const url = `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
      console.log("✅ Metadata uploaded to Pinata:", url);
      return url;
    } catch (error) {
      console.error("❌ Metadata upload failed:", error);
      return PLACEHOLDER_IMAGE;
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

    // ─── GraphQL branch: skip on-chain loop if subgraph is available ───
    if (useGraphQL) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const res = await fetch(import.meta.env.VITE_SUBGRAPH_URL || "", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            query: `{ expenseAddeds(orderBy: id, orderDirection: desc) {
              id expname amt participantCount
              statuses: statusUpdateds(orderBy: blockNumber, orderDirection: desc, first: 1) { newStatus }
              payments: participantPaids(orderBy: blockNumber, orderDirection: asc) { participant amount }
            }}`,
          }),
        });
        clearTimeout(timeoutId);
        const json = await res.json();
        if (json.data?.expenseAddeds) {
          const list = json.data.expenseAddeds.map((e) => ({
            id: parseInt(e.id),
            expname: e.expname,
            amt: parseFloat(e.amt) / 1e18,
            status: e.statuses?.[0]?.newStatus === "paid" ? 1 : 0,
          }));
          setExpenses(list);
          setTotalExpenses(list.length);
          setTotalAmount(list.reduce((s, e) => s + e.amt, 0));
          setDataLoaded(true);
          setRefreshing(false);
          return;
        }
      } catch (err) {
        console.error("GraphQL fetch failed, falling back to RPC:", err);
      }
    }

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
                  expenseId: i, // ✅ Add expenseId to track which expense
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

        // Only show pending requests where USER is the recipient
        if (walletAddress) {
          const pendingList = [];
          for (let i = 0; i < requests.length; i++) {
            const req = requests[i];
            if (
              req.to.toLowerCase() === walletAddress.toLowerCase() &&
              !req.isPaid
            ) {
              pendingList.push(req);
            }
          }
          setPendingRequests(pendingList);
        }
      } catch (error) {
        console.log("ℹ️ Payment requests not available");
        setAllRequests([]);
        setPendingRequests([]);
      }
    },
    [walletAddress],
  );

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
  }, [initEthers, loadPaymentRequests, loadUserNFTs, loadExpenses, getContractBalance]);

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
    setNftImported(false);
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

      if (nftImported) {
        alert("✅ NFT already imported to MetaMask!");
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
        setNftImported(true);
        alert("✅ NFT added to MetaMask!");
      } else {
        alert("❌ User rejected the request");
      }
    } catch (error) {
      console.error("Failed to import NFT:", error);
      alert("Failed to import NFT: " + error.message);
    }
  }, [userNFTs, nftImported]);

  // ✅ UPDATED: minting the nft with Pinata
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
          imageUrl = await uploadToPinata(nftImageFile);
          console.log("✅ Image uploaded to Pinata:", imageUrl);
        } catch (uploadError) {
          console.error("Image upload failed, using placeholder:", uploadError);
          imageUrl = PLACEHOLDER_IMAGE;
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
        metadataUrl = await uploadMetadataToPinata(metadata);
        console.log("✅ Metadata uploaded to Pinata:", metadataUrl);
      } catch (uploadError) {
        console.error(
          "Metadata upload failed, using placeholder:",
          uploadError,
        );
        metadataUrl = PLACEHOLDER_IMAGE;
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
    uploadToPinata,
    uploadMetadataToPinata,
  ]);

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
      if (error.code === "ACTION_REJECTED") {
        setError("Transaction was rejected in MetaMask");
        alert("You rejected the transaction in MetaMask");
      } else {
        setError("Transaction failed: " + (error.reason || error.message));
        alert("Transaction failed: " + (error.reason || error.message));
      }
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

  // ✅ FIX: Mark participant as paid with immediate UI update
  const markParticipantPaid = useCallback(
    async (expenseId, participantAddress) => {
      if (!contract || !isConnected) {
        alert("Please connect wallet first");
        return;
      }

      // Check if expense is already paid
      const expense = expenses.find((e) => e.id === expenseId);
      if (expense && expense.status === 1) {
        alert("⚠️ This expense is already marked as paid!");
        return;
      }

      try {
        setLoading(true);
        const tx = await contract.markParticipantPaid(
          expenseId,
          participantAddress,
        );
        await tx.wait();

        // ✅ Immediately reload all data to reflect changes
        await loadExpenses(contract);
        await loadPaymentRequests(contract);

        alert("✅ Participant marked as paid!");
      } catch (error) {
        console.error("Failed to mark participant as paid:", error);
        if (error.message.includes("Expense not pending")) {
          alert("⚠️ This expense is already paid or not pending!");
        } else {
          alert("Failed: " + (error.reason || error.message));
        }
      } finally {
        setLoading(false);
      }
    },
    [contract, isConnected, loadExpenses, loadPaymentRequests, expenses],
  );

  // ✅ FIX: Mark debtor as paid with immediate UI update
  const markDebtorAsPaid = useCallback(
    async (expenseId, debtorAddress) => {
      if (!contract || !isConnected) {
        alert("Please connect wallet first");
        return;
      }

      // Check if expense is already paid
      const expense = expenses.find((e) => e.id === expenseId);
      if (expense && expense.status === 1) {
        alert("⚠️ This expense is already marked as paid!");
        return;
      }

      try {
        setLoading(true);
        const tx = await contract.markParticipantPaid(expenseId, debtorAddress);
        await tx.wait();

        // ✅ Immediately reload all data to reflect changes
        await loadExpenses(contract);
        await loadPaymentRequests(contract);

        alert("✅ Debtor marked as paid!");
      } catch (error) {
        console.error("Failed to mark debtor as paid:", error);
        if (error.message.includes("Expense not pending")) {
          alert("⚠️ This expense is not pending or already paid!");
        } else {
          alert("Failed: " + (error.reason || error.message));
        }
      } finally {
        setLoading(false);
      }
    },
    [contract, isConnected, loadExpenses, loadPaymentRequests, expenses],
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
        // the actual request to the address that the payer creates expenses
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

  // the debtors can pay directly to the owner and the participants except debtors also can pay to the actual owner
  const handleRequestPayment = useCallback(async () => {
    if (!signer || !isConnected) {
      alert("Please connect wallet");
      return;
    }
    if (!requestRecipient || !requestAmount) {
      alert("Please fill owner address and amount");
      return;
    }
    try {
      setRequestLoading(true);
      // the debtors can pay directly to the owner and the participants except debtors also can pay to the actual owner
      const tx = await signer.sendTransaction({
        to: requestRecipient,
        value: ethers.utils.parseEther(requestAmount),
      });
      await tx.wait();
      setRequestRecipient("");
      setRequestAmount("");
      setRequestReason("");
      alert("✅ Paid directly to actual owner successfully!");
    } catch (error) {
      console.error("❌ Failed to pay owner:", error);
      alert("Failed to pay: " + (error.reason || error.message));
    } finally {
      setRequestLoading(false);
    }
  }, [signer, isConnected, requestRecipient, requestAmount, requestReason]);

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

  // create a reset butoon at the end so that when i click reset it resets the expenses
  const resetExpenses = useCallback(async () => {
    if (!contract || !isConnected) {
      alert("Please connect wallet first");
      return;
    }
    if (
      window.confirm(
        "Are you absolutely sure? This will delete all expenses permanently.",
      )
    ) {
      try {
        setLoading(true);
        const tx = await contract.resetexp();
        await tx.wait();
        await loadExpenses(contract);
        await loadPaymentRequests(contract);
        await getContractBalance(provider);
        alert("✅ Expenses reset successfully!");
      } catch (error) {
        console.error("Failed to reset expenses:", error);
        alert("Failed to reset expenses: " + (error.reason || error.message));
      } finally {
        setLoading(false);
      }
    }
  }, [
    contract,
    isConnected,
    loadExpenses,
    loadPaymentRequests,
    getContractBalance,
    provider,
  ]);

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
                    disabled={nftImported}
                    className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                      nftImported
                        ? "bg-green-100 text-green-700 cursor-not-allowed"
                        : "bg-purple-600 hover:bg-purple-700 text-white"
                    }`}
                  >
                    <i
                      className={`fas ${nftImported ? "fa-check-circle" : "fa-download"}`}
                    ></i>
                    {nftImported ? "Already Imported" : "Import to MetaMask"}
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
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-orange-100 text-sm">Contract Balance</p>
                  <p className="text-3xl font-bold">{contractBalance} ETH</p>
                </div>
                <button
                  onClick={handleRefresh}
                  className="bg-white/20 hover:bg-white/30 p-3 rounded-full transition-colors"
                  disabled={refreshing}
                >
                  <i
                    className={`fas fa-sync-alt ${refreshing ? "fa-spin" : ""}`}
                  ></i>
                </button>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div className="bg-white/20 rounded-lg p-2">
                  <p className="text-2xl font-bold">{totalExpenses}</p>
                  <p className="text-xs text-orange-100">Total Expenses</p>
                </div>
                <div className="bg-white/20 rounded-lg p-2">
                  <p className="text-2xl font-bold">{totalAmount.toFixed(2)}</p>
                  <p className="text-xs text-orange-100">Total Amount</p>
                </div>
                <div className="bg-white/20 rounded-lg p-2">
                  <p className="text-2xl font-bold">{pendingCount}</p>
                  <p className="text-xs text-orange-100">Pending</p>
                </div>
              </div>
            </div>

            {/* Bad Debtors Warning */}
            {badDebtors.length > 0 && (
              <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4">
                <h3 className="text-red-700 font-bold flex items-center gap-2 mb-2">
                  <i className="fas fa-exclamation-triangle"></i> Bad Debtors
                  Detected
                </h3>
                {badDebtors.map((debtor, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center bg-white p-2 rounded mt-1"
                  >
                    <div>
                      <span className="font-semibold text-red-700">
                        {debtor.name}
                      </span>
                      <span className="text-gray-500 text-sm ml-2">
                        ({formatAddress(debtor.address)})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-600 font-bold">
                        {debtor.amount} ETH
                      </span>
                      {/* ✅ FIX: Mark debtor as paid - removes from bad debtors list */}
                      <button
                        onClick={() =>
                          markDebtorAsPaid(
                            debtor.expenseId || 0,
                            debtor.address,
                          )
                        }
                        disabled={loading || !isConnected}
                        className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
                      >
                        Mark Paid
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Expenses List */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-700">
                  <i className="fas fa-list text-blue-600"></i> Expenses
                </h2>
                {refreshing && (
                  <span className="text-sm text-gray-500">
                    <i className="fas fa-spinner fa-spin"></i> Refreshing...
                  </span>
                )}
              </div>

              {!dataLoaded ? (
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-spinner fa-spin text-3xl mb-2"></i>
                  <p>Loading expenses...</p>
                </div>
              ) : expenses.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <i className="fas fa-receipt text-4xl mb-3 text-gray-300"></i>
                  <p>No expenses yet. Add your first expense!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="border rounded-xl p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-800">
                            {expense.expname}
                          </h3>
                          <p className="text-sm text-gray-500">
                            Paid by: {expense.paidby} (
                            {formatAddress(expense.payerAddress)})
                          </p>
                          <p className="text-sm text-gray-500">
                            Location: {expense.paddress}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            expense.status === 0
                              ? "bg-yellow-100 text-yellow-700"
                              : expense.status === 1
                                ? "bg-green-100 text-green-700"
                                : expense.status === 2
                                  ? "bg-red-100 text-red-700"
                                  : "bg-orange-100 text-orange-700"
                          }`}
                        >
                          {expense.statusText}
                        </span>
                      </div>

                      <div className="mt-3 flex justify-between items-center">
                        <div>
                          <span className="text-lg font-bold text-slate-800">
                            {expense.amt.toFixed(4)} ETH
                          </span>
                          <span className="text-sm text-gray-500 ml-2">
                            ({expense.participantCount} participants,{" "}
                            {expense.shareAmount} ETH each)
                          </span>
                        </div>
                      </div>

                      {/* Participants List */}
                      {expense.participants.length > 0 && (
                        <div className="mt-3 border-t pt-3">
                          <p className="text-xs font-semibold text-gray-500 mb-1">
                            PARTICIPANTS:
                          </p>
                          <div className="space-y-1">
                            {expense.participants.map((addr, idx) => {
                              const isUser =
                                addr.toLowerCase() ===
                                walletAddress?.toLowerCase();
                              const isPaid = expense.status === 1;
                              return (
                                <div
                                  key={idx}
                                  className="flex justify-between items-center text-sm bg-gray-50 p-1.5 rounded"
                                >
                                  <div>
                                    <span className="font-medium">
                                      {expense.participantNames[idx] ||
                                        `Participant ${idx + 1}`}
                                    </span>
                                    <span className="text-gray-400 ml-2 text-xs">
                                      {formatAddress(addr)}
                                    </span>
                                    {isUser && (
                                      <span className="ml-2 bg-blue-100 text-blue-600 text-xs px-1.5 py-0.5 rounded">
                                        You
                                      </span>
                                    )}
                                    {isPaid && (
                                      <span className="ml-2 bg-green-100 text-green-600 text-xs px-1.5 py-0.5 rounded">
                                        ✅ Paid
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    {/* request payment from payers */}
                                    {isUser &&
                                      (expense.status === 0 ||
                                        expense.status === 3) && (
                                        <button
                                          onClick={() =>
                                            requestPaymentFromPayer(expense.id)
                                          }
                                          disabled={loading}
                                          className="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
                                        >
                                          Request Payer
                                        </button>
                                      )}
                                    {/* ✅ FIX: Mark participant as paid - only for payer and only if not paid */}
                                    {expense.payerAddress &&
                                      expense.payerAddress.toLowerCase() ===
                                        walletAddress?.toLowerCase() &&
                                      expense.status !== 1 && (
                                        <button
                                          onClick={() =>
                                            markParticipantPaid(
                                              expense.id,
                                              addr,
                                            )
                                          }
                                          disabled={loading || !isConnected}
                                          className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
                                        >
                                          Mark Paid
                                        </button>
                                      )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* request payment from the debtors seprately if they want to repay payment to the acctual owner */}
        <div className="mt-6 bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-slate-700 mb-4">
            <i className="fas fa-hand-holding-usd text-yellow-600"></i> Repay
            Payment to Actual Owner
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Use this section if you are a debtor and want to create a separate
            request to repay the actual owner directly.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Actual Owner's Address (0x...)"
              className="border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              value={requestRecipient}
              onChange={(e) => setRequestRecipient(e.target.value)}
              disabled={!isConnected || !isCorrectNetwork}
            />
            <input
              type="number"
              step="0.001"
              min="0.001"
              placeholder="Amount (ETH)"
              className="border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              value={requestAmount}
              onChange={(e) => setRequestAmount(e.target.value)}
              disabled={!isConnected || !isCorrectNetwork}
            />
            <input
              type="text"
              placeholder="Reason (e.g. Repaying dinner debt)"
              className="border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              value={requestReason}
              onChange={(e) => setRequestReason(e.target.value)}
              disabled={!isConnected || !isCorrectNetwork}
            />
            <button
              onClick={handleRequestPayment}
              disabled={requestLoading || !isConnected || !isCorrectNetwork}
              className={`text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
                requestLoading || !isConnected || !isCorrectNetwork
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              <i className="fas fa-money-bill-wave"></i>
              {requestLoading ? "Sending..." : "Pay Owner Now"}
            </button>
          </div>
        </div>

        {/* Pending Payment Requests */}
        <div className="mt-6 bg-white rounded-2xl shadow-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-700">
              <i className="fas fa-bell text-red-500"></i> Your Pending Payment
              Requests
            </h2>
            <button
              onClick={() => setShowRequests(!showRequests)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showRequests ? "Hide" : "Show All Requests"}
            </button>
          </div>

          {pendingRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No pending payment requests for you.
            </p>
          ) : (
            <div className="space-y-3">
              {pendingRequests.map((req, idx) => (
                <div
                  key={idx}
                  className="border rounded-xl p-4 flex justify-between items-center bg-red-50"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      From: {formatAddress(req.from)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Reason: {req.reason}
                    </p>
                    <p className="text-sm text-gray-400">{req.timestamp}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <span className="text-lg font-bold text-red-600">
                      {req.amount} ETH
                    </span>
                    <button
                      onClick={() => payRequest(req.id, req.amount)}
                      disabled={loading || !isConnected}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 flex items-center gap-2"
                    >
                      <i className="fas fa-money-bill-wave"></i> Pay Now
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* All Requests History */}
          {showRequests && (
            <div className="mt-6 border-t pt-4">
              <h3 className="font-bold text-slate-700 mb-3">
                All Request History
              </h3>
              {allRequests.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No requests found.
                </p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {allRequests
                    .filter(
                      (req) =>
                        req.from.toLowerCase() ===
                          walletAddress?.toLowerCase() ||
                        req.to.toLowerCase() === walletAddress?.toLowerCase(),
                    )
                    .map((req, idx) => (
                      <div
                        key={idx}
                        className={`border rounded-lg p-3 flex justify-between items-center ${req.isPaid ? "bg-gray-50 opacity-75" : "bg-white"}`}
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {req.from.toLowerCase() ===
                            walletAddress?.toLowerCase()
                              ? "You → "
                              : ""}
                            {formatAddress(req.from)} → {formatAddress(req.to)}
                            {req.to.toLowerCase() ===
                            walletAddress?.toLowerCase()
                              ? " ← You"
                              : ""}
                          </p>
                          <p className="text-xs text-gray-500">
                            {req.reason} | {req.timestamp}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm">{req.amount} ETH</p>
                          <p
                            className={`text-xs font-semibold ${req.isPaid ? "text-green-600" : "text-yellow-600"}`}
                          >
                            {req.isPaid ? "✅ Paid" : "⏳ Pending"}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {req.from.toLowerCase() ===
                            walletAddress?.toLowerCase()
                              ? "You owe"
                              : "Owes you"}
                          </p>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* NFT Minting Section */}
        <div className="mt-6 bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-slate-700 mb-4">
            <i className="fas fa-cube text-purple-600"></i> Mint Expense NFT
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">
                Select Expense
              </label>
              <select
                className="w-full border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={selectedExpenseForNFT}
                onChange={(e) => setSelectedExpenseForNFT(e.target.value)}
                disabled={!isConnected || !isCorrectNetwork}
              >
                <option value="">Choose an expense...</option>
                {expenses.map((exp) => (
                  <option key={exp.id} value={exp.id}>
                    {exp.expname} - {exp.amt.toFixed(4)} ETH
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">
                Upload Custom Image (Optional)
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setNftImageFile(e.target.files[0]);
                  if (e.target.files[0]) {
                    setNftImage(URL.createObjectURL(e.target.files[0]));
                  }
                }}
                className="w-full border rounded-lg p-2 text-sm"
                disabled={!isConnected || !isCorrectNetwork}
              />
            </div>
          </div>

          {nftImage && (
            <div className="mt-4 flex justify-center">
              <img
                src={nftImage}
                alt="NFT Preview"
                className="w-48 h-48 object-cover rounded-xl border-2 border-purple-300 shadow-md"
              />
            </div>
          )}

          <button
            onClick={mintExpenseNFT}
            disabled={
              mintingNFT ||
              !isConnected ||
              !isCorrectNetwork ||
              !selectedExpenseForNFT
            }
            className={`mt-4 w-full text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all ${
              mintingNFT ||
              !isConnected ||
              !isCorrectNetwork ||
              !selectedExpenseForNFT
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700"
            }`}
          >
            <i className="fas fa-magic"></i>
            {mintingNFT
              ? uploading
                ? "Uploading to IPFS..."
                : "Minting..."
              : "Mint Expense NFT"}
          </button>
        </div>

        {/* NFT Gallery */}
        {userNFTs.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl shadow-xl p-6">
            <h2 className="text-xl font-bold text-slate-700 mb-4">
              <i className="fas fa-images text-indigo-600"></i> Your NFT Gallery
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {userNFTs.map((nft, idx) => (
                <div
                  key={idx}
                  className="border rounded-xl overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <img
                    src={nft.image}
                    alt={nft.metadata?.name || "Expense NFT"}
                    className="w-full h-40 object-cover"
                  />
                  <div className="p-3">
                    <p className="font-bold text-sm text-slate-800 truncate">
                      {nft.metadata?.name || "Expense NFT"}
                    </p>
                    <p className="text-xs text-gray-500">
                      Token ID: {nft.tokenId}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* create a reset butoon at the end so that when i click reset it resets the expenses */}
        <div className="mt-8 mb-12 text-center">
          <button
            onClick={resetExpenses}
            disabled={loading || !isConnected || !isCorrectNetwork}
            className={`bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-12 rounded-xl text-lg transition-all flex items-center justify-center gap-3 mx-auto ${
              loading || !isConnected || !isCorrectNetwork
                ? "bg-gray-400 cursor-not-allowed"
                : ""
            }`}
          >
            <i className="fas fa-trash-alt"></i>
            {loading ? "Resetting..." : "⚠️ RESET ALL EXPENSES ⚠️"}
          </button>
          <p className="text-sm text-red-500 mt-2">
            Warning: This will permanently delete all expense data from the
            contract.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
