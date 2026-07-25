# Reliability Design: harness-contract-and-regression

## Inputs and Invariants

U3のNFR RequirementsとFunctional Designを入力とする。全harnessでdirective、state transition、audit semanticsを一致させる。

## Recovery Design

- expected grant invalidityはtyped fallback、3 audit delta 0、state bytes不変。
- Reservation Id当たりowner `HUMAN_TURN`、approval、completion、consumeを各1回に収束させる。
- append後crashはReservation Id exact audit lookup、approval後crashはowner approval prefix lookupで回復する。
- target/session/reservation不一致、複数一致、protocol failureはfail-closedで別candidateへ差し替えない。
- team/human pathのargv、locking、stdout/stderr、audit/state baselineを変更しない。

## Blocking End-to-end

全harnessでroute→revoke→typed fallback→同一session human prompt→target＋Reservation Id reportを実行し、ownerだけが1回完了、非owner/replay delta 0、quality再実行0を検証する。

## Verification Pipeline

canonical generation後、focused tests、team/human regression、全harness integration、typecheck、full tests、`dist:check`、`promote:self:check`、`git diff --check`を同じtreeで通す。
