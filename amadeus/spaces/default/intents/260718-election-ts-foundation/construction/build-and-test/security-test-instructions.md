# Security Test Instructions — election-ts-foundation

> 上流入力(consumes 全数): code-generation 各ユニット code-summary.md、requirements.md、bolt-plan.md、team-practices.md

## 検査項目(requirements.md の fail-closed/blind 要件の実測面)

- 入力検証: 不正票5クラス+二重票拒否(t234/t235 — FR-3b)。GoA 数値 parse("five"/0/9/2.5 拒否 — verification-numeric-parse)
- blind 性: DistributionView/ShortNotification のキー全数 assert(t234/t239 — FR-1c/FR-2a の構造保証)。falling proof はフィールド注入で赤の実測済み(各 code-summary.md)
- コマンド境界: agmsg spawn は配列引数(シェル非経由)+env 明示(t240 — bolt-plan.md Bolt 3)
- 秘匿情報: 資格情報・シークレットの取扱いなし(gh 非依存 — NFR-1)。専用スキャナ追加は N/A(team-practices.md の既存必須 scan を継承)

## 実行

上記は unit/integration 層に内包 — 個別コマンドは unit/integration の instructions を参照
