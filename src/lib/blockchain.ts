/**
 * Blockchain Service Layer — ChainGuard AI
 * Connects to Sepolia Testnet via MetaMask + Alchemy RPC
 * Interacts with TransactionLedger smart contract
 */

import { ethers } from 'ethers';

// === CONFIG ===
const SEPOLIA_RPC_URL = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || '';
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';
const SEPOLIA_CHAIN_ID = 11155111;

// === CONTRACT ABI (matches TransactionLedger.sol) ===
const CONTRACT_ABI = [
  'function recordTransaction(bytes32 _dataHash, int256 _amount, string _category) external',
  'function batchRecordTransactions(bytes32[] _hashes, int256[] _amounts, string[] _categories) external',
  'function getRecord(address _user, uint256 _index) external view returns (bytes32, int256, string, uint256)',
  'function isHashVerified(bytes32 _hash) external view returns (bool)',
  'function getUserStats(address _user) external view returns (uint256 count, int256 totalAmount)',
  'function recordCount(address) external view returns (uint256)',
  'function totalRecords() external view returns (uint256)',
  'function totalUsers() external view returns (uint256)',
  'event TransactionRecorded(address indexed user, bytes32 indexed dataHash, int256 amount, string category, uint256 timestamp, uint256 recordIndex)',
];

// === TYPES ===
export interface OnChainRecord {
  txHash: string;
  dataHash: string;
  amount: number;
  category: string;
  timestamp: number;
  blockNumber: number;
  explorerUrl: string;
}

export interface BlockchainStats {
  totalRecords: number;
  totalUsers: number;
  userRecords: number;
  walletAddress: string;
  networkName: string;
  chainId: number;
  isConnected: boolean;
  contractAddress: string;
}

// === HELPERS ===

/**
 * Get MetaMask provider (browser wallet)
 */
function getMetaMaskProvider(): ethers.BrowserProvider | null {
  if (typeof window === 'undefined') return null;
  const ethereum = (window as any).ethereum;
  if (!ethereum) return null;
  return new ethers.BrowserProvider(ethereum);
}

/**
 * Get read-only provider (Alchemy RPC, no wallet needed)
 */
function getReadProvider(): ethers.JsonRpcProvider | null {
  if (!SEPOLIA_RPC_URL || SEPOLIA_RPC_URL.includes('YOUR_ALCHEMY_KEY')) return null;
  return new ethers.JsonRpcProvider(SEPOLIA_RPC_URL);
}

/**
 * Get contract instance for read-only operations
 */
function getReadContract(): ethers.Contract | null {
  const provider = getReadProvider();
  if (!provider || !CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') return null;
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
}

/**
 * Get contract instance with signer (for write operations via MetaMask)
 */
async function getWriteContract(): Promise<ethers.Contract | null> {
  const provider = getMetaMaskProvider();
  if (!provider || !CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') return null;
  const signer = await provider.getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
}

// === PUBLIC API ===

/**
 * Check if blockchain features are configured
 */
export function isBlockchainConfigured(): boolean {
  return (
    !!CONTRACT_ADDRESS &&
    CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000' &&
    !!SEPOLIA_RPC_URL &&
    !SEPOLIA_RPC_URL.includes('YOUR_ALCHEMY_KEY')
  );
}

/**
 * Connect MetaMask and switch to Sepolia network
 */
export async function connectWallet(): Promise<string> {
  const ethereum = (window as any).ethereum;
  if (!ethereum) throw new Error('MetaMask chưa được cài đặt');

  // Request account access
  const accounts = await ethereum.request({ method: 'eth_requestAccounts' });

  // Switch to Sepolia
  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x' + SEPOLIA_CHAIN_ID.toString(16) }],
    });
  } catch (switchError: any) {
    // If Sepolia is not added, add it
    if (switchError.code === 4902) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x' + SEPOLIA_CHAIN_ID.toString(16),
          chainName: 'Sepolia Testnet',
          nativeCurrency: { name: 'SepoliaETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: [SEPOLIA_RPC_URL || 'https://rpc.sepolia.org'],
          blockExplorerUrls: ['https://sepolia.etherscan.io'],
        }],
      });
    }
  }

  return accounts[0];
}

/**
 * Get wallet balance on Sepolia
 */
export async function getWalletBalance(address: string): Promise<string> {
  const provider = getReadProvider() || getMetaMaskProvider();
  if (!provider) return '0';
  const balance = await provider.getBalance(address);
  return ethers.formatEther(balance);
}

/**
 * Generate a deterministic hash from transaction data
 */
export function generateTransactionHash(
  transactionId: string,
  name: string,
  amount: number,
  category: string,
  date: string,
  userId: string
): string {
  const data = JSON.stringify({
    version: 1,
    transactionId,
    userId,
    name: name.normalize('NFC').trim(),
    amount: Math.round(amount),
    category: category.normalize('NFC').trim(),
    date: new Date(date).toISOString(),
  });
  return ethers.keccak256(ethers.toUtf8Bytes(data));
}

/**
 * Record a single transaction on-chain
 * Returns the transaction hash from the blockchain
 */
export async function recordTransactionOnChain(
  transactionId: string,
  name: string,
  amount: number,
  category: string,
  date: string,
  userId: string
): Promise<{ txHash: string; dataHash: string; explorerUrl: string; blockNumber: number; walletAddress: string; contractAddress: string }> {
  const contract = await getWriteContract();
  if (!contract) throw new Error('Smart contract chưa được cấu hình. Vui lòng kiểm tra .env.local');

  const dataHash = generateTransactionHash(transactionId, name, amount, category, date, userId);
  // amount in VND (store as int256)
  const amountWei = BigInt(Math.round(amount));

  const tx = await contract.recordTransaction(dataHash, amountWei, category);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    dataHash,
    blockNumber: receipt.blockNumber,
    walletAddress: await (contract.runner as ethers.Signer).getAddress(),
    contractAddress: CONTRACT_ADDRESS,
    explorerUrl: `https://sepolia.etherscan.io/tx/${receipt.hash}`,
  };
}

/**
 * Batch record multiple transactions on-chain (saves gas)
 */
export async function batchRecordOnChain(
  transactions: { id: string; name: string; amount: number; category: string; date: string; userId: string }[]
): Promise<{ txHash: string; count: number; explorerUrl: string; blockNumber: number; walletAddress: string; contractAddress: string; records: { transactionId: string; dataHash: string }[] }> {
  const contract = await getWriteContract();
  if (!contract) throw new Error('Smart contract chưa được cấu hình');

  const hashes = transactions.map(t => generateTransactionHash(t.id, t.name, t.amount, t.category, t.date, t.userId));
  const amounts = transactions.map(t => BigInt(Math.round(t.amount)));
  const categories = transactions.map(t => t.category);

  const tx = await contract.batchRecordTransactions(hashes, amounts, categories);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    count: transactions.length,
    blockNumber: receipt.blockNumber,
    walletAddress: await (contract.runner as ethers.Signer).getAddress(),
    contractAddress: CONTRACT_ADDRESS,
    records: transactions.map((item, index) => ({ transactionId: item.id, dataHash: hashes[index] })),
    explorerUrl: `https://sepolia.etherscan.io/tx/${receipt.hash}`,
  };
}

/**
 * Check if a hash is verified on-chain
 */
export async function verifyHashOnChain(dataHash: string): Promise<boolean> {
  const contract = getReadContract();
  if (!contract) return false;
  try {
    return await contract.isHashVerified(dataHash);
  } catch {
    return false;
  }
}

/**
 * Get blockchain stats
 */
export async function getBlockchainStats(walletAddress?: string): Promise<BlockchainStats> {
  const contract = getReadContract();
  const defaultStats: BlockchainStats = {
    totalRecords: 0,
    totalUsers: 0,
    userRecords: 0,
    walletAddress: walletAddress || '',
    networkName: 'Sepolia Testnet',
    chainId: SEPOLIA_CHAIN_ID,
    isConnected: !!walletAddress,
    contractAddress: CONTRACT_ADDRESS,
  };

  if (!contract) return defaultStats;

  try {
    const [totalRecords, totalUsers] = await Promise.all([
      contract.totalRecords(),
      contract.totalUsers(),
    ]);

    let userRecords = 0;
    if (walletAddress) {
      userRecords = Number(await contract.recordCount(walletAddress));
    }

    return {
      ...defaultStats,
      totalRecords: Number(totalRecords),
      totalUsers: Number(totalUsers),
      userRecords,
    };
  } catch {
    return defaultStats;
  }
}

/**
 * Get Etherscan URL for a transaction or address
 */
export function getExplorerUrl(hashOrAddress: string, type: 'tx' | 'address' = 'tx'): string {
  return `https://sepolia.etherscan.io/${type}/${hashOrAddress}`;
}

/**
 * Get contract URL on Etherscan
 */
export function getContractExplorerUrl(): string {
  return `https://sepolia.etherscan.io/address/${CONTRACT_ADDRESS}`;
}
