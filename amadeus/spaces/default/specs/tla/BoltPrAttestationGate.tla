---- MODULE BoltPrAttestationGate ----
EXTENDS Integers

\* The declaration order is the order TLC prints state variables in a trace
\* (measured, not alphabetical). The referee reads the trace vocabulary from
\* this list and compares it position by position, so any other order makes
\* every counterexample unparsable (#2918).
VARIABLES workflowDone, artifactsComplete, verdict, codeGenerationDone,
          sensorPassed, reportHead, head, attested, reportUnits,
          evidencedUnits, membershipValid, tupleConsistent,
          ownerEvidenceDistinct, candidateCount, authorityDecision,
          humanQuestion, receiptIssued, receiptCount, reportIdentity,
          receiptHead, receiptIdentity

vars == << head, reportHead, verdict, attested, sensorPassed,
           artifactsComplete, codeGenerationDone, workflowDone, reportUnits,
           evidencedUnits, membershipValid, tupleConsistent,
           ownerEvidenceDistinct, candidateCount, authorityDecision,
           humanQuestion, receiptIssued, receiptCount, reportIdentity,
           receiptHead, receiptIdentity >>

Verdicts == {"none", "created", "converged", "override"}
TerminalVerdicts == {"converged", "override"}
Units == {0, 1}
AuthorityDecisions == {"pending", "continued", "refused"}

TypeOK ==
  /\ head \in {0, 1}
  /\ reportHead \in {-1, 0, 1}
  /\ verdict \in Verdicts
  /\ attested \in BOOLEAN
  /\ sensorPassed \in BOOLEAN
  /\ artifactsComplete \in BOOLEAN
  /\ codeGenerationDone \in BOOLEAN
  /\ workflowDone \in BOOLEAN
  /\ reportUnits \subseteq Units
  /\ evidencedUnits \subseteq Units
  /\ membershipValid \in BOOLEAN
  /\ tupleConsistent \in BOOLEAN
  /\ ownerEvidenceDistinct \in BOOLEAN
  /\ candidateCount \in {0, 1, 2}
  /\ authorityDecision \in AuthorityDecisions
  /\ humanQuestion \in BOOLEAN
  /\ receiptIssued \in BOOLEAN
  /\ receiptCount \in {0, 1}
  /\ reportIdentity \in {-1, 0, 1, 2}
  /\ receiptHead \in {-1, 0, 1}
  /\ receiptIdentity \in {-1, 0, 1, 2}

EvidenceCurrentHead ==
  (attested \/ sensorPassed) => reportHead = head

SensorRequiresAttestation ==
  sensorPassed => attested

AttestationRequiresCompleteBolt ==
  attested =>
    /\ reportUnits = Units
    /\ evidencedUnits = Units
    /\ membershipValid
    /\ tupleConsistent

SensorRequiresCompleteBolt ==
  sensorPassed =>
    /\ reportUnits = Units
    /\ evidencedUnits = Units
    /\ membershipValid
    /\ tupleConsistent

OwnerEvidenceIsolated ==
  (attested \/ sensorPassed \/ codeGenerationDone \/ workflowDone) =>
    ownerEvidenceDistinct

AutonomyDecisionSafe ==
  /\ humanQuestion = FALSE
  /\ (authorityDecision = "continued" => candidateCount = 1)
  /\ (authorityDecision = "refused" => candidateCount # 1)

ReceiptIdempotent ==
  /\ receiptCount \in {0, 1}
  /\ (receiptIssued => receiptCount = 1)
  /\ (~receiptIssued => receiptCount = 0)
  /\ (attested => receiptIssued)

ReceiptBoundCurrentReport ==
  receiptIssued =>
    /\ receiptHead = head
    /\ receiptIdentity = reportIdentity

CodeGenerationGuarded ==
  codeGenerationDone =>
    /\ reportHead = head
    /\ verdict \in {"created", "converged", "override"}
    /\ attested
    /\ sensorPassed
    /\ artifactsComplete

WorkflowGuarded ==
  workflowDone =>
    /\ reportHead = head
    /\ verdict \in TerminalVerdicts
    /\ attested
    /\ sensorPassed
    /\ artifactsComplete

Init ==
  /\ head = 0
  /\ reportHead = -1
  /\ verdict = "none"
  /\ attested = FALSE
  /\ sensorPassed = FALSE
  /\ artifactsComplete = FALSE
  /\ codeGenerationDone = FALSE
  /\ workflowDone = FALSE
  /\ reportUnits = {}
  /\ evidencedUnits = {}
  /\ membershipValid = FALSE
  /\ tupleConsistent = FALSE
  /\ ownerEvidenceDistinct = FALSE
  /\ candidateCount = 0
  /\ authorityDecision = "pending"
  /\ humanQuestion = FALSE
  /\ receiptIssued = FALSE
  /\ receiptCount = 0
  /\ reportIdentity = -1
  /\ receiptHead = -1
  /\ receiptIdentity = -1

CreateReport ==
  /\ reportHead # head
  /\ \E nextReportUnits \in SUBSET Units,
        nextEvidencedUnits \in SUBSET Units:
       /\ reportHead' = head
       /\ verdict' = "created"
       /\ attested' = FALSE
       /\ sensorPassed' = FALSE
       /\ codeGenerationDone' = FALSE
       /\ workflowDone' = FALSE
       /\ reportUnits' = nextReportUnits
       /\ evidencedUnits' = nextEvidencedUnits
       /\ membershipValid' \in BOOLEAN
       /\ tupleConsistent' \in BOOLEAN
       /\ ownerEvidenceDistinct' \in BOOLEAN
       /\ candidateCount' \in {0, 1, 2}
       /\ authorityDecision' = "pending"
       /\ humanQuestion' = FALSE
       /\ receiptIssued' = FALSE
       /\ receiptCount' = 0
       /\ reportIdentity' = 0
       /\ receiptHead' = -1
       /\ receiptIdentity' = -1
       /\ UNCHANGED << head, artifactsComplete >>

ResolveAuthority ==
  /\ verdict # "none"
  /\ authorityDecision = "pending"
  /\ authorityDecision' = IF candidateCount = 1 THEN "continued" ELSE "refused"
  /\ humanQuestion' = FALSE
  /\ UNCHANGED << head, reportHead, verdict, attested, sensorPassed,
                   artifactsComplete, codeGenerationDone, workflowDone,
                   reportUnits, evidencedUnits, membershipValid, tupleConsistent,
                   ownerEvidenceDistinct, candidateCount, receiptIssued, receiptCount,
                   reportIdentity, receiptHead, receiptIdentity >>

Attest ==
  /\ reportHead = head
  /\ verdict # "none"
  /\ reportUnits = Units
  /\ evidencedUnits = Units
  /\ membershipValid
  /\ tupleConsistent
  /\ ownerEvidenceDistinct
  /\ authorityDecision = "continued"
  /\ attested' = TRUE
  /\ receiptIssued' = TRUE
  /\ receiptCount' = 1
  /\ receiptHead' = head
  /\ receiptIdentity' = reportIdentity
  /\ UNCHANGED << head, reportHead, verdict, sensorPassed,
                   artifactsComplete, codeGenerationDone, workflowDone,
                   reportUnits, evidencedUnits, membershipValid, tupleConsistent,
                   ownerEvidenceDistinct, candidateCount, authorityDecision, humanQuestion,
                   reportIdentity >>

PassSensor ==
  /\ reportHead = head
  /\ attested
  /\ sensorPassed' = TRUE
  /\ UNCHANGED << head, reportHead, verdict, attested,
                   artifactsComplete, codeGenerationDone, workflowDone,
                   reportUnits, evidencedUnits, membershipValid, tupleConsistent,
                   ownerEvidenceDistinct, candidateCount, authorityDecision,
                   humanQuestion, receiptIssued, receiptCount, reportIdentity,
                   receiptHead, receiptIdentity >>

MarkArtifactsComplete ==
  /\ artifactsComplete' = TRUE
  /\ UNCHANGED << head, reportHead, verdict, attested, sensorPassed,
                   codeGenerationDone, workflowDone, reportUnits,
                   evidencedUnits, membershipValid, tupleConsistent,
                   ownerEvidenceDistinct, candidateCount, authorityDecision,
                   humanQuestion, receiptIssued, receiptCount, reportIdentity,
                   receiptHead, receiptIdentity >>

Converge ==
  /\ reportHead = head
  /\ verdict \in {"created", "override"}
  /\ verdict' = "converged"
  /\ attested' = FALSE
  /\ sensorPassed' = FALSE
  /\ codeGenerationDone' = FALSE
  /\ workflowDone' = FALSE
  /\ reportIdentity' = 1
  /\ receiptIssued' = FALSE
  /\ receiptCount' = 0
  /\ receiptHead' = -1
  /\ receiptIdentity' = -1
  /\ UNCHANGED << head, reportHead, artifactsComplete, reportUnits,
                   evidencedUnits, membershipValid, tupleConsistent,
                   ownerEvidenceDistinct, candidateCount, authorityDecision,
                   humanQuestion >>

Override ==
  /\ reportHead = head
  /\ verdict = "created"
  /\ verdict' = "override"
  /\ attested' = FALSE
  /\ sensorPassed' = FALSE
  /\ codeGenerationDone' = FALSE
  /\ workflowDone' = FALSE
  /\ reportIdentity' = 2
  /\ receiptIssued' = FALSE
  /\ receiptCount' = 0
  /\ receiptHead' = -1
  /\ receiptIdentity' = -1
  /\ UNCHANGED << head, reportHead, artifactsComplete, reportUnits,
                   evidencedUnits, membershipValid, tupleConsistent,
                   ownerEvidenceDistinct, candidateCount, authorityDecision,
                   humanQuestion >>

CompleteCodeGeneration ==
  /\ reportHead = head
  /\ verdict \in {"created", "converged", "override"}
  /\ attested
  /\ sensorPassed
  /\ artifactsComplete
  /\ codeGenerationDone' = TRUE
  /\ UNCHANGED << head, reportHead, verdict, attested, sensorPassed,
                   artifactsComplete, workflowDone, reportUnits,
                   evidencedUnits, membershipValid, tupleConsistent,
                   ownerEvidenceDistinct, candidateCount, authorityDecision,
                   humanQuestion, receiptIssued, receiptCount, reportIdentity,
                   receiptHead, receiptIdentity >>

CompleteWorkflow ==
  /\ reportHead = head
  /\ verdict \in TerminalVerdicts
  /\ attested
  /\ sensorPassed
  /\ artifactsComplete
  /\ workflowDone' = TRUE
  /\ UNCHANGED << head, reportHead, verdict, attested, sensorPassed,
                   artifactsComplete, codeGenerationDone, reportUnits,
                   evidencedUnits, membershipValid, tupleConsistent,
                   ownerEvidenceDistinct, candidateCount, authorityDecision,
                   humanQuestion, receiptIssued, receiptCount, reportIdentity,
                   receiptHead, receiptIdentity >>

ChangeHead ==
  /\ head' = 1 - head
  /\ attested' = FALSE
  /\ sensorPassed' = FALSE
  /\ codeGenerationDone' = FALSE
  /\ workflowDone' = FALSE
  /\ reportUnits' = {}
  /\ evidencedUnits' = {}
  /\ membershipValid' = FALSE
  /\ tupleConsistent' = FALSE
  /\ ownerEvidenceDistinct' = FALSE
  /\ candidateCount' = 0
  /\ authorityDecision' = "pending"
  /\ humanQuestion' = FALSE
  /\ receiptIssued' = FALSE
  /\ receiptCount' = 0
  /\ reportIdentity' = -1
  /\ receiptHead' = -1
  /\ receiptIdentity' = -1
  /\ UNCHANGED << reportHead, verdict, artifactsComplete >>

Next ==
  \/ CreateReport
  \/ ResolveAuthority
  \/ Attest
  \/ PassSensor
  \/ MarkArtifactsComplete
  \/ Converge
  \/ Override
  \/ CompleteCodeGeneration
  \/ CompleteWorkflow
  \/ ChangeHead

Spec == Init /\ [][Next]_vars

====
