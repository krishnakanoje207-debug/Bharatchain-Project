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