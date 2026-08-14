---- MODULE FormalElectionCore ----
EXTENDS FiniteSets

NoResponse == [choice |-> "NO_CHOICE", goa |-> "NO_GOA"]
ResultNone == "none"
ResultHold == "hold"
ResultEstablished == "established"
Results == {ResultNone, ResultHold, ResultEstablished}

PhaseClosed == "closed"
PhaseCollecting == "collecting"
PhaseTallying == "tallying"
PhasePartial == "partial"
PhaseTallied == "tallied"
Phases == {PhaseClosed, PhaseCollecting, PhaseTallying, PhasePartial, PhaseTallied}

Response(choice, goa) == [choice |-> choice, goa |-> goa]
ResponseDomain(choices, goas) == [choice: choices \cup {NoResponse.choice}, goa: goas \cup {NoResponse.goa}]

AllResponded(accepted, voters, question) ==
  \A voter \in voters: accepted[voter][question] /= NoResponse

QuestionResult(accepted, voters, question, blockingGoa) ==
  IF \E voter \in voters: accepted[voter][question].goa = blockingGoa
  THEN ResultHold
  ELSE ResultEstablished

HeldQuestions(results, questions) ==
  {question \in questions: results[question] = ResultHold}

EstablishedQuestions(results, questions) ==
  {question \in questions: results[question] = ResultEstablished}

====
