'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast/Toast';
import {
  getTransactions,
  Transaction,
  seedDemoTransactions,
  updateTransaction,
} from '@/lib/firestore';
import { Timestamp } from 'firebase/firestore';
import {
  connectWallet as connectMetaMask,
  recordTransactionOnChain,
  batchRecordOnChain,
  getBlockchainStats,
  getExplorerUrl,
  getContractExplorerUrl,
  isBlockchainConfigured,
  getWalletBalance,
  BlockchainStats,
} from '@/lib/blockchain';

export default function BlockchainPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [walletBalance, setWalletBalance] = useState('0');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState<string | null>(null); // tx id being recorded
  const [batchRecording, setBatchRecording] = useState(false);
  const [chainStats, setChainStats] = useState<BlockchainStats | null>(null);
  const [recentTxHashes, setRecentTxHashes] = useState<Record<string, string>>({}); // txId -> blockchain txHash
  const configured = isBlockchainConfigured();

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      await seedDemoTransactions(user.uid);
      const txData = await getTransactions(user.uid, 200);
      setTransactions(txData);
    } catch (err) {
      console.error('Error loading blockchain data:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load chain stats when wallet is connected
  useEffect(() => {
    if (walletAddress && configured) {
      getBlockchainStats(walletAddress).then(setChainStats);
      getWalletBalance(walletAddress).then(setWalletBalance);
    }
  }, [walletAddress, configured]);

  const handleConnectWallet = async () => {
    try {
      const address = await connectMetaMask();
      setWalletAddress(address);
      setWalletConnected(true);
      showToast('success', 'Đã kết nối MetaMask', `${address.slice(0, 6)}...${address.slice(-4)} • Sepolia`);
      // Refresh stats
      if (configured) {
        const stats = await getBlockchainStats(address);
        setChainStats(stats);
        const balance = await getWalletBalance(address);
        setWalletBalance(balance);
      }
    } catch (err: any) {
      if (err?.message?.includes('MetaMask')) {
        showToast('warning', 'MetaMask không tìm thấy', 'Vui lòng cài đặt MetaMask extension');
      } else {
        showToast('error', 'Kết nối thất bại', err?.message || 'Vui lòng thử lại');
      }
    }
  };

  // Record a single transaction on-chain
  const handleRecordOnChain = async (tx: Transaction) => {
    if (!walletConnected) {
      showToast('warning', 'Chưa kết nối ví', 'Vui lòng kết nối MetaMask trước');
      return;
    }
    if (!configured) {
      showToast('warning', 'Chưa cấu hình', 'Vui lòng cập nhật RPC URL và Contract Address trong .env.local');
      return;
    }

    setRecording(tx.id || '');
    try {
      const txDate = tx.date instanceof Date ? tx.date : (tx.date as Timestamp).toDate();
      const result = await recordTransactionOnChain(
        tx.name,
        tx.amount,
        tx.category,
        txDate.toISOString(),
        tx.userId
      );

      // Update Firestore to mark as verified
      if (tx.id) {
        await updateTransaction(tx.id, { verified: true });
        setRecentTxHashes(prev => ({ ...prev, [tx.id!]: result.txHash }));
      }

      showToast('success', 'Đã ghi On-Chain!', 'Xem trên Etherscan ↗');
      // Reload data
      await loadData();
      // Refresh stats
      const stats = await getBlockchainStats(walletAddress);
      setChainStats(stats);
    } catch (err: any) {
      const msg = err?.message || 'Lỗi ghi blockchain';
      if (msg.includes('user rejected') || msg.includes('denied')) {
        showToast('warning', 'Đã hủy', 'Bạn đã từ chối giao dịch trong MetaMask');
      } else {
        showToast('error', 'Lỗi Blockchain', msg.slice(0, 100));
      }
      console.error('Record on-chain error:', err);
    } finally {
      setRecording(null);
    }
  };

  // Batch record all unverified transactions
  const handleBatchRecord = async () => {
    if (!walletConnected || !configured) {
      showToast('warning', 'Chưa sẵn sàng', 'Kết nối MetaMask và cấu hình contract trước');
      return;
    }

    const unverified = transactions.filter(t => !t.verified);
    if (unverified.length === 0) {
      showToast('info', 'Không có gì để ghi', 'Tất cả giao dịch đã verified');
      return;
    }

    setBatchRecording(true);
    try {
      const txData = unverified.slice(0, 20).map(t => {
        const d = t.date instanceof Date ? t.date : (t.date as Timestamp).toDate();
        return { name: t.name, amount: t.amount, category: t.category, date: d.toISOString(), userId: t.userId };
      });

      const result = await batchRecordOnChain(txData);

      // Update Firestore
      for (const tx of unverified.slice(0, 20)) {
        if (tx.id) await updateTransaction(tx.id, { verified: true });
      }

      showToast('success', `Đã ghi ${result.count} giao dịch!`, 'Batch verified on-chain');
      await loadData();
      const stats = await getBlockchainStats(walletAddress);
      setChainStats(stats);
    } catch (err: any) {
      showToast('error', 'Lỗi Batch', err?.message?.slice(0, 100) || 'Vui lòng thử lại');
      console.error('Batch record error:', err);
    } finally {
      setBatchRecording(false);
    }
  };

  const verifiedTx = transactions.filter((t) => t.verified);
  const unverifiedTx = transactions.filter((t) => !t.verified);
  const totalVerified = verifiedTx.length;
  const verifiedPercentage = transactions.length > 0 ? Math.round((totalVerified / transactions.length) * 100) : 0;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-md)' }}>🔗</div>
          <p style={{ color: 'var(--text-secondary)' }}>Đang tải dữ liệu blockchain...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header animate-fade-in-down">
        <div className="page-header-top">
          <div>
            <h1 className="page-title">🔗 Blockchain <span className="text-gradient">Explorer</span></h1>
            <p className="page-subtitle">
              Ghi giao dịch on-chain — Sepolia Testnet {configured && '✅'}
            </p>
          </div>
          <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
            {!walletConnected ? (
              <button className="btn btn-primary" onClick={handleConnectWallet}>
                🦊 Kết nối MetaMask
              </button>
            ) : (
              <div style={{ display: 'flex', gap: 'var(--space-sm)', alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="badge badge-success" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                  ✅ {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </div>
                <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                  {parseFloat(walletBalance).toFixed(4)} ETH
                </span>
                {configured && unverifiedTx.length > 0 && (
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={handleBatchRecord}
                    disabled={batchRecording}
                  >
                    {batchRecording ? '⏳ Đang ghi...' : `📝 Verify All (${unverifiedTx.length})`}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Not configured warning */}
      {!configured && (
        <div className="glass-card animate-fade-in-up" style={{
          marginBottom: 'var(--space-lg)',
          background: 'linear-gradient(135deg, rgba(255,165,0,0.08), rgba(255,100,0,0.04))',
          borderColor: 'rgba(255,165,0,0.2)',
        }}>
          <div className="card-body" style={{ padding: 'var(--space-xl)', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>⚠️</div>
            <h3 style={{ marginBottom: 'var(--space-sm)' }}>Cần cấu hình Blockchain</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: 'var(--space-md)' }}>
              Để ghi giao dịch on-chain thật, bạn cần:
            </p>
            <div style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <p>1️⃣ Tạo Alchemy account (free) → lấy Sepolia RPC URL</p>
              <p>2️⃣ Lấy SepoliaETH miễn phí từ Google Faucet</p>
              <p>3️⃣ Deploy contract trên Remix IDE</p>
              <p>4️⃣ Cập nhật <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px' }}>.env.local</code></p>
            </div>
          </div>
        </div>
      )}

      {/* Blockchain Stats */}
      <div className="stats-grid">
        <div className="glass-card stat-card-3d animate-fade-in-up" style={{ borderTopColor: 'var(--primary)' }}>
          <div className="stat-card-top">
            <div>
              <p className="stat-label">Tổng giao dịch</p>
              <p className="stat-value-3d text-gradient">{transactions.length}</p>
            </div>
            <div className="stat-card-icon">📊</div>
          </div>
          <p className="stat-change positive">Firestore Database</p>
        </div>

        <div className="glass-card stat-card-3d animate-fade-in-up" style={{ borderTopColor: 'var(--accent-emerald)', animationDelay: '0.1s' }}>
          <div className="stat-card-top">
            <div>
              <p className="stat-label">Verified (On-Chain)</p>
              <p className="stat-value-3d" style={{ color: 'var(--accent-emerald)' }}>{totalVerified}</p>
            </div>
            <div className="stat-card-icon">✅</div>
          </div>
          <p className="stat-change positive">{verifiedPercentage}% verified</p>
        </div>

        <div className="glass-card stat-card-3d animate-fade-in-up" style={{ borderTopColor: 'var(--accent-amber)', animationDelay: '0.2s' }}>
          <div className="stat-card-top">
            <div>
              <p className="stat-label">Unverified</p>
              <p className="stat-value-3d" style={{ color: 'var(--accent-amber)' }}>{unverifiedTx.length}</p>
            </div>
            <div className="stat-card-icon">⏳</div>
          </div>
          <p className="stat-change positive">Pending on-chain</p>
        </div>

        <div className="glass-card stat-card-3d animate-fade-in-up" style={{ borderTopColor: walletConnected ? 'var(--accent-emerald)' : 'var(--accent-coral)', animationDelay: '0.3s' }}>
          <div className="stat-card-top">
            <div>
              <p className="stat-label">Network</p>
              <p className="stat-value-3d" style={{ color: walletConnected ? 'var(--accent-emerald)' : 'var(--accent-coral)', fontSize: '1rem' }}>
                {walletConnected ? 'Sepolia' : 'Not Connected'}
              </p>
            </div>
            <div className="stat-card-icon">🌐</div>
          </div>
          <p className="stat-change positive">{walletConnected ? 'Chain ID: 11155111' : 'Click to connect'}</p>
        </div>
      </div>

      {/* Unverified — Ready to record */}
      {unverifiedTx.length > 0 && walletConnected && configured && (
        <div className="glass-card animate-fade-in-up" style={{ marginBottom: 'var(--space-lg)' }}>
          <div className="card-header">
            <h3 className="card-title">⏳ Chưa Verified — Sẵn sàng ghi On-Chain</h3>
            <span className="badge badge-warning">{unverifiedTx.length} pending</span>
          </div>
          <div className="card-body">
            <ul className="transaction-list">
              {unverifiedTx.slice(0, 10).map((tx) => {
                const txDate = tx.date instanceof Date ? tx.date : (tx.date as Timestamp).toDate();
                const isRecording = recording === tx.id;
                return (
                  <li key={tx.id} className="transaction-item">
                    <div className="transaction-icon" style={{ background: 'rgba(255,165,0,0.1)' }}>⏳</div>
                    <div className="transaction-info">
                      <div className="transaction-name">{tx.name}</div>
                      <span className="transaction-category">{tx.category} • {txDate.toLocaleDateString('vi-VN')}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                      <div className="text-mono" style={{ fontSize: '0.85rem', color: tx.amount > 0 ? 'var(--accent-emerald)' : 'var(--accent-coral)', fontWeight: 600 }}>
                        {tx.amount > 0 ? '+' : ''}{new Intl.NumberFormat('vi-VN').format(tx.amount)}₫
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => handleRecordOnChain(tx)}
                        disabled={isRecording || batchRecording}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {isRecording ? '⏳...' : '📝 Ghi'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            {unverifiedTx.length > 10 && (
              <p style={{ textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '0.8rem', marginTop: 'var(--space-md)' }}>
                và {unverifiedTx.length - 10} giao dịch khác... Dùng "Verify All" ở trên
              </p>
            )}
          </div>
        </div>
      )}

      {/* Verified Transactions */}
      <div className="glass-card animate-fade-in-up delay-200">
        <div className="card-header">
          <h3 className="card-title">✅ Giao dịch Verified</h3>
          <span className="badge badge-success">{totalVerified} on-chain</span>
        </div>
        <div className="card-body">
          {verifiedTx.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>
              <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>📭</div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Chưa có giao dịch verified — kết nối MetaMask và bắt đầu ghi on-chain!
              </p>
            </div>
          ) : (
            <ul className="transaction-list">
              {verifiedTx.slice(0, 15).map((tx) => {
                const txDate = tx.date instanceof Date ? tx.date : (tx.date as Timestamp).toDate();
                const blockchainHash = recentTxHashes[tx.id || ''];
                return (
                  <li key={tx.id} className="transaction-item">
                    <div className="transaction-icon" style={{ background: 'rgba(108, 99, 255, 0.1)' }}>🔗</div>
                    <div className="transaction-info">
                      <div className="transaction-name">
                        {tx.name}
                        <span className="badge badge-success" style={{ marginLeft: '8px', fontSize: '0.6rem' }}>
                          ✅ On-Chain
                        </span>
                      </div>
                      {blockchainHash ? (
                        <a
                          href={getExplorerUrl(blockchainHash)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-mono"
                          style={{ fontSize: '0.7rem', color: 'var(--primary-light)', textDecoration: 'none' }}
                        >
                          {blockchainHash.slice(0, 10)}...{blockchainHash.slice(-8)} ↗
                        </a>
                      ) : (
                        <span className="text-mono" style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>
                          Verified • {tx.category}
                        </span>
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="text-mono" style={{ fontSize: '0.85rem', color: tx.amount > 0 ? 'var(--accent-emerald)' : 'var(--accent-coral)', fontWeight: 600 }}>
                        {tx.amount > 0 ? '+' : ''}{new Intl.NumberFormat('vi-VN').format(tx.amount)}₫
                      </div>
                      <span className="transaction-time">{txDate.toLocaleDateString('vi-VN')}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Bottom: Contract Info + Transparency */}
      <div className="content-grid-equal" style={{ marginTop: 'var(--space-lg)' }}>
        <div className="glass-card animate-fade-in-up delay-300">
          <div className="card-header">
            <h3 className="card-title">📄 Smart Contract</h3>
            <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>Sepolia</span>
          </div>
          <div className="card-body">
            {[
              { name: 'TransactionLedger.sol', desc: 'Ghi nhận & xác minh giao dịch', status: configured ? 'Deployed' : 'Not Deployed' },
            ].map((contract, i) => (
              <div key={i} style={{
                padding: 'var(--space-md)',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-sm)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-sm)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', fontFamily: 'var(--font-mono)' }}>{contract.name}</div>
                  <span className={`badge ${configured ? 'badge-success' : 'badge-warning'}`}>{contract.status}</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: 'var(--space-sm)' }}>{contract.desc}</div>
                {configured && (
                  <a
                    href={getContractExplorerUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-mono"
                    style={{ fontSize: '0.7rem', color: 'var(--primary-light)', textDecoration: 'none' }}
                  >
                    📋 {CONTRACT_ADDRESS.slice(0, 10)}...{CONTRACT_ADDRESS.slice(-8)} ↗ Etherscan
                  </a>
                )}
              </div>
            ))}

            {/* On-chain stats */}
            {chainStats && (
              <div style={{ marginTop: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Network</span>
                  <span className="text-mono">{chainStats.networkName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Chain ID</span>
                  <span className="text-mono">{chainStats.chainId}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Total on-chain</span>
                  <span className="text-mono">{chainStats.totalRecords}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-tertiary)' }}>Your records</span>
                  <span className="text-mono">{chainStats.userRecords}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card animate-fade-in-up delay-400" style={{
          background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.08), rgba(0, 210, 255, 0.05))',
          borderColor: 'rgba(108, 99, 255, 0.15)'
        }}>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: 'var(--space-2xl)' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>🔐</div>
            <h3 style={{ marginBottom: 'var(--space-sm)' }}>Minh Bạch & Bất Biến</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: 'var(--space-lg)' }}>
              {totalVerified} giao dịch đã được ghi nhận trên Sepolia Testnet.
              Dữ liệu minh bạch, có thể xác minh trên Etherscan.
            </p>
            <div className="text-mono" style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
              Verified: {verifiedPercentage}% • Total: {transactions.length} • Sepolia
            </div>
            {configured && (
              <a
                href={getContractExplorerUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 'var(--space-md)', textDecoration: 'none' }}
              >
                🔍 Xem trên Etherscan
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';
