// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

interface IDigitalRupee {
    function mint(address to, uint256 amount) external;

    function revokeTokens(address from, uint256 amount) external;

    function balanceOf(address account) external view returns (uint256);
}
interface ICitizenRegistry {
    function getApprovedCitizenIds() external view returns (uint256[] memory);

    function getCitizenWallet(
        uint256 citizenId
    ) external view returns (address);

    function markFunded(uint256 citizenId, uint256 amount) external;
}
interface IVendorRegistry {
    function getVendorsWithRBIConfirmation()
        external
        view
        returns (uint256[] memory);

    function getVendorWallet(uint256 vendorId) external view returns (address);

    function markTokensRevoked(uint256 vendorId, uint256 amount) external;

    function isRBITransferConfirmed(
        uint256 vendorId
    ) external view returns (bool);
}

interface ITransactionLedger {
    function logTransaction(
        uint8 txType,
        address from,
        address to,
        uint256 amount,
        string calldata description
    ) external returns (uint256);
}

interface IWelfareScheme {
    function recordDistribution(
        uint256 schemeId,
        uint256 amount,
        uint256 beneficiaries
    ) external;
}
contract TokenDistributor is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    //reference of other contracts
    IDigitalRupee public digitalRupee;
    ICitizenRegistry public citizenRegistry;
    IVendorRegistry public vendorRegistry;
    ITransactionLedger public transactionLedger;
// addiing welfare scheme reference for recording distribution details
    uint256 public activeSchemeId;
    uint256 public perCitizenAmount;
    bool public distributionCompleted;

    // ===== TIME-BASED KEEPER FIELDS =====
    uint256 public interval; // Seconds between distributions (default 24h)
    uint256 public lastTimeStamp; // Last time distribution was triggered

    event TokensDistributed(
        uint256 indexed schemeId,
        uint256 citizenCount,
        uint256 totalAmount,
        uint256 timestamp
    );
    event VendorTokensRevoked(
        uint256 indexed vendorId,
        address indexed vendorWallet,
        uint256 amount,
        uint256 timestamp
    );
    event DistributionConfigured(
        uint256 indexed schemeId,
        uint256 perCitizenAmount
    );
    event IntervalUpdated(uint256 newInterval);
    constructor(
        address _digitalRupee,
        address _citizenRegistry,
        address _vendorRegistry,
        address _transactionLedger
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);

        digitalRupee = IDigitalRupee(_digitalRupee);
        citizenRegistry = ICitizenRegistry(_citizenRegistry);
        vendorRegistry = IVendorRegistry(_vendorRegistry);
        transactionLedger = ITransactionLedger(_transactionLedger);

        interval = 86400; // Default: 24 hours
        lastTimeStamp = block.timestamp; // Initialize to now
    }
     function setInterval(uint256 _interval) external onlyRole(ADMIN_ROLE) {
        require(_interval >= 60, "Interval must be >= 60 seconds");
        interval = _interval;
        emit IntervalUpdated(_interval);
    }
