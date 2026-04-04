// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract TransactionLedger is AccessControl {
    bytes32 public constant LOGGER_ROLE = keccak256("LOGGER_ROLE");

    enum TxType {
        TokenMint,
        TokenAllocation,
        CitizenToVendor,
        VendorExchange,
        TokenRevocation
    }

    struct TxRecord {
        // data type of our own
        uint256 id;
        TxType txType;
        address from;
        address to;
        uint256 amount;
        uint256 timestamp;
        string description;
    }
    TxRecord[] private _transactions; // array of transactions with datatype of TxRecord
    uint256 private _txCounter; //  Transaction counter

    uint256[] private _publicTxIds;
    uint256[] private _privateTxIds;

    // event for the contract
    event TransactionLogged(
        uint256 indexed txId,
        TxType indexed txType,
        address indexed from,
        address to,
        uint256 amount,
        uint256 timestamp
    );

    constructor() {
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

        _transactions.push(
            TxRecord({ // pushing a transaction record in the array
                id: txId,
                txType: txType,
                from: from,
                to: to,
                amount: amount,
                timestamp: block.timestamp,
                description: description
            })
        );
        // checking if the  transaction is public or private
        if (
            txType == TxType.TokenMint ||
            txType == TxType.TokenAllocation ||
            txType == TxType.TokenRevocation
        ) {
            _publicTxIds.push(txId); // if any one is true it means it was a public transaction
        } else {
            _privateTxIds.push(txId);
        }

        emit TransactionLogged(txId, txType, from, to, amount, block.timestamp);
        return txId;
    }

    // ********************************VIEW FUNCTIONS********************************
    // 1. get a transaction by its ID
    function getTransaction(
        uint256 txId
    ) external view returns (TxRecord memory) {
        require(txId < _transactions.length, "Transaction does not exist");
        return _transactions[txId];
    }

    // get the public transactions
    function getPublicTransactions() external view returns (TxRecord[] memory) {
        TxRecord[] memory publicTxns = new TxRecord[](_publicTxIds.length); // storing it in a new array
        for (uint256 i = 0; i < _publicTxIds.length; i++) {
            publicTxns[i] = _transactions[_publicTxIds[i]];
        }
        return publicTxns; // returning the new array
    }

    //3. get count of private Transactions
    function getPrivateTransactionCount() external view returns (uint256) {
        return _privateTxIds.length;
    }

    //4.get total transactions
    function getTotalTransactionCount() external view returns (uint256) {
        return _transactions.length;
    }

    // get the transactions in a paginated form
    function getTransactionsPaginated(
        uint256 offset,
        uint256 limit
    ) external view returns (TxRecord[] memory) {
        require(offset < _transactions.length, "Offset out of bounds"); // checking  if offset is less than the length of transactions or not
        uint256 end = offset + limit;
        if (end > _transactions.length) {
            // there are not enough transaction to return(limit is exceeded)
            end = _transactions.length;
        }
        TxRecord[] memory result = new TxRecord[](end - offset); // storing in a new array
        for (uint256 i = offset; i < end; i++) {
            result[i - offset] = _transactions[i]; // resultant array index starts from 0 but transaction index starts from the offset given
        }
        return result;
    }
}
