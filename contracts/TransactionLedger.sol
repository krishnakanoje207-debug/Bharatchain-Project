// SPDX - License-Identifier: MIT
pragma solidity ^0.8.20;





import "@openzeppelin/contracts/access/AccessControl.sol";


contract TransactionLedger is AccessControl{
    bytes32 public constant LOGGER_ROLE = keccak256("LOGGER_ROLE");

    enum TxType{TokenMint, TokenAllocation, CitizenToVendor, VendorExchange, TokenRevocation}

    struct TxRecord{// data type of our own
        uint256 id;
        TxType txType;
        address from;
        address to;
        uint256 amount;
        uint256 timestamp;
        string description;
    }
    TxRecord[] private _transactions;// array of transactions with datatype of TxRecord
    uint256 private _txCounter;//  Transaction counter
    // event for the contract
    event TransactionLogged(
        uint256 indexed txId,
        TxType indexed txType,
        address indexed from,
        address to,
        uint256 amount,
        uint256 timestamp
    );
    constructor(){
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);

    }
    // Function to Log Transaction
    function logTransaction(
        TxType txType,
        address from,
        address to,
        uint256 amount,
        string calldata description
    ) external onlyRole(LOGGER_ROLE) returns (uint256) {
        uint256 txId = _txCounter++;
        
        _transactions.push(TxRecord({// pushing a transaction record in the array
            id: txId,
            txType: txType,
            from: from,
            to: to,
            amount: amount,
            timestamp: block.timestamp,
            description: description
        }));
        // checking if the  transaction is public or private
        if (txType == TxType.TokenMint || txType == TxType.TokenAllocation || txType == TxType.TokenRevocation) {
            _publicTxIds.push(txId);// if any one is true it means it was a public transaction
        } else {
            _privateTxIds.push(txId);
        }

        emit TransactionLogged(txId, txType, from, to, amount, block.timestamp);
        return txId;
    }
    // ********************************VIEW FUNCTIONS********************************
    // 1. get a transaction by its ID
    function getTransaction(uint256 txId) external view returns (TxRecord memory) {
        require(txId < _transactions.length, "Transaction does not exist");
        return _transactions[txId];
    }
}