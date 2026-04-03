// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AcessControl.sol";

contract WelfareScheme is
    AccessControl // initiating the contract
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE"); // using the keccak256 hashing function for address of admin role

    enum SchemeStatus {
        Active,
        Paused,
        Completed,
        Cancelled
    } // using enum for easy use of scheme status

    struct Scheme {
        // our own data record for the Scheme
        uint256 id;
        string name;
        string description;
        uint256 totalFund;
        uint256 distributedFund;
        uint256 perCitizenAmount;
        uint256 instalmentCount;
        uint256 instalmentAmount;
        uint256 currentInstalment;
        SchemeStatus status;
        uint256 beneficiaryCount;
        uint256 createdAt;
        uint256 updatedAt;
    }
    mapping (uint256 => Scheme) private _schemes; // Storage of schemes
    uint256 private _schemeCounter;// Counts the no. of schemes
    uint256[] private _allSchemeIds;// Array for storing  the schemes

    mapping(uint256 => mapping(uint256 => uint256)) public instalmentSchedule;
    // creating the installment schedule storage

    address digitalRupeeAddress;
    address citizenRegistryAddress;
    address vendorRegistryAddress;
    address transactionLedgerAddress;
    // addresses of the contracts that will be required in the  welfare scheme
    // Events for telling the frontend that the contract has done some activity
    event SchemeCreated(uint256 indexed schemeId, string name, uint256 totalFund, uint256 perCitizenAmount, uint256 instalmentCount);
    event SchemeStatusUpdated(uint256 indexed schemeId, SchemeStatus newStatus, uint256 timestamp);
    event FundsDistributed(uint256 indexed schemeId, uint256 amount, uint256 beneficiaries);
    event InstalmentScheduled(uint256 indexed schemeId, uint256 instalmentNumber, uint256 scheduledTimestamp); 
      


}
