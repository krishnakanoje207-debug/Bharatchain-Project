const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TokenDistributor", function () {
  let digitalRupee, citizenRegistry, vendorRegistry, transactionLedger, tokenDistributor;
  let owner, citizen1, citizen2, vendor1, rbiAdmin;

  beforeEach(async function () {
    [owner, citizen1, citizen2, vendor1, rbiAdmin] = await ethers.getSigners();

    // Deploy all contracts
    const DigitalRupee = await ethers.getContractFactory("DigitalRupee");
    digitalRupee = await DigitalRupee.deploy();
    await digitalRupee.waitForDeployment();

    const ZKVerifier = await ethers.getContractFactory("ZKVerifier");
    const zkVerifier = await ZKVerifier.deploy();
    await zkVerifier.waitForDeployment();

    const TransactionLedger = await ethers.getContractFactory("TransactionLedger");
    transactionLedger = await TransactionLedger.deploy();
    await transactionLedger.waitForDeployment();

    const CitizenRegistry = await ethers.getContractFactory("CitizenRegistry");
    citizenRegistry = await CitizenRegistry.deploy(await zkVerifier.getAddress());
    await citizenRegistry.waitForDeployment();

    const VendorRegistry = await ethers.getContractFactory("VendorRegistry");
    vendorRegistry = await VendorRegistry.deploy();
    await vendorRegistry.waitForDeployment();

    const TokenDistributor = await ethers.getContractFactory("TokenDistributor");
    tokenDistributor = await TokenDistributor.deploy(
      await digitalRupee.getAddress(),
      await citizenRegistry.getAddress(),
      await vendorRegistry.getAddress(),
      await transactionLedger.getAddress()
    );
    await tokenDistributor.waitForDeployment();

    // Configure roles
    const MINTER_ROLE = await digitalRupee.MINTER_ROLE();
    const BURNER_ROLE = await digitalRupee.BURNER_ROLE();
    const LOGGER_ROLE = await transactionLedger.LOGGER_ROLE();
    const DISTRIBUTOR_ROLE = await citizenRegistry.DISTRIBUTOR_ROLE();
    const VENDOR_ADMIN_ROLE = await vendorRegistry.ADMIN_ROLE();
    const RBI_ROLE = await vendorRegistry.RBI_ROLE();

    await digitalRupee.grantRole(MINTER_ROLE, await tokenDistributor.getAddress());
    await digitalRupee.grantRole(BURNER_ROLE, await tokenDistributor.getAddress());
    await transactionLedger.grantRole(LOGGER_ROLE, await tokenDistributor.getAddress());
    await citizenRegistry.grantRole(DISTRIBUTOR_ROLE, await tokenDistributor.getAddress());
    await vendorRegistry.grantRole(VENDOR_ADMIN_ROLE, await tokenDistributor.getAddress());
    await vendorRegistry.grantRole(RBI_ROLE, rbiAdmin.address);
  });

  function generateProofData(pan, samagraId, mobile) {
    const commitment = ethers.solidityPackedKeccak256(
      ["uint256", "uint256", "uint256"], [pan, samagraId, mobile]
    );
    const seed = ethers.solidityPackedKeccak256(
      ["bytes32", "uint256"], [commitment, 12345]
    );
    const makeHash = (suffix) => BigInt(ethers.solidityPackedKeccak256(
      ["bytes32", "string"], [seed, suffix]
    ));
    return {
      commitment,
      a: [makeHash("a0"), makeHash("a1")],
      b: [[makeHash("b00"), makeHash("b01")], [makeHash("b10"), makeHash("b11")]],
      c: [makeHash("c0"), makeHash("c1")],
      input: [BigInt(commitment)],
      mobileHash: ethers.solidityPackedKeccak256(["uint256"], [mobile])
    };
  }

  async function registerAndApproveCitizen(signer, pan, samagraId, mobile) {
    const proof = generateProofData(pan, samagraId, mobile);
    await citizenRegistry.connect(signer).registerCitizen(
      proof.commitment, proof.mobileHash, 1,
      proof.a, proof.b, proof.c, proof.input
    );
    const citizenId = await citizenRegistry.walletToCitizenId(signer.address);
    // Citizens are now auto-approved on registration — no need to call approveCitizen
    return citizenId;
  }

  describe("Token Distribution", function () {
    beforeEach(async function () {
      await registerAndApproveCitizen(citizen1, 111, 222, 333);
      await registerAndApproveCitizen(citizen2, 444, 555, 666);
      
      await tokenDistributor.configureDistribution(1, ethers.parseEther("6000"));
    });

    it("Should distribute tokens to all approved citizens", async function () {
      await tokenDistributor.manualDistribute();
      
      expect(await digitalRupee.balanceOf(citizen1.address)).to.equal(ethers.parseEther("6000"));
      expect(await digitalRupee.balanceOf(citizen2.address)).to.equal(ethers.parseEther("6000"));
    });

    it("Should emit TokensDistributed event", async function () {
      await expect(tokenDistributor.manualDistribute())
        .to.emit(tokenDistributor, "TokensDistributed");
    });

    it("Should mark distribution as completed", async function () {
      await tokenDistributor.manualDistribute();
      const [, , completed] = await tokenDistributor.getDistributionStatus();
      expect(completed).to.be.true;
    });

    it("Should reject double distribution", async function () {
      await tokenDistributor.manualDistribute();
      await expect(tokenDistributor.manualDistribute())
        .to.be.revertedWith("Distribution already completed");
    });

    it("Should log transactions in ledger", async function () {
      await tokenDistributor.manualDistribute();
      const totalTx = await transactionLedger.getTotalTransactionCount();
      expect(totalTx).to.be.greaterThan(0);
    });
  });

  describe("Vendor Token Revocation", function () {
    let vendorId;

    beforeEach(async function () {
      // Register and approve citizen
      await registerAndApproveCitizen(citizen1, 111, 222, 333);
      
      // Distribute tokens to citizen
      await tokenDistributor.configureDistribution(1, ethers.parseEther("6000"));
      await tokenDistributor.manualDistribute();

      // Register and approve vendor  
      const bankHash = ethers.solidityPackedKeccak256(["string"], ["1234567890"]);
      const ifscHash = ethers.solidityPackedKeccak256(["string"], ["SBIN0001234"]);
      const credHash = ethers.solidityPackedKeccak256(["string"], ["BSc-Agri"]);
      await vendorRegistry.connect(vendor1).registerVendor(0, "Farm Shop", credHash, bankHash, ifscHash);
      vendorId = await vendorRegistry.walletToVendorId(vendor1.address);
      await vendorRegistry.approveVendor(vendorId);

      // Citizen transfers tokens to vendor
      await digitalRupee.connect(citizen1).transfer(vendor1.address, ethers.parseEther("3000"));
    });

    it("Should revoke vendor tokens after RBI confirms transfer", async function () {
      // Vendor requests exchange
      await vendorRegistry.connect(vendor1).requestExchange(ethers.parseEther("3000"));
      // Admin verifies ITR
      await vendorRegistry.verifyITR(vendorId);
      // RBI admin confirms bank transfer
      await vendorRegistry.connect(rbiAdmin).confirmRBITransfer(vendorId);

      // Verify vendor has tokens before revocation
      expect(await digitalRupee.balanceOf(vendor1.address)).to.equal(ethers.parseEther("3000"));

      // Trigger revocation
      await tokenDistributor.manualRevoke();

      // Verify vendor tokens are burned
      expect(await digitalRupee.balanceOf(vendor1.address)).to.equal(0);
    });

    it("Should emit VendorTokensRevoked event", async function () {
      await vendorRegistry.connect(vendor1).requestExchange(ethers.parseEther("3000"));
      await vendorRegistry.verifyITR(vendorId);
      await vendorRegistry.connect(rbiAdmin).confirmRBITransfer(vendorId);

      await expect(tokenDistributor.manualRevoke())
        .to.emit(tokenDistributor, "VendorTokensRevoked");
    });

    it("Should fail revocation if no confirmed RBI transfers", async function () {
      await expect(tokenDistributor.manualRevoke())
        .to.be.revertedWith("No vendors with confirmed RBI transfers");
    });
  });
});
