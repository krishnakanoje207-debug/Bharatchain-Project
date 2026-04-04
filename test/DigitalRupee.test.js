const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DigitalRupee", function () {
  let digitalRupee, owner, minter, burner, user1, user2;

  beforeEach(async function () {
    [owner, minter, burner, user1, user2] = await ethers.getSigners();
    const DigitalRupee = await ethers.getContractFactory("DigitalRupee");
    digitalRupee = await DigitalRupee.deploy();
    await digitalRupee.waitForDeployment();

    // Grant roles
    const MINTER_ROLE = await digitalRupee.MINTER_ROLE();
    const BURNER_ROLE = await digitalRupee.BURNER_ROLE();
    await digitalRupee.grantRole(MINTER_ROLE, minter.address);
    await digitalRupee.grantRole(BURNER_ROLE, burner.address);
  });

  describe("Deployment", function () {
    it("Should set the correct name and symbol", async function () {
      expect(await digitalRupee.name()).to.equal("Digital Rupee");
      expect(await digitalRupee.symbol()).to.equal("INRD");
    });

    it("Should grant DEFAULT_ADMIN_ROLE to deployer", async function () {
      const DEFAULT_ADMIN = await digitalRupee.DEFAULT_ADMIN_ROLE();
      expect(await digitalRupee.hasRole(DEFAULT_ADMIN, owner.address)).to.be.true;
    });
  });

  describe("Minting", function () {
    it("Should allow MINTER_ROLE to mint tokens", async function () {
      await digitalRupee.connect(minter).mint(user1.address, ethers.parseEther("1000"));
      expect(await digitalRupee.balanceOf(user1.address)).to.equal(ethers.parseEther("1000"));
    });

    it("Should reject minting from non-MINTER_ROLE", async function () {
      await expect(
        digitalRupee.connect(user1).mint(user1.address, ethers.parseEther("1000"))
      ).to.be.reverted;
    });

    it("Should emit TokensMinted event", async function () {
      await expect(digitalRupee.connect(minter).mint(user1.address, ethers.parseEther("500")))
        .to.emit(digitalRupee, "TokensMinted")
        .withArgs(user1.address, ethers.parseEther("500"), await getBlockTimestamp());
    });
  });

  describe("Token Revocation", function () {
    beforeEach(async function () {
      await digitalRupee.connect(minter).mint(user1.address, ethers.parseEther("1000"));
    });

    it("Should allow BURNER_ROLE to revoke tokens", async function () {
      await digitalRupee.connect(burner).revokeTokens(user1.address, ethers.parseEther("1000"));
      expect(await digitalRupee.balanceOf(user1.address)).to.equal(0);
    });

    it("Should reject revocation from non-BURNER_ROLE", async function () {
      await expect(
        digitalRupee.connect(user1).revokeTokens(user1.address, ethers.parseEther("1000"))
      ).to.be.reverted;
    });

    it("Should allow BURNER_ROLE to burnFrom without allowance", async function () {
      await digitalRupee.connect(burner).burnFrom(user1.address, ethers.parseEther("500"));
      expect(await digitalRupee.balanceOf(user1.address)).to.equal(ethers.parseEther("500"));
    });
  });

  describe("Transfers", function () {
    it("Should allow normal ERC-20 transfers", async function () {
      await digitalRupee.connect(minter).mint(user1.address, ethers.parseEther("1000"));
      await digitalRupee.connect(user1).transfer(user2.address, ethers.parseEther("300"));
      expect(await digitalRupee.balanceOf(user2.address)).to.equal(ethers.parseEther("300"));
      expect(await digitalRupee.balanceOf(user1.address)).to.equal(ethers.parseEther("700"));
    });
  });
});

async function getBlockTimestamp() {
  const block = await ethers.provider.getBlock("latest");
  return block.timestamp;
}
