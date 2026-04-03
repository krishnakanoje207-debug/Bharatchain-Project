//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

// digitalRupee contract
contract DigitalRupee is ERC20, ERC20Burnable, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    event TokensMinted(address indexed to , unit256 amount ,unit256 timestamp);
    event TokensRevoked(address indexed from , unit256 amount, unit256 timestamp);
    constructor() ERC20("DigitalRupee", "INRD"){
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    

