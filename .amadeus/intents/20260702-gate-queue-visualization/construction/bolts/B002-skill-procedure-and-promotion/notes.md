# B002 実行メモ

## 実行方針

- 記載先は `skills/amadeus-validator/SKILL.md` の `## 同梱スクリプト` とする。`StateScaffold.ts` の既存記載と同居させ、利用者が同じ見出しから同梱スクリプトの手順を読めるようにする。B002 の未確認事項「手順を置く見出しの位置」はこれで確定する。
- 記載内容は BR001〜BR007 の契約（判定条件、Markdown 表、0 件表示、exit code、対象外の扱い）の利用者向け要約とし、契約の定義元は Functional Design のまま変えない。
- promote 同期は T002 で行い、`npm run test:all`（`test:it:gate-queue-list` を含む）で非破壊を確認する。

## 対象タスク

- T001: SKILL.md への手順記載。
- T002: promote 同期と非破壊確認。

## 作業順序

1. T001 で SKILL.md へ手順を追記する。
2. T002 で昇格先を同期し、標準検証の pass を確認する。

## 実行準備で確定した判断

- `skills/amadeus-validator/evals/evals.json` への LLM eval 追加は行わない。受け入れ条件は決定論的検証（`test:it:gate-queue-list`）で固定済みであり、evals.json は validator skill の利用振る舞い評価が目的で、同梱スクリプト単体の契約検証には過剰であるため（B001 notes の未確認事項の解消）。
- `README.md` など skill 文書以外への記載は行わない。R004 の受け入れ条件は「amadeus-validator の利用者向け文書から読める」であり、SKILL.md への記載で満たせるため（Bolt モジュールの未確認事項の解消）。

## 未確認事項

- なし。
