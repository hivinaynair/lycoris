-- A sponsored purchase is now two on-chain events: the faucet transfer that funds
-- the burner, and the user operation that pays the merchant. One column cannot
-- name both.

-- RENAME COLUMN has no IF EXISTS form, so a second run would fail on a column
-- that is already renamed. Rename only while the old name is still there.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sponsored_checkout_payments' AND column_name = 'tx_hash'
  ) THEN
    ALTER TABLE sponsored_checkout_payments
      RENAME COLUMN tx_hash TO funding_tx_hash;
  END IF;
END $$;

ALTER TABLE sponsored_checkout_payments
  ADD COLUMN IF NOT EXISTS user_op_hash text,
  ADD COLUMN IF NOT EXISTS payer text;
