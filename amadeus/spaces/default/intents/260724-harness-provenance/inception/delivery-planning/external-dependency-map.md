# External Dependency Map — 260724-harness-provenance

上流入力(consumes 全数): requirements.md, stories.md, mockups.md, components.md, unit-of-work.md, unit-of-work-dependency.md, unit-of-work-story-map.md, team-practices.md

## 外部依存

外部API、外部データ、利用可能時間帯、外部チーム引継ぎ、第三者承認はない。requirements.md と stories.md はrepo内のdeveloper toolingを対象とし、mockups.mdも外部UIではなくCLI出力契約である。components.md は既存coreツール内の同期呼出だけを定義する。

| Gated item | Owner | Lead time | Blocking Bolt | Mitigation |
|---|---|---:|---|---|
| なし | N/A | 0 | なし | N/A |

## 内部前提

- unit-of-work.md / unit-of-work-dependency.md / unit-of-work-story-map.md は単一Unitのため、他Boltの先行マージを必要としない
- 全6 harness manifestとcore toolsは同一repo内の既存配布資産であり、AC-3d統合検証に外部チーム・外部サービスを必要としない
- Bun、Biome、TypeScript、repo内テスト・package/promoteスクリプトは既存project toolchainであり、新規外部依存ではない
- team-practices.md が要求するwalking-skeleton gateとPR merge承認はgovernance gateであり、外部システム統合依存ではない

## ブロッカー時の扱い

既存toolchainが利用不能な場合は、失敗をgreenとして扱わずAmadeusのhalt-and-ask経路へ送る。外部依存の代替経路を事前に捏造しない。
