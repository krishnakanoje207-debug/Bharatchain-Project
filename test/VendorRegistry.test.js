const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("VendorRegistry", function () {
  let vendorRegistry, owner, vendor1, vendor2, rbiAdmin;

  beforeEach(async function () {
    [owner, vendor1, vendor2, rbiAdmin] = await ethers.getSigners();

    const VendorRegistry = await ethers.getContractFactory("VendorRegistry");
    vendorRegistry = await VendorRegistry.deploy();
    await vendorRegistry.waitForDeployment();

    // Grant RBI_ROLE to rbiAdmin
    const RBI_ROLE = await vendorRegistry.RBI_ROLE();
    await vendorRegistry.grantRole(RBI_ROLE, rbiAdmin.address);
  });
  const sampleBankHash = ethers.solidityPackedKeccak256(["string"], ["1234567890"]);
  const sampleIFSCHash = ethers.solidityPackedKeccak256(["string"], ["SBIN0001234"]);
  const sampleCredHash = ethers.solidityPackedKeccak256(["string"], ["BSc-Agriculture-2020"]);

  describe("Vendor Registration", function () {
    it("Should register a FarmingSupplier vendor", async function () {
      await vendorRegistry.connect(vendor1).registerVendor(
        0, // FarmingSupplier
        "Green Farm Supplies",
        sampleCredHash,
        sampleBankHash,
        sampleIFSCHash
      );

      const vendor = await vendorRegistry.getVendor(1);
      expect(vendor.businessName).to.equal("Green Farm Supplies");
      expect(vendor.vendorType).to.equal(0);
      expect(vendor.status).to.equal(0); // Pending
      expect(vendor.bankAccountHash).to.equal(sampleBankHash);
    });

    it("Should register a CropBuyer vendor", async function () {
      await vendorRegistry.connect(vendor1).registerVendor(
        1, // CropBuyer
        "Harvest Trading Co",
        sampleCredHash,
        sampleBankHash,
        sampleIFSCHash
      );

      const vendor = await vendorRegistry.getVendor(1);
      expect(vendor.vendorType).to.equal(1);
    });

    it("Should reject duplicate wallet registration", async function () {
      await vendorRegistry.connect(vendor1).registerVendor(
        0, "Shop A", sampleCredHash, sampleBankHash, sampleIFSCHash
      );
      await expect(
        vendorRegistry.connect(vendor1).registerVendor(
          0, "Shop B", sampleCredHash, sampleBankHash, sampleIFSCHash
        )
      ).to.be.revertedWith("Wallet already registered as vendor");
    });
  });

  describe("Vendor Approval", function () {
    beforeEach(async function () {
      await vendorRegistry.connect(vendor1).registerVendor(
        0, "Green Farm Supplies", sampleCredHash, sampleBankHash, sampleIFSCHash
      );
    });

    it("Should approve vendor", async function () {
      await vendorRegistry.approveVendor(1);
      expect(await vendorRegistry.isVerifiedVendor(vendor1.address)).to.be.true;
    });

    it("Should reject vendor", async function () {
      await vendorRegistry.rejectVendor(1);
      const vendor = await vendorRegistry.getVendor(1);
      expect(vendor.status).to.equal(3); // Rejected
    });

    it("Should suspend approved vendor", async function () {
      await vendorRegistry.approveVendor(1);
      await vendorRegistry.suspendVendor(1);
      expect(await vendorRegistry.isVerifiedVendor(vendor1.address)).to.be.false;
    });
  });

  describe("Exchange & RBI Transfer Flow", function () {
    beforeEach(async function () {
      await vendorRegistry.connect(vendor1).registerVendor(
        0, "Green Farm Supplies", sampleCredHash, sampleBankHash, sampleIFSCHash
      );
      await vendorRegistry.approveVendor(1);
    });

    it("Should request exchange", async function () {
      await vendorRegistry.connect(vendor1).requestExchange(ethers.parseEther("5000"));
      const vendor = await vendorRegistry.getVendor(1);
      expect(vendor.exchangeStatus).to.equal(1); // Requested
      expect(vendor.exchangeRequestAmount).to.equal(ethers.parseEther("5000"));
    });

    it("Should verify ITR", async function () {
      await vendorRegistry.connect(vendor1).requestExchange(ethers.parseEther("5000"));
      await vendorRegistry.verifyITR(1);
      const vendor = await vendorRegistry.getVendor(1);
      expect(vendor.exchangeStatus).to.equal(2); // ITRVerified
    });

    it("Should confirm RBI transfer", async function () {
      await vendorRegistry.connect(vendor1).requestExchange(ethers.parseEther("5000"));
      await vendorRegistry.verifyITR(1);
      await vendorRegistry.connect(rbiAdmin).confirmRBITransfer(1);
      
      const vendor = await vendorRegistry.getVendor(1);
      expect(vendor.rbiTransferConfirmed).to.be.true;
      expect(vendor.exchangeStatus).to.equal(3); // RBITransferred
    });

    it("Should reject RBI confirm before ITR verification", async function () {
      await vendorRegistry.connect(vendor1).requestExchange(ethers.parseEther("5000"));
      await expect(
        vendorRegistry.connect(rbiAdmin).confirmRBITransfer(1)
      ).to.be.revertedWith("ITR not verified");
    });

    it("Should return vendors with RBI confirmation", async function () {
      await vendorRegistry.connect(vendor1).requestExchange(ethers.parseEther("5000"));
      await vendorRegistry.verifyITR(1);
      await vendorRegistry.connect(rbiAdmin).confirmRBITransfer(1);

      const confirmed = await vendorRegistry.getVendorsWithRBIConfirmation();
      expect(confirmed.length).to.equal(1);
    });
  });
});