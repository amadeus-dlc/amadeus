# Unit of Work Story Map — 260724-harness-provenance

上流入力(consumes 全数): components.md, component-methods.md, services.md, component-dependency.md, decisions.md, requirements.md, stories.md

## ユニット ↔ ストーリー/要件マッピング

stories.md は developer tooling のため正式なユーザーストーリーは N/A(利用シナリオのみ)。以下は各ユニットを requirements.md の FR と stories.md の利用シナリオへトレースする。

| ユニット | 対応 FR | stories.md 利用シナリオ | 検証 AC |
|---|---|---|---|
| U1: Harness Detector | FR-1(HarnessType 型)、FR-2(CLAUDECODE 検出)、FR-3(dot-dir 補助シグナル)、FR-1 AC-1d(AMADEUS_HARNESS_TYPE override) | 「実行中のハーネス種別が…自動記録されてほしい」の**検出**部分 | AC-1d(AMADEUS_HARNESS_TYPE override 経由の manual 指定)、AC-2a/2b(env var 検出)、AC-3a/3b/3c(dot-dir・override・unknown フォールバック) |
| U2: Harness Recorder | FR-1(state.md 記録)、FR-4(memory.md 非構造的 = テンプレート不変)、ADR-2(docs) | 「…自動記録されてほしい」の**記録**部分、「後日の障害調査でハーネス種別を特定できる」(intent-statement Problem Statement) | AC-1a(Harness 行の存在)、AC-1b(既存 V7 検証不破壊)、AC-1c(getField 読取)、AC-4a(t100 green) |

## トレーサビリティ確認

- requirements.md の FR-1〜FR-4 はすべていずれかのユニットに割り当て済み(FR-5 は Out of Scope のため割当なし)
- stories.md の唯一の利用シナリオ(自動記録)は U1(検出)+ U2(記録)の直列で充足
- 承認済み設計(components.md の3コンポーネント)のうち Component 3(Field Reuse)は U2 の検証 AC(AC-1c)で既存ヘルパー再利用として吸収(独立ユニット不要)
- services.md は独立サービス層を N/A と結論しており、本トレーサビリティにサービス起点のストーリーは現れない — U1→U2 の関数呼出依存(services.md の唯一の内部呼出関係)がユニット割当の粒度に一致する
