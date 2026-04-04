// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title VendorRegistry
 * @dev Manages the vendor blockchain — government-approved vendors of two types.
 * Includes banking details for RBI INR transfer and token revocation flow.
 */
contract VendorRegistry is AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant RBI_ROLE = keccak256("RBI_ROLE");

    enum VendorType { FarmingSupplier, CropBuyer }
    enum VendorStatus { Pending, Approved, Suspended, Rejected }
    enum ExchangeStatus { None, Requested, ITRVerified, RBITransferred, TokensRevoked }

    struct Vendor {
        uint256 id;
        address walletAddress;
        VendorType vendorType;
        VendorStatus status;
        string businessName;
        bytes32 credentialHash;      // Hash of degree/license
        bytes32 bankAccountHash;     // Hashed bank account number
        bytes32 ifscHash;            // Hashed IFSC code
        uint256 tokenBalance;        // Accumulated tokens from citizens
        uint256 exchangedAmount;     // Total tokens exchanged for INR
        ExchangeStatus exchangeStatus;
        uint256 exchangeRequestAmount;
        uint256 registeredAt;
        uint256 approvedAt;
        bool rbiTransferConfirmed;   // Set true when RBI sends real INR
    }

    mapping(uint256 => Vendor) private _vendors;
    mapping(address => uint256) public walletToVendorId;
    uint256 private _vendorCounter;
    uint256[] private _allVendorIds;

    event VendorRegistered(uint256 indexed vendorId, address indexed wallet, VendorType vendorType);
    event VendorApproved(uint256 indexed vendorId, uint256 timestamp);
    event VendorRejected(uint256 indexed vendorId, uint256 timestamp);
    event VendorSuspended(uint256 indexed vendorId, uint256 timestamp);
    event ExchangeRequested(uint256 indexed vendorId, uint256 amount, uint256 timestamp);
    event ITRVerified(uint256 indexed vendorId, uint256 timestamp);
    event RBITransferConfirmed(uint256 indexed vendorId, uint256 amount, uint256 timestamp);
    event TokensRevokedFromVendor(uint256 indexed vendorId, uint256 amount, uint256 timestamp);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(RBI_ROLE, msg.sender);
    }

    /**
     * @dev Register as a vendor. Called by vendor themselves via MetaMask.
     */
    function registerVendor(
        VendorType vendorType,
        string calldata businessName,
        bytes32 credentialHash,
        bytes32 bankAccountHash,
        bytes32 ifscHash
    ) external returns (uint256) {
        require(walletToVendorId[msg.sender] == 0 ||
                _vendors[walletToVendorId[msg.sender]].walletAddress == address(0),
                "Wallet already registered as vendor");

        uint256 vendorId = ++_vendorCounter;
        _vendors[vendorId] = Vendor({
            id: vendorId,
            walletAddress: msg.sender,
            vendorType: vendorType,
            status: VendorStatus.Pending,
            businessName: businessName,
            credentialHash: credentialHash,
            bankAccountHash: bankAccountHash,
            ifscHash: ifscHash,
            tokenBalance: 0,
            exchangedAmount: 0,
            exchangeStatus: ExchangeStatus.None,
            exchangeRequestAmount: 0,
            registeredAt: block.timestamp,
            approvedAt: 0,
            rbiTransferConfirmed: false
        });

        walletToVendorId[msg.sender] = vendorId;
        _allVendorIds.push(vendorId);

        emit VendorRegistered(vendorId, msg.sender, vendorType);
        return vendorId;
    }

    /**
     * @dev Register a vendor by admin — auto-approved.
     * Called by the backend using the deployer/admin signer when a vendor
     * application is approved in the database.
     */
    function registerVendorByAdmin(
        address vendorWallet,
        VendorType vendorType,
        string calldata businessName,
        bytes32 credentialHash,
        bytes32 bankAccountHash,
        bytes32 ifscHash
    ) external onlyRole(ADMIN_ROLE) returns (uint256) {
        require(walletToVendorId[vendorWallet] == 0 ||
                _vendors[walletToVendorId[vendorWallet]].walletAddress == address(0),
                "Wallet already registered as vendor");

        uint256 vendorId = ++_vendorCounter;
        _vendors[vendorId] = Vendor({
            id: vendorId,
            walletAddress: vendorWallet,
            vendorType: vendorType,
            status: VendorStatus.Approved,  // AUTO-APPROVED
            businessName: businessName,
            credentialHash: credentialHash,
            bankAccountHash: bankAccountHash,
            ifscHash: ifscHash,
            tokenBalance: 0,
            exchangedAmount: 0,
            exchangeStatus: ExchangeStatus.None,
            exchangeRequestAmount: 0,
            registeredAt: block.timestamp,
            approvedAt: block.timestamp,
            rbiTransferConfirmed: false
        });

        walletToVendorId[vendorWallet] = vendorId;
        _allVendorIds.push(vendorId);

        emit VendorRegistered(vendorId, vendorWallet, vendorType);
        emit VendorApproved(vendorId, block.timestamp);
        return vendorId;
    }

    /**
     * @dev Approve a pending vendor. Admin only.
     */
    function approveVendor(uint256 vendorId) external onlyRole(ADMIN_ROLE) {
        Vendor storage vendor = _vendors[vendorId];
        require(vendor.walletAddress != address(0), "Vendor does not exist");
        require(vendor.status == VendorStatus.Pending, "Vendor not pending");

        vendor.status = VendorStatus.Approved;
        vendor.approvedAt = block.timestamp;

        emit VendorApproved(vendorId, block.timestamp);
    }

    /**
     * @dev Reject a pending vendor. Admin only.
     */
    function rejectVendor(uint256 vendorId) external onlyRole(ADMIN_ROLE) {
        Vendor storage vendor = _vendors[vendorId];
        require(vendor.walletAddress != address(0), "Vendor does not exist");
        require(vendor.status == VendorStatus.Pending, "Vendor not pending");

        vendor.status = VendorStatus.Rejected;
        emit VendorRejected(vendorId, block.timestamp);
    }

    /**
     * @dev Suspend an approved vendor. Admin only.
     */
    function suspendVendor(uint256 vendorId) external onlyRole(ADMIN_ROLE) {
        Vendor storage vendor = _vendors[vendorId];
        require(vendor.status == VendorStatus.Approved, "Vendor not approved");

        vendor.status = VendorStatus.Suspended;
        emit VendorSuspended(vendorId, block.timestamp);
    }

    /**
     * @dev Vendor requests INR exchange for accumulated tokens.
     */
    function requestExchange(uint256 amount) external {
        uint256 vendorId = walletToVendorId[msg.sender];
        require(vendorId != 0, "Not a registered vendor");
        Vendor storage vendor = _vendors[vendorId];
        require(vendor.status == VendorStatus.Approved, "Vendor not approved");
        require(vendor.exchangeStatus == ExchangeStatus.None || 
                vendor.exchangeStatus == ExchangeStatus.TokensRevoked, 
                "Exchange already in progress");
        require(amount > 0, "Amount must be positive");

        vendor.exchangeStatus = ExchangeStatus.Requested;
        vendor.exchangeRequestAmount = amount;

        emit ExchangeRequested(vendorId, amount, block.timestamp);
    }

    /**
     * @dev Admin confirms ITR verification passed for vendor.
     */
    function verifyITR(uint256 vendorId) external onlyRole(ADMIN_ROLE) {
        Vendor storage vendor = _vendors[vendorId];
        require(vendor.exchangeStatus == ExchangeStatus.Requested, "No exchange request");

        vendor.exchangeStatus = ExchangeStatus.ITRVerified;
        emit ITRVerified(vendorId, block.timestamp);
    }

    /**
     * @dev RBI admin confirms real INR has been transferred to vendor's bank account.
     * This triggers the token revocation flow via Chainlink Keeper.
     */
    function confirmRBITransfer(uint256 vendorId) external onlyRole(RBI_ROLE) {
        Vendor storage vendor = _vendors[vendorId];
        require(vendor.walletAddress != address(0), "Vendor does not exist");
        require(vendor.exchangeStatus == ExchangeStatus.ITRVerified, "ITR not verified");

        vendor.rbiTransferConfirmed = true;
        vendor.exchangeStatus = ExchangeStatus.RBITransferred;

        emit RBITransferConfirmed(vendorId, vendor.exchangeRequestAmount, block.timestamp);
    }

    /**
     * @dev Mark vendor tokens as revoked. Called by TokenDistributor after burning.
     */
    function markTokensRevoked(uint256 vendorId, uint256 amount) external onlyRole(ADMIN_ROLE) {
        Vendor storage vendor = _vendors[vendorId];
        require(vendor.rbiTransferConfirmed, "RBI transfer not confirmed");

        vendor.exchangeStatus = ExchangeStatus.TokensRevoked;
        vendor.exchangedAmount += amount;
        vendor.tokenBalance = 0;
        vendor.rbiTransferConfirmed = false;
        vendor.exchangeRequestAmount = 0;

        emit TokensRevokedFromVendor(vendorId, amount, block.timestamp);
    }

    /**
     * @dev Update vendor token balance. Called when citizens transfer tokens.
     */
    function updateTokenBalance(uint256 vendorId, uint256 amount) external onlyRole(ADMIN_ROLE) {
        _vendors[vendorId].tokenBalance += amount;
    }

    // ==================== VIEW FUNCTIONS ====================

    function isVerifiedVendor(address wallet) external view returns (bool) {
        uint256 vid = walletToVendorId[wallet];
        return vid != 0 && _vendors[vid].status == VendorStatus.Approved;
    }

    function getVendor(uint256 vendorId) external view returns (Vendor memory) {
        require(_vendors[vendorId].walletAddress != address(0), "Vendor does not exist");
        return _vendors[vendorId];
    }

    function getVendorByWallet(address wallet) external view returns (Vendor memory) {
        uint256 vid = walletToVendorId[wallet];
        require(vid != 0, "No vendor for this wallet");
        return _vendors[vid];
    }

    function isRBITransferConfirmed(uint256 vendorId) external view returns (bool) {
        return _vendors[vendorId].rbiTransferConfirmed;
    }

    function getTotalVendors() external view returns (uint256) {
        return _vendorCounter;
    }

    function getAllVendorIds() external view returns (uint256[] memory) {
        return _allVendorIds;
    }

    function getVendorWallet(uint256 vendorId) external view returns (address) {
        return _vendors[vendorId].walletAddress;
    }

    function getVendorsWithRBIConfirmation() external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < _allVendorIds.length; i++) {
            if (_vendors[_allVendorIds[i]].rbiTransferConfirmed) {
                count++;
            }
        }

        uint256[] memory confirmed = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < _allVendorIds.length; i++) {
            if (_vendors[_allVendorIds[i]].rbiTransferConfirmed) {
                confirmed[idx++] = _allVendorIds[i];
            }
        }
        return confirmed;
    }
}
