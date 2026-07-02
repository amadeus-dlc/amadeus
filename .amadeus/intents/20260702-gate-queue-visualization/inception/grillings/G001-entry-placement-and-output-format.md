# G001: 実行入口の配置先と出力形式

## 概要

- 状態: completed
- 対象: Intent
- 反映先: [requirements.md](requirements.md)

## 確定判断

| ID | 判断 | 状態 | 反映先 | 置き換え先 |
|---|---|---|---|---|
| GD001 | ゲート待ちキュー一覧の実行入口は `amadeus-validator` 同梱（`skills/amadeus-validator/scripts/`、昇格先 `.agents/skills/amadeus-validator/scripts/`）にする。 | active | [R004-distribution-and-procedure.md](requirements/R004-distribution-and-procedure.md) | なし |
| GD002 | 一覧の出力形式は Markdown 表にし、承認待ち 0 件の場合はその旨を表示する。 | active | [R002-approval-queue-listing.md](requirements/R002-approval-queue-listing.md)、[R003-zero-waiting-visibility.md](requirements/R003-zero-waiting-visibility.md) | なし |

## 質問記録

### Q001

- 確定判断: GD001
- 確認したいこと: ゲート待ちキュー一覧の実行入口（同梱スクリプト）をどの skill に置くか。
- 確認が必要な理由: 配布先ユーザー環境での実行が受け入れ条件であり、配置先が Unit の実装対象と Bolt 分割を決めるため。
- 推奨回答: `amadeus-validator` 同梱（`skills/amadeus-validator/scripts/`）。
- 推奨理由: 一覧は ideation、inception、construction の全 phase を横断して `state.json` を読むため、特定 phase の skill（`amadeus-construction` の `list-unfinalized-intents.ts` と同居）より、workspace 横断ユーティリティの先例（`StateScaffold.ts`、`IndexGenerate.ts`）がある validator 同梱が自然である。新規 skill はスクリプト 1 本のためには過剰である。
- ユーザー回答: `amadeus-validator` 同梱にする。

### Q002

- 確定判断: GD002
- 確認したいこと: 承認待ち一覧の出力形式をどれにするか。
- 確認が必要な理由: 出力形式は受け入れ条件「1 回の実行で一覧できる」「0 件の場合もその旨が分かる」の観測方法を決め、Requirement の受け入れ状態と Construction の検証（RED → GREEN）の判定基準になるため。
- 推奨回答: Markdown 表（0 件時はその旨を表示）。
- 推奨理由: 主利用者はゲート審査官（人間）であり、そのまま読める形式が目的に合う。プレーンテキスト行は 4 列の情報の一望に不向きで、JSON オプションは今回の受け入れ条件には不要である。
- ユーザー回答: Markdown 表にする。
