// Circom circuit: citizenProof.circom
// Proves: "I know (pan, samagraId, mobile) such that Poseidon(pan, samagraId, mobile) == commitment"
//
// This circuit is for reference. In the hackathon prototype, the ZKVerifier.sol
// uses a simplified verifier. To use this circuit in production:
//
// 1. Install circom: npm install -g circom
// 2. Compile: circom citizenProof.circom --r1cs --wasm --sym
// 3. Trusted setup: snarkjs groth16 setup citizenProof.r1cs pot12_final.ptau circuit_final.zkey
// 4. Export verifier: snarkjs zkey export solidityverifier circuit_final.zkey ZKVerifier.sol
// 5. Generate proof: snarkjs groth16 fullprove input.json citizenProof_js/citizenProof.wasm circuit_final.zkey proof.json public.json

pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";

template CitizenIdentityProof() {
    // Private inputs (citizen's raw data — never leaves the client)
    signal input pan;           // PAN number as field element
    signal input samagraId;     // Samagra ID as field element
    signal input mobile;        // Mobile number as field element

    // Public output (stored on-chain)
    signal output commitment;   // Poseidon hash — the identity commitment

    // Compute Poseidon hash of the three private inputs
    component hasher = Poseidon(3);
    hasher.inputs[0] <== pan;
    hasher.inputs[1] <== samagraId;
    hasher.inputs[2] <== mobile;

    // The commitment is the hash output
    commitment <== hasher.out;
}