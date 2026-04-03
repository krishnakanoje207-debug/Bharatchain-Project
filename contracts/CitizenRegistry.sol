// SPDX - License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";






// creating the interface for Zero Knowledge Proof verification
interface IZKVerifier {
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[2] calldata input
    ) external returns(bool);
}
// creating the main contract for citizenRegistry(ZKproof auto-approves)
contract CitizenRegistry is AccessControl{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    
    IZKVerifier public zkVerifier; // instance of the ZK verifier contract
    enum CitizenStatus{Pending,Approved,Rejected,Funded};

    struct Citizen{ // Creating Citizen data record 
        uint256 id;
        address walletAddress;
        bytes32 zkCommitment;
        CitizenStatus status;
        uint256 tokenBalance;
        uint256 registeredAt;
        uint256 approvedAt;
        bytes32 mobileHash;
        uint256 schemeId;
    }
    

}

