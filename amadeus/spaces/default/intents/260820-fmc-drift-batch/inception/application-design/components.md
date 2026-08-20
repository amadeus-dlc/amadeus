# Components — 260820-fmc-drift-batch

上流入力: `inception/requirements-analysis/requirements.md`(FR-ARM/REG/BND/RET + §12a Review 節)、codekb `architecture.md`(:6110 の 260820 節 — focus 4件の機序)、codekb `component-inventory.md`(plugin 構成・model-map 全数表)。`stories` / `team-practices` は不在(設計どおり)。新設コンポーネントはなく、既存4コンポーネントの変更 + 1宣言面の撤去で構成する(brownfield delta 設計。ADR-1 の leaf モジュール `authoring-routes.ts` は定数のみの終端でコンポーネントに数えない — import グラフは component-dependency.md の「循環依存なし」節で宣言)。

## C1: ApplicabilityJudge(変更)— `plugins/formal-model-check/tools/tla-applicability.ts` + `plugins/formal-model-check/stages/tla-authoring.md` + 判定契約 doc 面

- **責務**: tla-authoring 適用性判定(既存)。本 intent で「腕チェック」段(語彙 drift 検出 / 欠陥再発トリガ — AD Q3=A)を terminal route 確定の直前に追加所有する。腕は特定モデルにハードコードせず登録済み全モデルへ適用する一般形(FR-ARM-4)。#3186 の欠落は判定器コードだけでなく stage 契約側にもある(RE 実測: 発火述語 census 0 hit の対象は `stages/tla-authoring.md`)ため、**stage 契約への発火述語の明文追加**と **FR-ARM-6 の two-layer 整合の明記(判定契約の文書面 = `stages/tla-authoring.md` + `docs/reference/22-formal-model-supply.{md,ja.md}` の該当節)**も C1 の所有面とする。
- **公開面**: 既存の判定 API + 判定結果(route + receipt)。腕の検出結果は判定成果物の一部として公開(新 CLI なし)。
- **所有 unit**: applicability-arms(直列末端)。`AUTHORING_ROUTES` の import 切替(ADR-1 改訂: `tla-applicability.ts:302` の定義を leaf モジュール import へ置換)も本コンポーネントの変更として本 unit が実施。`stages/tla-authoring.md` は C4(前段)も削除面(:53)で触るため直列化が必須(C4 → C1 依存の根拠と整合)。
- **推定規模**: 実装 +250〜350 行(腕2本 + 被覆確認)、テスト +350〜450 行。

## C2: RegistrationCommitter(変更)— `plugins/formal-model-check/tools/tla-registration.ts`

- **責務**: model-map への登録 commit(既存)。本 intent で route 依存 compose(revise-model = 置換 / author-new = append)、不在名 cross-check、leaf モジュール `authoring-routes.ts` の新設と `tla-registration.ts:87` の定義→import 置換(ADR-1 改訂)を追加所有する。
- **公開面**: `commit` / `composeRegisteredMap`(route 引数追加)。`AUTHORING_ROUTES` の公開面は leaf モジュール側(ADR-1 — registration からの export はしない: 循環 import になるため)。
- **所有 unit**: revise-model-commit。t448 の再スコープも本 unit(source と test の ownership 一致)。leaf モジュール `authoring-routes.ts`(ADR-1)の新設も本 unit。**FR-REG-6(旧 FD への改訂ポインタ追記 = 他 intent record への書込)は unit の write scope に含めず、conductor がステージ作業として実施する**(サブエージェントの record 変更禁止ノルムに整合)— functional-design の成果物に改訂裁定を明記するのは本 intent の FD ステージ(conductor)。
- **推定規模**: 実装 +120〜180 行、テスト +250〜350 行。

## C3: ModelBoundary(変更)— `plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts` + `tla-model-loader-internal.ts` + `sensors/amadeus-model-completeness.md`

- **責務**: モデル実装境界の単一正本(`IMPLEMENTATION_PATHS` + containment 判定を model-map モジュールから export — AD Q2=A)。loader は import で導出し `implementationRoot` ハードコードを撤去。sensor manifest の `matches` glob は entries 全被覆へ更新 + drift テスト。
- **公開面**: `IMPLEMENTATION_PATHS` / containment 判定関数の export(新)。validator 拒否・SOURCE_DRIFT の既存エラー契約は不変(境界集合だけが広がる)。
- **所有 unit**: boundary-three-face。model-map.json への PR系2モデル entries 追加登録も本 unit。
- **推定規模**: 実装 +150〜220 行(export 化 + loader 置換 + glob 更新)、テスト +300〜400 行(両境界の落ちる実証 + drift テスト)、model-map.json entries 追加 + ハッシュピン。

## C4: AdvisoryRetirement(撤去)— `plugins/formal-model-check/plugin.json` + `tla-authoring.ts` + `stages/tla-authoring.md` + docs

- **責務**: authoring-hold advisory 経路と subjects 書き手の完全撤去(FR-RET-1〜4)。互換レイヤーゼロ。
- **公開面の変化**: `advisory hold` / `subjects declare` verb の消滅(USAGE から削除)。plugin.json `advisories[]` から authoring-hold エントリ除去(spec-change advisory は残る)。
- **所有 unit**: advisory-retirement(applicability-arms の前段 — `tla-authoring.ts` / `stages/tla-authoring.md` 共有のため直列)。
- **推定規模**: 削除 −300〜400 行、テスト削除2本(t528/t524)+ 期待値更新7本 + t450 追随、docs 2面更新。census 述語による残存ゼロ実証(census は t528/t524 削除 → `bun tests/gen-coverage-registry.ts` regen の**後**に実行 — `tests/.coverage-registry.json` は生成台帳で regen により 0 になる)。※ t481 / t527 の処分区分(RA §12a MAJOR-2)と、RFC `specs/rfc/0001-intent-autonomy-modes.md:249` の authoring-hold 言及の扱い(RA §12a MAJOR-3 — 除外条件追加か退役ポインタ追記か。後者なら C4 の書込面が1つ増える)は functional-design で確定するまで暫定(未計上)。

## 変更しないコンポーネント(境界確認)

- engine(`amadeus-orchestrate.ts` の汎用 advisory 機構 — 同名 `advisoryHold` は別物、FR-RET-3)
- `run-model-check-artifacts.ts` の isContained(用途が異なる — FR-BND-6)
- `amadeus-sensor-model-completeness.ts` の updateModelMap 経路(FR-REG-3 は registration 経路のみを変更)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-20T12:51:10Z
- **Iteration:** 1
- **Scope decision:** none

3 invocation にわたる BLOCKER 6件(C1所有面/依存辺宣言/不在宣言/辺本数説明/ADR-1循環前提の未実測/leaf同期漏れ)を全て是正し、leaf 設計は4面で一貫、census AC は算術一致。FOLLOW-UP 2件(census AC の帰属条件化、依存マトリクスへの C1 列追加)と NIT 2件は functional-design / delivery-planning への申し送り。

### Findings

- FOLLOW-UP | census AC(exact 5 hit)は leaf の派生型行で偽赤になりうる — FD で「定義箇所が leaf 1ファイルのみ・reg/app 側定義 0 件」の帰属条件へ言い換え
- FOLLOW-UP | 依存マトリクスに C1 列がなく既在辺(registration→applicability)が表に現れない — FD/DP 前に列追加
- NIT | component-dependency.md:29 の (2') は反証でなく OQ-AD-2 帰結義務 — 別段落化が安全
- NIT | ADR-1 の「arms unit の書込 = applicability」に(集約作業に限る)の限定を補う
