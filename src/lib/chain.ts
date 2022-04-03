import { ChainId } from "@usedapp/core";
import { toHexPrefixedWith0x } from "./utils";

export interface ChainInfo {
  chainId: number; // A 0x-prefixed hexadecimal string
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string; // 2-6 characters long
    decimals: 18;
  };
  rpcUrls: string[];
  blockExplorerUrls?: string[];
  iconUrls?: string[]; // Currently ignored.
  genesisBlockHash?: string,
}

export const NETWORKS: Record<string, ChainInfo> = {
  local: {
    chainId: ChainId.Localhost,
    chainName: 'Localhost Network',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['http://localhost:8545'],
  },
  rinkeby: {
    chainId: ChainId.Rinkeby,
    chainName: 'Rinkeby Test Network',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161'],
    blockExplorerUrls: ['https://rinkeby.etherscan.io'],
  },
}
