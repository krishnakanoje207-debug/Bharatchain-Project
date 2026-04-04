// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

// digitalRupee contract
contract DigitalRupee is ERC20, ERC20Burnable, AccessControl {
//Creating  unique role identifiers
//Using keccak256 (hash function) to generate secure role IDs
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    //Storing logs on blockchain

    event TokensMinted(address indexed to, uintt256 amount, uintt256 timestamp);
    event TokensRevoked(
        address indexed from,
        unit256 amount,
        unit256 timestamp
    );
            //initiallizing ERC20
    constructor() ERC20("DigitalRupee", "INRD") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
}
//Only addresses with MINTER_ROLE can call this
  function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
        emit TokensMinted(to, amount, block.timestamp);
    }
    // only admin can brn tokens 
    function revokeTokens(address from, uint256 amount) external onlyRole(BURNER_ROLE) {
        _burn(from, amount);
        emit TokensRevoked(from, amount, block.timestamp);
    }
    function burnFrom(address account, uint256 amount) public override {
        if (hasRole(BURNER_ROLE, msg.sender)) {
            _burn(account, amount);
            emit TokensRevoked(account, amount, block.timestamp);
        } else {
            super.burnFrom(account, amount);
        }
    }


