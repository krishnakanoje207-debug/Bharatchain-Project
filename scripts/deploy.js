const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    (await hre.ethers.provider.getBalance(deployer.address)).toString(),
  );
  console.log("---");

  // 1. Deploy DigitalRupee (ERC-20)
  console.log("1/7 Deploying DigitalRupee...");
  const DigitalRupee = await hre.ethers.getContractFactory("DigitalRupee");
  const digitalRupee = await DigitalRupee.deploy();
  await digitalRupee.waitForDeployment();
  const digitalRupeeAddr = await digitalRupee.getAddress();
  console.log("   DigitalRupee deployed to:", digitalRupeeAddr);

  // 2. Deploy ZKVerifier
  console.log("2/7 Deploying ZKVerifier...");
  const ZKVerifier = await hre.ethers.getContractFactory("ZKVerifier");
  const zkVerifier = await ZKVerifier.deploy();
  await zkVerifier.waitForDeployment();
  const zkVerifierAddr = await zkVerifier.getAddress();
  console.log("   ZKVerifier deployed to:", zkVerifierAddr);

  // 3. Deploy TransactionLedger
  console.log("3/7 Deploying TransactionLedger...");
  const TransactionLedger = await hre.ethers.getContractFactory(
    "TransactionLedger",
  );
  const transactionLedger = await TransactionLedger.deploy();
  await transactionLedger.waitForDeployment();
  const transactionLedgerAddr = await transactionLedger.getAddress();
  console.log("   TransactionLedger deployed to:", transactionLedgerAddr);

  // 4. Deploy CitizenRegistry (needs ZKVerifier address)
  console.log("4/7 Deploying CitizenRegistry...");
  const CitizenRegistry = await hre.ethers.getContractFactory(
    "CitizenRegistry",
  );
  const citizenRegistry = await CitizenRegistry.deploy(zkVerifierAddr);
  await citizenRegistry.waitForDeployment();
  const citizenRegistryAddr = await citizenRegistry.getAddress();
  console.log("   CitizenRegistry deployed to:", citizenRegistryAddr);

  // 5. Deploy VendorRegistry
  console.log("5/7 Deploying VendorRegistry...");
  const VendorRegistry = await hre.ethers.getContractFactory("VendorRegistry");
  const vendorRegistry = await VendorRegistry.deploy();
  await vendorRegistry.waitForDeployment();
  const vendorRegistryAddr = await vendorRegistry.getAddress();
  console.log("   VendorRegistry deployed to:", vendorRegistryAddr);

  // 6. Deploy WelfareScheme (needs all registry addresses)
  console.log("6/7 Deploying WelfareScheme...");
  const WelfareScheme = await hre.ethers.getContractFactory("WelfareScheme");
  const welfareScheme = await WelfareScheme.deploy(
    digitalRupeeAddr,
    citizenRegistryAddr,
    vendorRegistryAddr,
    transactionLedgerAddr,
  );
  await welfareScheme.waitForDeployment();
  const welfareSchemeAddr = await welfareScheme.getAddress();
  console.log("   WelfareScheme deployed to:", welfareSchemeAddr);

  // 7. Deploy TokenDistributor
  console.log("7/7 Deploying TokenDistributor...");
  const TokenDistributor = await hre.ethers.getContractFactory(
    "TokenDistributor",
  );
  const tokenDistributor = await TokenDistributor.deploy(
    digitalRupeeAddr,
    citizenRegistryAddr,
    vendorRegistryAddr,
    transactionLedgerAddr,
  );
  await tokenDistributor.waitForDeployment();
  const tokenDistributorAddr = await tokenDistributor.getAddress();
  console.log("   TokenDistributor deployed to:", tokenDistributorAddr);

  // ==================== CONFIGURE ROLES ====================
  console.log("\n--- Configuring Roles ---");

  // Grant MINTER_ROLE and BURNER_ROLE to TokenDistributor on DigitalRupee
  const MINTER_ROLE = await digitalRupee.MINTER_ROLE();
  const BURNER_ROLE = await digitalRupee.BURNER_ROLE();
  await digitalRupee.grantRole(MINTER_ROLE, tokenDistributorAddr);
  console.log("   Granted MINTER_ROLE to TokenDistributor");
  await digitalRupee.grantRole(BURNER_ROLE, tokenDistributorAddr);
  console.log("   Granted BURNER_ROLE to TokenDistributor");
  // Also grant BURNER_ROLE to deployer so backend admin can revoke tokens directly
  await digitalRupee.grantRole(BURNER_ROLE, deployer.address);
  console.log("   Granted BURNER_ROLE to Deployer (backend admin)");

  // Grant LOGGER_ROLE to all contracts that log transactions + deployer
  const LOGGER_ROLE = await transactionLedger.LOGGER_ROLE();
  await transactionLedger.grantRole(LOGGER_ROLE, tokenDistributorAddr);
  console.log("   Granted LOGGER_ROLE to TokenDistributor");
  await transactionLedger.grantRole(LOGGER_ROLE, welfareSchemeAddr);
  console.log("   Granted LOGGER_ROLE to WelfareScheme");
  // Grant LOGGER_ROLE to deployer so backend can log transactions directly
  await transactionLedger.grantRole(LOGGER_ROLE, deployer.address);
  console.log("   Granted LOGGER_ROLE to Deployer (backend admin)");

  // Grant DISTRIBUTOR_ROLE to TokenDistributor on CitizenRegistry
  const DISTRIBUTOR_ROLE = await citizenRegistry.DISTRIBUTOR_ROLE();
  await citizenRegistry.grantRole(DISTRIBUTOR_ROLE, tokenDistributorAddr);
  console.log(
    "   Granted DISTRIBUTOR_ROLE to TokenDistributor on CitizenRegistry",
  );

  // Grant ADMIN_ROLE to TokenDistributor on VendorRegistry (for markTokensRevoked)
  const VENDOR_ADMIN_ROLE = await vendorRegistry.ADMIN_ROLE();
  await vendorRegistry.grantRole(VENDOR_ADMIN_ROLE, tokenDistributorAddr);
  console.log("   Granted ADMIN_ROLE to TokenDistributor on VendorRegistry");

  // ==================== SAVE ADDRESSES ====================
  const fs = require("fs");
  const path = require("path");

  // Get deployer private key for backend admin operations
  // On Hardhat network, the first signer's private key is deterministic
  const deployerPrivateKey =
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"; // Hardhat account #0

  const addresses = {
    DigitalRupee: digitalRupeeAddr,
    ZKVerifier: zkVerifierAddr,
    TransactionLedger: transactionLedgerAddr,
    CitizenRegistry: citizenRegistryAddr,
    VendorRegistry: vendorRegistryAddr,
    WelfareScheme: welfareSchemeAddr,
    TokenDistributor: tokenDistributorAddr,
    deployer: deployer.address,
    deployerPrivateKey: deployerPrivateKey,
    network: hre.network.name,
    deployedAt: new Date().toISOString(),
  };

  // Save to root
  const rootPath = path.join(__dirname, "..", "deployed-addresses.json");
  fs.writeFileSync(rootPath, JSON.stringify(addresses, null, 2));
  console.log("\n   Addresses saved to deployed-addresses.json");

  // Save to frontend config
  const frontendDir = path.join(__dirname, "..", "frontend", "src", "config");
  if (!fs.existsSync(frontendDir)) {
    fs.mkdirSync(frontendDir, { recursive: true });
  }
  const frontendPath = path.join(frontendDir, "deployed-addresses.json");
  fs.writeFileSync(frontendPath, JSON.stringify(addresses, null, 2));
  console.log(
    "   Addresses saved to frontend/src/config/deployed-addresses.json",
  );

  console.log("\n=== Deployment Complete ===\n");
  console.table(addresses);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
