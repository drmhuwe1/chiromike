export function claimBalance(claim) {
  return Math.max(
    0,
    (claim?.total_charge || 0) -
      (claim?.amount_paid || 0) -
      (claim?.written_off_amount || 0),
  );
}
