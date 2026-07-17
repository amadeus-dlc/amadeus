# Security Test Instructions — opencode-plugin-adapter(Issue #1049)

> 上流入力(consumes 全数): `../code-generation/code-generation-plan.md`(検証列・統制)、`../code-generation/code-summary.md`(出荷物・検証結果・レビュー)。2026-07-17。

## 比例選定(build-and-test:c3 — 承認済み NFR S-1〜S-5 へのトレース)

コード変更ゼロにつき新規攻撃面なし。実施した grep 検査(実測):

- S-4(credentials 不在): 本 Bolt の diff(docs 2+record 1)に秘密情報・キー類なし — `git show aa97a789d --stat` の3ファイル全読で確認
- S-3(監査整合性 = 本 unit の第一級資産): mint 未対応(fail-closed)の docs 表記が phantom HUMAN_TURN 封鎖の設計どおりであること — mapping-table.md / docs 表の突き合わせ(PR レビュー e1 が独立確認済み)
- 依存追加なし: 測定用 devDependency は revert 済み(package.json への @opencode-ai 残存 0 を grep 実測 — Forbidden「runtime dependency 追加禁止」遵守)

## 将来条件

配線 intent(#1126 後継)では S-2(注入面不存在)の機械検査 — hookFile が frozen map 固有値集合であることのテスト — を AC-3a の2系に含める。
