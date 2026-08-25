// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title TransactionLedger
 * @dev ChainGuard AI — Ghi nhận giao dịch tài chính on-chain
 * 
 * Deploy trên Sepolia Testnet (FREE):
 * 1. Mở https://remix.ethereum.org
 * 2. Tạo file TransactionLedger.sol → paste code này
 * 3. Compiler → chọn 0.8.24 → Compile
 * 4. Deploy → Environment: "Injected Provider - MetaMask"
 * 5. MetaMask → chọn Sepolia → Confirm
 * 6. Copy Contract Address → paste vào .env.local
 */
contract TransactionLedger {
    
    struct TxRecord {
        bytes32 dataHash;      // keccak256 hash of transaction data
        int256 amount;         // amount in smallest unit (VND)
        string category;       // "Ăn uống", "Mua sắm", etc.
        uint256 timestamp;     // block.timestamp
        bool exists;           // to check if record exists
    }
    
    // user address => array of records
    mapping(address => TxRecord[]) private userRecords;
    
    // user address => record count
    mapping(address => uint256) public recordCount;
    
    // hash => verified flag (to check if a specific hash is on-chain)
    mapping(bytes32 => bool) public hashVerified;
    
    // Global stats
    uint256 public totalRecords;
    uint256 public totalUsers;
    mapping(address => bool) private isUser;
    
    // Events
    event TransactionRecorded(
        address indexed user,
        bytes32 indexed dataHash,
        int256 amount,
        string category,
        uint256 timestamp,
        uint256 recordIndex
    );
    
    /**
     * @dev Record a transaction on-chain
     * @param _dataHash keccak256 hash of transaction data (name + amount + date)
     * @param _amount Transaction amount (positive = income, negative = expense)
     * @param _category Transaction category
     */
    function recordTransaction(
        bytes32 _dataHash,
        int256 _amount,
        string calldata _category
    ) external {
        // Track new users
        if (!isUser[msg.sender]) {
            isUser[msg.sender] = true;
            totalUsers++;
        }
        
        uint256 index = userRecords[msg.sender].length;
        
        userRecords[msg.sender].push(TxRecord({
            dataHash: _dataHash,
            amount: _amount,
            category: _category,
            timestamp: block.timestamp,
            exists: true
        }));
        
        recordCount[msg.sender]++;
        hashVerified[_dataHash] = true;
        totalRecords++;
        
        emit TransactionRecorded(
            msg.sender,
            _dataHash,
            _amount,
            _category,
            block.timestamp,
            index
        );
    }
    
    /**
     * @dev Batch record multiple transactions (saves gas)
     */
    function batchRecordTransactions(
        bytes32[] calldata _hashes,
        int256[] calldata _amounts,
        string[] calldata _categories
    ) external {
        require(
            _hashes.length == _amounts.length && _amounts.length == _categories.length,
            "Arrays length mismatch"
        );
        
        if (!isUser[msg.sender]) {
            isUser[msg.sender] = true;
            totalUsers++;
        }
        
        for (uint256 i = 0; i < _hashes.length; i++) {
            uint256 index = userRecords[msg.sender].length;
            
            userRecords[msg.sender].push(TxRecord({
                dataHash: _hashes[i],
                amount: _amounts[i],
                category: _categories[i],
                timestamp: block.timestamp,
                exists: true
            }));
            
            recordCount[msg.sender]++;
            hashVerified[_hashes[i]] = true;
            totalRecords++;
            
            emit TransactionRecorded(
                msg.sender,
                _hashes[i],
                _amounts[i],
                _categories[i],
                block.timestamp,
                index
            );
        }
    }
    
    /**
     * @dev Get a specific record
     */
    function getRecord(address _user, uint256 _index) 
        external view 
        returns (bytes32 dataHash, int256 amount, string memory category, uint256 timestamp) 
    {
        require(_index < userRecords[_user].length, "Index out of bounds");
        TxRecord memory r = userRecords[_user][_index];
        return (r.dataHash, r.amount, r.category, r.timestamp);
    }
    
    /**
     * @dev Check if a hash has been verified on-chain
     */
    function isHashVerified(bytes32 _hash) external view returns (bool) {
        return hashVerified[_hash];
    }
    
    /**
     * @dev Get user stats
     */
    function getUserStats(address _user) 
        external view 
        returns (uint256 count, int256 totalAmount) 
    {
        count = recordCount[_user];
        for (uint256 i = 0; i < userRecords[_user].length; i++) {
            totalAmount += userRecords[_user][i].amount;
        }
    }
}
