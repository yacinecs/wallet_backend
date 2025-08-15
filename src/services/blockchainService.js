const { ethers } = require('ethers');

const NETWORK = process.env.CHAIN_NETWORK || 'base-mainnet';
const RPC_URL = process.env.CHAIN_RPC_URL; // Required
const USDC_ADDRESS = process.env.USDC_CONTRACT; // Required
const PRIVATE_KEY = process.env.CHAIN_PRIVATE_KEY; // Optional (required for send)

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

let signer;
function getSigner() {
  if (!PRIVATE_KEY) throw new Error('CHAIN_PRIVATE_KEY missing');
  if (!signer) signer = new ethers.Wallet(PRIVATE_KEY, getProvider());
  return signer;
}

async function getSignerAddress() {
  return getSigner().address;
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

// Send USDC from custodial signer to a destination address
async function sendUsdc({ to, amount }) {
  if (!ethers.isAddress(to)) throw new Error('Invalid recipient address');
  const token = getUsdcContract();
  const dec = Number(await token.decimals());
  if (typeof amount !== 'number' && typeof amount !== 'string') throw new Error('Amount must be number or string');
  const amtNum = typeof amount === 'string' ? Number(amount) : amount;
  if (!amtNum || amtNum <= 0) throw new Error('Amount must be positive');
  const value = ethers.parseUnits(amtNum.toString(), dec);

  const connected = token.connect(getSigner());
  const tx = await connected.transfer(to, value);
  const receipt = await tx.wait();
  return {
    txHash: String(tx.hash),
    status: receipt?.status === 1 ? 'success' : 'failed',
    blockNumber: receipt?.blockNumber ? Number(receipt.blockNumber) : null,
  };
}

// Chunked log retrieval to satisfy provider limits (e.g., 500-block windows, inclusive)
async function listTransfers(address, fromBlock, toBlock) {
  const token = getUsdcContract();
  const latest = await getProvider().getBlockNumber();
  const window = Math.max(100, Math.min(2000, Number(process.env.LOGS_BLOCK_WINDOW) || 500));

  // Ensure inclusive range size <= window, i.e., (end - start + 1) <= window
  let end = toBlock ?? latest;
  let start = fromBlock ?? Math.max(0, end - (window - 1));

  const results = [];
  const maxChunks = Number(process.env.LOGS_MAX_CHUNKS) || 5;
  let chunks = 0;

  while (chunks < maxChunks && end >= 0) {
    // Safety clamp in case inputs were provided
    if (end - start + 1 > window) {
      start = Math.max(0, end - (window - 1));
    }

    const filterIn = token.filters.Transfer(null, address);
    const filterOut = token.filters.Transfer(address, null);

    const [ins, outs] = await Promise.all([
      token.queryFilter(filterIn, start, end),
      token.queryFilter(filterOut, start, end),
    ]);

    for (const ev of [...ins, ...outs]) {
      results.push({
        blockNumber: Number(ev.blockNumber),
        txHash: String(ev.transactionHash),
        from: String(ev.args.from),
        to: String(ev.args.to),
        value: ev.args.value.toString(),
      });
    }

    // Prepare next chunk going backwards
    end = start - 1;
    if (end < 0) break;
    start = Math.max(0, end - (window - 1));
    chunks += 1;
  }

  results.sort((a, b) => a.blockNumber - b.blockNumber);
  return results;
}

async function getSignerUsdcBalance() {
  const addr = await getSignerAddress();
  const bal = await getUsdcBalance(addr);
  return { address: addr, ...bal };
}

async function getTxReceipt(txHash) {
  if (!txHash || !/^0x[0-9a-fA-F]{64}$/.test(txHash)) throw new Error('Invalid tx hash');
  const receipt = await getProvider().getTransactionReceipt(txHash);
  return receipt || null;
}

module.exports = {
  getProvider,
  getSigner,
  getSignerAddress,
  getUsdcContract,
  getUsdcBalance,
  sendUsdc,
  listTransfers,
  getSignerUsdcBalance,
  getTxReceipt,
};
