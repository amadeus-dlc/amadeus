# B004 実行メモ

## 実行方針

- migration は生成結果を正とする（Construction D001）。行順は識別子の辞書順へ正規化され、依存関係表は依存ごとの行に分割される。情報の欠落がないことを diff レビューで確認する。
- 見出しの追加は、現行 `intents.md` の文言をそのまま移す。文言の改善や言い換えをしない。
- examples の補修は、skill、template、validator の契約変更（B001 から B003）を先行させたうえでの機械的な適合であり、examples ルールに整合する。real provider による再生成は行わないため、B003 で変更した skill の provenance は staleReason の追記で扱う（Issue #179 で確立済みの運用）。
- B002 完了時点の中間 RED（Index 生成整合の fail）を、この Bolt がすべて GREEN にする。

## 対象タスク

- T001: workspace migration（このリポジトリの `.amadeus/`）。
- T002: eval fixture migration（amadeus-validator、amadeus-validator-domain、state-scaffold）。
- T003: examples migration と provenance の staleReason 整備。
- T004: 全体検証（`test:all` GREEN）。

## 作業順序

1. T001 で workspace を適合させ、Index 生成整合の fail 0 を確認する。
2. T002 と T003 は T001 の後、互いに独立して進められる。
3. T004 で全体の GREEN を確認する。

## 実装で確定した判断

- `dev-scripts/evals/llm-templates/check.ts` の fixture も旧形式の index を合成しており Index 生成整合で fail したため、許可リスト外だが同種の最小適合を行った（詳細: test-results.md の補足）。
- eval 専用の合成 Intent fixture 2 件は移設元がないため、最小の概要と依存を新規に書いた。
- `examples/skill-provenance.json` は全対象 entry に staleReason 登録済みのため変更不要だった。

## 未確認事項

- fixture の適合方法（fixture 生成コードへの見出し追加か、期待値ファイルの更新か）は各 eval の構造を見て実装時に確定する。
