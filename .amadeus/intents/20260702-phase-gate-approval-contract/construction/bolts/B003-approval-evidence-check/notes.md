# B003 実行メモ

## 実行方針

dev-scripts ルールに従い、eval 先行（RED → GREEN）で進める。
検査は既存の `taskGeneration` 検査枠組みへの追加とし、`kind: approval` の実在だけを対象にする（GD002）。

既存の `passed` 34 件はすべて approval evidence を持つことを確認済みであり、既存成果物の pass 維持を検証の前提にする。

## 対象タスク

- T001: eval に approval evidence 除去の改変ケースを追加し、RED を確認する。
- T002: validator に approval evidence 検査を実装し、GREEN を確認する。

## 作業順序

1. B001 の契約文言を確定させてから着手する（Bolt 依存: B001）。
2. T001 で eval の改変ケースを追加し、RED を記録する。
3. T002 で source validator へ検査を実装し、promote 同期のうえ GREEN を確認する。

## 実装判断

- 実装調査の結果、`passed` と approval evidence の対応検査は既に validator に実装済みであることを確認した。`amadeus-contracts/catalog/task-generation.ts` 由来の `taskGenerationContract.allowedStateMatrix` が `passed` の必須 evidence kind に `approval` を含み、`stages/construction/bolt-preparation.ts` の `checkTaskGenerationStateMatrix` が照合している。approval を除去した state で「Task Generation passed は approval evidence を持つ」の fail を実際に確認した。
- そのため T002 の validator 実装と promote 同期は不要になり、B003 の実施内容は回帰 eval の追加に縮小した。Issue #307 の背景（validator はこの対応を検査しない）は、Issue 起票後の契約カタログ導入で解消済みである。
- T001 の RED 確認は、検査が既に存在するため成立しない。代わりに `runExpectFailure` が改変 fixture で該当 fail メッセージの出現を検証する形で、検査の実在を eval に固定した。
- 追加した eval は 3 ケース: (1) `passed` × approval なし → fail、(2) `passed` × approval あり → approval の fail が出ない、(3) `ready_for_approval` × approval なし → approval の fail が出ない。`runExpectOutputExcludes` helper を追加した。
- `path` の種類は限定しない（GD002）。既存検査も kind の実在だけを見ており、変更は不要である。

## 未確認事項

- 変更 PR の説明は、レビュー支援契約（挙動差分要約、skill-forge 確認、粒度制約）に従う。
