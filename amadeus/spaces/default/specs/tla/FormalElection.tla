---- MODULE FormalElection ----
EXTENDS Naturals, Sequences, FiniteSets, TLC, FormalElectionCore

CONSTANTS V1, V2, Q1, Q2, Q1C1, Q1C2, Q2C1, Q2C2, Favor, Block

Voters == {V1, V2}
QuestionOrder == <<Q1, Q2>>
Questions == {Q1, Q2}
Choices == [q \in Questions |->
  CASE q = Q1 -> {Q1C1, Q1C2}
    [] OTHER -> {Q2C1, Q2C2}]
Goas == {Favor, Block}

VARIABLES accepted, results, targets, preserved, phase
vars == <<accepted, results, targets, preserved, phase>>

EmptyAccepted == [v \in Voters |-> [q \in Questions |-> NoResponse]]
EmptyResults == [q \in Questions |-> ResultNone]

Init ==
  /\ accepted = EmptyAccepted
  /\ results = EmptyResults
  /\ targets = {}
  /\ preserved = {}
  /\ phase = PhaseClosed

Open ==
  /\ phase = PhaseClosed
  /\ accepted' = EmptyAccepted
  /\ results' = EmptyResults
  /\ targets' = Questions
  /\ preserved' = {}
  /\ phase' = PhaseCollecting

AcceptResponse(v, q, c, g) ==
  /\ phase \in {PhaseCollecting, PhaseTallying}
  /\ q \in targets
  /\ accepted[v][q] = NoResponse
  /\ c \in Choices[q]
  /\ g \in Goas
  /\ accepted' = [accepted EXCEPT ![v][q] = Response(c, g)]
  /\ UNCHANGED <<results, targets, preserved, phase>>

TallyQuestion(q) ==
  /\ phase \in {PhaseCollecting, PhaseTallying}
  /\ q \in targets
  /\ results[q] = ResultNone
  /\ AllResponded(accepted, Voters, q)
  /\ results' = [results EXCEPT ![q] = QuestionResult(accepted, Voters, q, Block)]
  /\ phase' = PhaseTallying
  /\ UNCHANGED <<accepted, targets, preserved>>

FinishRun ==
  /\ phase = PhaseTallying
  /\ \A q \in targets: results[q] /= ResultNone
  /\ LET held == HeldQuestions(results, targets)
     IN /\ preserved' = preserved \cup EstablishedQuestions(results, targets)
        /\ targets' = held
        /\ phase' = IF held = {} THEN PhaseTallied ELSE PhasePartial
  /\ UNCHANGED <<accepted, results>>

Rerun ==
  LET held == HeldQuestions(results, targets)
  IN /\ phase = PhasePartial
     /\ held /= {}
     /\ targets' = held
     /\ accepted' = [v \in Voters |->
          [q \in Questions |-> IF q \in held THEN NoResponse ELSE accepted[v][q]]]
     /\ results' = [q \in Questions |-> IF q \in held THEN ResultNone ELSE results[q]]
     /\ UNCHANGED preserved
     /\ phase' = PhaseCollecting

TerminalStutter ==
  /\ phase \in {PhasePartial, PhaseTallied}
  /\ UNCHANGED vars

Next ==
  \/ Open
  \/ \E v \in Voters, q \in Questions:
       \E c \in Choices[q], g \in Goas: AcceptResponse(v, q, c, g)
  \/ \E q \in Questions: TallyQuestion(q)
  \/ FinishRun
  \/ Rerun
  \/ TerminalStutter

QuestionIdsUnique == Len(QuestionOrder) = Cardinality(Questions)

AcceptedDomain ==
  \A v \in Voters, q \in Questions:
    accepted[v][q] = NoResponse
    \/ (accepted[v][q].choice \in Choices[q] /\ accepted[v][q].goa \in Goas)

ResultCompleteness ==
  /\ \A q \in Questions: results[q] \in Results
  /\ \A q \in preserved: results[q] = ResultEstablished
  /\ phase \in {PhasePartial, PhaseTallied} =>
       \A q \in targets: results[q] /= ResultNone

PerQuestionIsolation ==
  \A q \in Questions:
    results[q] = ResultNone
    \/ (AllResponded(accepted, Voters, q)
        /\ results[q] = QuestionResult(accepted, Voters, q, Block))

EstablishedImmutable ==
  \A q \in preserved: results[q] = ResultEstablished

HeldOnlyTargets ==
  /\ preserved \cap targets = {}
  /\ preserved \subseteq Questions
  /\ targets \subseteq Questions
  /\ (phase \in {PhaseCollecting, PhaseTallying} /\ preserved /= {}) =>
       targets = Questions \ preserved

MixedLifecycle ==
  /\ (phase = PhasePartial => HeldQuestions(results, targets) /= {})
  /\ (phase = PhaseTallied =>
       \A q \in Questions: results[q] = ResultEstablished)
  /\ ((phase \in {PhasePartial, PhaseTallied}) =>
       (phase = PhasePartial <=> HeldQuestions(results, targets) /= {}))

ResponseCoverage ==
  \A q \in Questions:
    results[q] /= ResultNone => AllResponded(accepted, Voters, q)

TypeOK ==
  /\ accepted \in [Voters -> [Questions -> ResponseDomain(UNION {Choices[q] : q \in Questions}, Goas)]]
  /\ results \in [Questions -> Results]
  /\ targets \subseteq Questions
  /\ preserved \subseteq Questions
  /\ phase \in Phases

RunInProgress == phase \in {PhaseCollecting, PhaseTallying}
RunComplete == phase \in {PhasePartial, PhaseTallied}
ReadyToComplete ==
  RunInProgress
  /\ \A v \in Voters, q \in targets: accepted[v][q] /= NoResponse

EnabledRunCompletes == [](ReadyToComplete => <>RunComplete)

Fairness ==
  /\ WF_vars(Open)
  /\ \A q \in Questions: WF_vars(TallyQuestion(q))
  /\ WF_vars(FinishRun)
  /\ WF_vars(Rerun)

Spec == Init /\ [][Next]_vars /\ Fairness

====
