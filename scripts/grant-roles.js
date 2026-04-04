
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { ethers } = require("ethers");
const path = require("path");

async function main() {
  // Load addresses
  let addresses;
  try {
    addresses = require(path.join(__dirname, "..", "deployed-addresses.json"));
  } catch {
    addresses = require(path.join(__dirname, "..", "frontend", "src", "config", "deployed-addresses.json"));
  }

  const rpcUrl = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL || "http://127.0.0.1:8545";
  let privateKey = process.env.DEPLOYER_PRIVATE_KEY || addresses.deployerPrivateKey;
  if (!privateKey) throw new Error("DEPLOYER_PRIVATE_KEY not set");
  if (!privateKey.startsWith("0x")) privateKey = "0x" + privateKey;

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const deployer = new ethers.Wallet(privateKey, provider);
  const deployerAddr = await deployer.getAddress();

  console.log(`\nDeployer: ${deployerAddr}`);
  console.log(`Network: ${rpcUrl}`);
  console.log(`Balance: ${ethers.formatEther(await provider.getBalance(deployerAddr))} ETH\n`);

  // ===== 1. Grant BURNER_ROLE on DigitalRupee =====
  const digitalRupee = new ethers.Contract(addresses.DigitalRupee, [
    "function BURNER_ROLE() view returns (bytes32)",
    "function hasRole(bytes32,address) view returns (bool)",
    "function grantRole(bytes32,address) external"
  ], deployer);

  const BURNER_ROLE = await digitalRupee.BURNER_ROLE();
  const hasBurner = await digitalRupee.hasRole(BURNER_ROLE, deployerAddr);
  if (hasBurner) {
    console.log("✅ Deployer already has BURNER_ROLE on DigitalRupee");
  } else {
    console.log("🔑 Granting BURNER_ROLE to deployer on DigitalRupee...");
    const tx = await digitalRupee.grantRole(BURNER_ROLE, deployerAddr);
    await tx.wait();
    console.log(`   ✅ BURNER_ROLE granted — TX: ${tx.hash.slice(0, 14)}...`);
  }

  // ===== 2. Grant LOGGER_ROLE on TransactionLedger =====
  const txLedger = new ethers.Contract(addresses.TransactionLedger, [
    "function LOGGER_ROLE() view returns (bytes32)",
    "function hasRole(bytes32,address) view returns (bool)",
    "function grantRole(bytes32,address) external"
  ], deployer);

  const LOGGER_ROLE = await txLedger.LOGGER_ROLE();
  const hasLogger = await txLedger.hasRole(LOGGER_ROLE, deployerAddr);
  if (hasLogger) {
    console.log("✅ Deployer already has LOGGER_ROLE on TransactionLedger");
  } else {
    console.log("🔑 Granting LOGGER_ROLE to deployer on TransactionLedger...");
    const tx = await txLedger.grantRole(LOGGER_ROLE, deployerAddr);
    await tx.wait();
    console.log(`   ✅ LOGGER_ROLE granted — TX: ${tx.hash.slice(0, 14)}...`);
  }

  // ===== 3. Verify ADMIN_ROLE on VendorRegistry =====
  const vendorReg = new ethers.Contract(addresses.VendorRegistry, [
    "function ADMIN_ROLE() view returns (bytes32)",
    "function hasRole(bytes32,address) view returns (bool)"
  ], deployer);

  const ADMIN_ROLE = await vendorReg.ADMIN_ROLE();
  const hasAdmin = await vendorReg.hasRole(ADMIN_ROLE, deployerAddr);
  console.log(`${hasAdmin ? '✅' : '❌'} Deployer ${hasAdmin ? 'has' : 'MISSING'} ADMIN_ROLE on VendorRegistry`);

  // ===== 4. Verify ADMIN_ROLE on CitizenRegistry =====
  const citizenReg = new ethers.Contract(addresses.CitizenRegistry, [
    "function ADMIN_ROLE() view returns (bytes32)",
    "function hasRole(bytes32,address) view returns (bool)"
  ], deployer);

  const CR_ADMIN_ROLE = await citizenReg.ADMIN_ROLE();
  const hasCRAdmin = await citizenReg.hasRole(CR_ADMIN_ROLE, deployerAddr);
  console.log(`${hasCRAdmin ? '✅' : '❌'} Deployer ${hasCRAdmin ? 'has' : 'MISSING'} ADMIN_ROLE on CitizenRegistry`);

  console.log("\n🎉 Role configuration complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Error:", err.reason || err.message);
    process.exit(1);
  });
