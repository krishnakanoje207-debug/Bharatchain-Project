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
        walletToVendorId[msg.sender] = vendorId;
        _allVendorIds.push(vendorId);

        emit VendorRegistered(vendorId, msg.sender, vendorType);
        return vendorId;
    }
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


    function approvevendor(uint256 vendorId) external onlyRole(ADMIN_ROLE){
        vendor storage vendor = _vendor[vendorId];
        require(vendor.walletAddress!=address(0),"vendor does not exist");
        require(vendor status == VendorStatus.Pending,"vendor not verified");
        vendor.approvedAt =block.timestamp;
        emit VendorApproved(vendorId,block.timestamp);
    }
