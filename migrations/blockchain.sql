-- Blockchain Integration Migration
-- Add blockchain-related columns to existing tables

-- Add blockchain address to wallets table
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS blockchain_address VARCHAR(42);
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS private_key_encrypted TEXT;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS mnemonic_encrypted TEXT;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS blockchain_balance DECIMAL(18,6) DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS last_blockchain_sync TIMESTAMP;

-- Update transactions table for blockchain support
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS blockchain_tx_hash VARCHAR(66);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS blockchain_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS gas_fee DECIMAL(18,6);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS block_number BIGINT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS confirmations INTEGER DEFAULT 0;

-- Add new transaction types for blockchain operations
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'blockchain_deposit', 'blockchain_withdrawal', 'blockchain_transfer'));

-- Add new status types for blockchain transactions
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_status_check 
CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'blockchain_pending', 'blockchain_confirmed', 'blockchain_failed'));

-- Create blockchain_transactions table for detailed blockchain tracking
CREATE TABLE IF NOT EXISTS blockchain_transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE CASCADE,
  tx_hash VARCHAR(66) UNIQUE NOT NULL,
  from_address VARCHAR(42) NOT NULL,
  to_address VARCHAR(42) NOT NULL,
  amount DECIMAL(18,6) NOT NULL,
  gas_price DECIMAL(18,6),
  gas_used BIGINT,
  gas_fee DECIMAL(18,6),
  block_number BIGINT,
  confirmations INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  network VARCHAR(20) DEFAULT 'ethereum',
  created_at TIMESTAMP DEFAULT now(),
  confirmed_at TIMESTAMP
);

-- Create wallet_addresses table for managing multiple addresses per user
CREATE TABLE IF NOT EXISTS wallet_addresses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id INTEGER NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  address VARCHAR(42) UNIQUE NOT NULL,
  private_key_encrypted TEXT NOT NULL,
  address_type VARCHAR(20) DEFAULT 'deposit',
  is_active BOOLEAN DEFAULT true,
  balance DECIMAL(18,6) DEFAULT 0,
  last_synced TIMESTAMP,
  created_at TIMESTAMP DEFAULT now()
);

-- Create gas_fee_estimates table for tracking gas costs
CREATE TABLE IF NOT EXISTS gas_fee_estimates (
  id SERIAL PRIMARY KEY,
  network VARCHAR(20) NOT NULL,
  gas_price_gwei DECIMAL(10,2) NOT NULL,
  fast_gas_price DECIMAL(10,2),
  standard_gas_price DECIMAL(10,2),
  safe_gas_price DECIMAL(10,2),
  estimated_cost_usd DECIMAL(10,6),
  created_at TIMESTAMP DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_wallets_blockchain_address ON wallets(blockchain_address);
CREATE INDEX IF NOT EXISTS idx_transactions_blockchain_tx_hash ON transactions(blockchain_tx_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_tx_hash ON blockchain_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_user_id ON blockchain_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_transactions_status ON blockchain_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_addresses_user_id ON wallet_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_addresses_address ON wallet_addresses(address);

-- Add constraints
ALTER TABLE wallet_addresses ADD CONSTRAINT wallet_addresses_address_type_check 
CHECK (address_type IN ('deposit', 'withdrawal', 'primary'));

ALTER TABLE blockchain_transactions ADD CONSTRAINT blockchain_transactions_status_check 
CHECK (status IN ('pending', 'confirmed', 'failed', 'cancelled'));

ALTER TABLE blockchain_transactions ADD CONSTRAINT blockchain_transactions_network_check 
CHECK (network IN ('ethereum', 'polygon', 'testnet'));

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'Blockchain integration migration completed successfully!';
    RAISE NOTICE 'Added blockchain support to wallets and transactions tables';
    RAISE NOTICE 'Created new tables: blockchain_transactions, wallet_addresses, gas_fee_estimates';
    RAISE NOTICE 'Added performance indexes for blockchain operations';
END $$;
