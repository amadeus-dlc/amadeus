---- MODULE MirrorLifecycleAsImplemented ----
(***************************************************************************)
(* AsImplemented variant of the GitHub mirror lifecycle (FD                *)
(* u7-mirror-model, T3). Faithful map of                                   *)
(* amadeus-mirror-coordinator.ts:235:                                      *)
(*                                                                         *)
(*     if (context.boundary.kind === "intent-capture-approved")            *)
(*       return "create";                                                  *)
(*                                                                         *)
(* The boundary returns "create" without consulting state.issueNumber, so  *)
(* a workspace that already has an open mirror Issue prepares a second     *)
(* create receipt and opens a second Issue. That is Issue #1838.           *)
(*                                                                         *)
(* THIS VARIANT IS EXPECTED TO FAIL. Running it must produce a             *)
(* NoDuplicateCreate counterexample trace; that is the falling proof       *)
(* required by FR-C3 AC (ii). It is deliberately NOT registered in         *)
(* amadeus/spaces/default/specs/tla/model-map.json and is NOT part of any recurring CI job, so    *)
(* no scheduled job is permanently red                                     *)
(* (cid:code-generation:falling-proof-injection-one-set).                  *)
(*                                                                         *)
(* HISTORICAL NOTE. Issue #1876, already landed on origin/main, fixes      *)
(* coordinator:235. This module maps the defective implementation as it    *)
(* stood when #1838 was reported, and is kept as reproducible evidence     *)
(* that the model detects the defect class it was built for. It is         *)
(* deliberately not re-pointed at the fixed implementation - doing so      *)
(* would destroy the evidence and make the two variants identical.         *)
(***************************************************************************)

EXTENDS Naturals, FiniteSets

CONSTANT MaxReceipts

VARIABLES receipts, issueNumber, boundaryIdx

vars == <<receipts, issueNumber, boundaryIdx>>

Core == INSTANCE MirrorLifecycleCore
          WITH CaptureBoundaryAlwaysCreates <- TRUE

Init == Core!Init
Next == Core!Next
Spec == Init /\ [][Next]_vars

TypeOK                   == Core!TypeOK
NoCloseWithoutLandedSync == Core!NoCloseWithoutLandedSync
NoDuplicateCreate        == Core!NoDuplicateCreate

====
