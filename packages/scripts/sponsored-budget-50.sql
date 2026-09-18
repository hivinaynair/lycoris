-- Raise the sponsored demo budget from 10 to 50 purchases.
--
-- The cap lives in the function rather than a column because it is enforced
-- under the same advisory lock that serializes reservations: counting rows and
-- inserting one must be a single decision, or two instances both see nine.
--
-- CREATE OR REPLACE keeps the existing rows and the advisory-lock semantics; the
-- body below is `sponsored-checkout.sql`'s with one number changed, so the two
-- must be edited together.
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
  IF (SELECT count(*) FROM sponsored_checkout_payments WHERE sponsor = p_sponsor) >= 50 THEN
    RAISE EXCEPTION 'Sponsored demo budget exhausted';
  END IF;
  RETURN QUERY INSERT INTO sponsored_checkout_payments(id, sponsor, recipient)
    VALUES (p_id, p_sponsor, p_recipient) RETURNING *;
END;
$$;
