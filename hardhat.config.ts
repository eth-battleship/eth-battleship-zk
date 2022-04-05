import "@nomiclabs/hardhat-ethers"
import "@nomiclabs/hardhat-truffle5"
import "@nomiclabs/hardhat-etherscan"
import { HardhatUserConfig } from "hardhat/config"

const TEST_MNEMONIC = 'funny door sample enrich female wedding stereo crane setup shop dwarf dismiss'

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.9",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },

  defaultNetwork: 'hardhat',

  networks: {
    hardhat: {
      chainId: 1337,
      initialBaseFeePerGas: 0,
      blockGasLimit: 30000000,
      accounts: {
        mnemonic: TEST_MNEMONIC,
        count: 50,
      },
      mining: {
        auto: true,
      },
    },
    rinkeby: {
      chainId: 4,
      url: `https://rinkeby.infura.io/v3/${process.env.INFURA_ID}`,
      accounts: {
        mnemonic: process.env.MNEMONIC,
      },
      timeout: 120000,
    }
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },
}

export default config;
