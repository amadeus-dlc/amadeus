# Risk and Sequencing Rationale — Codex Duration Bounds

## Upstream Inputs

本理由書は `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md` を入力とする。技術DAGが許す複数順序から、ユーザーの「前段改善を後段の作業自体へ波及させる」という価値判断で経済的順序を決める。

## Selected Heuristic

Hybrid sequencingを採用する。

1. **Walking-skeleton-first**: #1602で最小のend-to-end measurement pathを証明する。
2. **Risk-first**: 後続の判定基盤となるidentity/duration/baseline/single-writerを先に確定する。
3. **Feedback propagation**: 各Boltの実測、共有contract、実行時間改善を次Boltのベースへ取り込む。

WSJF数値は使わない。value/time criticality/risk reduction/job sizeの一次データがないため、仮点は数学的な精密さを偽装する。complexityはスコアではなく実行capacity見積りにだけ使う。

## Topology Validation

技術DAGは `#1602 → #1998 → {#1999, #1919}`。選択順 `#1602 → #1998 → #1999 → #1919` は全辺を守る有効topological orderであり、依存逆転はない。

#1999と#1919は技術的には並列可能だが、#1999を先に行う。これは技術依存の追加ではなく、対話/review budgetにより長い#1919のConstruction自体を有界化し、毎Boltのmerge/rebaseでfeedbackを取り込む経済的選択である。

## Bolt Rationale

| Bolt | Why now | Confidence gained | Why not later |
|---|---|---|---|
| #1602 | 計測・identity・writerは他の証拠の前提 | 改善前後を同じschemaで比較可能 | 後回しは他Boltの効果を測れない |
| #1998 | 長時間化の直接原因である非収束/retryを有界化 | Stop/retryの定義済み終端 | C4/C5が共通budgetを使えない |
| #1999 | #1998のreserveを小さいM規模で対話に拡張 | 後続の質問/review自体が有界 | #1919先行だと長い作業に対話budget改善が波及しない |
| #1919 | 共通identity/budgetの上で最も大きな並行実行リスクを閉じる | queue/slot/attemptと統合dogfoodの成立 | 前提contractを複製しないため最後が合理的 |

## Risk Register

| Risk | Likelihood | Impact | Earliest Bolt | Mitigation / gate |
|---|---|---|---|---|
| #1602がXLでwalking skeletonが肥大化 | Medium | High | 1 | 最小E2Eを先に証明しつつUnit/Issueは分断せず、full DoD後にgate |
| audit-first fold/lockが性能を悪化 | Medium | High | 1 | 固定workloadとbaseline、injectable clock、lock contention証跡。閾値はbaseline後に決める |
| harness欠測を成功と誤認 | Medium | High | 1 | capability matrixでunavailable/legacy/incompleteをblocking expectationにする |
| budgetが正常処理を早期停止 | Medium | High | 2/3 | cap境界、last progress、control/treatment、人間gate。具体defaultはNFR stageでbaseline根拠から固定 |
| retryが外部副作用を重複 | Low | Critical | 2/4 | no-effect-confirmed allowlistのみ。unknown/auth/config/canonical writeはfail-closed |
| queueの二重release/enqueue | Medium | High | 4 | C2 single writer、idempotency receipt、model/property test |
| 後続brebaseで前段契約と不整合 | Medium | High | 2〜4 | merge後rebase、前段conformance再実行、次Issueの着手前gate |
| provider/CIの一過性timeout | Medium | Medium | all | deterministic suiteをblockingとし、既知のcold timeoutは対象fileを高いtimeoutで単独再実行 |

## Go/No-Go Checkpoints

- Bolt 1→2: baseline artifact、identity/duration conformance、package/promote、人間merge、後続brebaseが揃う。
- Bolt 2→3: hard budget/retry allowlist、cap境界、control/treatment、人間mergeが揃う。
- Bolt 3→4: interaction counter、resume/idempotency、review exhaustion、人間mergeが揃う。
- Intent closeout: 4 Boltのmerge、統合workload、distribution、park/resume dogfood、対象Issueの完了証跡が揃う。
