# Dependencies — 260705-space-inventory

上流入力: Maintainer 直接指示（2026-07-05 チャット）

## 依存関係

- phases/*.md ← graph compile（rules_in_context）と .agents/rules/amadeus.md（@include。上流適応のため編集不可 = parity rules-file 検査）
- intents.json ← development.md / team.md が参照する正準台帳
- codekb ← 解析時点のコード実態（provenance は timestamp.md）
