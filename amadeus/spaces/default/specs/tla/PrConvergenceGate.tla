---- MODULE PrConvergenceGate ----
EXTENDS Integers

\* The declaration order is the order TLC prints state variables in a trace
\* (measured, not alphabetical). The referee reads the trace vocabulary from
\* this list and compares it position by position, so any other order makes
\* every counterexample unparsable (#2918).
VARIABLES workflowDone, artifactsComplete, verdict, codeGenerationDone,
          sensorPassed, reportHead, head, attested

vars == << head, reportHead, verdict, attested, sensorPassed,
           artifactsComplete, codeGenerationDone, workflowDone >>

Verdicts == {"none", "created", "converged", "override"}
TerminalVerdicts == {"converged", "override"}

TypeOK ==
  /\ head \in {0, 1}
  /\ reportHead \in {-1, 0, 1}
  /\ verdict \in Verdicts
  /\ attested \in BOOLEAN
  /\ sensorPassed \in BOOLEAN
  /\ artifactsComplete \in BOOLEAN
  /\ codeGenerationDone \in BOOLEAN
  /\ workflowDone \in BOOLEAN

EvidenceCurrentHead ==
  (attested \/ sensorPassed) => reportHead = head

SensorRequiresAttestation ==
  sensorPassed => attested

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

CreateReport ==
  /\ reportHead # head
  /\ reportHead' = head
  /\ verdict' = "created"
  /\ attested' = FALSE
  /\ sensorPassed' = FALSE
  /\ codeGenerationDone' = FALSE
  /\ workflowDone' = FALSE
  /\ UNCHANGED << head, artifactsComplete >>

Attest ==
  /\ reportHead = head
  /\ verdict # "none"
  /\ attested' = TRUE
  /\ UNCHANGED << head, reportHead, verdict, sensorPassed,
                   artifactsComplete, codeGenerationDone, workflowDone >>

PassSensor ==
  /\ reportHead = head
  /\ attested
  /\ sensorPassed' = TRUE
  /\ UNCHANGED << head, reportHead, verdict, attested,
                   artifactsComplete, codeGenerationDone, workflowDone >>

MarkArtifactsComplete ==
  /\ artifactsComplete' = TRUE
  /\ UNCHANGED << head, reportHead, verdict, attested, sensorPassed,
                   codeGenerationDone, workflowDone >>

Converge ==
  /\ reportHead = head
  /\ verdict \in {"created", "override"}
  /\ verdict' = "converged"
  /\ attested' = FALSE
  /\ sensorPassed' = FALSE
  /\ codeGenerationDone' = FALSE
  /\ workflowDone' = FALSE
  /\ UNCHANGED << head, reportHead, artifactsComplete >>

Override ==
  /\ reportHead = head
  /\ verdict = "created"
  /\ verdict' = "override"
  /\ attested' = FALSE
  /\ sensorPassed' = FALSE
  /\ codeGenerationDone' = FALSE
  /\ workflowDone' = FALSE
  /\ UNCHANGED << head, reportHead, artifactsComplete >>

CompleteCodeGeneration ==
  /\ reportHead = head
  /\ verdict \in {"created", "converged", "override"}
  /\ attested
  /\ sensorPassed
  /\ artifactsComplete
  /\ codeGenerationDone' = TRUE
  /\ UNCHANGED << head, reportHead, verdict, attested, sensorPassed,
                   artifactsComplete, workflowDone >>

CompleteWorkflow ==
  /\ reportHead = head
  /\ verdict \in TerminalVerdicts
  /\ attested
  /\ sensorPassed
  /\ artifactsComplete
  /\ workflowDone' = TRUE
  /\ UNCHANGED << head, reportHead, verdict, attested, sensorPassed,
                   artifactsComplete, codeGenerationDone >>

ChangeHead ==
  /\ head' = 1 - head
  /\ attested' = FALSE
  /\ sensorPassed' = FALSE
  /\ codeGenerationDone' = FALSE
  /\ workflowDone' = FALSE
  /\ UNCHANGED << reportHead, verdict, artifactsComplete >>

Next ==
  \/ CreateReport
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
