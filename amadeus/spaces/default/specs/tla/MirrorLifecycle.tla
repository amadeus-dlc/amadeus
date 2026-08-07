---- MODULE MirrorLifecycle ----
(***************************************************************************)
(* AsIntended variant of the GitHub mirror lifecycle (FD u7-mirror-model,  *)
(* T3). The state-dependent boundary->operation map of                     *)
(* amadeus-mirror-coordinator.ts:243 is applied to every non-manual,       *)
(* non-completion boundary, including intent-capture-approved.             *)
(*                                                                         *)
(* This is the variant registered in amadeus/spaces/default/specs/tla/model-map.json and the only *)
(* variant CI is required to keep green (BR-U7-5). Both invariants must    *)
(* hold under exhaustive exploration.                                      *)
(*                                                                         *)
(* Under this map, at intent-capture-approved with an Issue already open,  *)
(* operationForBoundary yields "sync" - which is not in that boundary's    *)
(* APPLICABLE_OPERATIONS (policy.ts:66), so decideMirrorAction:157         *)
(* suppresses it as "not-applicable" and no receipt is prepared. The       *)
(* boundary correctly becomes a no-op instead of opening a second Issue.   *)
(*                                                                         *)
(* All model text, guards, provenance and the reduction manifest live in   *)
(* MirrorLifecycleCore. This module only fixes the variant constant, so    *)
(* the two variants cannot drift apart.                                    *)
(***************************************************************************)

EXTENDS Naturals, FiniteSets

CONSTANT MaxReceipts

VARIABLES receipts, issueNumber, boundaryIdx

vars == <<receipts, issueNumber, boundaryIdx>>

Core == INSTANCE MirrorLifecycleCore
          WITH CaptureBoundaryAlwaysCreates <- FALSE

Init == Core!Init
Next == Core!Next
Spec == Init /\ [][Next]_vars

TypeOK                   == Core!TypeOK
NoCloseWithoutLandedSync == Core!NoCloseWithoutLandedSync
NoDuplicateCreate        == Core!NoDuplicateCreate
CloseUnreachable         == Core!CloseUnreachable

====
