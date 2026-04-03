const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("WelfareScheme", function () {
  let welfareScheme, owner, admin, user1;
  let digitalRupeeAddr, citizenRegistryAddr, vendorRegistryAddr, ledgerAddr;

  beforeEach(async function () {
    [owner, admin, user1] = await ethers.getSigners();

    // Deploy stub contracts for addresses
    const DigitalRupee = await ethers.getContractFactory("DigitalRupee");
    const dr = await DigitalRupee.deploy();
    digitalRupeeAddr = await dr.getAddress();

    const ZKVerifier = await ethers.getContractFactory("ZKVerifier");
    const zk = await ZKVerifier.deploy();
    const zkAddr = await zk.getAddress();

    const TransactionLedger = await ethers.getContractFactory("TransactionLedger");
    const tl = await TransactionLedger.deploy();
    ledgerAddr = await tl.getAddress();

    const CitizenRegistry = await ethers.getContractFactory("CitizenRegistry");
    const cr = await CitizenRegistry.deploy(zkAddr);
    citizenRegistryAddr = await cr.getAddress();

    const VendorRegistry = await ethers.getContractFactory("VendorRegistry");
    const vr = await VendorRegistry.deploy();
    vendorRegistryAddr = await vr.getAddress();

    const WelfareScheme = await ethers.getContractFactory("WelfareScheme");
    welfareScheme = await WelfareScheme.deploy(
      digitalRupeeAddr, citizenRegistryAddr, vendorRegistryAddr, ledgerAddr
    );
    await welfareScheme.waitForDeployment();
  });

  describe("Scheme Creation", function () {
    it("Should create a scheme with correct details", async function () {
      const tx = await welfareScheme.createScheme(
        "PM Kisan Agriculture Welfare",
        "Direct benefit transfer for small farmers",
        ethers.parseEther("1000000"),
        ethers.parseEther("6000"),
        3,
        ethers.parseEther("2000")
      );
      
      const scheme = await welfareScheme.getScheme(1);
      expect(scheme.name).to.equal("PM Kisan Agriculture Welfare");
      expect(scheme.totalFund).to.equal(ethers.parseEther("1000000"));
      expect(scheme.perCitizenAmount).to.equal(ethers.parseEther("6000"));
      expect(scheme.status).to.equal(0); // Active
    });

    it("Should emit SchemeCreated event", async function () {
      await expect(welfareScheme.createScheme(
        "Test Scheme", "Desc", ethers.parseEther("1000"), ethers.parseEther("100"), 1, ethers.parseEther("100")
      )).to.emit(welfareScheme, "SchemeCreated");
    });

    it("Should reject scheme with zero fund", async function () {
      await expect(
        welfareScheme.createScheme("Test", "Desc", 0, ethers.parseEther("100"), 1, ethers.parseEther("100"))
      ).to.be.revertedWith("Fund must be positive");
    });

    it("Should reject per citizen amount exceeding total", async function () {
      await expect(
        welfareScheme.createScheme("Test", "Desc", ethers.parseEther("100"), ethers.parseEther("200"), 1, ethers.parseEther("200"))
      ).to.be.revertedWith("Per citizen exceeds total fund");
    });
  });

  describe("Status Management", function () {
    beforeEach(async function () {
      await welfareScheme.createScheme(
        "Test Scheme", "Desc", ethers.parseEther("1000"), ethers.parseEther("100"), 1, ethers.parseEther("100")
      );
    });

    it("Should update scheme status", async function () {
      await welfareScheme.updateSchemeStatus(1, 1); // Paused
      const scheme = await welfareScheme.getScheme(1);
      expect(scheme.status).to.equal(1);
    });

    it("Should not update cancelled scheme", async function () {
      await welfareScheme.updateSchemeStatus(1, 3); // Cancelled
      await expect(
        welfareScheme.updateSchemeStatus(1, 0)
      ).to.be.revertedWith("Cannot update cancelled scheme");
    });
  });

  describe("View Functions", function () {
    it("Should return all scheme IDs", async function () {
      await welfareScheme.createScheme("S1", "D1", ethers.parseEther("1000"), ethers.parseEther("100"), 1, ethers.parseEther("100"));
      await welfareScheme.createScheme("S2", "D2", ethers.parseEther("2000"), ethers.parseEther("200"), 2, ethers.parseEther("100"));
      
      const ids = await welfareScheme.getAllSchemeIds();
      expect(ids.length).to.equal(2);
    });
  });
});
