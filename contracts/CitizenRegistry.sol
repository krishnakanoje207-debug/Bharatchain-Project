// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

interface IZKVerifier {
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[1] calldata input
    ) external returns (bool);
}

/**
 * @title CitizenRegistry
 * @dev Citizens are AUTO-APPROVED on registration once ZK proof is verified.
 * Uses LUMP-SUM distribution: once funded, a citizen moves to Funded status
 * and is excluded from future distributions (no double-spending).
 */
contract CitizenRegistry is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");

    IZKVerifier public zkVerifier;

    enum CitizenStatus { Pending, Approved, Rejected, Funded }

    struct Citizen {
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

    mapping(uint256 => Citizen) private _citizens;
    mapping(address => uint256) public walletToCitizenId;
    mapping(bytes32 => bool) public commitmentUsed;
    uint256 private _citizenCounter;
    uint256[] private _allCitizenIds;

    event CitizenRegistered(uint256 indexed citizenId, address indexed wallet, bytes32 zkCommitment);
    event CitizenApproved(uint256 indexed citizenId, uint256 timestamp);
    event CitizenRejected(uint256 indexed citizenId, uint256 timestamp);
    event CitizenFunded(uint256 indexed citizenId, uint256 amount, uint256 timestamp);

    constructor(address _zkVerifier) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        zkVerifier = IZKVerifier(_zkVerifier);
    }

    /**
     * @dev Register a citizen — AUTO-APPROVED if ZK proof is valid.
     */
    function registerCitizen(
        bytes32 zkCommitment,
        bytes32 mobileHash,
        uint256 schemeId,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        uint256[1] calldata input
    ) external returns (uint256) {
        require(!commitmentUsed[zkCommitment], "Commitment already registered");
        require(walletToCitizenId[msg.sender] == 0 || 
                _citizens[walletToCitizenId[msg.sender]].walletAddress == address(0), 
                "Wallet already registered");

        require(input[0] == uint256(zkCommitment), "Input mismatch with commitment");
        bool proofValid = zkVerifier.verifyProof(a, b, c, input);
        require(proofValid, "Invalid ZK proof");

        uint256 citizenId = ++_citizenCounter;
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

        walletToCitizenId[msg.sender] = citizenId;
        commitmentUsed[zkCommitment] = true;
        _allCitizenIds.push(citizenId);

        emit CitizenRegistered(citizenId, msg.sender, zkCommitment);
        emit CitizenApproved(citizenId, block.timestamp);
        return citizenId;
    }

    /**
     * @dev Register a citizen by admin — NO ZK proof required.
     * The backend has already verified the citizen's identity.
     */
    function registerCitizenByAdmin(
        address citizenWallet,
        bytes32 zkCommitment,
        bytes32 mobileHash,
        uint256 schemeId
    ) external onlyRole(ADMIN_ROLE) returns (uint256) {
        require(!commitmentUsed[zkCommitment], "Commitment already registered");
        require(walletToCitizenId[citizenWallet] == 0 || 
                _citizens[walletToCitizenId[citizenWallet]].walletAddress == address(0), 
                "Wallet already registered");

        uint256 citizenId = ++_citizenCounter;
        _citizens[citizenId] = Citizen({
            id: citizenId,
            walletAddress: citizenWallet,
            zkCommitment: zkCommitment,
            status: CitizenStatus.Approved,
            tokenBalance: 0,
            registeredAt: block.timestamp,
            approvedAt: block.timestamp,
            mobileHash: mobileHash,
            schemeId: schemeId
        });

        walletToCitizenId[citizenWallet] = citizenId;
        commitmentUsed[zkCommitment] = true;
        _allCitizenIds.push(citizenId);

        emit CitizenRegistered(citizenId, citizenWallet, zkCommitment);
        emit CitizenApproved(citizenId, block.timestamp);
        return citizenId;
    }

    function rejectCitizen(uint256 citizenId) external onlyRole(ADMIN_ROLE) {
        Citizen storage citizen = _citizens[citizenId];
        require(citizen.walletAddress != address(0), "Citizen does not exist");
        require(citizen.status == CitizenStatus.Approved, "Citizen not approved");
        citizen.status = CitizenStatus.Rejected;
        emit CitizenRejected(citizenId, block.timestamp);
    }

    /**
     * @dev Mark citizen as funded. Changes status to Funded so they are
     * excluded from future distributions (one-time lump-sum).
     */
    function markFunded(uint256 citizenId, uint256 amount) external onlyRole(DISTRIBUTOR_ROLE) {
        Citizen storage citizen = _citizens[citizenId];
        require(citizen.status == CitizenStatus.Approved, "Citizen not approved");
        citizen.status = CitizenStatus.Funded;
        citizen.tokenBalance += amount;
        emit CitizenFunded(citizenId, amount, block.timestamp);
    }

    // ==================== VIEW FUNCTIONS ====================
    function getCitizen(uint256 citizenId) external view returns (Citizen memory) {
        require(_citizens[citizenId].walletAddress != address(0), "Citizen does not exist");
        return _citizens[citizenId];
    }

    function getCitizenByWallet(address wallet) external view returns (Citizen memory) {
        uint256 cid = walletToCitizenId[wallet];
        require(cid != 0, "No citizen for this wallet");
        return _citizens[cid];
    }

    function getCitizenStatus(uint256 citizenId) external view returns (CitizenStatus) {
        return _citizens[citizenId].status;
    }

    function getTotalCitizens() external view returns (uint256) { return _citizenCounter; }

    /**
     * @dev Returns ONLY Approved citizens — Funded citizens are excluded
     * to prevent double-spending in lump-sum distribution model.
     */
    function getApprovedCitizenIds() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < _allCitizenIds.length; i++) {
            if (_citizens[_allCitizenIds[i]].status == CitizenStatus.Approved) count++;
        }
        uint256[] memory approved = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < _allCitizenIds.length; i++) {
            if (_citizens[_allCitizenIds[i]].status == CitizenStatus.Approved) approved[idx++] = _allCitizenIds[i];
        }
        return approved;
    }

    function getAllCitizenIds() external view returns (uint256[] memory) { return _allCitizenIds; }

    function getCitizenWallet(uint256 citizenId) external view returns (address) {
        return _citizens[citizenId].walletAddress;
    }
}
