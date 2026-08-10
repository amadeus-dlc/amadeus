# Performance Design — stage-stats-attribution-service

## Scope and upstream applicability

present consumeの `business-logic-model.md` を対象とする。`performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`はexpected-absentで、declared NFR requirement IDはない。`requirements.md:287-305`と`services.md:98-104`はcontext evidenceとしてだけ使う。

## Workload and budgets

| Dimension | Design budget |
|---|---|
| corpus | 実行前condition `shardCount >= 229`かつ`lineCount >= 136_011`を満たすscale test |
| scan | corpusを1回readし、original rowsをlegacy、新しいreadonly viewをattributionへ渡す |
| candidates/windows | decoder/accountantを各1回、全eligible集合を同一値で共有 |
| report | composition O(n)、statistics/outlier O(n log n)、reason matrix固定153行 |
| memory | corpus/candidate/interval/windowにO(n)、window/category bucketで局所化 |
| stdout | 各format >65,536 bytesのfixtureを1回writeし、consumer EOFまでdrain |
| latency SLO | declared requirementなし。固定秒上限を発明しない |

correctnessを犠牲にするsampling、approximation、parallel scan、early truncationは使わない。outlier Nは表示行だけへ適用し、統計母集団の計算量を縮めない。

## Optimization strategy

- argvをI/O前にparseし、usage error時のscanを0回にする。
- corpus scanを1回に限定し、legacyとattributionでfilesystemを再走査しない。
- measured evidenceは既存window constructionと同じpassで並行生成する。
- canonical dedupはattribution branchのinvocation-local `Set`だけで行う。
- category/global unionはwindow/category bucketでsortし、全intervalのglobal sortを避ける。
- semantic modelを1回構成し、rendererはstatistics、ratio、sortを再計算しない。
- fixed 9×17 matrixはclosed tupleから生成し、dynamic discoveryを行わない。

cache、connection/resource pool、async worker、CDN、pagination、database query optimizationは非適用である。one-shot read-only CLIにpersistent cacheを加えるとinvalid cacheとwrite failureを新設するため禁止する。

## Resource lifecycle

入力row、dedup map、group、fragment、report stringはprocess-localで、process終了時に解放する。global cache、temp file、disk indexを作らない。stdout payloadはcomplete stringを1回writeし、`process.exit()`を呼ばずevent loopのnatural drainへ委ねる。

## Decision traceability

全decisionのdeclared requirementはmissingである。行参照はcontext evidenceで、ID代用ではない。

| Performance decision | Declared requirement | Context evidence / verification |
|---|---|---|
| corpus scan 1回 | Missing (`performance-requirements.md` absent) | `requirements.md:287-301`; scanner call count |
| decoder/accountant各1回 | Missing | `business-logic-model.md` Service orchestration; injected spy |
| O(n)/O(n log n)/固定153行 | Missing | 同 Complexity節; scale fixture |
| O(n) memoryとbucket局所化 | Missing | `services.md:100-104`; bucket cardinality |
| sampling/approximationなし | Missing | `requirements.md:299-305`; semantic parity |
| renderer再計算なし | Missing | `business-logic-model.md` Canonical report; 3format parity |
| persistent cache/pool/workerなし | Missing | one-shot processでexternal resourceなし; import/resource census |
| >65,536 bytes stdout drain | Missing | `requirements.md:295-297`; full/pipe digest parity |
| fixed latency SLOなし | Missing | Issueが上限を宣言しない; correctness testを優先 |

## Performance verification

同じinputでfull captureとpipe consumerを実行し、Markdown/CSV/JSONすべてでbytes >65,536、producer exit 0、consumer exit 0、digest一致をassertする。JSONはさらに`jq empty`を通す。scale testはshard/line preconditionを先にassertし、同じ単一processがreport生成とdrainまで完走することを確認する。


## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-10T00:53:33Z
- **Iteration:** 1
- **Scope decision:** none

5成果物はいずれもrequired sectionsと全consumesへのupstream coverageを満たし、NFR Requirement ID不在を明示したdesign-decision単位のtraceabilityを備えている。performance/security/scalability/reliability/logical componentの各契約はbusiness-logic-model.mdと整合し、Issue #2695完了条件1〜10、229 shard・136,011 row以上の単一process scale、Markdown/CSV/JSON各65,536 bytes超のpipe drain、exit 0/1/2 ladder、read-only、append-onlyのlegacy互換を弱める設計はない。未解決BLOCKERは0件。

### Findings

- None
