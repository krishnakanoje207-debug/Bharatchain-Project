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
});
