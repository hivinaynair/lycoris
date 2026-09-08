CREATE TABLE IF NOT EXISTS sponsored_checkout_payments (
  id uuid PRIMARY KEY,
  sponsor text NOT NULL,
  recipient text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  tx_hash text
);

-- Serialize budget reservations across server instances. Failures retain their slot:
-- an uncertain submission must never free budget for another payment.
CREATE OR REPLACE FUNCTION reserve_sponsored_checkout(p_id uuid, p_sponsor text, p_recipient text)
RETURNS SETOF sponsored_checkout_payments LANGUAGE plpgsql AS $$
DECLARE existing sponsored_checkout_payments;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_sponsor, 0));
  SELECT * INTO existing FROM sponsored_checkout_payments WHERE id = p_id;
  IF FOUND THEN
    IF existing.sponsor <> p_sponsor OR existing.recipient <> p_recipient THEN
      RAISE EXCEPTION 'Purchase configuration changed';
    END IF;
    RETURN NEXT existing;
    RETURN;
  END IF;
  IF (SELECT count(*) FROM sponsored_checkout_payments WHERE sponsor = p_sponsor) >= 10 THEN
    RAISE EXCEPTION 'Sponsored demo budget exhausted';
  END IF;
  RETURN QUERY INSERT INTO sponsored_checkout_payments(id, sponsor, recipient)
    VALUES (p_id, p_sponsor, p_recipient) RETURNING *;
END;
$$;
