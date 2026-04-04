
const { ethers } = require("hardhat");

async function generateSimplifiedProof(pan, samagraId, mobile) {
  console.log("=== Simplified ZK Proof Generation ===\n");
  console.log("Private inputs (never shared):");
  console.log("  PAN:", pan);
  console.log("  Samagra ID:", samagraId);
  console.log("  Mobile:", mobile);

  // Generate commitment (simulated Poseidon hash using keccak256)
  const commitment = ethers.solidityPackedKeccak256(
    ["uint256", "uint256", "uint256"],
    [pan, samagraId, mobile]
  );
  console.log("\nPublic commitment (stored on-chain):", commitment);

  // Generate proof components (simplified — in production, SnarkJS generates these)
  const proofSeed = ethers.solidityPackedKeccak256(
    ["bytes32", "uint256"],
    [commitment, Date.now()]
  );

  const a = [
    BigInt(ethers.solidityPackedKeccak256(["bytes32", "string"], [proofSeed, "a0"])),
    BigInt(ethers.solidityPackedKeccak256(["bytes32", "string"], [proofSeed, "a1"]))
  ];
  const b = [
    [
      BigInt(ethers.solidityPackedKeccak256(["bytes32", "string"], [proofSeed, "b00"])),
      BigInt(ethers.solidityPackedKeccak256(["bytes32", "string"], [proofSeed, "b01"]))
    ],
    [
      BigInt(ethers.solidityPackedKeccak256(["bytes32", "string"], [proofSeed, "b10"])),
      BigInt(ethers.solidityPackedKeccak256(["bytes32", "string"], [proofSeed, "b11"]))
    ]
  ];
  const c = [
    BigInt(ethers.solidityPackedKeccak256(["bytes32", "string"], [proofSeed, "c0"])),
    BigInt(ethers.solidityPackedKeccak256(["bytes32", "string"], [proofSeed, "c1"]))
  ];
  const input = [BigInt(commitment)];

  console.log("\nProof generated:");
  console.log("  a:", a.map(x => x.toString().slice(0, 20) + "..."));
  console.log("  b:", b.map(row => row.map(x => x.toString().slice(0, 20) + "...")));
  console.log("  c:", c.map(x => x.toString().slice(0, 20) + "..."));
  console.log("  input:", input.map(x => x.toString().slice(0, 20) + "..."));

  return { commitment, a, b, c, input };
}

async function main() {
  // Sample citizen data
  const proof = await generateSimplifiedProof(
    "123456789012",  // PAN
    "987654321",     // Samagra ID
    "9876543210"     // Mobile
  );

  console.log("\n=== Proof Ready for On-Chain Verification ===");
  console.log("Submit this proof with CitizenRegistry.registerCitizen()");
}

main().catch(console.error);

module.exports = { generateSimplifiedProof };
