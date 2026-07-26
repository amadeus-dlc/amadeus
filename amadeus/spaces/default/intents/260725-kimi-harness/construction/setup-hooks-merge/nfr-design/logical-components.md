上流入力(consumes 全数): performance-requirements, security-requirements, scalability-requirements, reliability-requirements, tech-stack-decisions, business-logic-model

# Logical Components — setup-hooks-merge

> 上流入力の使用箇所: tech-stack-decisions.md §選択(domain+modules 分離・構造的文字列処理・既存 apply-write)と business-logic-model.md §マージフローを構造の根拠とする。

## 対象の概要

本 Unit の論理構成は「domain(純粋ロジック) → modules(組込み) → 既存 ports(実行)」の3層。

## 構成

| 論理部品 | 役割 | 対応する実体 |
|---|---|---|
| domain/kimi-hooks | renderManagedBlock/planMerge/applyMerge/removeManagedBlock(純粋) | `packages/setup/src/domain/kimi-hooks.ts` |
| modules/kimi-hooks | plan report 組込み・wizard confirm 連携・バックアップ・除去導線 | `packages/setup/src/modules/kimi-hooks.ts` |
| 既存 ports | tty(confirm)・apply-write(atomic)・fsops(ファイル操作 — `packages/setup/src/ports/` 実在) | 既存(変更なし) |
| snippet 正本 | managed block の内容ソース | dist/kimi の `hooks/amadeus-hooks.snippet.toml` |

## 関係

- domain は I/O を持たず全て単体テスト可能。modules は domain と ports を結ぶだけで、マージの判定ロジックを持たない(tech-stack-decisions.md §選択の分離意図)
- snippet の内容は本 Unit では opaque(内容は U2 の live capture で確定する設計)
