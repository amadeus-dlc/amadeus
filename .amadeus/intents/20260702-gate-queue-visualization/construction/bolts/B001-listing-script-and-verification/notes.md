# B001 実行メモ

## 実行方針

- Script Rules に従い、検証先行（RED から GREEN）で進める。T001 で失敗する検証を先に追加し、RED を確認してから T002 の最小実装を入れる。
- 検証の配置は `dev-scripts/evals/gate-queue-list/check.ts` とし、`index-generate` の既存 eval と同じ構成（一時ディレクトリの fixture workspace、`package.json` の `test:it:*` 入口）を使う。Bolt モジュールの未確認事項「検証の repo test chain への組み込み」はこの構成で確定する。
- スクリプトは `StateScaffold.ts` と同じ配置（`skills/amadeus-validator/scripts/`）と CLI 形式（第 1 引数 workspace）に合わせる。
- 判定語彙は `validator/generated/task-generation-contract.ts` と validator の gate 語彙を定義元にし、`GateQueueList.ts` 内に値を複製しない。
- promote 同期は T003 で行い、`R004` の「昇格済み成果物だけで実行できる」を満たす。SKILL.md の手順記載は B002 で行う。

## 対象タスク

- T001: 検証の先行追加と RED 確認。
- T002: `GateQueueList.ts` の実装と GREEN 確認。
- T003: promote 同期と非破壊確認。

## 作業順序

1. T001 で fixture workspace と検証ケースを作り、RED を記録する。
2. T002 で走査、判定、整形、CLI を実装し、GREEN を確認する。
3. T003 で昇格先を同期し、標準検証の pass を確認する。

## 実装で確定した判断

- T001 の RED は「Module not found "skills/amadeus-validator/scripts/GateQueueList.ts"」による検証失敗として確認した（`npm run test:it:gate-queue-list` が exit 非 0）。
- 承認待ちとして扱う `taskGeneration.status` は、契約カタログの `gateResultByStatus` から gate 結果が `waiting_approval` になる status を導出する（現行語彙では `ready_for_approval`）。値をスクリプト内に複製しない。
- top-level `status: waiting_approval` は `state.phase` が示す phase の行へ併記する。phase が既知の 3 phase 以外の場合は、行を落とさずゲート列を `未確認` にする（fail-safe）。
- 同一 Intent 内の行の並び順は、phase 順（ideation、inception、construction）、phase gate 行が Task Generation 行より先、Bolt ID 昇順とした。
- 昇格済みスクリプトを現 workspace と `examples/04-construction-design-ready` に対して実行し、実データでの検出（現 workspace で 3 件、examples/04 で 1 件）と exit 0 を確認した。

## 未確認事項

- Inception の実装対象 IT002 は検証の置き場所を `skills/amadeus-validator/evals/` としていたが、決定論的検証は先例（`index-generate`）に合わせて `dev-scripts/evals/gate-queue-list/` に置く。`skills/amadeus-validator/evals/evals.json` への LLM eval 追加の要否は B002 で判断する。
