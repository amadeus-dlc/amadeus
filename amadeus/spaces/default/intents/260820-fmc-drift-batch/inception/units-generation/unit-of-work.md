# Units of Work — 260820-fmc-drift-batch

上流入力: `inception/application-design/` の5成果物(components C1〜C4、component-methods、services、component-dependency の依存2辺、decisions ADR-1〜3)と `inception/requirements-analysis/requirements.md`(FR 群)。1 Issue = 1 Unit 原則(project.md cid:units-generation:c1)に従い4 unit。規模は数値(実装+テスト LOC、AD の per-component 見積を継承)。

## U1: revise-model-commit(#2289 / C2)

- **kind**: library(standalone runtime を持たない plugin 内部ロジック — CLI verb の挙動面は変えるが verb 自体の追加・削除はなく、変更の実体は再利用コードの意味論)/ **deployment model**: なし(bun 直接実行の CLI に同梱、デプロイ単位なし)/ **相対複雑度**: M
- **責務**: route 依存 compose(revise-model = 同名置換 / author-new = append)、不在名 cross-check(fail-open 閉鎖)、provenance last-writer-wins、leaf モジュール `authoring-routes.ts` 新設 + `tla-registration.ts:87` の定義→import 置換、t448 再スコープ(zero-assertion 形の是正込み)。
- **担当 FR**: FR-REG-1〜5(FR-REG-5 は「leaf 新設 + registration 側置換」の前半のみ — applicability 側置換は U4)。FR-REG-6 は conductor のステージ作業(unit write scope 外)。
- **write scope**: `plugins/formal-model-check/tools/tla-registration.ts`、`plugins/formal-model-check/tools/authoring-routes.ts`(新規)、`tests/unit/t448-tla-registration.test.ts`、新規テストファイル(本 unit 名義)、生成台帳(`tests/.coverage-registry.json` regen — 下記「生成台帳の扱い」)。
- **規模**: 実装 +120〜180 行 + leaf 約20行、テスト +250〜350 行。
- **受け入れ基準**: 3面テスト(置換成功/置換対象不在/author-new 同名衝突)+ fail-open 閉鎖テスト green(TDD 先行)。census: `git grep -n -F 'AUTHORING_ROUTES' -- plugins/formal-model-check/tools/` で registration 側の定義 0 件・leaf に定義 1 件(帰属条件 — AD §12a FOLLOW-UP の較正どおり exact hit 数ではなく帰属で判定)。t448 に `if (!snapshot.ok) return;` 型の無音 pass が残存しないこと。

## U2: boundary-three-face(#2929 / C3)

- **kind**: library(境界述語と loader の内部整合 — 公開 CLI 面の変更なし)/ **deployment model**: なし / **相対複雑度**: L(3面同時是正 + 落ちる実証2本)
- **責務**: `IMPLEMENTATION_PATHS` へ一般形タプル追加 + export(単一正本化)、loader の `implementationRoot` ハードコード撤去 → import 導出、sensor `matches` glob の entries 全被覆化 + drift テスト新設、PR系2モデルへの plugin 実装 entries 追加登録(経路は OQ-AD-1 の FD 確定に従う)+ model-map ハッシュピン resync。
- **担当 FR**: FR-BND-1〜6。
- **write scope**: `plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts`、`plugins/formal-model-check/tools/tla-model-loader-internal.ts`、`plugins/formal-model-check/sensors/amadeus-model-completeness.md`、`amadeus/spaces/default/specs/tla/model-map.json`、`tests/unit/t-formal-verif-canonical-core.test.ts`、新規テスト(loader 落ちる実証 + glob drift)、生成台帳(`tests/.coverage-registry.json` regen)。
- **規模**: 実装 +150〜220 行、テスト +300〜400 行。
- **受け入れ基準**: 両境界の落ちる実証(validator = 既存テスト拡張、loader = 新設 — 現状テスト 0 件を実測済み)green。plugin implPath entry が parse → load → TLC の全経路を通過し SOURCE_DRIFT 検知が実測で機能。glob drift テストが境界定義・entries と非整合時に赤。

## U3: advisory-retirement(#3187 / C4)

- **kind**: library(宣言面 + 内部経路の撤去 — CLI verb 2件の削除を含むが新設 runtime なし)/ **deployment model**: なし / **相対複雑度**: M(削除中心だがテスト面が広い)
- **責務**: authoring-hold advisory 宣言・advisory 経路コード・subjects 書き手・stage 契約 :53・docs 2面の完全撤去。互換レイヤーゼロ。テスト: t528/t524 削除、t450 pin 追随、7本の期待値更新、t481/t527 は FD 確定の処分に従う。coverage-registry regen 同梱。
- **担当 FR**: FR-RET-1〜4。
- **write scope**: `plugins/formal-model-check/plugin.json`、`plugins/formal-model-check/tools/tla-authoring.ts`(advisory/subjects 面の削除のみ)、`plugins/formal-model-check/stages/tla-authoring.md`(:53 削除面のみ)、`docs/reference/22-formal-model-supply.{md,ja.md}`、該当テスト群(FR-RET-3 の名指し: t528 / t524 / t450 / t526 / t529 / t532 / t444 / t445 / t353 / t113 — t481 / t527 は FD 確定後に追加)、生成台帳(`tests/.coverage-registry.json` regen)。
- **規模**: 削除 −300〜400 行、テスト削除2本 + 更新7本 + t450(t481/t527 は FD 確定後に計上)。
- **受け入れ基準**: FR-RET-4 の census 述語(キー集合9・対象集合・除外条件、regen 後実行、対照リテラル併走)で残存ゼロ — ただし**除外条件の確定(RFC `specs/rfc/0001-intent-autonomy-modes.md:249` の扱い — RA §12a MAJOR-3)は functional-design 待ち**であり、確定前の census 実行を AC 充足と扱わない(t481/t527 と同じ保留形式)。`bun run build` 後の投影面でも同 census 0。

## U4: applicability-arms(#3186 / C1、直列末端)

- **kind**: library(判定 pipeline の段追加 — applicability verb の出力面は変わるが verb 追加なし)/ **deployment model**: なし / **相対複雑度**: L(腕2本 + 落ちる実証 + 閾値較正)
- **責務**: 判定 pipeline への armCheck(vocabularyDrift / defectRecurrence)+ coverageCheck 段の追加(一般形・fail-closed・receipt 整合・non-target 再分類禁止)、`tla-applicability.ts:302` の定義→leaf import 置換(FR-REG-5 後半)、stage 契約への発火述語明文追加 + FR-ARM-6 の two-layer 整合明記、閾値の観測レンジ内確定(OQ-4)。
- **担当 FR**: FR-ARM-1〜7 + FR-REG-5(後半)。
- **write scope**: `plugins/formal-model-check/tools/tla-applicability.ts`、`plugins/formal-model-check/tools/tla-authoring.ts`(applicability verb の出力面へ腕チェック結果を露出する dispatch 変更 — services.md の CLI 面変化と整合)、`plugins/formal-model-check/stages/tla-authoring.md`(:51 近傍の追加面)、`docs/reference/22-formal-model-supply.{md,ja.md}`(U3 の撤去後断面に追記)、新規テスト、生成台帳(`tests/.coverage-registry.json` regen)。
- **規模**: 実装 +250〜350 行、テスト +350〜450 行。
- **受け入れ基準**: FR-ARM-1 の落ちる実証(PrConvergenceGate `landed` 不在の実 corpus で赤 → 是正経路提示 → 緑)1セット。FR-ARM-2 の両側テスト + 閾値両側固定。census: applicability 側の AUTHORING_ROUTES 定義 0 件(帰属条件)。

## Unit 外の作業(conductor 所有)

- FR-REG-6: functional-design 成果物への改訂裁定明記 + 旧 FD(`260804-tla-authoring/.../business-logic-model.md`)への改訂ポインタ追記(record 書込は conductor)。
- FR-X-4: t448 自己参照比較の bug Issue 起票 — conductor 帰属の根拠: remote write は unit builder の write scope 外で、承認境界(requirements.md FR-X-4 / §11c)を通す必要があるため(units-generation で新規に明文化した帰属であり AD には現れない — 無申告ではなくここが宣言点)。
- 各 Bolt PR の record checkpoint・マージ(常任承認条件下)・Issue クローズ。

## 独立実装可能性の検証(Delivery Planning 前提)

各 unit は自 write scope 内で test green まで到達可能(U1: registration+leaf 単体で3面テスト、U2: 境界3面と model-map で drift 実測、U3: 削除+テスト整理、U4: 判定 pipeline 単体)。片側だけでは価値を出荷できない境界は存在しない(各 Issue が独立の完了条件を持つ)。

**非交差の正確な主張**: **ソース面**の write scope は相互に非交差(共有ソースは U3→U4 の `tla-authoring.ts`・`stages/tla-authoring.md`・docs 2面のみで、宣言済み依存辺により直列化済み)。**生成台帳**(`tests/.coverage-registry.json` 等)は新規テストを持つ全 unit(U1/U2/U3/U4)が regen で書くため交差するが、これは各 unit が自 worktree 内で regen を同梱し、PR の直列着地時に再構成 + `bun run build` 後 regen で解決する既定運用の対象(cid:build-and-test:registry-merge-recomposition / cid:code-generation:c5-regen-needs-build)であり、並列実装可能性を損なわない。

**model-map ハッシュピンの交差実測**(2026-08-20): 現行 model-map.json の implPath ピン13件は全て `packages/framework/core/tools/` 配下(RE 実測)で、U1/U3/U4 が触る plugin ファイルはピン対象外 — ハッシュピン resync は engine ファイル接触時のみ発火し、本 intent の unit はいずれも該当しない。U2 が追加する新 entries は `plugins/github-pr-convergence/tools/` 配下(FR-BND-4)で、U1/U3/U4 の write scope と交差しない。

**既在 import 辺の非昇格**: registration → applicability の既在 import(ADR-1 Context の実測)は本 intent が新設する辺ではなく、着地順序の新規制約を生まないため unit 辺へ昇格しない(delivery-planning はこの記載を読んで辺 2 本のみを制約として扱う)。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-20T13:08:24Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の BLOCKER(生成台帳の共有書込面)を4 unit 全 write scope への宣言 + 非交差主張の書き換え + model-map ピン非交差の実測で解消。U4 への tla-authoring.ts 追加は依存辺・CLI 面変化と整合。per-unit 必須3項目充足。残余は FD/DP で閉じる FOLLOW-UP 3件。

### Findings

- FOLLOW-UP | 生成台帳の列挙が coverage-registry 1件+等 — coverage-patch-allowlist(再アンカーは createSemanticSelector 経由で regen 形では閉じない)等クラス別解決手順を FD/DP で書き分け
- FOLLOW-UP | t3078 の述語方向(tools→plugin.json 全数宣言)なら U1 の leaf 新設が plugin.json 宣言を要し U1×U3 交差 — FD で実読確認し条件付き write scope を確定
- FOLLOW-UP | U3 の RFC 退役ポインタ経路に倒れた場合の specs/rfc パスを条件付き write scope として明記(FD 確定後)
- NIT | deployment model の値「なし」はステージ語彙(standalone/shared/embedded)外 — embedded+補足の形が安全
- NIT | tla-authoring.ts の C1 変更面が AD 4面中2面(components/component-methods)未追随 — FD 成果物に記録
