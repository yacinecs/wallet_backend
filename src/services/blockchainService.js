const { ethers } = require('ethers');

const NETWORK = process.env.CHAIN_NETWORK || 'base-mainnet';
const RPC_URL = process.env.CHAIN_RPC_URL; // Required
const USDC_ADDRESS = process.env.USDC_CONTRACT; // Required

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
  if (!RPC_URL) throw new Error('CHAIN_RPC_URL missing');
  if (!provider) provider = new ethers.JsonRpcProvider(RPC_URL);
  return provider;
}

function getUsdcContract() {
  if (!USDC_ADDRESS) throw new Error('USDC_CONTRACT missing');
  return new ethers.Contract(USDC_ADDRESS, ERC20_ABI, getProvider());
}

async function getUsdcBalance(address) {
  const token = getUsdcContract();
  const [raw, dec, sym] = await Promise.all([
    token.balanceOf(address),
    token.decimals(),
    token.symbol(),
  ]);
  const decimals = Number(dec); // ensure JSON-safe
  const formatted = ethers.formatUnits(raw, decimals); // string
  return { symbol: String(sym), decimals, raw: raw.toString(), formatted };
}

async function listTransfers(address, fromBlock, toBlock) {
  const token = getUsdcContract();
  const filterIn = token.filters.Transfer(null, address);
  const filterOut = token.filters.Transfer(address, null);
  const latest = await getProvider().getBlockNumber();
  const start = fromBlock ?? Math.max(0, latest - 10_000);
  const end = toBlock ?? latest;
  const [ins, outs] = await Promise.all([
    token.queryFilter(filterIn, start, end),
    token.queryFilter(filterOut, start, end),
  ]);
  return [...ins, ...outs]
    .sort((a, b) => (a.blockNumber - b.blockNumber))
    .map(ev => ({
      blockNumber: Number(ev.blockNumber),
      txHash: String(ev.transactionHash),
      from: String(ev.args.from),
      to: String(ev.args.to),
      value: ev.args.value.toString(),
    }));
}

module.exports = {
  getProvider,
  getUsdcContract,
  getUsdcBalance,
  listTransfers,
};
