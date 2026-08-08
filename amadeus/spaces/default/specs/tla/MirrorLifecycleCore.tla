---- MODULE MirrorLifecycleCore ----
(***************************************************************************)
(* Shared core of the GitHub mirror lifecycle model.                       *)
(*                                                                         *)
(* Two variants instantiate this core (FD u7-mirror-model, T3):            *)
(*                                                                         *)
(*   MirrorLifecycle.tla              AsIntended  - the state-dependent    *)
(*                                    boundary->operation map applied to   *)
(*                                    every non-manual boundary. This is   *)
(*                                    the variant registered in            *)
(*                                    amadeus/spaces/default/specs/tla/model-map.json and the     *)
(*                                    only variant CI keeps green.         *)
(*                                                                         *)
(*   MirrorLifecycleAsImplemented.tla AsImplemented - the faithful map of  *)
(*                                    amadeus-mirror-coordinator.ts:235,   *)
(*                                    which returns "create" for the       *)
(*                                    intent-capture-approved boundary     *)
(*                                    without consulting issueNumber. It   *)
(*                                    is expected to VIOLATE               *)
(*                                    NoDuplicateCreate; it is a one-off   *)
(*                                    falling proof, not a CI job.         *)
(*                                                                         *)
(* HISTORICAL NOTE. The worktree this model was written against predates   *)
(* the fix for that defect. Issue #1876 (already landed on origin/main)    *)
(* corrects coordinator:235. The AsImplemented variant is therefore a      *)
(* historical map of the defective implementation that produced #1838, and *)
(* is retained as reproducible evidence that the model detects the class   *)
(* of defect it was built to detect. It is deliberately NOT re-pointed at  *)
(* the fixed implementation.                                               *)
(***************************************************************************)

(***************************************************************************)
(* SOURCE OF TRUTH                                                         *)
(*                                                                         *)
(* Every guard below is a translation of a named predicate in the four     *)
(* pinned implementation files (FD ADR-4 / model-map entries). Line numbers *)
(* are resolved against the worktree section the model was authored on;    *)
(* the SHA pins in model-map.json are the machine-checked binding, and     *)
(* SOURCE_DRIFT is the mechanism that reports when they move.              *)
(*                                                                         *)
(*   packages/framework/core/tools/amadeus-mirror-state-reducer.ts         *)
(*     guardMarkAttempted        :691-695                                  *)
(*     guardClaimCreate          :697-701                                  *)
(*     guardRetryNoEffect        :703-707                                  *)
(*     guardObservedRetry        :709-713                                  *)
(*     reduceAbandon             :715-742                                  *)
(*     reduceComplete            :407-452                                  *)
(*     completedReceipt          :305-338                                  *)
(*     writeCompletedIssue       :341-384                                  *)
(*     reduceSkip                :454-500                                  *)
(*     reduceMarkPending         :550-574                                  *)
(*     reduceSafetyBlocked       :576-597                                  *)
(*     TERMINAL_STATUSES         :127-132                                  *)
(*     dispatch switches         :751-806                                  *)
(*                                                                         *)
(*   packages/framework/core/tools/amadeus-mirror-project-reconciliation-  *)
(*   reducer.ts                                                            *)
(*     guardProjectReconciliationReceipt :135-210                          *)
(*     verifiedReceipt                   :109-122                          *)
(*     reduceHoldForProjectSync          :~280-312                         *)
(*     reduceRetireProjectSyncHold       :317-378                          *)
(*                                                                         *)
(*   packages/framework/core/tools/amadeus-mirror-coordinator.ts           *)
(*     operationForBoundary      :230-244                                  *)
(*                                                                         *)
(*   packages/framework/core/tools/amadeus-mirror-types.ts                 *)
(*     MirrorOperation           :15                                       *)
(*     MirrorBoundary            :22-33                                    *)
(*     MirrorReceiptStatus       :66-73                                    *)
(*     MirrorMutationEffect      :75-78                                    *)
(*                                                                         *)
(*   packages/framework/core/tools/amadeus-mirror-policy.ts (reached       *)
(*   through the coordinator; not itself SHA-pinned)                       *)
(*     APPLICABLE_OPERATIONS     :59-71                                    *)
(*     IN_PROGRESS_STATUSES      :73-77                                    *)
(*     TERMINAL_BLOCK_STATUSES   :79-83                                    *)
(*     classifyReceipt           :114-124                                  *)
(*     decideMirrorAction        :157-159 (applicability suppression)      *)
(*     nextCompletionOperation   :385-407                                  *)
(***************************************************************************)

(***************************************************************************)
(* REDUCTION MANIFEST (BR-U7-2)                                            *)
(*                                                                         *)
(* A finite model only proves what its reductions preserve                 *)
(* (cid:application-design:finite-exploration-not-detected-proof). Every   *)
(* reduction applied here is declared, with the argument for why the two   *)
(* invariants below still range over the same abstract state space.        *)
(*                                                                         *)
(* R1. TRANSITIONS: 21 implemented -> 14 modelled.                         *)
(*     The reducer dispatches 21 transition kinds (11 in                   *)
(*     reduceReceiptTransition, 10 in reduceAuxTransition). The model      *)
(*     carries the 14 that can change a receipt `status` or the state      *)
(*     `issueNumber` - the only two fields the invariants read.            *)
(*                                                                         *)
(*     MODELLED (14):                                                      *)
(*       prepare, mark-attempted, claim-create-attempt,                    *)
(*       retry-after-no-effect, claim-observed-retry, complete,            *)
(*       complete-with-project-sync-hold, skip-for-event, mark-pending,    *)
(*       mark-safety-blocked, abandon-attempt,                             *)
(*       commit-project-reconciliation, hold-for-project-sync,             *)
(*       retire-project-sync-hold                                          *)
(*                                                                         *)
(*     EXCLUDED (7), each with its own argument:                           *)
(*       set-warning            writes only `warnings`; reads `status` as  *)
(*                              a guard, never assigns it.                 *)
(*       set-global-warning     writes only `warnings`.                    *)
(*       clear-global-warning   writes only `warnings`.                    *)
(*       set-expected-prompt    writes only `expectedPrompt`.              *)
(*       consume-expected-prompt deletes only `expectedPrompt`.            *)
(*       issue-repair-challenge writes only `repairChallenges`.            *)
(*       repair-link            NOT status-free: it assigns `issueNumber`  *)
(*                              (reducer :690). It is excluded on a        *)
(*                              different ground. Its transition type      *)
(*                              declares `issueNumber: number`             *)
(*                              (reducer :109), so it can only ever move   *)
(*                              issueNumber to a non-null value - never    *)
(*                              back to Null. In this model's abstract     *)
(*                              two-valued domain {Null, Issue1} its only  *)
(*                              effect is Null -> Issue1 or Issue1 ->      *)
(*                              Issue1, and Null -> Issue1 is already      *)
(*                              reachable through complete(create). It     *)
(*                              therefore adds no abstract state and can   *)
(*                              never re-enable a create. It is further    *)
(*                              gated behind an operator-issued repair     *)
(*                              challenge and plan digest, outside the     *)
(*                              boundary-driven lifecycle the invariants   *)
(*                              govern.                                    *)
(*                                                                         *)
(*     NOTE: the FD (business-logic-model.md T2) originally stated the      *)
(*     exclusion ground for all 7 as "does not change                      *)
(*     status/operation/issueNumber". That is accurate for 6 of them and   *)
(*     inaccurate for repair-link, which does assign issueNumber. The      *)
(*     modelled set of 14 is unchanged; only the stated ground was wrong.  *)
(*     The FD now carries the corrected argument above; this comment       *)
(*     remains the canonical statement of it.                              *)
(*                                                                         *)
(* R2. BOUNDARIES: 6 implemented -> 4 modelled (ADR-3).                    *)
(*     `parked` and `manual` are dropped. `manual` returns null from       *)
(*     operationForBoundary (coordinator :234) and so drives nothing.      *)
(*     `parked` has the same applicable-operation set as `phase-verified`  *)
(*     ({create, sync}) and the same state-dependent mapping, so it is a   *)
(*     duplicate of an already-modelled boundary shape.                    *)
(*                                                                         *)
(* R3. ISSUE NUMBERS: N -> {Null, Issue1}.                                 *)
(*     Both invariants ask only whether an Issue exists, never which one.  *)
(*                                                                         *)
(* R4. LIVE RECEIPTS: bounded by MaxReceipts (ADR-3: 3).                   *)
(*     Three is the exact number the close path needs (a create from an    *)
(*     earlier boundary, plus sync and close at workflow-completed), so    *)
(*     the bound does not make the close-side invariant vacuous. Vacuity   *)
(*     is checked separately: see MirrorLifecycleVacuity.cfg, whose        *)
(*     CloseUnreachable invariant is REQUIRED to be violated.              *)
(*                                                                         *)
(* R5. CURRENT-BOUNDARY TRANSITIONS.                                       *)
(*     Receipt transitions fire only on receipts whose boundary is the     *)
(*     current one. The coordinator drives one boundary per invocation and *)
(*     never resumes a past boundary's operation, so receipts left behind  *)
(*     by an earlier boundary are frozen. Cross-boundary completion        *)
(*     reconciliation (coordinator :669, selectCompletionSyncReconciliation)*)
(*     is OUT OF SCOPE for this first model and is the first candidate for *)
(*     a follow-up revision.                                               *)
(*                                                                         *)
(* R6. TIMESTAMPS, OPERATION IDS, DIGESTS, WARNINGS, PROVENANCE.           *)
(*     Dropped. They make replay idempotent and bind repair plans; they    *)
(*     never widen the reachable {status, issueNumber} space, they only    *)
(*     narrow it by rejecting mismatched transitions. Dropping them is an  *)
(*     over-approximation: the model admits at least every behaviour the   *)
(*     implementation admits, so a proved invariant stays proved.          *)
(***************************************************************************)

EXTENDS Naturals, FiniteSets

CONSTANTS
    MaxReceipts,
    (* TRUE reproduces coordinator:235 (the #1838 defect). FALSE applies   *)
    (* the state-dependent map of coordinator:243 to every non-manual,     *)
    (* non-completion boundary.                                            *)
    CaptureBoundaryAlwaysCreates

----------------------------------------------------------------------------
(* Domains. amadeus-mirror-types.ts :15, :22-33, :66-78.                   *)

Null   == "NULL"
Issue1 == "ISSUE1"
IssueNumbers == {Null, Issue1}

Operations == {"create", "sync", "close"}

IntentInitialized == "intent-initialized"
CaptureApproved   == "intent-capture-approved"
PhaseVerified     == "phase-verified"
WorkflowCompleted == "workflow-completed"

BoundarySet == {IntentInitialized, CaptureApproved, PhaseVerified, WorkflowCompleted}
NumBoundaries == 4

BoundaryAt(i) ==
  CASE i = 1 -> IntentInitialized
    [] i = 2 -> CaptureApproved
    [] i = 3 -> PhaseVerified
    [] OTHER -> WorkflowCompleted

(* MirrorReceiptStatus, types.ts :66-73. *)
Statuses == {"prepared", "attempted", "succeeded", "skipped-for-event",
             "pending", "safety-blocked", "abandoned"}

(* policy.ts :73-77. *)
InProgressStatuses == {"prepared", "attempted", "pending"}
(* policy.ts :79-83. *)
TerminalBlockStatuses == {"skipped-for-event", "safety-blocked", "abandoned"}
(* reducer.ts :127-132. *)
TerminalStatuses == {"succeeded", "skipped-for-event", "safety-blocked", "abandoned"}

(* MirrorMutationEffect, types.ts :75-78, plus "none" for an absent lastEffect. *)
Effects == {"none", "not-started", "no-effect-confirmed", "outcome-unknown"}

(* APPLICABLE_OPERATIONS, policy.ts :59-71. Consumed by decideMirrorAction  *)
(* :157-159, which suppresses a non-applicable operation as                *)
(* "not-applicable" - so no receipt is prepared for it.                    *)
ApplicableOps(b) ==
  CASE b = IntentInitialized -> {"create", "sync"}
    [] b = CaptureApproved   -> {"create"}
    [] b = PhaseVerified     -> {"create", "sync"}
    [] OTHER                 -> {"create", "sync", "close"}

EventKeys == { <<b, o>> \in BoundarySet \X Operations : o \in ApplicableOps(b) }

(* A receipt slot. `syncLanded` is a model-only witness recorded when a     *)
(* close receipt is prepared; see NoCloseWithoutLandedSync.                *)
NoReceipt == [used |-> FALSE, status |-> "prepared", effect |-> "none",
              hold |-> FALSE, verified |-> FALSE, syncLanded |-> FALSE]

ReceiptRecs == [used: BOOLEAN, status: Statuses, effect: Effects,
                hold: BOOLEAN, verified: BOOLEAN, syncLanded: BOOLEAN]

----------------------------------------------------------------------------

VARIABLES
    receipts,      \* [EventKeys -> ReceiptRecs]
    issueNumber,   \* IssueNumbers
    boundaryIdx    \* 1..NumBoundaries

vars == <<receipts, issueNumber, boundaryIdx>>

CurrentBoundary == BoundaryAt(boundaryIdx)

Used(b, o)   == <<b, o>> \in EventKeys /\ receipts[<<b, o>>].used
Rec(b, o)    == receipts[<<b, o>>]
UsedKeys     == {k \in EventKeys : receipts[k].used}
UsedCount    == Cardinality(UsedKeys)

(* classifyReceipt, policy.ts :114-124. *)
Classify(b, o) ==
  IF ~Used(b, o) THEN "none"
  ELSE IF Rec(b, o).status = "succeeded" THEN "succeeded"
  ELSE IF Rec(b, o).status \in InProgressStatuses THEN "in-progress"
  ELSE "terminal-block"

(* nextCompletionOperation, policy.ts :385-407. *)
NextCompletionOperation(b) ==
  LET create == Classify(b, "create")
      sync   == Classify(b, "sync")
      close  == Classify(b, "close")
      issueExists == (issueNumber /= Null) \/ (create = "succeeded")
  IN  IF create = "in-progress"    THEN "create"
      ELSE IF create = "terminal-block" THEN "none"
      ELSE IF ~issueExists         THEN "create"
      ELSE IF sync = "in-progress" THEN "sync"
      ELSE IF sync = "terminal-block" THEN "none"
      ELSE IF sync /= "succeeded"  THEN "sync"
      ELSE IF close = "in-progress" THEN "close"
      ELSE IF close = "terminal-block" \/ close = "succeeded" THEN "none"
      ELSE "close"

(* operationForBoundary, coordinator.ts :230-244. The `manual` arm (:234,  *)
(* returns null) is absent because `manual` is outside the modelled        *)
(* boundary set (R2).                                                      *)
OperationForBoundary(b) ==
  IF b = WorkflowCompleted THEN NextCompletionOperation(b)
  ELSE IF CaptureBoundaryAlwaysCreates /\ b = CaptureApproved
       THEN "create"                                   \* coordinator :235
       ELSE IF issueNumber = Null THEN "create" ELSE "sync"  \* coordinator :243

----------------------------------------------------------------------------
(* Initial state. No receipts, no Issue, workflow at its first boundary.   *)

Init ==
  /\ receipts = [k \in EventKeys |-> NoReceipt]
  /\ issueNumber = Null
  /\ boundaryIdx = 1

SetRec(k, r) == [receipts EXCEPT ![k] = r]

----------------------------------------------------------------------------
(* Boundary progression. The workflow advances through boundaries in       *)
(* order; each may be driven any number of times before advancing.         *)

AdvanceBoundary ==
  /\ boundaryIdx < NumBoundaries
  /\ boundaryIdx' = boundaryIdx + 1
  /\ UNCHANGED <<receipts, issueNumber>>

----------------------------------------------------------------------------
(* 1. prepare - reducer reducePrepare :205-264, reached through            *)
(*    decideMirrorAction :157-165 and operationForBoundary.                *)
(*                                                                         *)
(*    A prepare on an already-used key returns `unchanged` (:221), so only *)
(*    the fresh-key case is a state change. The applicability gate (:157)  *)
(*    and the skipped-for-event suppression (:162) are both preconditions  *)
(*    of ever reaching the reducer.                                        *)

DriveEnabled ==
  LET b  == CurrentBoundary
      op == OperationForBoundary(b)
  IN  /\ op \in Operations
      /\ op \in ApplicableOps(b)          \* decideMirrorAction :157
      /\ ~Used(b, op)                     \* else reducePrepare :221 unchanged
      /\ UsedCount < MaxReceipts          \* R4 finiteness bound

DriveBoundary ==
  LET b  == CurrentBoundary
      op == OperationForBoundary(b)
  IN  /\ DriveEnabled
      /\ receipts' = SetRec(<<b, op>>,
           [used |-> TRUE, status |-> "prepared", effect |-> "none",
            hold |-> FALSE, verified |-> FALSE,
            (* Witness for NoCloseWithoutLandedSync: was the sync receipt  *)
            (* at this boundary already succeeded when close was enabled?  *)
            syncLanded |-> (op = "close" /\ Classify(b, "sync") = "succeeded")])
      /\ UNCHANGED <<issueNumber, boundaryIdx>>

----------------------------------------------------------------------------
(* Receipt transitions. Per R5 each fires only on the current boundary.    *)

(* 2. mark-attempted - guardMarkAttempted, reducer :691-695.               *)
MarkAttempted(o) ==
  LET b == CurrentBoundary
      k == <<b, o>>
  IN  /\ k \in EventKeys
      /\ Used(b, o)
      /\ Rec(b, o).status = "prepared"     \* "attempted" -> unchanged (:278)
      /\ receipts' = SetRec(k, [Rec(b, o) EXCEPT !.status = "attempted"])
      /\ UNCHANGED <<issueNumber, boundaryIdx>>

(* 3. claim-create-attempt - guardClaimCreate, reducer :697-701. Requires  *)
(*    a createIdentity, which only a create receipt carries (:235-243).    *)
ClaimCreateAttempt ==
  LET b == CurrentBoundary
      k == <<b, "create">>
  IN  /\ k \in EventKeys
      /\ Used(b, "create")
      /\ Rec(b, "create").status = "prepared"
      /\ receipts' = SetRec(k, [Rec(b, "create") EXCEPT !.status = "attempted"])
      /\ UNCHANGED <<issueNumber, boundaryIdx>>

(* 4. retry-after-no-effect - guardRetryNoEffect, reducer :703-707.        *)
(*    `attempt(.., clearEffectAndWarnings = TRUE)` drops lastEffect :290.  *)
RetryAfterNoEffect(o) ==
  LET b == CurrentBoundary
      k == <<b, o>>
  IN  /\ k \in EventKeys
      /\ Used(b, o)
      /\ Rec(b, o).status = "pending"
      /\ Rec(b, o).effect = "no-effect-confirmed"
      /\ receipts' = SetRec(k,
           [Rec(b, o) EXCEPT !.status = "attempted", !.effect = "none"])
      /\ UNCHANGED <<issueNumber, boundaryIdx>>

(* 5. claim-observed-retry - guardObservedRetry, reducer :709-713.         *)
ClaimObservedRetry(o) ==
  LET b == CurrentBoundary
      k == <<b, o>>
  IN  /\ k \in EventKeys
      /\ Used(b, o)
      /\ Rec(b, o).status = "pending"
      /\ Rec(b, o).effect = "outcome-unknown"
      /\ receipts' = SetRec(k,
           [Rec(b, o) EXCEPT !.status = "attempted", !.effect = "none"])
      /\ UNCHANGED <<issueNumber, boundaryIdx>>

(* 6. complete - reduceComplete :407-452 + completedReceipt :305-321 +     *)
(*    writeCompletedIssue :341-384.                                        *)
(*                                                                         *)
(*    Status guard :424. projectSyncVerified rules :426-441: verified=TRUE *)
(*    requires a non-close receipt holding a Project sync hold, and a held *)
(*    receipt may only be completed with verified=TRUE.                    *)
(*    writeCompletedIssue :353-375: completing a create assigns            *)
(*    issueNumber; sync/close leave it unchanged (:378-383).               *)
Complete(o) ==
  LET b == CurrentBoundary
      k == <<b, o>>
      r == Rec(b, o)
  IN  /\ k \in EventKeys
      /\ Used(b, o)
      /\ r.status \in {"attempted", "pending"}
      /\ receipts' = SetRec(k,
           [r EXCEPT !.status = "succeeded",
                     !.hold = FALSE,
                     !.verified = r.hold,   \* held => verified (:426-441)
                     !.effect = "none"])
      /\ IF o = "create"
           THEN issueNumber' = Issue1
           ELSE /\ UNCHANGED issueNumber
                (* sync/close completion must match the linked Issue :378 *)
      /\ UNCHANGED boundaryIdx

(* 7. complete-with-project-sync-hold - reduceComplete :415-421 rejects    *)
(*    close; completedReceipt :325-337 parks the receipt at `pending` with *)
(*    a hold and clears failureClass / lastEffect / projectSyncVerified.   *)
(*    It still runs through writeCompletedIssue, so a create assigns       *)
(*    issueNumber here too.                                                *)
CompleteWithProjectSyncHold(o) ==
  LET b == CurrentBoundary
      k == <<b, o>>
      r == Rec(b, o)
  IN  /\ k \in EventKeys
      /\ o /= "close"                      \* reducer :415-421
      /\ Used(b, o)
      /\ r.status \in {"attempted", "pending"}
      /\ ~r.hold                           \* replayedCompletion :456-464
      /\ receipts' = SetRec(k,
           [r EXCEPT !.status = "pending", !.hold = TRUE,
                     !.verified = FALSE, !.effect = "none"])
      /\ IF o = "create" THEN issueNumber' = Issue1 ELSE UNCHANGED issueNumber
      /\ UNCHANGED boundaryIdx

(* 8. skip-for-event - reduceSkip :454-500. Rejected on a terminal receipt *)
(*    (:471).                                                              *)
SkipForEvent(o) ==
  LET b == CurrentBoundary
      k == <<b, o>>
      r == Rec(b, o)
  IN  /\ k \in EventKeys
      /\ Used(b, o)
      /\ r.status \notin TerminalStatuses
      /\ receipts' = SetRec(k, [r EXCEPT !.status = "skipped-for-event"])
      /\ UNCHANGED <<issueNumber, boundaryIdx>>

(* 9. mark-pending - reduceMarkPending :550-574. Only from "attempted"     *)
(*    (:557); records the mutation effect.                                 *)
MarkPending(o, e) ==
  LET b == CurrentBoundary
      k == <<b, o>>
      r == Rec(b, o)
  IN  /\ k \in EventKeys
      /\ Used(b, o)
      /\ r.status = "attempted"
      /\ receipts' = SetRec(k, [r EXCEPT !.status = "pending", !.effect = e])
      /\ UNCHANGED <<issueNumber, boundaryIdx>>

(* 10. mark-safety-blocked - reduceSafetyBlocked :576-597. Rejected on a   *)
(*     terminal receipt (:583).                                            *)
MarkSafetyBlocked(o) ==
  LET b == CurrentBoundary
      k == <<b, o>>
      r == Rec(b, o)
  IN  /\ k \in EventKeys
      /\ Used(b, o)
      /\ r.status \notin TerminalStatuses
      /\ receipts' = SetRec(k, [r EXCEPT !.status = "safety-blocked"])
      /\ UNCHANGED <<issueNumber, boundaryIdx>>

(* 11. abandon-attempt - reduceAbandon :715-742. Rejects a succeeded       *)
(*     receipt (:724) and any terminal receipt (:726).                     *)
AbandonAttempt(o) ==
  LET b == CurrentBoundary
      k == <<b, o>>
      r == Rec(b, o)
  IN  /\ k \in EventKeys
      /\ Used(b, o)
      /\ r.status /= "succeeded"
      /\ r.status \notin TerminalStatuses
      /\ receipts' = SetRec(k, [r EXCEPT !.status = "abandoned"])
      /\ UNCHANGED <<issueNumber, boundaryIdx>>

----------------------------------------------------------------------------
(* ProjectSyncTransition - amadeus-mirror-project-reconciliation-reducer.  *)
(* These three change `status` and so are inside the modelled set (R1).    *)

(* 12. commit-project-reconciliation - guardProjectReconciliationReceipt   *)
(*     :135-210 (close rejected :149; requires pending + hold :190-199) +  *)
(*     verifiedReceipt :109-122 (succeeded + projectSyncVerified).         *)
CommitProjectReconciliation(o) ==
  LET b == CurrentBoundary
      k == <<b, o>>
      r == Rec(b, o)
  IN  /\ k \in EventKeys
      /\ o /= "close"
      /\ Used(b, o)
      /\ r.status = "pending"
      /\ r.hold
      /\ receipts' = SetRec(k,
           [r EXCEPT !.status = "succeeded", !.hold = FALSE,
                     !.verified = TRUE, !.effect = "none"])
      /\ UNCHANGED <<issueNumber, boundaryIdx>>

(* 13. hold-for-project-sync - reduceHoldForProjectSync. Only from         *)
(*     "succeeded"; parks at pending with a hold and clears the verified   *)
(*     marker.                                                             *)
HoldForProjectSync(o) ==
  LET b == CurrentBoundary
      k == <<b, o>>
      r == Rec(b, o)
  IN  /\ k \in EventKeys
      /\ o /= "close"
      /\ Used(b, o)
      /\ r.status = "succeeded"
      /\ receipts' = SetRec(k,
           [r EXCEPT !.status = "pending", !.hold = TRUE, !.verified = FALSE])
      /\ UNCHANGED <<issueNumber, boundaryIdx>>

(* 14. retire-project-sync-hold - reduceRetireProjectSyncHold :317-378.    *)
(*     Close rejected (:325); requires pending + hold (:344-351). Returns  *)
(*     the receipt to "succeeded" WITHOUT claiming convergence, so the     *)
(*     verified marker is dropped (:369). Per the implementation comment   *)
(*     at :313-316 this is the path that retires the barrier without any   *)
(*     claim that this receipt's Project query converged - which is the    *)
(*     enable condition NoCloseWithoutLandedSync exists to police.         *)
RetireProjectSyncHold(o) ==
  LET b == CurrentBoundary
      k == <<b, o>>
      r == Rec(b, o)
  IN  /\ k \in EventKeys
      /\ o /= "close"
      /\ Used(b, o)
      /\ r.status = "pending"
      /\ r.hold
      /\ receipts' = SetRec(k,
           [r EXCEPT !.status = "succeeded", !.hold = FALSE, !.verified = FALSE])
      /\ UNCHANGED <<issueNumber, boundaryIdx>>

----------------------------------------------------------------------------

NonCloseOps == {"create", "sync"}

(***************************************************************************)
(* Terminal stuttering, following the sibling FormalElection spec's idiom  *)
(* (amadeus/spaces/default/specs/tla/FormalElection.tla, Terminal / TerminalStutter).             *)
(*                                                                         *)
(* The workflow genuinely ends: at the last boundary, once every receipt   *)
(* there has reached a terminal status and the completion policy yields no *)
(* further operation, nothing more can happen. Without an explicit         *)
(* stutter TLC reports that legitimate end state as a deadlock.            *)
(*                                                                         *)
(* Terminal is stated as an explicit predicate rather than by disabling    *)
(* deadlock checking, so TLC still reports any state that is stuck for     *)
(* some other, unintended reason.                                          *)
(*                                                                         *)
(* Receipts stranded at an earlier boundary are excluded: they are frozen  *)
(* by construction (R5) and are never resumed.                             *)
(***************************************************************************)
Terminal ==
  /\ boundaryIdx = NumBoundaries
  /\ ~DriveEnabled
  /\ \A o \in Operations :
       (<<CurrentBoundary, o>> \in EventKeys /\ Used(CurrentBoundary, o))
         => Rec(CurrentBoundary, o).status \in TerminalStatuses

TerminalStutter ==
  /\ Terminal
  /\ UNCHANGED vars

Next ==
  \/ AdvanceBoundary
  \/ DriveBoundary
  \/ TerminalStutter
  \/ \E o \in Operations :
       \/ MarkAttempted(o)
       \/ RetryAfterNoEffect(o)
       \/ ClaimObservedRetry(o)
       \/ Complete(o)
       \/ SkipForEvent(o)
       \/ MarkSafetyBlocked(o)
       \/ AbandonAttempt(o)
  \/ \E o \in Operations, e \in Effects \ {"none"} : MarkPending(o, e)
  \/ ClaimCreateAttempt
  \/ \E o \in NonCloseOps :
       \/ CompleteWithProjectSyncHold(o)
       \/ CommitProjectReconciliation(o)
       \/ HoldForProjectSync(o)
       \/ RetireProjectSyncHold(o)

Spec == Init /\ [][Next]_vars

----------------------------------------------------------------------------
(* Invariants (FD T4). Provenance is burned in per BR-U7-6 / FR-C2.       *)

TypeOK ==
  /\ receipts \in [EventKeys -> ReceiptRecs]
  /\ issueNumber \in IssueNumbers
  /\ boundaryIdx \in 1..NumBoundaries
  /\ UsedCount <= MaxReceipts

(*************************************************************************)
(* NoCloseWithoutLandedSync                                              *)
(*                                                                       *)
(* Provenance: Issues #1816 and #1607 - the close-after-landing class.   *)
(* A mirror Issue must never be closed on the strength of a sync that    *)
(* has not landed. In the implementation the guarantee is positional:    *)
(* nextCompletionOperation (policy :398-406) only reaches its `close`    *)
(* arm after the sync receipt classifies as "succeeded".                 *)
(*                                                                       *)
(* Stated over the enable condition rather than over the current state,  *)
(* because that is what the implementation guarantees: close is enabled  *)
(* only while sync has landed. `syncLanded` is the witness recorded in   *)
(* DriveBoundary at the instant the close receipt is prepared. A         *)
(* mapping that returned "close" without consulting the sync receipt     *)
(* would record FALSE and be caught here.                                *)
(*************************************************************************)
NoCloseWithoutLandedSync ==
  \A k \in EventKeys :
    (k[2] = "close" /\ receipts[k].used) => receipts[k].syncLanded

(*************************************************************************)
(* NoDuplicateCreate                                                     *)
(*                                                                       *)
(* Provenance: Issue #1838, coordinator :235 - the intent-capture-       *)
(* approved boundary returns "create" without reading issueNumber, so a  *)
(* workspace that already had an Issue got a second one.                 *)
(*                                                                       *)
(* Once an Issue exists, no create receipt at the boundary currently     *)
(* being driven may sit in a pre-completion state: such a receipt is     *)
(* exactly the one that would go on to open a second Issue. A create     *)
(* that already succeeded is the one that made the Issue, and a create   *)
(* abandoned or blocked earlier is inert, so both are permitted.         *)
(*                                                                       *)
(* Restricted to the boundary being driven because receipts stranded by  *)
(* an earlier boundary are frozen (R5) and are never resumed - the       *)
(* partial-failure convergence the coordinator relies on (policy :62-64) *)
(* deliberately leaves them behind.                                      *)
(*************************************************************************)
NoDuplicateCreate ==
  issueNumber /= Null =>
    \A b \in BoundarySet :
      (b = CurrentBoundary /\ Used(b, "create"))
        => Rec(b, "create").status \notin {"prepared", "attempted"}

(*************************************************************************)
(* Vacuity guard (cid:code-generation:vocabulary-collision-vacuity-guard).*)
(* Checked ONLY by MirrorLifecycleVacuity.cfg, where a violation is the   *)
(* required outcome: it proves the close path is reachable inside the     *)
(* MaxReceipts bound, so NoCloseWithoutLandedSync is not vacuously true.  *)
(*************************************************************************)
CloseUnreachable ==
  \A k \in EventKeys : k[2] = "close" => ~receipts[k].used

====
