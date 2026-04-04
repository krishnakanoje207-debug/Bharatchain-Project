// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract WelfareScheme is AccessControl  {  
    // initiating the contract
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE"); // using the keccak256 hashing function for address of admin role

    enum SchemeStatus {
        Active,
        Paused,
        Completed,
        Cancelled
    } // using enum for easy use of scheme status

    struct Scheme {
        // our own data record for the Scheme
        uint256 id;
        string name;
        string description;
        uint256 totalFund;
        uint256 distributedFund;
        uint256 perCitizenAmount;
        uint256 instalmentCount;
        uint256 instalmentAmount;
        uint256 currentInstalment;
        SchemeStatus status;
        uint256 beneficiaryCount;
        uint256 createdAt;
        uint256 updatedAt;
    }
    mapping(uint256 => Scheme) private _schemes; // Storage of schemes
    uint256 private _schemeCounter; // Counts the no. of schemes
    uint256[] private _allSchemeIds; // Array for storing  the schemes

    mapping(uint256 => mapping(uint256 => uint256)) public instalmentSchedule;
    // creating the installment schedule storage

    address digitalRupeeAddress;
    address citizenRegistryAddress;
    address vendorRegistryAddress;
    address transactionLedgerAddress;
    // addresses of the contracts that will be required in the  welfare scheme
    // Events for telling the frontend that the contract has done some activity
    event SchemeCreated(
        uint256 indexed schemeId,
        string name,
        uint256 totalFund,
        uint256 perCitizenAmount,
        uint256 instalmentCount
    );
    event SchemeStatusUpdated(
        uint256 indexed schemeId,
        SchemeStatus newStatus,
        uint256 timestamp
    );
    event FundsDistributed(
        uint256 indexed schemeId,
        uint256 amount,
        uint256 beneficiaries
    );
    event InstalmentScheduled(
        uint256 indexed schemeId,
        uint256 instalmentNumber,
        uint256 scheduledTimestamp
    );

    constructor(
        address _digitalRupee, // taking input of the addresses of contracts
        address _citizenRegistry,
        address _vendorRegistry,
        address _transactionLedger
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender); //constructor function grants role to deployer
        _grantRole(ADMIN_ROLE, msg.sender);
        digitalRupeeAddress = _digitalRupee;
        citizenRegistryAddress = _citizenRegistry;
        vendorRegistryAddress = _vendorRegistry;
        transactionLedgerAddress = _transactionLedger;
    } // storing the given addresses in the variable we made for it above

    // creating the function for making a scheme
    function createScheme(
        string calldata name,
        string calldata description,
        uint256 totalFund,
        uint256 perCitizenAmount,
        uint256 instalmentCount,
        uint256 instalmentAmount
    ) external onlyRole(ADMIN_ROLE) returns (uint256) {
        // modifier used so only admin can perform this function
        require(totalFund > 0, "Fund must be positive");
        require(perCitizenAmount > 0, "Per citizen amount must be positive");
        require(
            perCitizenAmount <= totalFund,
            "Per citizen exceeds total fund"
        );
        require(instalmentCount > 0, "At least 1 instalment");

        uint256 schemeId = ++_schemeCounter;
        _schemes[schemeId] = Scheme({
            id: schemeId,
            name: name,
            description: description,
            totalFund: totalFund,
            distributedFund: 0,
            perCitizenAmount: perCitizenAmount,
            instalmentCount: instalmentCount,
            instalmentAmount: instalmentAmount > 0
                ? instalmentAmount
                : perCitizenAmount / instalmentCount,
            currentInstalment: 0,
            status: SchemeStatus.Active,
            beneficiaryCount: 0,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });

        _allSchemeIds.push(schemeId); // pushing to the array of schemes
        emit SchemeCreated(
            schemeId,
            name,
            totalFund,
            perCitizenAmount,
            instalmentCount
        ); // emitting the  event for frontend
        return schemeId;
    }

    // function for scheduling the instalment
    function scheduleInstalment(
        uint256 schemeId,
        uint256 instalmentNumber,
        uint256 scheduledTimestamp
    ) external onlyRole(ADMIN_ROLE) {
        Scheme storage scheme = _schemes[schemeId]; // fetching the scheme id
        require(scheme.createdAt != 0, "Scheme does not exist"); // checking conditions to see if the scheme exist or instalment number is within the range
        require(
            instalmentNumber > 0 && instalmentNumber <= scheme.instalmentCount,
            "Invalid instalment"
        );

        instalmentSchedule[schemeId][instalmentNumber] = scheduledTimestamp;
        emit InstalmentScheduled(
            schemeId,
            instalmentNumber,
            scheduledTimestamp
        );
    }

    // function to update  scheme
    function updateSchemeStatus(
        uint256 schemeId,
        SchemeStatus newStatus
    ) external onlyRole(ADMIN_ROLE) {
        Scheme storage scheme = _schemes[schemeId];
        require(scheme.createdAt != 0, "Scheme does not exist");
        require(
            scheme.status != SchemeStatus.Cancelled,
            "Cannot update cancelled scheme"
        ); // checking if the scheme is cancelled or not
        scheme.status = newStatus;
        scheme.updatedAt = block.timestamp; // creating a timestamp for when the scheme details are updated
        emit SchemeStatusUpdated(schemeId, newStatus, block.timestamp);
    }

    // function for recording the distribution
    function recordDistribution(
        uint256 schemeId,
        uint256 amount,
        uint256 beneficiaries
    ) external onlyRole(ADMIN_ROLE) {
        Scheme storage scheme = _schemes[schemeId];
        require(scheme.status == SchemeStatus.Active, "Scheme not active");
        // updating details of main block after distribution
        scheme.distributedFund += amount;
        scheme.beneficiaryCount += beneficiaries;
        scheme.currentInstalment++;
        scheme.updatedAt = block.timestamp;
        emit FundsDistributed(schemeId, amount, beneficiaries);
        // checking if the  distributed fund has not exceeded the total fund, if done then mark the scheme as completed
        if (scheme.distributedFund >= scheme.totalFund) {
            scheme.status = SchemeStatus.Completed;
            emit SchemeStatusUpdated(
                schemeId,
                SchemeStatus.Completed,
                block.timestamp
            );
        }
    }

    // these are all the functions that use gas, now we will make view functions for the things we need that does not use gas
    // 1. to return scheme
    function getScheme(uint256 schemeId) external view returns (Scheme memory) {
        require(_schemes[schemeId].createdAt != 0, "Scheme does not exist");
        return _schemes[schemeId];  
    }
    // 2. scheme details 
    function getSchemeDetails(
        uint256 schemeId
    )
        external
        view
        returns (
            string memory name,
            string memory description,
            uint256 totalFund,
            uint256 distributedFund,
            uint256 perCitizenAmount,
            SchemeStatus status,
            uint256 beneficiaryCount,
            uint256 instalmentCount,
            uint256 currentInstalment
        )
    {
        Scheme memory s = _schemes[schemeId];
        require(s.createdAt != 0, "Scheme does not exist");
        return (
            s.name,
            s.description,
            s.totalFund,
            s.distributedFund,
            s.perCitizenAmount,
            s.status,
            s.beneficiaryCount,
            s.instalmentCount,
            s.currentInstalment
        );
    }
    // 3. to return total no. of schemes
    function getTotalSchemes() external view returns (uint256) {
        return _schemeCounter;
    }
    // 4. to return schemeIds
    function getAllSchemeIds() external view returns (uint256[] memory) {
        return _allSchemeIds;
    }
    // 5. to check how much fund is left
    function getRemainingFund(
        uint256 schemeId
    ) external view returns (uint256) {
        Scheme memory s = _schemes[schemeId];
        if (s.distributedFund >= s.totalFund) return 0;
        return s.totalFund - s.distributedFund;
    }
    // 6. to return instalment schedule
    function getInstalmentSchedule(
        uint256 schemeId,
        uint256 instalmentNumber
    ) external view returns (uint256) {
        return instalmentSchedule[schemeId][instalmentNumber];
    }
}
