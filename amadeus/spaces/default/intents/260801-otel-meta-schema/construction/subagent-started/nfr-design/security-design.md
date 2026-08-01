# Security Design — U4 subagent-started

上流入力(consumes 全数): security-requirements ほか performance-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在(expected)— セキュリティ要件は requirements.md の redaction 原則+ project.md Mandated(export-boundary-redaction)から代替導出。business-logic-model.md(実在)の Purpose 統制(200字・先頭1行)と safe-key 自動追従を消費。tech-stack 前提は codekb technology-stack.md 260801 現在節に依拠。

## Purpose の情報統制

- Purpose は subagent prompt 由来の自由文字列 — **先頭1行のみ+200字切詰め**(SubagentStop の Message 200字既習形と同値)で、prompt 全文・複数行の機微文脈が store へ流れる面を構造的に絞る
- registry の safe-key 自動追従(redaction.ts の REGISTRY_ATTRIBUTE_KEYS 機械導出)により、SUBAGENT_STARTED の属性キーは redaction allowlist へ自動編入 — 値は既存 scrubCredentials を通過(二層原則の write 層)。export 境界層は既存 redaction 無改変

## registry 統制(fail-closed 面)

- SUBAGENT_STARTED は canonical registry への正規追加(79 化)— required=["Agent Type"] の検証は fail-closed 不変(NFR-1 の例外条項)。未登録イベント名での emit は既存 admission ガード(t385)が拒否

## 検証

- credential 形値・複数行 prompt を含む Purpose 注入で (a) 1行化 (b) 200字上限 (c) scrub 済み、を assert(落ちる実証)
