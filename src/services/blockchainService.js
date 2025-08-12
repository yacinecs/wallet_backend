const { ethers } = require('ethers');
require('dotenv').config();

// USDC Contract ABI (simplified for transfers)
const USDC_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) external returns (bool)",
  "function decimals() external view returns (uint8)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "event Transfer(address indexed from, address indexed to, uint256 value)"
];

class BlockchainService {
  constructor() {
    this.initializeProvider();
    this.initializeContract();
    this.initializeMasterWallet();
  }

  initializeProvider() {
    const network = process.env.BLOCKCHAIN_NETWORK || 'testnet';
    
    switch (network) {
      case 'mainnet':
        this.provider = new ethers.JsonRpcProvider(process.env.ETHEREUM_RPC_URL);
        this.usdcAddress = '0xA0b86a33E6417d70d79d70D6CFfE02b0e19b2b62F4aF'; // Ethereum USDC
        break;
      case 'polygon':
        this.provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
        this.usdcAddress = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174'; // Polygon USDC
        break;
      case 'testnet':
      default:
        this.provider = new ethers.JsonRpcProvider(process.env.TESTNET_RPC_URL);
        this.usdcAddress = process.env.USDC_CONTRACT_ADDRESS;
        break;
    }
    
    console.log(`✅ Blockchain provider initialized for ${network}`);
  }

  initializeContract() {
    this.usdcContract = new ethers.Contract(
      this.usdcAddress,
      USDC_ABI,
      this.provider
    );
  }

  initializeMasterWallet() {
    if (process.env.MASTER_WALLET_PRIVATE_KEY) {
      this.masterWallet = new ethers.Wallet(
        process.env.MASTER_WALLET_PRIVATE_KEY,
        this.provider
      );
      this.usdcContractWithSigner = this.usdcContract.connect(this.masterWallet);
    }
  }

  // Generate a new wallet address for a user
  generateWalletAddress() {
    const wallet = ethers.Wallet.createRandom();
    return {
      address: wallet.address,
      privateKey: wallet.privateKey,
      mnemonic: wallet.mnemonic.phrase
    };
  }

  // Get USDC balance for an address
  async getUSDCBalance(address) {
    try {
      const balance = await this.usdcContract.balanceOf(address);
      // USDC has 6 decimals
      return ethers.formatUnits(balance, 6);
    } catch (error) {
      console.error('Error getting USDC balance:', error);
      throw error;
    }
  }

  // Transfer USDC from master wallet to user address
  async depositUSDC(toAddress, amount) {
    try {
      if (!this.masterWallet) {
        throw new Error('Master wallet not configured');
      }

      const amountInWei = ethers.parseUnits(amount.toString(), 6);
      
      // Estimate gas
      const gasEstimate = await this.usdcContractWithSigner.transfer.estimateGas(
        toAddress,
        amountInWei
      );

      // Send transaction
      const tx = await this.usdcContractWithSigner.transfer(
        toAddress,
        amountInWei,
        {
          gasLimit: gasEstimate * BigInt(120) / BigInt(100) // Add 20% buffer
        }
      );

      console.log(`USDC deposit transaction sent: ${tx.hash}`);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed'
      };
    } catch (error) {
      console.error('Error depositing USDC:', error);
      throw error;
    }
  }

  // Transfer USDC from user address to master wallet (withdrawal)
  async withdrawUSDC(userPrivateKey, amount) {
    try {
      const userWallet = new ethers.Wallet(userPrivateKey, this.provider);
      const userUsdcContract = this.usdcContract.connect(userWallet);
      
      const amountInWei = ethers.parseUnits(amount.toString(), 6);
      
      // Check user balance first
      const userBalance = await this.getUSDCBalance(userWallet.address);
      if (parseFloat(userBalance) < parseFloat(amount)) {
        throw new Error('Insufficient USDC balance');
      }

      // Estimate gas
      const gasEstimate = await userUsdcContract.transfer.estimateGas(
        this.masterWallet.address,
        amountInWei
      );

      // Send transaction
      const tx = await userUsdcContract.transfer(
        this.masterWallet.address,
        amountInWei,
        {
          gasLimit: gasEstimate * BigInt(120) / BigInt(100)
        }
      );

      console.log(`USDC withdrawal transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      
      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed'
      };
    } catch (error) {
      console.error('Error withdrawing USDC:', error);
      throw error;
    }
  }

  // Transfer USDC between user addresses
  async transferUSDC(fromPrivateKey, toAddress, amount) {
    try {
      const fromWallet = new ethers.Wallet(fromPrivateKey, this.provider);
      const fromUsdcContract = this.usdcContract.connect(fromWallet);
      
      const amountInWei = ethers.parseUnits(amount.toString(), 6);
      
      // Check sender balance
      const senderBalance = await this.getUSDCBalance(fromWallet.address);
      if (parseFloat(senderBalance) < parseFloat(amount)) {
        throw new Error('Insufficient USDC balance');
      }

      // Estimate gas
      const gasEstimate = await fromUsdcContract.transfer.estimateGas(
        toAddress,
        amountInWei
      );

      // Send transaction
      const tx = await fromUsdcContract.transfer(
        toAddress,
        amountInWei,
        {
          gasLimit: gasEstimate * BigInt(120) / BigInt(100)
        }
      );

      console.log(`USDC transfer transaction sent: ${tx.hash}`);
      
      const receipt = await tx.wait();
      
      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed'
      };
    } catch (error) {
      console.error('Error transferring USDC:', error);
      throw error;
    }
  }

  // Get transaction details
  async getTransactionDetails(txHash) {
    try {
      const tx = await this.provider.getTransaction(txHash);
      const receipt = await this.provider.getTransactionReceipt(txHash);
      
      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        value: ethers.formatEther(tx.value),
        gasPrice: ethers.formatUnits(tx.gasPrice, 'gwei'),
        gasUsed: receipt ? receipt.gasUsed.toString() : null,
        blockNumber: receipt ? receipt.blockNumber : null,
        status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : 'pending',
        confirmations: receipt ? await receipt.confirmations() : 0
      };
    } catch (error) {
      console.error('Error getting transaction details:', error);
      throw error;
    }
  }

  // Estimate gas costs
  async estimateGasCosts() {
    try {
      const gasPrice = await this.provider.getGasPrice();
      const transferGasLimit = 65000; // Approximate gas for USDC transfer
      
      const gasCostWei = gasPrice * BigInt(transferGasLimit);
      const gasCostEth = ethers.formatEther(gasCostWei);
      
      return {
        gasPrice: ethers.formatUnits(gasPrice, 'gwei'),
        estimatedGasLimit: transferGasLimit,
        estimatedCostETH: gasCostEth,
        estimatedCostUSD: null // Would need ETH price API
      };
    } catch (error) {
      console.error('Error estimating gas costs:', error);
      throw error;
    }
  }

  // Monitor blockchain events (for deposit confirmations)
  async monitorUSDCTransfers(callback) {
    try {
      this.usdcContract.on('Transfer', (from, to, amount, event) => {
        const transferData = {
          from,
          to,
          amount: ethers.formatUnits(amount, 6),
          txHash: event.transactionHash,
          blockNumber: event.blockNumber
        };
        
        callback(transferData);
      });
      
      console.log('✅ USDC transfer monitoring started');
    } catch (error) {
      console.error('Error starting transfer monitoring:', error);
      throw error;
    }
  }
}

module.exports = new BlockchainService();
