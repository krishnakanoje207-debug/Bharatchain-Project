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

}