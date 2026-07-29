# Feasibility — 質問票

Stage: feasibility (ideation)
Depth: Standard（目安 5-8 問）
Context: `intent-statement.md`（Q5/Q6 で 1 Intent・hard gate 方針が確定済み）。ステージ例の汎用設問（AWS・規制・予算）は本取り組みに該当しないため、実現可能性上の真の不確実性に絞って設問を文脈適応した。

## 判定と根拠（E-OC1 3段順序）

- Q1-Q6: 選挙不要 — ソロ運用。ユーザー本人が AskUserQuestion で直接回答（HUMAN_TURN 実測）
- leader 承認: ユーザー本人の直接回答をもって承認済み 2026-07-29T05:55:29Z

---

## Q1. OTel Logs API の安定性リスクをどう許容するか？

JS の Logs Bridge／Event API（`@opentelemetry/api-logs`、`sdk-events`）は Trace API と違い stability が低い（Development 寄り）。canonical audit の担い手に据えることの許容方針は。

- A. Phase 1 ADR で採否を確定するまで仮説扱い — `@opentelemetry/api-logs` 利用と最小 EventRecord 独自 Interface の両案を walking skeleton で実測比較し、不合格条件の一部とする（#1678 どおり）
- B. 独自の最小 EventRecord Interface を既定とし、OTel Logs API には寄せない
- C. `@opentelemetry/api-logs` 採用を既定とし、version pin と upstream 追従方針だけ決める
- X. Other (please specify)

[Answer]: A. Phase 1 ADR で採否を確定するまで仮説扱い — 両案を walking skeleton で実測比較（#1678 どおり）

## Q2. Bun での Context 維持の実現性に対する前提は？

Bun は AsyncLocalStorage 対応とされるが、`@opentelemetry/context-async-hooks` がそのまま動く保証はない。feasibility 上の前提としてどう置くか。

- A. 仮説: 既製 Context Manager が Bun で動く。Phase 1 で最初に検証し、不成立時のみ Amadeus Adapter を自前実装する（#1678 どおり）
- B. 自前 Context Manager を最初から実装前提にする
- C. Context 維持が不成立なら initiative 自体を撤回する hard gate 条件とする
- X. Other (please specify)

[Answer]: A. 仮説: 既製 Context Manager が Bun で動く。Phase 1 で最初に検証し、不成立時のみ Amadeus Adapter を自前実装（#1678 どおり）

## Q3. 配布制約（Bun-only 単一 bundle）との整合は？

`@opentelemetry/api` 等の追加は runtime dependency に当たる。project.md の Forbidden「利用者側の Bun-only 前提を変更する理由を文書化せず、配布フレームワークへ runtime dependency を追加しない」にどう整合させるか。

- A. bundle へ取り込む（依存として import し bun build の単一 bundle に含める）ため利用者側の Bun-only 前提は変わらない。追加理由を ADR に文書化する
- B. 依存追加を避け、必要な OTel API 型・契約を自前実装する（vendoring）
- C. 制約の解釈を Phase 1 ADR で確定するまで未決とする
- X. Other (please specify)

[Answer]: A. bundle へ取り込む。利用者側の Bun-only 前提は変わらず、追加理由を ADR に文書化する

## Q4. 同期 I/O の性能予算は？

canonical Event ごとに lock 取得＋同期 append が発生し、tool 呼出し等の hot path の同期 I/O 点になる。許容予算の置き方は。

- A. 現行 appendAuditEntry と同等（既に lock＋sync append）なので回帰なしとみなし、Phase 1 で cold/warm 実測して予算を数値化する（#1678 の計測項目どおり）
- B. 厳しい予算（例: 現行比 +10% 以内）を事前に設定し、超過なら設計見直し
- C. 性能は Phase 1 の観測対象であり、予算は計測後に決める
- X. Other (please specify)

[Answer]: A. 現行 appendAuditEntry と同等なので回帰なしとみなし、Phase 1 で cold/warm 実測して予算を数値化する

## Q5. 移行規模の実行可能性に制約はあるか？

約1600 call site の段階移行、mixed schema merge、全 harness 生成面の同期を 1 Intent で扱う。期間・並行作業の制約は。

- A. 制約なし — 長寿命 Intent として session を跨ぎ resume しながら進める。並行化は Unit/Bolt で行う
- B. Phase 1 合格後に後続 Phase の着手時期を再評価する（他の優先 intent が入りうる）
- C. 期限またはマイルストーンがある
- X. Other (please specify)

[Answer]: A. 制約なし — 長寿命 Intent として session を跨ぎ resume しながら進める。並行化は Unit/Bolt で行う

## Q6. 組織的ブロッカーはあるか？

`packages/framework/core/tools/` の audit/observability 系を大きく触るため、他 intent との競合がありうる。

- A. ブロッカーなし — 関連領域を触る進行中 intent はなく、変更凍結等もない
- B. 競合しうる intent・作業がある
- C. 不明 — 起動中の他 worktree/intent を確認してから回答する
- X. Other (please specify)

[Answer]: A. ブロッカーなし — 関連領域を触る進行中 intent はなく、変更凍結等もない
