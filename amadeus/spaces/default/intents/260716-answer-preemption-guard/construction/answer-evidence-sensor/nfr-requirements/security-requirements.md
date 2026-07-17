# Security Requirements — answer-evidence-sensor

上流入力(consumes 全数): unit FD 4点(`../functional-design/business-logic-model.md`・`business-rules.md`・`domain-entities.md`・`frontend-components.md`)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜7)、codekb `technology-stack.md`(Bun/TS/Biome 前提)。

## 要件

- S-1: 入力(--output-path)は read-only 消費 — 書込み・削除・実行なし。パスは検査対象の実在ファイルに限り、内容は述語(checkQuestionsEvidence)以外へ流さない。
- S-2: シークレット・認証情報の取扱いなし(構造的 N/A — 根拠: 入出力は record 内 md と stdout JSON のみ)。
- S-3: 攻撃面の増加なし — 新規ネットワーク・環境変数・外部プロセスを導入しない(spawn されるのは既存 dispatcher からのみ)。

## 検証

比例選定(build-and-test:c3): 上記が全て構造的 N/A ないし read-only のため専用セキュリティ検査は追加せず、既存必須 scan(CI の lint/typecheck)を省略しない。
