# Unit of Work Story Map — 260724-harness-provenance

上流入力(consumes 全数): components.md, component-methods.md, services.md, component-dependency.md, decisions.md, requirements.md, stories.md

## ユニット ↔ ストーリー/要件マッピング

stories.md は developer tooling のため正式なユーザーストーリーは N/A(利用シナリオのみ)。以下は単一 deployable Unit を requirements.md の FR と stories.md の利用シナリオへトレースする。components.md の Harness Detector / Harness Recorder / Field Reuse はすべて U1 内へ含め、component-methods.md の `detectHarnessType(): HarnessType` 契約と component-dependency.md の呼出関係を内部契約として維持する。

| ユニット | 対応 FR | stories.md 利用シナリオ | 検証 AC |
|---|---|---|---|
| `harness-provenance` (U1 / Harness Provenance) | FR-1(state.md 記録・HarnessType・manual override)、FR-2(CLAUDECODE 検出)、FR-3(provenance付きdot-dir補助シグナル)、FR-4(memory.md の通常 diary エントリ本文へ `Harness=<type>` を記録し、テンプレート構造は不変)、ADR-2(docs)、ADR-5(resolver) | 「実行中のハーネス種別が `amadeus-state.md` に自動記録され、後日の障害調査で特定できる」という利用シナリオ全体 | AC-1a/1b/1c/1d、AC-2a/2b、AC-3a/3b/3c、AC-3d(全6配布形態のintent birthでenvまたはscript-pathがCWD probeより先に確定)、AC-4a(template 不変)、AC-4b(state が機械参照の一次面、memory は人間可読の実在証跡) |

## トレーサビリティ確認

- requirements.md の FR-1〜FR-4 はすべて canonical unit `harness-provenance` に割り当て済み(FR-5 は Out of Scope のため割当なし)
- stories.md の唯一の利用シナリオは `harness-provenance` 単独で end-to-end に充足する
- services.md は独立サービス層を N/A と結論しているため、サービス起点の別ユニットは不要。唯一の内部呼出関係は U1 内に閉じる
- decisions.md の ADR-2(docs)、ADR-4(既存モジュールへの最小追加)、ADR-5(provenance付きresolver)も U1 の成果物・規模・検証境界に反映済み
