<p align="center">
  <h1 align="center">🇮🇳 BharatChain</h1>
  <p align="center"><strong>Blockchain-Powered Anti-Corruption Welfare Distribution System</strong></p>
  <p align="center">
    <a href="#-architecture">Architecture</a> •
    <a href="#-smart-contracts">Smart Contracts</a> •
    <a href="#-getting-started">Getting Started</a> •
    <a href="#-deployment">Deployment</a> •
    <a href="#-api-reference">API</a>
  </p>
</p>

---

## 📋 Overview

**BharatChain** is a full-stack Web3 application that eliminates corruption in government welfare distribution by leveraging blockchain technology, zero-knowledge proofs, and CBDC (Central Bank Digital Currency) tokenomics.

Traditional welfare schemes in India suffer from fund diversion, ghost beneficiaries, and opaque disbursement. BharatChain solves these by:

- **Minting Digital Rupees (₹D / INRD)** as ERC-20 tokens directly to verified citizen wallets
- **Verifying citizen identity** with Zero-Knowledge Proofs (Poseidon-hashed PAN + Samagra ID + Mobile)
- **Recording every transaction** on an immutable on-chain ledger, publicly auditable
- **Automating fund disbursement** via Chainlink Keeper-compatible smart contracts
- **Enforcing a closed-loop economy** where vendors exchange tokens back to INR through RBI, with token revocation on settlement

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🔐 **ZK Identity Verification** | Citizens prove identity via Poseidon hash commitments without revealing raw PAN/Aadhaar data |
| 💰 **Digital Rupee (INRD)** | ERC-20 CBDC token with role-based minting (Distributor) and burning (RBI settlement) |
| 📊 **Public Ledger** | On-chain TransactionLedger separates public (mint/allocation/revocation) from private (citizen→vendor) transactions |
| ⏰ **Automated Distribution** | Chainlink Keeper-compatible time-based triggers with manual override for demos |
| 🏪 **Vendor Ecosystem** | Two vendor types (Farming Suppliers & Crop Buyers) with ITR verification and RBI settlement flow |
| 🏛️ **Admin Portal** | Full dashboard for scheme management, citizen/vendor approval, event triggers, and ledger audit |
| 🌐 **Multi-language** | i18n support with language toggle |
| 🌙 **Dark/Light Mode** | Theme toggle across the entire UI |
| 📱 **MetaMask Integration** | Frontend wallet connect for vendor self-registration |

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│              React 19 + Vite + React Router 7                │
│         (Deployed on Vercel — SPA with catch-all)            │
│                                                              │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌────────────────┐   │
│  │  Citizen  │ │  Vendor  │ │  Admin  │ │ Public Ledger  │   │
│  │Dashboard │ │Dashboard │ │ Portal  │ │    (read-only) │   │
│  └────┬─────┘ └────┬─────┘ └────┬────┘ └───────┬────────┘   │
│       │             │            │               │            │
│       └─────────────┴────────────┴───────────────┘            │
│                          │  REST API                          │
└──────────────────────────┼────────────────────────────────────┘
                           │
┌──────────────────────────┼────────────────────────────────────┐
│                     BACKEND (Express.js)                       │
│                (Deployed on Render)                            │
│                                                               │
│  ┌──────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌───────┐  │
│  │ Auth │ │ Verify   │ │  Admin   │ │Blockchain │ │Ledger │  │
│  │Routes│ │ Routes   │ │  Routes  │ │  Routes   │ │Routes │  │
│  └──┬───┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘ └───┬───┘  │
│     │          │             │              │           │      │
│  ┌──┴──────────┴─────────────┴──────────────┴───────────┴──┐  │
│  │              PostgreSQL (Supabase / Render)              │  │
│  │     users • citizen_applications • vendor_applications   │  │
│  │     schemes • event_triggers • notifications             │  │
│  └─────────────────────────────────────────────────────────┘  │
│     │                                                         │
│  ┌──┴────────────────────────────────────┐                    │
│  │  Schedulers (Auto-Trigger + On-Chain  │                    │
│  │  Sync — 60s / 120s intervals)         │                    │
│  └──┬────────────────────────────────────┘                    │
│     │  ethers.js v6                                           │
└─────┼─────────────────────────────────────────────────────────┘
      │
┌─────┼─────────────────────────────────────────────────────────┐
│     ▼          ETHEREUM (Sepolia Testnet)                      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ DigitalRupee │  │  ZKVerifier  │  │ TransactionLedger  │   │
│  │   (ERC-20)   │  │  (Groth16)   │  │  (Immutable Log)   │   │
│  └──────┬───────┘  └──────────────┘  └────────────────────┘   │
│         │                                                     │
│  ┌──────┴───────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │CitizenReg.   │  │ VendorReg.   │  │   WelfareScheme    │   │
│  │(ZK-verified) │  │(ITR+RBI flow)│  │(Instalment-aware)  │   │
│  └──────────────┘  └──────────────┘  └────────────────────┘   │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐    │
│  │               TokenDistributor                         │    │
│  │  (Chainlink Keeper-compatible, time-based triggers)    │    │
│  └────────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
```

---

## 📜 Smart Contracts

All contracts are written in Solidity `^0.8.20` and use OpenZeppelin `AccessControl` for role-based permissions.

| Contract | Purpose | Key Roles |
|---|---|---|
| **DigitalRupee.sol** | ERC-20 CBDC token (₹D / INRD) — mintable & burnable | `MINTER_ROLE`, `BURNER_ROLE` |
| **ZKVerifier.sol** | Groth16-compatible ZK proof verifier for citizen identity | — |
| **CitizenRegistry.sol** | Citizen registration w/ ZK commitment; admin-bypass path for backend | `ADMIN_ROLE`, `DISTRIBUTOR_ROLE` |
| **VendorRegistry.sol** | Two-type vendor management with INR exchange + RBI settlement flow | `ADMIN_ROLE`, `RBI_ROLE` |
| **WelfareScheme.sol** | Scheme lifecycle (create → active → completed/cancelled) with instalment scheduling | `ADMIN_ROLE` |
| **TokenDistributor.sol** | Chainlink Keeper: time-based auto-distribution + vendor token revocation | `ADMIN_ROLE` |
| **TransactionLedger.sol** | Immutable on-chain transaction log (public + private classification) | `LOGGER_ROLE` |

### Role Hierarchy

```
Deployer (DEFAULT_ADMIN_ROLE)
├── MINTER_ROLE    → TokenDistributor  (can mint INRD)
├── BURNER_ROLE    → TokenDistributor + Deployer  (can burn/revoke tokens)
├── LOGGER_ROLE    → TokenDistributor + WelfareScheme + Deployer  (can log transactions)
├── DISTRIBUTOR_ROLE → TokenDistributor  (can mark citizens as funded)
├── ADMIN_ROLE     → Deployer  (on all registries)
└── RBI_ROLE       → Deployer  (can confirm INR transfers on VendorRegistry)
```

---

## 🔐 Zero-Knowledge Proof Circuit

The ZK circuit (`circuits/citizenProof.circom`) uses Poseidon hashing:

```
Citizen proves: "I know (PAN, SamagraID, Mobile) such that
  Poseidon(PAN, SamagraID, Mobile) == commitment"
```

- **Private inputs**: PAN number, Samagra ID, Mobile number
- **Public output**: Poseidon hash commitment (stored on-chain)
- **Framework**: Circom 2.0 + SnarkJS Groth16
- **Prototype**: Simplified verifier for hackathon; production would use full trusted setup ceremony

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- **MetaMask** browser extension (for vendor registration)
- **PostgreSQL** database (Supabase, Neon, or local)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/bharatchain.git
cd bharatchain

# Install root dependencies (Hardhat, OpenZeppelin, ethers)
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### Environment Setup

Create a `.env` file in the project root:

```env
# Blockchain RPC
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
DEPLOYER_PRIVATE_KEY=your_deployer_private_key

# Backend Auth
JWT_SECRET=your_jwt_secret_here

# PostgreSQL Database
DATABASE_URL=postgresql://user:password@host:5432/dbname
```

### Local Development

```bash
# Terminal 1 — Start local Hardhat blockchain
npx hardhat node

# Terminal 2 — Deploy contracts to local chain
npm run deploy:local

# Terminal 3 — Start backend (auto-bootstraps DB + on-chain state)
cd backend && npm start

# Terminal 4 — Start frontend dev server
cd frontend && npm run dev
```

The backend auto-detects chain resets (Hardhat node restarts) and re-syncs citizen registrations automatically.

### Default Credentials

| Role | Phone | Password |
|---|---|---|
| **Admin** | `9000000001` | `admin123` |
| **RBI** | `9000000002` | `rbi123` |

Citizen accounts are seeded automatically — see `citizens_test_data.csv` for test data.

---

## 📁 Project Structure

```
bharatchain/
├── contracts/                    # Solidity smart contracts
│   ├── DigitalRupee.sol          #   ERC-20 CBDC token
│   ├── ZKVerifier.sol            #   ZK proof verifier
│   ├── CitizenRegistry.sol       #   Citizen registration + ZK
│   ├── VendorRegistry.sol        #   Vendor management + RBI flow
│   ├── WelfareScheme.sol         #   Scheme lifecycle
│   ├── TokenDistributor.sol      #   Chainlink Keeper distribution
│   └── TransactionLedger.sol     #   Immutable transaction log
│
├── circuits/                     # Circom ZK circuits
│   └── citizenProof.circom       #   Poseidon identity proof
│
├── scripts/                      # Deployment & operations
│   ├── deploy.js                 #   Full contract deployment
│   ├── bootstrap.js              #   Auto-bootstrap for backend
│   ├── grant-roles.js            #   Role configuration
│   └── generate-proof.js         #   ZK proof generation helper
│
├── test/                         # Hardhat test suite
│   ├── DigitalRupee.test.js
│   ├── CitizenRegistry.test.js
│   ├── VendorRegistry.test.js
│   ├── WelfareScheme.test.js
│   └── TokenDistributor.test.js
│
├── backend/                      # Express.js API server
│   ├── server.js                 #   Entry point + schedulers
│   ├── database/
│   │   ├── init.js               #   DB schema init (PostgreSQL)
│   │   └── pg-wrapper.js         #   PostgreSQL query wrapper
│   ├── routes/
│   │   ├── auth.js               #   Signup/Login/OTP
│   │   ├── verify.js             #   Citizen verification
│   │   ├── admin.js              #   Admin CRUD operations
│   │   ├── blockchain.js         #   On-chain interactions
│   │   ├── ledger.js             #   Public ledger queries
│   │   └── notifications.js     #   SMS/notification system
│   ├── middleware/               #   JWT auth middleware
│   └── utils/
│       ├── contractSigner.js     #   Ethers.js contract helpers
│       └── walletGenerator.js    #   HD wallet generation
│
├── frontend/                     # React SPA
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx          #   Landing page
│   │   │   ├── Login.jsx         #   Citizen/Vendor login
│   │   │   ├── SignUp.jsx        #   Registration with KYC
│   │   │   ├── Schemes.jsx       #   Welfare scheme browser
│   │   │   ├── PublicLedger.jsx  #   On-chain transaction viewer
│   │   │   ├── citizen/          #   Dashboard, Apply, Wallet, Send
│   │   │   ├── vendor/           #   Dashboard, Apply, Exchange
│   │   │   └── admin/            #   Dashboard, Schemes, Citizens,
│   │   │                         #   Vendors, EventTriggers
│   │   ├── components/           #   Navbar, Sidebar, Theme/Lang toggles
│   │   ├── hooks/                #   useAuth context
│   │   ├── i18n/                 #   Multi-language translations
│   │   └── config/               #   Deployed contract addresses
│   └── vercel.json               #   SPA routing config
│
├── hardhat.config.js             # Hardhat configuration
├── deployed-addresses.json       # Deployed contract addresses
└── package.json                  # Root project config
```

---

## 🔄 Welfare Distribution Flow

```mermaid
sequenceDiagram
    participant A as Admin
    participant B as Backend
    participant SC as Smart Contracts
    participant C as Citizen
    participant V as Vendor
    participant RBI as RBI Node

    A->>B: Create Scheme + Schedule Trigger
    B->>SC: WelfareScheme.createScheme()
    
    Note over B: ⏰ Scheduler fires (60s interval)
    B->>SC: TokenDistributor.configureDistribution()
    B->>SC: TokenDistributor.manualDistribute()
    SC->>SC: DigitalRupee.mint() → Citizen wallets
    SC->>SC: CitizenRegistry.markFunded()
    SC->>SC: TransactionLedger.logTransaction()
    
    C->>V: Pay vendor with INRD tokens
    B->>SC: DigitalRupee.transfer(vendor)
    SC->>SC: TransactionLedger.logTransaction()
    
    V->>B: Request INR Exchange
    B->>SC: VendorRegistry.requestExchange()
    A->>SC: VendorRegistry.verifyITR()
    RBI->>SC: VendorRegistry.confirmRBITransfer()
    B->>SC: DigitalRupee.revokeTokens(vendor)
    SC->>SC: VendorRegistry.markTokensRevoked()
```

---

## 🌐 Deployment

### Backend → Render

1. Push backend to a GitHub repo
2. Create a new **Web Service** on [Render](https://render.com)
3. Set environment variables: `DATABASE_URL`, `JWT_SECRET`, `RPC_URL`, `DEPLOYER_PRIVATE_KEY`
4. Build command: `cd backend && npm install`
5. Start command: `cd backend && node server.js`

### Frontend → Vercel

1. Import the repository on [Vercel](https://vercel.com)
2. Set root directory to `frontend`
3. Framework preset: **Vite**
4. Add environment variable: `VITE_API_URL=https://your-backend.onrender.com`
5. The included `vercel.json` handles SPA catch-all routing

### Smart Contracts → Sepolia

```bash
# Deploy to Sepolia testnet
npm run deploy:sepolia

# Grant roles post-deployment
npx hardhat run scripts/grant-roles.js --network sepolia
```

---

## 🧪 Testing

```bash
# Run the full Hardhat test suite
npm test

# Run a specific contract test
npx hardhat test test/TokenDistributor.test.js

# Run with gas reporting
REPORT_GAS=true npx hardhat test
```

### Test Coverage

| Contract | Tests |
|---|---|
| DigitalRupee | Minting, burning, role enforcement, revocation |
| CitizenRegistry | Registration, ZK verification, admin bypass, funding lifecycle |
| VendorRegistry | Registration, approval/rejection, exchange flow, RBI settlement |
| WelfareScheme | Scheme creation, status transitions, instalment scheduling |
| TokenDistributor | Distribution, Keeper integration, vendor revocation |

---

## 🛡️ Security Considerations

- **Role-Based Access Control**: All state-changing functions protected by OpenZeppelin's `AccessControl`
- **ZK Privacy**: Raw PAN/Aadhaar data never touches the blockchain — only Poseidon commitments
- **Double-Spend Prevention**: Citizens marked as `Funded` after lump-sum distribution; excluded from future allocations
- **Chain Reset Detection**: Backend auto-detects Hardhat node restarts and re-syncs state
- **JWT Authentication**: Backend API protected with signed JWT tokens
- **Password Hashing**: bcrypt with salt rounds for all user passwords

> ⚠️ **Note**: The ZKVerifier uses a simplified proof verification for the hackathon prototype. Production deployment would require a full Groth16 trusted setup ceremony with Powers of Tau.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Smart Contracts** | Solidity 0.8.20, OpenZeppelin 5.x, Hardhat |
| **Blockchain** | Ethereum Sepolia Testnet |
| **ZK Proofs** | Circom 2.0, SnarkJS, Poseidon Hash |
| **Backend** | Node.js, Express.js, ethers.js v6 |
| **Database** | PostgreSQL (Supabase) |
| **Frontend** | React 19, Vite 8, React Router 7 |
| **Wallet** | MetaMask (ethers.js BrowserProvider) |
| **Deployment** | Vercel (frontend), Render (backend) |

---

## 📄 License

This project was built for a hackathon and is provided as-is for educational and demonstration purposes.

---

<p align="center">
  Built with ❤️ for a corruption-free India
</p>