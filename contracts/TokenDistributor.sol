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