// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;




import "@openzeppelin/contracts/access/AcessControl.sol";


contract WelfareScheme is AccessControl{ // initiating the contract 
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE"); // using the keccak256 hashing function for address of admin role
    
    enum SchemeStatus{Active, Paused , Completed, Cancelled }// using enum for easy use of scheme status
    
    struct Scheme{ // our own data record for the Scheme
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
    
}