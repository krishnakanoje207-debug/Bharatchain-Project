const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CitizenRegistry", function () {
  let citizenRegistry, zkVerifier, owner, citizen1, citizen2;

  beforeEach(async function () {
    [owner, citizen1, citizen2] = await ethers.getSigners();

    const ZKVerifier = await ethers.getContractFactory("ZKVerifier");
    zkVerifier = await ZKVerifier.deploy();
    await zkVerifier.waitForDeployment();
    const zkAddr = await zkVerifier.getAddress();

    const CitizenRegistry = await ethers.getContractFactory("CitizenRegistry");
    citizenRegistry = await CitizenRegistry.deploy(zkAddr);
    await citizenRegistry.waitForDeployment();
  });
  function generateProofData(pan, samagraId, mobile) {
    const commitment = ethers.solidityPackedKeccak256(
      ["uint256", "uint256", "uint256"],
      [pan, samagraId, mobile]
    );
    const seed = ethers.solidityPackedKeccak256(
      ["bytes32", "uint256"],
      [commitment, 12345]
    );
    const a = [
      BigInt(ethers.solidityPackedKeccak256(["bytes32", "string"], [seed, "a0"])),
      BigInt(ethers.solidityPackedKeccak256(["bytes32", "string"], [seed, "a1"]))
    ];
    const b = [
      [
        BigInt(ethers.solidityPackedKeccak256(["bytes32", "string"], [seed, "b00"])),
        BigInt(ethers.solidityPackedKeccak256(["bytes32", "string"], [seed, "b01"]))
      ],
      [
        BigInt(ethers.solidityPackedKeccak256(["bytes32", "string"], [seed, "b10"])),
        BigInt(ethers.solidityPackedKeccak256(["bytes32", "string"], [seed, "b11"]))
      ]
    ];
    const c = [
      BigInt(ethers.solidityPackedKeccak256(["bytes32", "string"], [seed, "c0"])),
      BigInt(ethers.solidityPackedKeccak256(["bytes32", "string"], [seed, "c1"]))
    ];
    const input = [BigInt(commitment)];
    const mobileHash = ethers.solidityPackedKeccak256(["uint256"], [mobile]);
    return { commitment, a, b, c, input, mobileHash };
  }

  describe("Citizen Registration (Auto-Approve)", function () {
    it("Should register and AUTO-APPROVE a citizen with valid ZK proof", async function () {
      const proof = generateProofData(123456789012, 987654321, 9876543210);
      
      await citizenRegistry.connect(citizen1).registerCitizen(
        proof.commitment, proof.mobileHash, 1,
        proof.a, proof.b, proof.c, proof.input
      );

      const citizen = await citizenRegistry.getCitizen(1);
      expect(citizen.walletAddress).to.equal(citizen1.address);
      expect(citizen.status).to.equal(1); // Approved (auto)
      expect(citizen.approvedAt).to.be.gt(0); // approvedAt is set
      expect(citizen.zkCommitment).to.equal(proof.commitment);
    });

    it("Should reject duplicate commitment", async function () {
      const proof = generateProofData(123456789012, 987654321, 9876543210);
      
      await citizenRegistry.connect(citizen1).registerCitizen(
        proof.commitment, proof.mobileHash, 1,
        proof.a, proof.b, proof.c, proof.input
      );

      await expect(
        citizenRegistry.connect(citizen2).registerCitizen(
          proof.commitment, proof.mobileHash, 1,
          proof.a, proof.b, proof.c, proof.input
        )
      ).to.be.revertedWith("Commitment already registered");
    });
    it("Should emit CitizenRegistered and CitizenApproved events", async function () {
      const proof = generateProofData(111111111111, 222222222, 3333333333);
      
      await expect(
        citizenRegistry.connect(citizen1).registerCitizen(
          proof.commitment, proof.mobileHash, 1,
          proof.a, proof.b, proof.c, proof.input
        )
      ).to.emit(citizenRegistry, "CitizenRegistered")
       .and.to.emit(citizenRegistry, "CitizenApproved");
    });
  });

  describe("Admin Rejection (Post-Audit)", function () {
    beforeEach(async function () {
      const proof = generateProofData(123456789012, 987654321, 9876543210);
      await citizenRegistry.connect(citizen1).registerCitizen(
        proof.commitment, proof.mobileHash, 1,
        proof.a, proof.b, proof.c, proof.input
      );
    });

    it("Should reject an approved citizen (post-audit)", async function () {
      await citizenRegistry.rejectCitizen(1);
      const citizen = await citizenRegistry.getCitizen(1);
      expect(citizen.status).to.equal(2); // Rejected
    });

    it("Should reject when called by non-admin", async function () {
      await expect(
        citizenRegistry.connect(citizen1).rejectCitizen(1)
      ).to.be.reverted;
    });
  });

  describe("View Functions", function () {
    it("Should return citizen by wallet", async function () {
      const proof = generateProofData(123456789012, 987654321, 9876543210);
      await citizenRegistry.connect(citizen1).registerCitizen(
        proof.commitment, proof.mobileHash, 1,
        proof.a, proof.b, proof.c, proof.input
      );

      const citizen = await citizenRegistry.getCitizenByWallet(citizen1.address);
      expect(citizen.walletAddress).to.equal(citizen1.address);
    });

    it("Should return all registered as approved (auto-approve)", async function () {
      const proof1 = generateProofData(111, 222, 333);
      const proof2 = generateProofData(444, 555, 666);

      await citizenRegistry.connect(citizen1).registerCitizen(
        proof1.commitment, proof1.mobileHash, 1,
        proof1.a, proof1.b, proof1.c, proof1.input
      );
      await citizenRegistry.connect(citizen2).registerCitizen(
        proof2.commitment, proof2.mobileHash, 1,
        proof2.a, proof2.b, proof2.c, proof2.input
      );

      // Both should be in approved list (auto-approved)
      const approved = await citizenRegistry.getApprovedCitizenIds();
      expect(approved.length).to.equal(2);
    });
  });
});
