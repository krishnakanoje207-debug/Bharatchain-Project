const { ethers } = require("ethers");
const crypto = require("crypto");

// Server salt — MUST be kept secret and consistent across restarts
const SERVER_SALT = process.env.WALLET_SALT || "bharatchain_hackathon_salt_2024_secure";

/**
 * Generate a deterministic Ethereum wallet from user-unique data.
 * The private key is derived: keccak256(pan + phone + server_salt)
 * This means the same user always gets the same wallet.
 */
function generateDeterministicWallet(pan, phone) {
  const seed = `${pan}:${phone}:${SERVER_SALT}`;
  const privateKey = ethers.keccak256(ethers.toUtf8Bytes(seed));
  const wallet = new ethers.Wallet(privateKey);
  return {
    address: wallet.address,
    privateKey: privateKey
  };
}

/**
 * Simple encrypt/decrypt for storing private keys in DB.
 * For production, use KMS or HSM. For hackathon, AES-256 is fine.
 */
const ENC_KEY = process.env.ENC_KEY || "bharatchain_enc_key_32bytes_!@#"; // Must be 32 chars
const ENC_IV_LENGTH = 16;

function encryptPrivateKey(privateKey) {
  const iv = crypto.randomBytes(ENC_IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENC_KEY.padEnd(32).slice(0, 32)), iv);
  let encrypted = cipher.update(privateKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

function decryptPrivateKey(encryptedKey) {
  const [ivHex, encrypted] = encryptedKey.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENC_KEY.padEnd(32).slice(0, 32)), iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Get an ethers.js Wallet instance for signing transactions.
 * Connects to the provider for on-chain operations.
 */
function getSignerWallet(encryptedPrivateKey, providerUrl) {
  const privateKey = decryptPrivateKey(encryptedPrivateKey);
  const provider = new ethers.JsonRpcProvider(providerUrl || "http://127.0.0.1:8545");
  return new ethers.Wallet(privateKey, provider);
}

module.exports = {
  generateDeterministicWallet,
  encryptPrivateKey,
  decryptPrivateKey,
  getSignerWallet
};
