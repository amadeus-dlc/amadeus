---- MODULE FormalElection ----
EXTENDS Naturals, Sequences, FiniteSets, TLC

CONSTANTS V1, V2, V3, C1, C2, C3
Voters == {V1, V2, V3}
Choices == {C1, C2, C3}
Symmetry == {
  [x \in Voters \cup Choices |-> IF x \in Voters THEN pv[x] ELSE pc[x]] :
    pv \in Permutations(Voters), pc \in Permutations(Choices)
}
ChoiceInputs == Choices \cup {"UNKNOWN_CHOICE"}
SubmittedAt == {"T0", "T1", "T2"}
SubmittedInputs == SubmittedAt \cup {"INVALID_FORMAT", "INVALID_DATE"}
InvalidSubmitted == SubmittedInputs \ SubmittedAt
ReceivedAt == {"T0", "T1", "T2"}
GoA == 1..8
GoARepresentatives == {1, 4, 5, 7, 8}
LateGoARepresentatives == {1, 8}
OriginalSubmittedRepresentative == "T1"
TallyReceivedRepresentative == "T1"
UnknownRef == "UNKNOWN_REF"
NoBallot == [choice |-> "NONE", submittedAt |-> "T0", goaClass |-> "EXCLUDED", arrivalSeq |-> 0]
GoAClasses == {"FAVOR", "EXCLUDED", "DISCUSS", "AGAINST", "BLOCK"}
HoldReasons == {"BLOCK", "DISCUSSION_NEEDED", "QUORUM_SHORT", "TIE"}
Ballots == [choice: Choices, submittedAt: SubmittedAt, goaClass: GoAClasses, arrivalSeq: 1..6]

GoAClass(g) ==
  CASE g \in {1, 2, 3, 6} -> "FAVOR"
    [] g = 4 -> "EXCLUDED"
    [] g = 5 -> "DISCUSS"
    [] g = 7 -> "AGAINST"
    [] OTHER -> "BLOCK"

SubmittedRank(s) == CASE s = "T0" -> 0 [] s = "T1" -> 1 [] OTHER -> 2
Later(a, b) ==
  \/ SubmittedRank(a.submittedAt) > SubmittedRank(b.submittedAt)
  \/ /\ a.submittedAt = b.submittedAt
     /\ a.arrivalSeq > b.arrivalSeq
Resolve(prior, ballot) == IF prior = NoBallot \/ Later(ballot, prior) THEN ballot ELSE prior
ResolvedVoters(r) == {v \in Voters : r[v] /= NoBallot}
ResolvedSet(r) == {r[v] : v \in ResolvedVoters(r)}
EligibleSet(r) == {b \in ResolvedSet(r) : b.goaClass /= "EXCLUDED"}
ChoiceCount(r, c) == Cardinality({b \in EligibleSet(r) : b.choice = c})
Counts(r) == [c \in Choices |-> ChoiceCount(r, c)]
BlockCount(r) == Cardinality({b \in ResolvedSet(r) : b.goaClass = "BLOCK"})
DiscussCount(r) == Cardinality({b \in ResolvedSet(r) : b.goaClass = "DISCUSS"})
FavorCount(r) == Cardinality({b \in ResolvedSet(r) : b.goaClass = "FAVOR"})
AgainstCount(r) == Cardinality({b \in ResolvedSet(r) : b.goaClass \in {"AGAINST", "BLOCK"}})
TopChoices(r) == {c \in Choices : \A other \in Choices: ChoiceCount(r, c) >= ChoiceCount(r, other)}
UniqueWinner(r) == IF Cardinality(TopChoices(r)) = 1 THEN CHOOSE c \in TopChoices(r): TRUE ELSE "NONE"
HoldReason(r) ==
  IF BlockCount(r) >= 1 THEN "BLOCK"
  ELSE IF DiscussCount(r) >= 2 THEN "DISCUSSION_NEEDED"
  ELSE IF FavorCount(r) + AgainstCount(r) = 0 THEN "QUORUM_SHORT"
  ELSE IF Cardinality(TopChoices(r)) /= 1 THEN "TIE"
  ELSE "NONE"
TallyKind(r) == IF HoldReason(r) = "NONE" THEN "ESTABLISHED" ELSE "HOLD"
ReceiptWinner(r) == IF TallyKind(r) = "ESTABLISHED" THEN UniqueWinner(r) ELSE "NONE"
EligibleMap(r) == [v \in Voters |-> IF r[v] /= NoBallot /\ r[v].goaClass /= "EXCLUDED" THEN r[v] ELSE NoBallot]
ResolutionSeqs(r) == [v \in Voters |-> IF r[v] = NoBallot THEN 0 ELSE r[v].arrivalSeq]
EmptyResolution == [v \in Voters |-> NoBallot]
EmptyCounts == [c \in Choices |-> 0]
EmptyReceipt == [
  kind |-> "NONE", reason |-> "NONE", winner |-> "NONE", choiceWinner |-> "NONE",
  receivedAt |-> TallyReceivedRepresentative, cutoffSeq |-> 0, ballotSnapshot |-> EmptyResolution,
  resolved |-> EmptyResolution, eligible |-> EmptyResolution,
  perVoterResolution |-> [v \in Voters |-> 0], counts |-> EmptyCounts
]
Receipt(r, received, cutoff) == [
  kind |-> TallyKind(r), reason |-> HoldReason(r), winner |-> ReceiptWinner(r),
  choiceWinner |-> ReceiptWinner(r), receivedAt |-> received, cutoffSeq |-> cutoff,
  ballotSnapshot |-> r, resolved |-> r, eligible |-> EligibleMap(r),
  perVoterResolution |-> ResolutionSeqs(r), counts |-> Counts(r)
]

VARIABLES accepted, reexamRequired, initialBudget, amendBudget,
          holdBudget, holdMarkers, tally
vars == <<accepted, reexamRequired, initialBudget, amendBudget,
          holdBudget, holdMarkers, tally>>

InitialSpent == 3 - (initialBudget[V1] + initialBudget[V2] + initialBudget[V3])
AmendSpent == 3 - (amendBudget[V1] + amendBudget[V2] + amendBudget[V3])
SubmissionCount == InitialSpent + AmendSpent
AcceptedCount == IF tally.kind = "NONE" THEN SubmissionCount ELSE tally.cutoffSeq
LateCount == SubmissionCount - AcceptedCount
NextSeq == SubmissionCount + 1

Init ==
  /\ accepted = EmptyResolution
  /\ reexamRequired = FALSE
  /\ initialBudget = [v \in Voters |-> 1]
  /\ amendBudget = [v \in Voters |-> 1]
  /\ holdBudget = 1
  /\ holdMarkers = <<>>
  /\ tally = EmptyReceipt

Reject == UNCHANGED vars

Route(v, ballot, g) ==
  /\ IF tally.kind = "NONE"
     THEN /\ accepted' = [accepted EXCEPT ![v] = Resolve(@, ballot)]
          /\ UNCHANGED reexamRequired
     ELSE /\ UNCHANGED accepted
          /\ reexamRequired' = (reexamRequired \/ (g = 8))

SubmitOriginal(v, c, s, g) ==
  /\ initialBudget[v] = 1
  /\ IF c = "UNKNOWN_CHOICE"
     THEN Reject
     ELSE IF s \notin SubmittedAt
     THEN Reject
     ELSE /\ initialBudget' = [initialBudget EXCEPT ![v] = 0]
          /\ UNCHANGED <<amendBudget, holdBudget, holdMarkers, tally>>
          /\ LET ballot == [choice |-> c, submittedAt |-> s, goaClass |-> GoAClass(g), arrivalSeq |-> NextSeq]
             IN Route(v, ballot, g)

SubmitAmend(v, ref, c, s, g) ==
  /\ amendBudget[v] = 1
  /\ IF c = "UNKNOWN_CHOICE"
     THEN Reject
     ELSE IF s \notin SubmittedAt
     THEN Reject
     ELSE IF accepted[v] = NoBallot \/ ref /= accepted[v].arrivalSeq
     THEN Reject
     ELSE /\ amendBudget' = [amendBudget EXCEPT ![v] = 0]
          /\ UNCHANGED <<initialBudget, holdBudget, holdMarkers, tally>>
          /\ LET ballot == [choice |-> c, submittedAt |-> s, goaClass |-> GoAClass(g), arrivalSeq |-> NextSeq]
             IN Route(v, ballot, g)

Tally(received) ==
  /\ tally.kind = "NONE"
  /\ SubmissionCount > 0
  /\ tally' = Receipt(accepted, received, SubmissionCount)
  /\ UNCHANGED <<accepted, reexamRequired, initialBudget, amendBudget,
                  holdBudget, holdMarkers>>

RecordHold(reason) ==
  /\ tally.kind = "HOLD"
  /\ tally.reason = reason
  /\ holdBudget = 1
  /\ holdMarkers = <<>>
  /\ holdBudget' = 0
  /\ holdMarkers' = <<reason>>
  /\ UNCHANGED <<accepted, reexamRequired, initialBudget, amendBudget, tally>>

SpendableSubmission ==
  \E v \in Voters:
    \/ initialBudget[v] = 1
    \/ /\ amendBudget[v] = 1
       /\ accepted[v] /= NoBallot
Terminal ==
  /\ tally.kind /= "NONE"
  /\ ~SpendableSubmission
  /\ (tally.kind = "ESTABLISHED" \/ holdBudget = 0)
TerminalStutter ==
  /\ Terminal
  /\ UNCHANGED vars

Next ==
  \/ \E v \in Voters, c \in Choices, g \in GoARepresentatives:
       /\ tally.kind = "NONE"
       /\ SubmitOriginal(v, c, OriginalSubmittedRepresentative, g)
  \/ \E v \in Voters, g \in LateGoARepresentatives:
       /\ tally.kind /= "NONE"
       /\ SubmitOriginal(v, C1, "T1", g)
  \/ \E v \in Voters, c \in Choices, s \in SubmittedAt,
       g \in GoARepresentatives:
       /\ tally.kind = "NONE"
       /\ SubmitAmend(v, accepted[v].arrivalSeq, c, s, g)
  \/ \E v \in Voters, g \in LateGoARepresentatives:
       /\ tally.kind /= "NONE"
       /\ SubmitAmend(v, accepted[v].arrivalSeq, C1, "T1", g)
  \/ \E v \in Voters: SubmitOriginal(v, "UNKNOWN_CHOICE", "T1", 1)
  \/ \E v \in Voters: SubmitOriginal(v, C1, "INVALID_FORMAT", 1)
  \/ \E v \in Voters: SubmitAmend(v, accepted[v].arrivalSeq, "UNKNOWN_CHOICE", "T1", 1)
  \/ \E v \in Voters: SubmitAmend(v, accepted[v].arrivalSeq, C1, "INVALID_FORMAT", 1)
  \/ \E v \in Voters: SubmitAmend(v, 0, C1, "T1", 1)
  \/ Tally(TallyReceivedRepresentative)
  \/ \E reason \in HoldReasons: RecordHold(reason)
  \/ TerminalStutter

TypeOK ==
  /\ accepted \in [Voters -> Ballots \cup {NoBallot}]
  /\ reexamRequired \in BOOLEAN
  /\ initialBudget \in [Voters -> {0, 1}]
  /\ amendBudget \in [Voters -> {0, 1}]
  /\ holdBudget \in {0, 1}
  /\ holdMarkers \in Seq(HoldReasons)
  /\ Len(holdMarkers) <= 1
  /\ tally.kind \in {"NONE", "HOLD", "ESTABLISHED"}
  /\ SubmissionCount \in 0..6
  /\ AcceptedCount \in 0..6
  /\ LateCount \in 0..6
  /\ NextSeq \in 1..7

ActionRefinement ==
  /\ \A v \in Voters: amendBudget[v] = 0 => initialBudget[v] = 0
  /\ \A v \in ResolvedVoters(accepted): initialBudget[v] = 0
  /\ (holdBudget = 1 => holdMarkers = <<>>)
  /\ (holdBudget = 0 =>
      /\ tally.kind = "HOLD"
      /\ holdMarkers = <<tally.reason>>)
  /\ (tally.kind = "NONE" =>
      /\ tally = EmptyReceipt
      /\ AcceptedCount = SubmissionCount
      /\ LateCount = 0
      /\ reexamRequired = FALSE)
  /\ (tally.kind /= "NONE" =>
      /\ tally.cutoffSeq \in 1..SubmissionCount
      /\ AcceptedCount = tally.cutoffSeq
      /\ LateCount = SubmissionCount - tally.cutoffSeq
      /\ tally.ballotSnapshot = accepted
      /\ tally.resolved = accepted)

UnknownChoiceAction ==
  \E v \in Voters:
    \/ SubmitOriginal(v, "UNKNOWN_CHOICE", "INVALID_FORMAT", 1)
    \/ SubmitAmend(v, 0, "UNKNOWN_CHOICE", "INVALID_FORMAT", 1)
InvalidTimestampAction ==
  \E v \in Voters, s \in InvalidSubmitted:
    \/ SubmitOriginal(v, C1, s, 1)
    \/ SubmitAmend(v, 0, C1, s, 1)
AnyValidAmend == \E v \in Voters: amendBudget[v] = 1 /\ accepted[v] /= NoBallot
ValidAmendStep ==
  \E v \in Voters, g \in LateGoARepresentatives:
    /\ amendBudget[v] = 1 /\ accepted[v] /= NoBallot
    /\ SubmitAmend(v, accepted[v].arrivalSeq, C1, "T1", g)
BadAmendStep ==
  \E v \in Voters, g \in LateGoARepresentatives:
    /\ amendBudget[v] = 1 /\ accepted[v] /= NoBallot
    /\ SubmitAmend(v, accepted[v].arrivalSeq, C1, "T1", g)
    /\ ~(/\ SubmissionCount' = SubmissionCount + 1
         /\ amendBudget' = [amendBudget EXCEPT ![v] = 0]
         /\ UNCHANGED <<initialBudget, holdBudget, holdMarkers, tally>>
         /\ (IF tally.kind = "NONE"
             THEN UNCHANGED reexamRequired
             ELSE reexamRequired' = (reexamRequired \/ (g = 8))))
ExpectedResolution(prior, ballot) ==
  IF prior = NoBallot
     \/ (CASE ballot.submittedAt = "T0" -> 0 [] ballot.submittedAt = "T1" -> 1 [] OTHER -> 2)
        > (CASE prior.submittedAt = "T0" -> 0 [] prior.submittedAt = "T1" -> 1 [] OTHER -> 2)
     \/ /\ ballot.submittedAt = prior.submittedAt
        /\ ballot.arrivalSeq > prior.arrivalSeq
  THEN ballot ELSE prior
BadResolutionStep ==
  \E v \in Voters:
    \/ LET ballot == [choice |-> C1, submittedAt |-> OriginalSubmittedRepresentative,
                       goaClass |-> GoAClass(1), arrivalSeq |-> NextSeq]
       IN /\ initialBudget[v] = 1
          /\ SubmitOriginal(v, C1, OriginalSubmittedRepresentative, 1)
          /\ ~(IF tally.kind = "NONE"
                THEN accepted' = [accepted EXCEPT ![v] = ExpectedResolution(@, ballot)]
                ELSE UNCHANGED accepted)
    \/ \E s \in SubmittedAt:
         LET ballot == [choice |-> C1, submittedAt |-> s,
                         goaClass |-> GoAClass(1), arrivalSeq |-> NextSeq]
         IN /\ amendBudget[v] = 1 /\ accepted[v] /= NoBallot
            /\ SubmitAmend(v, accepted[v].arrivalSeq, C1, s, 1)
            /\ ~(IF tally.kind = "NONE"
                  THEN accepted' = [accepted EXCEPT ![v] = ExpectedResolution(@, ballot)]
                  ELSE UNCHANGED accepted)

ChoiceWinner ==
  /\ TypeOK
  /\ ActionRefinement
  /\ (tally.kind = "NONE" \/
      /\ tally.kind = TallyKind(tally.resolved)
      /\ tally.reason = HoldReason(tally.resolved)
      /\ tally.winner = ReceiptWinner(tally.resolved)
      /\ tally.choiceWinner = ReceiptWinner(tally.resolved)
      /\ tally.counts = Counts(tally.resolved))
UnknownChoiceRejected ==
  /\ TypeOK
  /\ ActionRefinement
  /\ (\A v \in ResolvedVoters(accepted): accepted[v].choice \in Choices)
  /\ ~ENABLED (UnknownChoiceAction /\ ~(UNCHANGED vars))
ReceivedAtAxis ==
  /\ TypeOK
  /\ ActionRefinement
  /\ ((tally.kind = "NONE" => LateCount = 0)
      /\ (tally.kind /= "NONE" => LateCount = SubmissionCount - tally.cutoffSeq))
InvalidTimestampRejected ==
  /\ TypeOK
  /\ ActionRefinement
  /\ (\A v \in ResolvedVoters(accepted): accepted[v].submittedAt \in SubmittedAt)
  /\ ~ENABLED (InvalidTimestampAction /\ ~(UNCHANGED vars))
AmendSubmission ==
  /\ TypeOK
  /\ ActionRefinement
  /\ (AmendSpent <= InitialSpent)
  /\ (AnyValidAmend => ENABLED ValidAmendStep)
  /\ ~ENABLED BadAmendStep
UnknownRefRejected ==
  /\ TypeOK
  /\ ActionRefinement
  /\ (\A v \in Voters:
      ~ENABLED (SubmitAmend(v, 0, C1, "T1", 1)
                /\ ~(UNCHANGED vars)))
PerVoterResolution ==
  /\ TypeOK
  /\ ActionRefinement
  /\ (tally.kind /= "NONE" =>
      /\ tally.resolved = tally.ballotSnapshot
      /\ tally.perVoterResolution = ResolutionSeqs(tally.ballotSnapshot)
      /\ tally.cutoffSeq <= SubmissionCount)
  /\ ~ENABLED BadResolutionStep

Spec == Init /\ [][Next]_vars

====
