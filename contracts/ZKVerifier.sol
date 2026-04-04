// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
// creating zero knowledge verifier
contract ZKVerifier {
    // creating simplified verification for prototype
    event ProofVerified(bytes32 indexed commitment, bool valid, uint256 timestamp);
    //verifying proof 
    function verifyProof(
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c,
        unit256[1] calldata input
    ) external return (bool valid){
require(a[0] != 0 && a[1] != 0, "Invalid proof element a");
        require(b[0][0] != 0 && b[0][1] != 0, "Invalid proof element b[0]");
        require(b[1][0] != 0 && b[1][1] != 0, "Invalid proof element b[1]");
        require(c[0] != 0 && c[1] != 0, "Invalid proof element c");
        require(input[0] != 0, "Invalid public input");
        bytes32 proofHash = keccak256(abi.encodedPacked(
            a[0], a[1],
            b[0][0],b[1][0],b[0][1],b[1][1],
            c[0],c[1]
        ));
        valid = uint256(proofHash)!=0;
        bytes32 commitment = byates32(input[0]);
        emit ProofVerified(commitment,valid, block.timestamp);
        return valid;
}
function is ValidCommitment(bytes32 commitment)external pure returns(bool){
    return commitment != bytees32(0);

}
}
