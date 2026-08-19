# NFR Design Memory

## Interpretations

- 2026-08-04T14:15:00Z — nfr-requirements成果物はscope上の意図的SKIPであるため再作成せず、engineが渡したFunctional Designだけからsecurity/logical componentを具体化する。
- 2026-08-04T14:28:00Z — Kiro ACPもnfr-requirements成果物を再作成せず、Functional Designのstrong containment、JSON-RPC相関、cleanup優先契約をNFR componentへ写像する。
- 2026-08-04T14:38:00Z — Kimi printはsource credentialをnon-ownedのまま短命bindingだけをresource管理し、run request identityをFIFO queue・lease owner・run identityへ連続させる。
- 2026-08-04T14:46:00Z — Evidence Unitはdeclared input 0件のspecとして扱い、兄弟Unitの成果物を暗黙consumeせず、receipt provenanceと決定的projectionのsecurity contractだけを設計する。
- 2026-08-04T23:49:55Z — Session resumed on the Claude harness after the park; the runtime graph was missing (BOLT_DAG_RECOVERED) and was rebuilt via `amadeus-runtime.ts compile`, which restored the produces_kinds pruning (library units: security-design + logical-components; spec unit: security-design only). The pre-compile directive that demanded all five outputs was treated as a graph artifact, not a real gap.

## Deviations

- なし。
- 2026-08-04T23:49:55Z — none this session; the remaining work was the §12a review of the phase2-live-e2e-evidence draft, which the previous session had left unreviewed.

## Tradeoffs

- 2026-08-04T14:15:00Z — Kiro TUIは新しいAWS/service境界を追加せず、process内portsとrun-private tmux/scratchをsecurity failure domainとして扱う; 短命CLI harnessへcloud infrastructureを発明しないため。
- 2026-08-04T14:19:00Z — cleanup barrier終端をClosedCleanup|FailedCleanupのunionとし、closedは通常receipt、failedは非PASS CleanupFailureReceiptを生成する; cleanup未完了をgreen化せず監査結果も失わないため。
- 2026-08-04T14:28:00Z — ACP direct eligibilityを通常process groupで広げず、OS primitiveによるpre-exec非離脱境界とowned-child reapの両証明へ限定する; Darwinでの利用可能性より子孫残存をgreen化しない安全性を優先するため。
- 2026-08-04T14:38:00Z — Kimiの負荷制御は並列scaleやcircuit breakerでなくprocess-wide FIFO leaseとEAGAIN限定1回retryにする; 外部課金・rate limit・credential共有を持つ短命CLIではthroughputより決定性とblast radius制限を優先するため。
- 2026-08-04T14:46:00Z — Evidence projectionはambient HEADや時刻で不足provenanceを補完せず、欠損receiptをfail-closedにする; 一時的なmatrix可用性よりsupported/green主張の完全性を優先するため。

## Open questions

- なし。
- 2026-08-04T23:49:55Z — The advisory upstream-coverage sensor fires on every unit because the nfr-requirements consumes are skipped by the self-feature scope; confirm the team is comfortable treating that as expected noise for spec/library units.
