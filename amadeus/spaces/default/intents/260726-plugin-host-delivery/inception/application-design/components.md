# Components — plugin-host-delivery

> 上流入力(consumes 全数): requirements、architecture、component-inventory、team-practices
> requirements.md FR-1〜FR-10 を実現するコンポーネント分割。codekb architecture.md「plugin 導入 UX と第7ディストリ面の現況」節と component-inventory.md の既存資産実測を Reuse Inventory の基礎とし、team-practices.md の対応表(engine 単一実装・harness 境界・count-free)を設計制約とする。

## 前提となる実測(設計の接地)

- compose engine(`scripts/plugin-composition.ts`、1365 行)は**配布されていない**(`dist/claude/.claude/tools/` に plugin 系 0 件 — 2026-07-26 実測)。依存は node 組込+ `packages/framework/core/tools/amadeus-lib.ts` / `amadeus-stage-schema.ts` + `scripts/plugin-projection.ts` の ReadOnlyFs のみ(import 実測)— core/tools への移設は追加依存なしで可能
- 中立バンドル `dist/plugins/formal-model-check/` = plugin.json + README + stages/(実測)。ホスト投影は不在
- engine 側は composition record(`.amadeus-plugin-composition.json`)読取配線を既に持つ(amadeus-graph.ts:1897 / amadeus-orchestrate.ts:901)

## コンポーネント一覧(規模は行数見積り — units-generation で精緻化)

| ID | コンポーネント | 責務 | 対応 FR | 新規/変更 | 見積り |
|---|---|---|---|---|---|
| C1 | `amadeus-plugin.ts`(core/tools 新設 CLI) | compose / doctor / drop / status verb。既存 engine 関数(planPluginComposition / applyPluginPlan / planPluginDrop / diagnosePlugins / runRecovery)への薄い配線のみ。`--if-stale` フラグで no-op 高速路(FR-3c)。compose / drop 成功後の再 compile 起動(既存 `amadeus-runtime.ts compile` 呼び出し)を含み、FR-4(a)-(e) の合成意味論自体は C2 engine と既存 graph compile が担う(C1 は起動責務のみ) | FR-3a/3c, **FR-4(起動+統合の責務)**, FR-5, FR-6 | 新規 | 250-350 行 |
| C2 | compose engine の core 移設 | `scripts/plugin-composition.ts` → `packages/framework/core/tools/amadeus-plugin-compose.ts` へ移設(ReadOnlyFs seam の最小移設を含む)。旧パスの互換 re-export は置かない(org.md Forbidden — 互換シム禁止)。消費側(scripts/package.ts・既存テスト t252-254 等)の import を同一変更で更新 | FR-3 全体の前提, **FR-4(a)-(e)(合成意味論の実体 — set-union / fragment 順序 / 相互非上書きは engine 実装が担い、既存 t252/t253 系+C7 で検証)** | 移設+import 更新 | 差分 100-200 行(本体は移動) |
| C3 | host projection(packaging 拡張) | `scripts/package.ts` / `plugin-projection.ts` を拡張し、中立正本から `dist/plugins/<name>/<harness>/` のホスト別インストール成果物(host manifest・marketplace metadata・hook snippet・plugin 内容)を生成。`--check` の stale/orphan 検出へ編入。0-plugin byte-identical 維持 | FR-2 | 変更 | 400-600 行 |
| C4 | ハーネス別フック配線(7 面) | 各 `harness/<name>/hooks/`(claude は settings hooks)の session-start 相当から C1 の `compose --if-stale` を起動。FR-1 マトリクスで trigger 非対応と確定した面は配線せず degrade 契約を文書化+doctor 可観測(C5) | FR-3b | 変更(面ごと小) | 30-80 行 × 対応面数 |
| C5 | doctor 統合 | `amadeus-utility.ts` の doctor 出力に plugin 行(installed / composed / drift / dropped surfaces、[degraded]=FAIL / [advisory]=PASS(advisory))を追加。判定は diagnosePlugins の既存戻り値のみ消費 | FR-5, FR-1(degrade 可観測) | 変更 | 80-150 行 |
| C6 | activation policy 実装 | decisions.md ADR-1 の裁定に従う(既定案: spec 変更検出の決定的ゲート)。compose 済み plugin stage の通常到達経路+発動判定 | FR-7 | 新規 | 100-200 行 |
| C7 | 適合テスト+追跡表 | 上流 t188 32 ケースの追跡表(`docs/reference/` 配下 or tests 併設)と、compose 意味論(ハーネス非依存 1 回)/投影・trigger(ハーネス別)の層別テスト。native hook 実起動テストを含む | FR-8, FR-10 | 新規 | テスト 1,000-1,800 行+表 |
| C8 | docs 同期 | `docs/guide/19-plugins{,.ja}.md` を実装後の install / doctor / drop 手順へ更新 | FR-9 | 変更 | 100-200 行 |
| C9 | 能力マトリクス(文書+プローブ) | 7 ハーネスの導入機構・trigger 語彙・root 解決の実測文書(record 成果物)。実装コンポーネントの確定条件 | FR-1 | 新規(文書) | 文書(コード外) |

## Reuse Inventory(新規機構を作らない根拠)

- 合成・drop・診断・復旧: 既存 engine をそのまま呼ぶ(重複実装禁止 — requirements FR-3a)
- 再コンパイル: 既存 `amadeus-runtime.ts compile` / graph の composition record 配線を再利用(新コンパイラなし)
- drift 検査: 既存 `dist:check` / `promote:self:check` の枠に C3 出力を編入(新ガード新設なし)
- フック: 既存 7 面のアダプタ/settings hooks に呼び出しを追加(新フック機構なし)
- CLI 様式: `amadeus-mirror.ts` の verb 型 CLI を既習様式として踏襲(新 UX 発明なし)

## 除外(本設計で作らないもの)

adapter・登録スロットの先行着地(inception.md N3)、plugin 独自 scope・`when:` 評価エンジン・lockfile(requirements スコープ外)、テストダブル用の本番分岐(construction.md Testing Standards)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T15:09:41Z
- **Iteration:** 1
- **Scope decision:** none

設計は上流入力に接地し ADR も代替案・セキュリティ影響を備えるが、(1) FR-4 が FR↔コンポーネント対応表から漏落、(2) ADR-3 の no-help-probe 引用と緩和策(引数なし限定)の意味論不一致+未知フラグ扱い未定義、の Major 2 件で NOT-READY(Minor: C6 の engine 側変更内訳の不明瞭、engine 関数名引用の次段再検証留意)。

### Findings

- [Major] components.md 対応表に FR-4 の割当がない — 再 compile・scope 統合の責務コンポーネントが追跡不能
- [Major] decisions.md ADR-3 のセキュリティ影響が no-help-probe cid の実リスク(未知フラグ無視での mutation 実行)を緩和していない — C1 verb 表に未知フラグ拒否の定義がない(citation-semantics-check)
- [Minor] component-dependency.md の C6 非循環根拠が component-methods.md の engine 側 advisory 変更と表現齟齬 — 見積りへの engine 側内訳明記を推奨
- [Minor] Reuse Inventory の engine 関数名は requirements 継承引用 — units-generation/code-generation 段での再検証を留意(mechanism-cite-verify の3段)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-26T15:12:00Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の Major 2 件・Minor 1 件は全て是正済みで閉包を実測確認。FR-4 は C1(起動+統合)/C2(合成意味論)へ明示配賦、ADR-3 は未知フラグ fail-closed 拒否で意味論一致、C6 の engine 側内訳も一貫明文化。

### Findings

- None
