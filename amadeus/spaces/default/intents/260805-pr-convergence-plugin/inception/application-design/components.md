# Components: PR 収束 opt-in プラグイン

上流入力(consumes 全数): requirements、architecture、component-inventory

測定 ref: observed = origin/main `8409c2039c52`

## コンポーネント一覧

component-inventory の「PR 収束プラグインの対象コンポーネント」節(plugin 系5ファイル+ガード述語+再利用候補3件)を基礎に、requirements の FR 別へ新設/変更/再利用を割り当てる。

| # | コンポーネント | 種別 | 所在 | 担う要件 |
|---|---|---|---|---|
| C1 | frontmatter seam bridge — 実ステージ frontmatter の parse/serialize(バイト保存型) | **変更**(ADR-1) | `packages/framework/core/tools/amadeus-plugin-compose.ts`(parse 受理拡張)+`amadeus-plugin.ts`(host snapshot) | FR-2a |
| C2 | produces overlay 適用 — install 時の code-generation produces 追記+seam 台帳+drop 復元 | **再利用**(seam merge/台帳/drop は既存) | 同上(既存 `mergeSeamEntries` / `applySeamContributions` / `rebuildStageSeams`) | FR-1b, FR-2b |
| C3 | 収束述語モジュール `pr-convergence-predicate.ts` — thread 4区分+UNKNOWN-retry+CLEAN 判定の単一定義 | **新設**(ADR-2/ADR-4) | `plugins/pr-convergence/tools/` | FR-3a〜3d |
| C4 | thread 台帳生成器 `pr-convergence-ledger.ts` — GraphQL 実測から機械導出(ページング・bot 判定・severity・終端処理) | **新設** | `plugins/pr-convergence/tools/` | FR-4a, FR-4c |
| C5 | 収束 CLI `pr-convergence-cli.ts` — status / report / override の3 verb | **新設**(ADR-3) | `plugins/pr-convergence/tools/` | FR-5(工程駆動), FR-7 |
| C6 | gh 実行子 `pr-convergence-gh-runner.ts` — readiness 検査・argv 配列・token 非保持・loud fail の4契約(ADR-6) | **新設**(plugin 内最小実装 — gateway と同一契約、import はしない) | `plugins/pr-convergence/tools/`(独立ファイル — C4 が import) | FR-4b(E-PCP-ADDEV 改訂版) |
| C7 | 収束ループ工程のステージ本文断片(工程(0)-(5)+トリアージ基準+Guardrail self-contained) | **新設** | `plugins/pr-convergence/stages/`(fragment — 出荷形は functional-design で確定) | FR-5a〜5c |
| C8 | レポート様式センサー manifest | **新設**(ADR-5) | `packages/framework/core/sensors/amadeus-pr-convergence-report-format.md` | FR-6 |
| C9 | plugin manifest `plugin.json` — stages/seams/fragments/tools 宣言(tools = C3/C4/C5/C6 の4ファイル+import 閉包全数) | **新設** | `plugins/pr-convergence/plugin.json` | FR-1a, NFR-4 |
| C10 | ガード本体 `unitCovered` / `firstUncoveredBatch` | **無変更**(データ点火のみ) | `packages/framework/core/tools/amadeus-orchestrate.ts:3452-3472 / :3068-3085` | FR-2b, C-2 |

## 規模の正当化(行数見積り — inception ガードレール準拠)

| コンポーネント | 見積り(実装+テスト) | 根拠 |
|---|---|---|
| C1 parse/serialize | 150-250 行 + テスト 200-300 行 | frontmatter 4配列の抽出/書換え+byte-identity 往復。既存 parseHostStageSeams(13行)の受理拡張 |
| C2 overlay 適用 | 30-80 行(既存 seam 機構への結線のみ) | merge/台帳/drop は既存関数の再利用 |
| C3 述語 | 100-180 行 + テスト 150-250 行 | 4区分 classify+収束判定+retry 定数。純関数中心 |
| C4 台帳生成器 | 150-250 行 + テスト 150-250 行(fixture 込み) | GraphQL ページング+bot 判定+severity+終端処理抽出 |
| C5 CLI | 150-250 行 + テスト 150-250 行 | 3 verb+HUMAN_TURN 束縛+レポート生成+exit code 契約 |
| C6 gh 実行子 | 60-120 行 + テスト 100-150 行 | readiness 検査+argv 実行+typed error。4契約の assertion 固定込み |
| C7 工程断片 | md 200-350 行(コードなし) | 工程(0)-(5)+トリアージ表+Guardrail self-contained |
| C8 センサー manifest | md 30-60 行 | 既存8センサーの様式踏襲 |
| C9 plugin.json | 30-60 行 | formal-model-check の plugin.json 様式踏襲 |

合計概算: 実装 640-1,120 行+テスト 650-1,050 行+md 260-470 行。新規機構は C1(seam bridge)1点に集約されており、adapter・外部契約の先行着地はない(実装+配線が同一 intent — inception ガードレール N3 充足)。

## 境界と不変条件

- **core / plugin 境界**: C1/C2/C8 は core(全ハーネス投影)、C3/C4/C5/C6/C7/C9 は plugin バンドル。plugin tools は core への import を持たない self-contained 構成(ADR-6 — plugin→core import は import-closure guard が構造的に拒否する実測に基づく E-PCP-ADDEV 裁定)。C6 は gateway と同一の4契約(readiness 検査・argv 配列・token 非保持・loud fail)を plugin 内で満たす最小実装であり、import 閉包は C9 が全数宣言(NFR-4)
- **ガード1定義**: fail-closed の判定は C10 のみ。C3/C5 は判定材料(レポート)の生成者であり、前進可否を判定しない(検証劇場 Forbidden 対応)
- **未 install 不変**: C1 の parse 受理拡張は compose 実行時のみ通る経路 — install しない workspace では compose が走らず、ステージファイル・compiled graph・produces は不変(NFR-1 の対実証で固定)

## architecture 整合

architecture の「plugin seam 機構の半実装状態と3層 trust」節と整合: C1 が未接続面(U11+)を埋め、trust 3層(compose TrustGrant / compile provenance stamp / run O_NOFOLLOW)は FR-2d のとおり既存を踏襲する。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T07:06:02Z
- **Iteration:** 2
- **Scope decision:** none

ADR4部構成とFR-4b承認系譜は是正確認できたが、C6の所在記述がcomponents.md(C5内埋め込み・C9 tools[]未列挙)とcomponent-dependency.md/component-methods.md(独立モジュール・C4→C6依存)で矛盾し、字義通りだとC5⇔C4の循環importが生じる。

### Findings

- BLOCKER | components.mdのC6所在欄『plugins/pr-convergence/tools/(C5 内)』はC6をC5ファイル内に埋め込む記述だが、component-dependency.mdの依存方向規律『C5 → C3, C4 / C4 → C6』とcomponent-methods.mdのC4記述(GhRunnerはC6の plugin 内定義型)はC6をC4が直接importする独立モジュールとして扱っている。字義通りに実装するとC5.ts(C5+C6を内包)をC4.tsがimportし、かつC5.tsがC4.tsをimportする循環importが生じ、component-dependency.md自身が主張する『循環なし』(line 31)と矛盾する。加えてcomponents.mdのC9行(tools宣言)はC3/C4/C5のみを列挙しC6を含めておらず、C6が独立ファイルであるべきかの判断とNFR-4(import閉包全数宣言)の充足可否に直接影響する。C6を独立ファイルとして明示し所在欄・C9 tools[]をcomponent-dependency.md/component-methods.mdと整合させるか、埋め込み設計に統一して依存方向規律・C4記述を書き換える是正が必要。
- NIT | ADR-2/3/5/6のConsequencesは(+)/(−)/Reversibilityの3要素が揃っているが、Reversibility評価(高/中/低)の判定基準が成果物内に明文化されていない — 次回以降のADR起草での評価ブレを避けるため、簡潔な評価軸(影響範囲・巻き戻しコスト等)の一文を末尾に追加してもよい。
