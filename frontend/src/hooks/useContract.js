import { useMemo } from 'react';
import { Contract } from 'ethers';
import { CONTRACT_ADDRESSES, ABIS } from '../config/contracts';

export function useContract(contractName, signerOrProvider) {
  const contract = useMemo(() => {
    const address = CONTRACT_ADDRESSES[contractName];
    const abi = ABIS[contractName];

    if (!address || !abi || !signerOrProvider) return null;

    try {
      return new Contract(address, abi, signerOrProvider);
    } catch (err) {
      console.error(`Failed to create ${contractName} contract:`, err);
      return null;
    }
  }, [contractName, signerOrProvider]);

  return contract;
}
