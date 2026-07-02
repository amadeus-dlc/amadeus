# R004 配布先ユーザー環境での実行と手順の記載

## 要求

一覧の実行入口が配布先ユーザー環境（repo root の開発用スクリプトなし）で実行でき、実行手順が `amadeus-validator` の利用者向け文書から読める。

## 背景

G001 の確定判断（GD001）により、実行入口は `amadeus-validator` 同梱にする。
一覧は ideation、inception、construction の全 phase を横断して `state.json` を読むため、特定 phase の skill より、workspace 横断ユーティリティの先例（`StateScaffold.ts`、`IndexGenerate.ts`）がある validator 同梱が自然である。

## 受け入れ条件

- 昇格済み成果物（`.agents/skills/amadeus-validator/scripts/` 配下）だけで一覧を実行できる。
- source skill（`skills/amadeus-validator/`）と昇格先が promote 手順で同期されている。
- 実行手順（コマンド）が `amadeus-validator` の利用者向け文書から読める。

## 依存

R002。

## 対応する対象境界

- SC-IN-003

## 未確認事項

- 利用者向け文書のどの見出しに手順を置くかは、Construction Functional Design で確定する。
