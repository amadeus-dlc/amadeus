# Tech Stack Decisions — convergence-budgets

上流入力（consumes 全数）: `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`

## 技術選定

`technology-stack.md` のBun／TypeScript／JSONL audit／fast-checkを維持し、`business-logic-model.md` のC2 atomic writerとC3 pure policy、`business-rules.md` のclosed allowlistをdeep moduleとして実装する。新規dependency、daemon、database、Codex専用gateは追加しない。

| Decision | Selection | Rationale |
|---|---|---|
| Policy schema | `BudgetPolicyV1`のclosed TypeScript union | default／hard cap／versionを共有coreで一元化 |
| Defaults | stop interactive 2、autonomous/gated 8、retry 2 | 現行Stop実装と既存spawn retryの実測値を維持 |
| Hard caps | stop 10、retry 3 | #1998参考設計の10とarchitect knowledgeの安全な最小一般値3 |
| Persistence | Unit 1のcanonical JSONL audit＋BudgetProjection | session／workerを跨ぐdurable counter、別storeなし |
| Atomicity | 既存per-intent mkdir lock内のreserve batch | counter／attempt／receiptの部分成功を防止 |
| Retry classifier | v1 exact-match `Map`、stable rule ID 4件 | O(1)判定、unknown fail-closed、adapter独自predicateなし |
| Scheduling | injectable scheduler、default 50ms linear backoff | testでsleep不要、既存EAGAIN retry fixtureと整合 |
| Testing | Bun test＋fast-check＋fake writer／effect query／scheduler | cap、crash、concurrencyをlive workerなしで再現 |
| Rendering | `TerminationReasonV1`からharness-native proseへ投影 | 表示だけharness差、停止semanticsは共有 |
| Distribution | package 7面／影響self-install 5面を生成 | driftをblockingし、正本以外を直接編集しない |

## Configuration Contract

| Kind／mode | Default | Hard cap | Unit |
|---|---:|---:|---|
| `stop-continuation:interactive` | 2 | 10 | continuation reserve |
| `stop-continuation:autonomous` | 8 | 10 | continuation reserve |
| `stop-continuation:gated` | 8 | 10 | continuation reserve |
| `recoverable-retry` | 2 | 3 | initial attempt後のretry reserve |

設定値は正の整数かつhard cap以下だけを受理する。同じBudgetSubjectの初回reserveでeffective値とconfig digestを固定し、途中変更は`budget-policy-mismatch`とする。現行のharness名を含むenv seamは互換入力adapterに留め、正準policy名・validation・counterを共有coreへ置く。

## Rejected Alternatives と Gates

- audit行数をprogress signatureへ含めない。副次eventでcounterをresetできるためである。
- LLMの「改善している」判定をhard cap代替にしない。advisory replan signalとしてのみ扱う。
- exponential unbounded backoff、infinite retry、worker IDごとのcounterを採用しない。
- approval／GitHub mutation／canonical writeをgeneric retry wrapperへ通さない。
- adapter別capやCodexだけの停止reasonを追加しない。

Blocking gateはtypecheck、lint、budget property test、Stop audit-noise regression、allowlist matrix、影響adapter conformance、`bun scripts/package.ts --check`、`bun run promote:self:check`とする。Markdownにcode snippetがないためlinter/type-check sensorは非該当、required-sections／upstream-coverage／answer-evidenceを適用する。
