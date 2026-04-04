/**
 * bootstrap.js — Auto-deploy contracts & sync DB state to fresh Hardhat chain.
 *
 * Hardhat node is in-memory: all blockchain state vanishes on restart.
 * This script bridges the gap by:
 *   1. Deploying all contracts to the running Hardhat node
 *   2. Re-registering approved/funded citizens from the SQLite DB
 *   3. Re-minting tokens for citizens who were already funded
 *
 * Called automatically by server.js on startup.
 */
const { ethers } = require("ethers");
const path = require("path");
const fs = require("fs");

const RPC_URL = process.env.RPC_URL || process.env.SEPOLIA_RPC_URL || "http://127.0.0.1:8545";
const DEPLOYED_ADDRESSES_PATH = path.join(__dirname, "..", "deployed-addresses.json");
const FRONTEND_ADDRESSES_PATH = path.join(__dirname, "..", "frontend", "src", "config", "deployed-addresses.json");

function isLocalNetwork() {
  return RPC_URL.includes("127.0.0.1") || RPC_URL.includes("localhost");
}

async function bootstrap(db) {
  const local = isLocalNetwork();
  console.log(`\n🔗 [BOOTSTRAP] Network: ${local ? "localhost" : "Sepolia"} (${RPC_URL.slice(0, 40)}...)`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  try {
    await provider.getBlockNumber();
  } catch (e) {
    if (local) {
      console.log("   ⚠️  Hardhat node not running. Skipping bootstrap. Start with: npx hardhat node");
    } else {
      console.log("   ⚠️  Cannot reach RPC. Skipping bootstrap.");
    }
    return false;
  }

  // Check if ALL contracts are deployed and functioning
  if (fs.existsSync(DEPLOYED_ADDRESSES_PATH)) {
    try {
      const addresses = JSON.parse(fs.readFileSync(DEPLOYED_ADDRESSES_PATH, "utf8"));
      const contractKeys = ["DigitalRupee", "CitizenRegistry", "VendorRegistry", "TokenDistributor", "TransactionLedger", "ZKVerifier", "WelfareScheme"];
      let allDeployed = true;

      for (const key of contractKeys) {
        if (!addresses[key]) { allDeployed = false; break; }
        const code = await provider.getCode(addresses[key]);
        if (code === "0x") {
          console.log(`   ⚠️  ${key} at ${addresses[key]} has NO code — needs redeploy`);
          allDeployed = false;
          break;
        }
      }

      if (allDeployed) {
        console.log("   ✅ All contracts deployed at current addresses. Syncing state...");
        await syncDbToChain(db, provider, addresses);
        return true;
      }
    } catch { /* stale addresses file, redeploy */ }
  }

  // On Sepolia/testnet: do NOT auto-deploy — contracts must be deployed manually
  if (!local) {
    console.log("   ⚠️  Some contracts missing on Sepolia. They must be deployed via: npx hardhat run scripts/deploy.js --network sepolia");
    console.log("   Skipping auto-deploy on non-local network.");
    return false;
  }

  // Deploy fresh contracts (local Hardhat only)
  console.log("   🚀 Deploying fresh contracts (local Hardhat)...");
  const deployed = await deployContracts(provider);
  if (!deployed) return false;

  // Sync DB state
  await syncDbToChain(db, provider, deployed);
  return true;
}

async function deployContracts(provider) {
  try {
    // Use Hardhat's first account as deployer
    const deployer = await provider.getSigner(0);
    const deployerAddress = await deployer.getAddress();
    console.log(`   Deployer: ${deployerAddress}`);

    // Load compiled artifacts
    const artifactsDir = path.join(__dirname, "..", "artifacts", "contracts");

    function loadArtifact(contractName) {
      const p = path.join(artifactsDir, `${contractName}.sol`, `${contractName}.json`);
      return JSON.parse(fs.readFileSync(p, "utf8"));
    }

    async function deploy(name, args = []) {
      const artifact = loadArtifact(name);
      const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
      const contract = await factory.deploy(...args);
      await contract.waitForDeployment();
      const addr = await contract.getAddress();
      console.log(`   ${name} → ${addr}`);
      return { contract, address: addr };
    }

    // Deploy in order
    const digitalRupee = await deploy("DigitalRupee");
    const zkVerifier = await deploy("ZKVerifier");
    const transactionLedger = await deploy("TransactionLedger");
    const citizenRegistry = await deploy("CitizenRegistry", [zkVerifier.address]);
    const vendorRegistry = await deploy("VendorRegistry");
    const welfareScheme = await deploy("WelfareScheme");
    const tokenDistributor = await deploy("TokenDistributor", [
      digitalRupee.address, citizenRegistry.address, vendorRegistry.address, transactionLedger.address
    ]);

    // Configure roles
    await (await digitalRupee.contract.grantRole(ethers.keccak256(ethers.toUtf8Bytes("MINTER_ROLE")), tokenDistributor.address)).wait();
    await (await digitalRupee.contract.grantRole(ethers.keccak256(ethers.toUtf8Bytes("BURNER_ROLE")), tokenDistributor.address)).wait();
    await (await transactionLedger.contract.grantRole(ethers.keccak256(ethers.toUtf8Bytes("LOGGER_ROLE")), tokenDistributor.address)).wait();
    await (await transactionLedger.contract.grantRole(ethers.keccak256(ethers.toUtf8Bytes("LOGGER_ROLE")), welfareScheme.address)).wait();
    await (await citizenRegistry.contract.grantRole(ethers.keccak256(ethers.toUtf8Bytes("DISTRIBUTOR_ROLE")), tokenDistributor.address)).wait();
    await (await vendorRegistry.contract.grantRole(ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE")), tokenDistributor.address)).wait();
    console.log("   ✅ Roles configured");

    // Get deployer private key (Hardhat default account #0)
    const deployerPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

    const addresses = {
      DigitalRupee: digitalRupee.address,
      ZKVerifier: zkVerifier.address,
      TransactionLedger: transactionLedger.address,
      CitizenRegistry: citizenRegistry.address,
      VendorRegistry: vendorRegistry.address,
      WelfareScheme: welfareScheme.address,
      TokenDistributor: tokenDistributor.address,
      deployer: deployerAddress,
      deployerPrivateKey,
      network: "localhost",
      deployedAt: new Date().toISOString()
    };

    // Save to both locations
    fs.writeFileSync(DEPLOYED_ADDRESSES_PATH, JSON.stringify(addresses, null, 2));
    const frontendDir = path.dirname(FRONTEND_ADDRESSES_PATH);
    if (!fs.existsSync(frontendDir)) fs.mkdirSync(frontendDir, { recursive: true });
    fs.writeFileSync(FRONTEND_ADDRESSES_PATH, JSON.stringify(addresses, null, 2));
    console.log("   ✅ Addresses saved");

    return addresses;
  } catch (e) {
    console.error("   ❌ Deployment failed:", e.message);
    return null;
  }
}

async function syncDbToChain(db, provider, addresses) {
  let deployerKey = process.env.DEPLOYER_PRIVATE_KEY || addresses.deployerPrivateKey;
  if (!deployerKey) {
    console.warn("   ⚠️  No deployer key available for sync.");
    return;
  }
  if (!deployerKey.startsWith("0x")) deployerKey = "0x" + deployerKey;

  const deployer = new ethers.Wallet(deployerKey, provider);

  // Load contract ABIs from artifacts
  const artifactsDir = path.join(__dirname, "..", "artifacts", "contracts");

  // On Render, artifacts might not exist — use minimal ABIs as fallback
  let loadABI;
  if (fs.existsSync(artifactsDir)) {
    loadABI = function(name) {
      const p = path.join(artifactsDir, `${name}.sol`, `${name}.json`);
      return JSON.parse(fs.readFileSync(p, "utf8")).abi;
    };
  } else {
    console.log("   ⚠️  No compiled artifacts found — using minimal ABIs for sync");
    // Minimal ABIs sufficient for sync operations
    const minimalABIs = {
      CitizenRegistry: [
        "function registerCitizenByAdmin(address citizenWallet, bytes32 zkCommitment, bytes32 mobileHash, uint256 schemeId) external returns (uint256)",
        "function getCitizenByWallet(address wallet) view returns (tuple(uint256 id, address walletAddress, bytes32 zkCommitment, uint8 status, uint256 tokenBalance, uint256 registeredAt, uint256 approvedAt, bytes32 mobileHash, uint256 schemeId))",
        "function getTotalCitizens() view returns (uint256)"
      ],
      TokenDistributor: [
        "function configureDistribution(uint256 schemeId, uint256 _perCitizenAmount) external",
        "function manualDistribute() external"
      ],
      DigitalRupee: [
        "function balanceOf(address) view returns (uint256)"
      ],
      VendorRegistry: [
        "function registerVendorByAdmin(address vendorWallet, uint8 vendorType, string calldata businessName, bytes32 credentialHash, bytes32 bankAccountHash, bytes32 ifscHash) external returns (uint256)",
        "function getVendorByWallet(address wallet) view returns (tuple(uint256 id, address walletAddress, uint8 vendorType, string businessName, uint8 status, uint256 registeredAt))"
      ]
    };
    loadABI = function(name) { return minimalABIs[name] || []; };
  }

  const citizenReg = new ethers.Contract(addresses.CitizenRegistry, loadABI("CitizenRegistry"), deployer);
  const tokenDistributor = new ethers.Contract(addresses.TokenDistributor, loadABI("TokenDistributor"), deployer);
  const digitalRupee = new ethers.Contract(addresses.DigitalRupee, loadABI("DigitalRupee"), deployer);

  // Find all approved/funded citizens with wallets
  const citizens = db.prepare(`
    SELECT ca.*, u.wallet_address
    FROM citizen_applications ca
    JOIN users u ON ca.user_id = u.id
    WHERE ca.status IN ('Approved', 'Funded')
      AND u.wallet_address IS NOT NULL
  `).all();

  if (citizens.length === 0) {
    console.log("   📋 No approved citizens to sync.");
    return;
  }

  console.log(`   📋 Syncing ${citizens.length} citizen(s) to chain...`);

  for (const app of citizens) {
    try {
      // Check if already registered on this chain
      try {
        await citizenReg.getCitizenByWallet(app.wallet_address);
        // Already registered — check if needs minting
      } catch {
        // Not registered — register now
        const zkCommitment = ethers.keccak256(ethers.toUtf8Bytes(`${app.pan}:${app.phone}`));
        const mobileHash = ethers.keccak256(ethers.toUtf8Bytes(app.phone));

        const regTx = await citizenReg.registerCitizenByAdmin(app.wallet_address, zkCommitment, mobileHash, app.scheme_id);
        await regTx.wait();
      }

      // Get on-chain citizen ID
      const citizenData = await citizenReg.getCitizenByWallet(app.wallet_address);
      const onChainId = Number(citizenData.id);

      // Update DB with on-chain ID
      db.prepare("UPDATE citizen_applications SET on_chain_citizen_id = ?, on_chain_tx_hash = 'bootstrap' WHERE id = ?")
        .run(onChainId, app.id);

      // Fund citizen wallet with ETH for gas (only on local — skip on Sepolia to conserve funds)
      if (isLocalNetwork()) {
        const ethBalance = await provider.getBalance(app.wallet_address);
        if (ethBalance < ethers.parseEther("0.01")) {
          const gasFunder = new ethers.Wallet(deployerKey, new ethers.JsonRpcProvider(RPC_URL));
          const fundTx = await gasFunder.sendTransaction({ to: app.wallet_address, value: ethers.parseEther("0.1") });
          await fundTx.wait();
          console.log(`   ⛽ ${app.citizen_name}: funded with 0.1 ETH for gas`);
        }
      }

      // If the citizen was previously funded, re-mint their tokens
      if (app.status === "Funded") {
        const scheme = db.prepare("SELECT per_citizen_amount FROM schemes WHERE id = ?").get(app.scheme_id);
        const amount = scheme ? scheme.per_citizen_amount : 6000;
        const currentBalance = await digitalRupee.balanceOf(app.wallet_address);

        if (Number(ethers.formatEther(currentBalance)) < amount) {
          // Configure and distribute (use fresh signers for nonce safety)
          const provider2 = new ethers.JsonRpcProvider(RPC_URL);
          const signer2 = new ethers.Wallet(deployerKey, provider2);
          const td = new ethers.Contract(addresses.TokenDistributor, loadABI("TokenDistributor"), signer2);

          const configTx = await td.configureDistribution(app.scheme_id, ethers.parseEther(String(amount)));
          await configTx.wait();

          const provider3 = new ethers.JsonRpcProvider(RPC_URL);
          const signer3 = new ethers.Wallet(deployerKey, provider3);
          const td3 = new ethers.Contract(addresses.TokenDistributor, loadABI("TokenDistributor"), signer3);

          const distTx = await td3.manualDistribute();
          await distTx.wait();
          console.log(`   💰 ${app.citizen_name}: re-minted ₹${amount}`);
        } else {
          console.log(`   ✅ ${app.citizen_name}: already has ₹${ethers.formatEther(currentBalance)}`);
        }
      } else {
        console.log(`   ✅ ${app.citizen_name}: registered (Approved, awaiting distribution)`);
      }
    } catch (e) {
      console.warn(`   ⚠️  ${app.citizen_name}: ${e.reason || e.message}`);
    }
  }

  // ===== SYNC APPROVED VENDORS TO CHAIN =====
  const vendors = db.prepare(`
    SELECT va.*, u.wallet_address
    FROM vendor_applications va
    JOIN users u ON va.user_id = u.id
    WHERE va.status = 'Approved' AND u.wallet_address IS NOT NULL
  `).all();

  if (vendors.length > 0) {
    console.log(`   📋 Syncing ${vendors.length} vendor(s) to chain...`);
    const vendorRegABI = loadABI("VendorRegistry");
    
    for (const v of vendors) {
      try {
        const vr = new ethers.Contract(addresses.VendorRegistry, vendorRegABI, deployer);
        
        // Check if already registered on this chain
        try {
          await vr.getVendorByWallet(v.wallet_address);
          console.log(`   ✅ ${v.business_name}: already on-chain`);
        } catch {
          // Not registered — register now
          const vendorType = v.vendor_type === "CropBuyer" ? 1 : 0;
          const credentialHash = ethers.keccak256(ethers.toUtf8Bytes(v.credential || "none"));
          const bankAccountHash = ethers.keccak256(ethers.toUtf8Bytes(v.bank_account || "none"));
          const ifscHash = ethers.keccak256(ethers.toUtf8Bytes(v.ifsc_code || "none"));

          // Use fresh signer for each registration
          const freshProvider = new ethers.JsonRpcProvider(RPC_URL);
          const freshSigner = new ethers.Wallet(deployerKey, freshProvider);
          const vrFresh = new ethers.Contract(addresses.VendorRegistry, vendorRegABI, freshSigner);

          const regTx = await vrFresh.registerVendorByAdmin(
            v.wallet_address, vendorType, v.business_name, credentialHash, bankAccountHash, ifscHash
          );
          await regTx.wait();
          console.log(`   🔗 ${v.business_name}: registered on-chain`);
        }

        // Fund vendor wallet with gas ETH (only on local)
        if (isLocalNetwork()) {
          const ethBal = await provider.getBalance(v.wallet_address);
          if (ethBal < ethers.parseEther("0.01")) {
            const gasFunder = new ethers.Wallet(deployerKey, new ethers.JsonRpcProvider(RPC_URL));
            const fundTx = await gasFunder.sendTransaction({ to: v.wallet_address, value: ethers.parseEther("0.1") });
            await fundTx.wait();
            console.log(`   ⛽ ${v.business_name}: funded with 0.1 ETH for gas`);
          }
        }
      } catch (e) {
        console.warn(`   ⚠️  ${v.business_name}: ${e.reason || e.message}`);
      }
    }
  }

  // Reset any "Scheduled" triggers that failed (stale from old chain)
  db.prepare("UPDATE event_triggers SET retry_count = 0, error_message = NULL WHERE status = 'Failed'").run();
  console.log("   ✅ Chain sync complete.\n");
}

module.exports = { bootstrap };
