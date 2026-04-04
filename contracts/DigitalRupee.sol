//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title DigitalRupee
 * @dev ERC-20 token representing the Digital Rupee (₹D / INRD).
 * Only MINTER_ROLE can mint tokens (granted to TokenDistributor).
 * BURNER_ROLE can burn tokens from vendor wallets (token revocation after RBI transfer).
 */
contract DigitalRupee is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    event TokensMinted(address indexed to, uint256 amount, uint256 timestamp);
    event TokensRevoked(address indexed from, uint256 amount, uint256 timestamp);

    constructor() ERC20("Digital Rupee", "INRD") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Mint new Digital Rupees. Only callable by TokenDistributor (MINTER_ROLE).
     * @param to Recipient address (citizen wallet)
     * @param amount Amount of tokens to mint (in wei, 18 decimals)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
        emit TokensMinted(to, amount, block.timestamp);// logging token on blockchain
    }

    /**
     * @dev Burn tokens from a vendor's wallet after RBI confirms INR transfer.
     * Only callable by TokenDistributor (BURNER_ROLE).
     * @param from Vendor address to burn tokens from
     * @param amount Amount to burn
     */
    function revokeTokens(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(from, amount);
        emit TokensRevoked(from, amount, block.timestamp);
    }

    /**
     * @dev Override to allow BURNER_ROLE to burn without allowance (for revocation).
     */
    function burnFrom(address account, uint256 amount) public override {
        if (hasRole(BURNER_ROLE, msg.sender)) {
            _burn(account, amount);
            emit TokensRevoked(account, amount, block.timestamp);
        } else {
            super.burnFrom(account, amount);
        }
    }
}
