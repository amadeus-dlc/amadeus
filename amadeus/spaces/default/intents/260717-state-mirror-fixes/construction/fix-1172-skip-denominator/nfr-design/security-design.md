# Security Design — fix-1172-skip-denominator(nfr-design)

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 設計(S-1/S-2 の実現)

- security-requirements.md S-1: 関数シグネチャ・入力面不変(純関数の内部条件1本のみ)
- S-2: gh 境界・外部送信は本 diff に現れない — PR レビューで diff 面の機械確認(fetch/socket/spawn の grep 0)

## セキュリティレビュー観点

正規表現は固定リテラル(ユーザー入力由来のパターン構築なし)— ReDoS 面の新規リスクなし(`\s*$` 末尾アンカーの単純形)。
