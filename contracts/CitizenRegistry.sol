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
    // Storage 
    mapping(uint256 => Citizen) private _citizens;// data storage for Citizens
    mapping(address => uint256) public walletToCitizenId; // wallet to citizen Id storage
    mapping(bytes32 => bool) public commitmentUsed; // is zkcommitment used or not
    uint256 private _citizenCounter; // no. of citizens
    uint256[] private _allCitizenIds;// array for CitizenIds
    // events for this contract
    event CitizenRegistered(uint256 indexed citizenId, address indexed wallet, bytes32 zkCommitment);
    event CitizenApproved(uint256 indexed citizenId, uint256 timestamp);
    event CitizenRejected(uint256 indexed citizenId, uint256 timestamp);
    event CitizenFunded(uint256 indexed citizenId, uint256 amount, uint256 timestamp);

    //constructor for the contract
    constructor(address _zkVerifier){// taking address of zkVerifier as input
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        zkVerifier = IZKVerifier(_zkVerifier);// assigning the address to an instance 
    }
    // creating the  main function of registering citizen
    function registerCitizen(
        bytes32 zkCommitment,
        bytes32 mobileHash,
        uint256 schemeId,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[1] calldata input
    ) external returns (uint256) {
        require(!commitmentUsed[zkCommitment], "Commitment already registered");// checking if the zk is used previously or not
        require(walletToCitizenId[msg.sender] == 0 || 
                _citizens[walletToCitizenId[msg.sender]].walletAddress == address(0), 
                "Wallet already registered");// checking  if the wallet is used previously or not

        require(input[0] == uint256(zkCommitment), "Input mismatch with commitment");// is zk the same as the input provided
        bool proofValid = zkVerifier.verifyProof(a, b, c, input);// checking if citizen is verified or not by calling verifyProof Function
        require(proofValid, "Invalid ZK proof");

        uint256 citizenId = ++_citizenCounter;// citizen data 
        _citizens[citizenId] = Citizen({
            id: citizenId,
            walletAddress: msg.sender,
            zkCommitment: zkCommitment,
            status: CitizenStatus.Approved,
            tokenBalance: 0,
            registeredAt: block.timestamp,
            approvedAt: block.timestamp,
            mobileHash: mobileHash,
            schemeId: schemeId
        });

        walletToCitizenId[msg.sender] = citizenId;// storing wallet
        commitmentUsed[zkCommitment] = true;// to avoid reuse of ZKproofs
        _allCitizenIds.push(citizenId);//pushing to the citizen array
        // emitting  the events
        emit CitizenRegistered(citizenId, msg.sender, zkCommitment);
        emit CitizenApproved(citizenId, block.timestamp);
        return citizenId;
    }



}

