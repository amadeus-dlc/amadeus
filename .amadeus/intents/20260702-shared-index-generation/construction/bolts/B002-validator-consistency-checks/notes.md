# B002 実行メモ

## 実行方針

- B001 が export した生成ロジック（`buildIntentsIndex`、`buildDiscoveriesIndex`、マーカー定数）を再利用し、生成規則と検査規則を単一実装に保つ（BR008）。
- `HeadingContractViolationError` は B001 で validator 統合を見据えて throw 設計になっている。catch して fail 報告に変換する。
- この Bolt の完了時点では、実 workspace と examples が未 migration のため `npm run test:all` の index 整合検査は fail する。これは repo 規模の RED として意図された中間状態であり、B004 の migration が GREEN にする。

## 対象タスク

- T001: validator 統合の検証ケース追加と RED 確認。
- T002: 不整合検査の実装と GREEN 確認。
- T003: promote 同期と、意図された中間 fail の記録。

## 作業順序

1. T001 で検証ケースを追加し、RED を記録する。
2. T002 で validator に検査を実装し、GREEN を確認する。
3. T003 で promote 同期し、`test:all` の fail が意図した対象だけであることを確認する。

## 未確認事項

- 検査カテゴリの名前は実装時に既存カテゴリの語彙に合わせて確定する。

## レビュー対応

- Cursor Bugbot の指摘（PR #348、Medium）: Discovery の `state.json` が欠落または不正な場合、例外が rethrow されて validator の run 全体が中断し、実行環境の blocked として報告されていた。
- 対応: `IndexGenerate.ts` が state.json の欠落と JSON 解釈不能を契約違反として収集し、validator は「Index 生成整合: 配下モジュールの state.json が読める」の構造化された fail として報告する。検証に state.json 欠落ケースを RED から GREEN で追加した。
