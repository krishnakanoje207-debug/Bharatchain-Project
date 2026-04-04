export const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111
export const HARDHAT_CHAIN_ID = '0x7a69'; // 31337

export const CHAINS = {
  sepolia: {
    chainId: SEPOLIA_CHAIN_ID,
    chainName: 'Sepolia Testnet',
    rpcUrls: ['https://rpc.sepolia.org'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 }
  },
  hardhat: {
    chainId: HARDHAT_CHAIN_ID,
    chainName: 'Hardhat Local',
    rpcUrls: ['http://127.0.0.1:8545'],
    blockExplorerUrls: [],
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }
  }
};

export const ACTIVE_CHAIN = import.meta.env.VITE_CHAIN === 'sepolia' ? CHAINS.sepolia : CHAINS.hardhat;
export const BLOCK_EXPLORER = ACTIVE_CHAIN.blockExplorerUrls[0] || '';
