const { ethers } = require("ethers");
const path = require("path");

const RPC_URL = process.env.RPC_URL || process.env.SEPOLIA_RPC_URL || "http://127.0.0.1:8545";

// Minimal ABIs for backend admin operations
const TOKEN_DISTRIBUTOR_ABI = [
  "function configureDistribution(uint256 schemeId, uint256 _perCitizenAmount) external",
  "function manualDistribute() external",
  "function manualRevoke() external",
  "function setInterval(uint256 _interval) external",
  "function getDistributionStatus() external view returns (uint256, uint256, bool, uint256, uint256, uint256)"
];

const DIGITAL_RUPEE_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function revokeTokens(address,uint256) external"
];

const VENDOR_REGISTRY_ABI = [
  "function registerVendorByAdmin(address,uint8,string,bytes32,bytes32,bytes32) external returns (uint256)",
  "function getVendorByWallet(address) view returns (tuple(uint256 id, address walletAddress, uint8 vendorType, uint8 status, string businessName, bytes32 credentialHash, bytes32 bankAccountHash, bytes32 ifscHash, uint256 tokenBalance, uint256 exchangedAmount, uint8 exchangeStatus, uint256 exchangeRequestAmount, uint256 registeredAt, uint256 approvedAt, bool rbiTransferConfirmed))",
  "function walletToVendorId(address) view returns (uint256)",
  "function getTotalVendors() view returns (uint256)",
  "function verifyITR(uint256) external",
  "function confirmRBITransfer(uint256) external",
  "function markTokensRevoked(uint256,uint256) external"
];

const TRANSACTION_LEDGER_ABI = [
  "function logTransaction(uint8,address,address,uint256,string) external returns (uint256)",
  "function getPublicTransactions() view returns (tuple(uint256 id, uint8 txType, address from, address to, uint256 amount, uint256 timestamp, string description)[])",
  "function getTotalTransactionCount() view returns (uint256)",
  "function getPrivateTransactionCount() view returns (uint256)"
];

const CITIZEN_REGISTRY_ABI = [
  "function registerCitizenByAdmin(address citizenWallet, bytes32 zkCommitment, bytes32 mobileHash, uint256 schemeId) external returns (uint256)",
  "function getCitizen(uint256 citizenId) view returns (tuple(uint256 id, address walletAddress, bytes32 zkCommitment, uint8 status, uint256 tokenBalance, uint256 registeredAt, uint256 approvedAt, bytes32 mobileHash, uint256 schemeId))",
  "function getCitizenByWallet(address wallet) view returns (tuple(uint256 id, address walletAddress, bytes32 zkCommitment, uint8 status, uint256 tokenBalance, uint256 registeredAt, uint256 approvedAt, bytes32 mobileHash, uint256 schemeId))",
  "function getTotalCitizens() view returns (uint256)",
  "function getApprovedCitizenIds() view returns (uint256[])"
];

// Cache only the deployed addresses (they don't change until redeployment)
let _cachedAddresses = null;

function _loadAddresses() {
  if (_cachedAddresses) return _cachedAddresses;
  try {
    delete require.cache[require.resolve("../../deployed-addresses.json")];
    _cachedAddresses = require("../../deployed-addresses.json");
  } catch {
    try {
      delete require.cache[require.resolve("../../frontend/src/config/deployed-addresses.json")];
      _cachedAddresses = require("../../frontend/src/config/deployed-addresses.json");
    } catch {
      throw new Error("No deployed-addresses.json found. Deploy contracts first.");
    }
  }
  return _cachedAddresses;
}

/**
 * Get deployer signer for admin on-chain operations.
 * Creates a COMPLETELY FRESH provider + wallet every call.
 * This is critical for Hardhat automining mode where the JsonRpcProvider
 * caches nonces internally, causing "nonce too low" on sequential transactions.
 */
function getDeployerSigner() {
  const addresses = _loadAddresses();

  let privateKey = process.env.DEPLOYER_PRIVATE_KEY || addresses.deployerPrivateKey;
  if (!privateKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY not found in environment or deployed-addresses.json.");
  }
  // Ensure 0x prefix
  if (!privateKey.startsWith("0x")) {
    privateKey = "0x" + privateKey;
  }

  // Fresh provider + signer every time — prevents ALL nonce caching issues
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(privateKey, provider);

  return { signer, addresses };
}

/**
 * Get a connected TokenDistributor contract instance (signed by deployer).
 */
function getTokenDistributor() {
  const { signer, addresses } = getDeployerSigner();
  if (!addresses.TokenDistributor) throw new Error("TokenDistributor address not found");
  const contract = new ethers.Contract(addresses.TokenDistributor, TOKEN_DISTRIBUTOR_ABI, signer);
  return { contract, signer, addresses };
}

/**
 * Get a connected CitizenRegistry contract instance (signed by deployer/admin).
 */
function getCitizenRegistry() {
  const { signer, addresses } = getDeployerSigner();
  if (!addresses.CitizenRegistry) throw new Error("CitizenRegistry address not found");
  const contract = new ethers.Contract(addresses.CitizenRegistry, CITIZEN_REGISTRY_ABI, signer);
  return { contract, signer, addresses };
}

/**
 * Get a connected DigitalRupee contract instance (read-only provider).
 */
function getDigitalRupee(useSigner = false) {
  if (useSigner) {
    const { signer, addresses } = getDeployerSigner();
    return { contract: new ethers.Contract(addresses.DigitalRupee, DIGITAL_RUPEE_ABI, signer), signer, addresses };
  }
  const addresses = _loadAddresses();
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  return new ethers.Contract(addresses.DigitalRupee, DIGITAL_RUPEE_ABI, provider);
}

/**
 * Get a connected VendorRegistry contract instance (signed by deployer/admin).
 */
function getVendorRegistry() {
  const { signer, addresses } = getDeployerSigner();
  if (!addresses.VendorRegistry) throw new Error("VendorRegistry address not found");
  const contract = new ethers.Contract(addresses.VendorRegistry, VENDOR_REGISTRY_ABI, signer);
  return { contract, signer, addresses };
}

/**
 * Get a connected TransactionLedger contract instance (signed by deployer for logging).
 */
function getTransactionLedger() {
  const { signer, addresses } = getDeployerSigner();
  if (!addresses.TransactionLedger) throw new Error("TransactionLedger address not found");
  const contract = new ethers.Contract(addresses.TransactionLedger, TRANSACTION_LEDGER_ABI, signer);
  return { contract, signer, addresses };
}

// ===== GLOBAL TX LOCK =====
// Prevents concurrent on-chain transactions from colliding.
let _txLockPromise = Promise.resolve();

function withTxLock(fn) {
  const prev = _txLockPromise;
  let resolve;
  _txLockPromise = new Promise(r => { resolve = r; });
  return prev.then(() => fn()).finally(() => resolve());
}

/**
 * Reset cached addresses (useful after redeployment)
 */
function resetSignerCache() {
  _cachedAddresses = null;
}

module.exports = { getDeployerSigner, getTokenDistributor, getCitizenRegistry, getDigitalRupee, getVendorRegistry, getTransactionLedger, withTxLock, resetSignerCache };
