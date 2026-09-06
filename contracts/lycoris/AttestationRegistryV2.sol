// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title AttestationRegistryV2
/// @notice Publishes a commitment to a compliance decision. The decision record and its salt live
/// off chain; holders of both can verify against `commitment`.
///
/// A commitment is a hash of the decision record plus a random salt. Publishing it proves two
/// things at once: that a decision existed, and that it existed *at this moment* — the block
/// timestamp is the notary. It reveals nothing about the decision. Anyone later handed the record
/// and the salt can hash them and check they match what is on chain, which makes the record
/// tamper-evident without ever having been public. The salt is what stops an observer from simply
/// guessing a record and hashing it to confirm.
///
/// V1 of this contract put the payer, the payment hash, the amount and the identity status directly
/// in the event, which meant the whole compliance book was readable by anyone. This version
/// deliberately omits all of it.
///
/// Note the limit: the USDC transfer itself is still public. This hides the compliance book, not
/// the payment — and it hides it from observers, not from the facilitator, who holds the record.
/// See docs/plans/2026-08-16-privacy-primitive.md.
///
/// Not on the Foundry `src` path — built by `bun lycoris:compile-contracts` and deployed by
/// `bun lycoris:deploy-contracts`, both in `packages/scripts`.
contract AttestationRegistryV2 {
    /// @notice A decision was made and committed to. `commitment` is indexed so a viewer can look
    /// up one specific decision without scanning the chain.
    event AttestedCommitment(bytes32 indexed commitment, uint64 timestamp);

    /// @notice Record a decision. The event log is the entire storage — writing to a log is far
    /// cheaper than contract storage, and nothing on chain ever needs to read this back.
    /// @param commitment Hash of the off-chain decision record and its salt.
    function attest(bytes32 commitment) external {
        emit AttestedCommitment(commitment, uint64(block.timestamp));
    }
}
