const { ethers } = require('ethers');

const NETWORK = process.env.CHAIN_NETWORK || 'polygon-amoy'; // default to Polygon Amoy testnet
const RPC_URL = process.env.CHAIN_RPC_URL; // e.g. https://polygon-amoy.g.alchemy.com/v2/KEY
const USDC_ADDRESS = process.env.USDC_CONTRACT || '0x3c38cA2A6E1C8337F6bC64E360Ebd48fCF9D2b9c'; // Amoy testnet USDC (example)

// Minimal ERC20 ABI
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)'
];

let provider;
function getProvider() {
  if (!provider) {
    if (!RPC_URL) throw new Error('CHAIN_RPC_URL missing');
    provider = new ethers.JsonRpcProvider(RPC_URL);
  }
  return provider;
}

function getUsdcContract() {
  return new ethers.Contract(USDC_ADDRESS, ERC20_ABI, getProvider());
}

async function getUsdcBalance(address) {
  const token = getUsdcContract();
  const [raw, decimals, symbol] = await Promise.all([
    token.balanceOf(address),
    token.decimals(),
    token.symbol(),
  ]);
  const formatted = Number(ethers.formatUnits(raw, decimals));
  return { symbol, decimals, raw: raw.toString(), formatted };
}

async function listTransfers(address, fromBlock, toBlock) {
  const token = getUsdcContract();
  const filterIn = token.filters.Transfer(null, address);
  const filterOut = token.filters.Transfer(address, null);
  const provider = getProvider();
  const latest = await provider.getBlockNumber();
  const start = fromBlock ?? Math.max(0, latest - 10_000);
  const end = toBlock ?? latest;
  const [ins, outs] = await Promise.all([
    token.queryFilter(filterIn, start, end),
    token.queryFilter(filterOut, start, end),
  ]);
  return [...ins, ...outs]
    .sort((a, b) => (a.blockNumber - b.blockNumber))
    .map(ev => ({
      blockNumber: ev.blockNumber,
      txHash: ev.transactionHash,
      from: ev.args.from,
      to: ev.args.to,
      value: ev.args.value.toString(),
    }));
}

module.exports = {
  getProvider,
  getUsdcContract,
  getUsdcBalance,
  listTransfers,
};
