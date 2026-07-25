# Bolt Plan — 260724-harness-provenance

上流入力(consumes 全数): requirements.md, stories.md, mockups.md, components.md, unit-of-work.md, unit-of-work-dependency.md, unit-of-work-story-map.md, team-practices.md

## 計画方針

org.md の `feature` 規則に従い、walking-skeleton-first を採用する。unit-of-work-dependency.md は canonical unit `harness-provenance` 一つだけの非循環DAGであり、並列化・順序比較・WSJFスコアリングの対象はない。unit-of-work.mdの単一deployable境界とunit-of-work-story-map.mdのFR/利用シナリオ全件割当を、そのまま1 Unit = 1 Bolt = 1 PRへ写像する。team-practices.md が参照する正本編集・dist再生成・セルフ昇格も同じBoltに閉じる。

## Bolt 1: harness-provenance

- **Unit**: `harness-provenance`（U1 / Harness Provenance）
- **Walking skeleton**: Yes。最初かつ唯一のBoltとして単独・ゲート付きで実行する
- **Deployment model**: `embedded`
- **Relative complexity**: `M`
- **Branching**: Construction worktree は `main` をbase/targetとし、Bolt slugを用いた短命ブランチからsquash mergeする
- **対象価値**: stories.md の「intent birth 時にハーネス種別が state.md へ自動記録され、後日の障害調査で特定できる」をend-to-endで出荷する
- **設計範囲**: components.md の Harness Detector・Harness Recorder・Field Reuseを一体として実装する。Detector内部ではprovenance付きresolverを導入し、既存`harnessDir(): string`の公開互換性を維持する。mockups.md のCLI出力契約も同じBoltで満たす

### Definition of Done

1. requirements.md の FR-1〜FR-3どおり、`AMADEUS_HARNESS_TYPE` override、`CLAUDECODE=1`、dot-dir補助シグナル、`unknown` fallbackを型付きで検証できる。invalid overrideは`unknown`へfail-closedし、自動検出へfall throughしない
2. intent birth の実FS統合テストで `amadeus-state.md` に `Harness` 行が生成され、既存のHarnessなしV7 stateを壊さない
3. Application Design ADR-5どおり、内部`HarnessDirResolution`が`env | script-path | cwd-probe | fallback`を保持し、既存`harnessDir(): string`の戻り値・env優先・cache意味論を維持する。fallback `.claude`だけを`unknown`へ写像する
4. `HARNESS_DIR_TO_TYPE`をIssue #1452対象5種のcanonical mappingとし、型・テストをmappingから導出する。`KNOWN_HARNESS_DIRS`を存在ハーネスのsource of truthとして扱わない
5. AC-3dどおり、Claude/Codex/Cursor/OpenCode/Kiro/Kiro IDEの全6配布形態で、通常intent birthが明示envまたはscript-pathでCWD probeより先に確定することを統合テストで実証する
6. requirements.md FR-4どおり、stateのHarness値を通常のstage diary本文へ `Harness=<type>` として記録した実在証跡があり、memory templateの4見出し構造と`total=0`を壊さない
7. `AMADEUS_HARNESS_TYPE` の利用者向け契約をdocsへ反映する
8. 関連unit/integrationテスト、`bun run typecheck`、`bun run lint` がgreenである
9. `bun scripts/package.ts` と `bun run promote:self` を実行し、`bun run dist:check` と `bun run promote:self:check` がgreenである
10. 承認済み要件・Application Designからの未申告逸脱がない

### Confidence hypothesis

このBoltを出荷すると、既存のstate/memory契約と全ハーネス配布面を壊さず、実行ハーネス種別をintent birthから機械参照可能なstateフィールドまで一貫して伝播できることが実証される。

### Expected demo

1. `AMADEUS_HARNESS_TYPE=manual`、invalid override、`CLAUDECODE=1` の各条件でintent birthを実行する
2. 生成された `amadeus-state.md` の `Harness` 行を表示する
3. 全6配布形態でenv/script-path解決がCWD probeより先に成立する統合テスト結果を提示する
4. 通常diaryエントリの `Harness=<type>` を表示し、memory template不変テストを実行する
5. dist/self-installドリフト検査のgreen結果を提示する

## 後続Bolt

なし。walking skeletonが製品価値全体を含むため、機能追加用の別Boltは作らない。walking-skeleton承認後のautonomy ladderは残存Boltがないため実行結果に影響しないが、実行時のプロトコル判断はAmadeusエンジンに従う。
