# 再スキャン記録 — 260726-grant-scope-gate（Issue #1497）

上流入力（consumes 全数）: 本 intent の reverse-engineering ステージ Step 2（Developer スキャン結果）

- Developer スキャン結果 — 区間サマリ（PR #1483 / PR #1493）、`standingGrantSatisfiesGate` の患部実測、再現プローブ表、テスト fixture の語彙捏造、coverage / allowlist 面を引き継いだ。**file:line・件数は本 Step 3 で observed `e12259ba7` に対して独立再実測し、一致を確認した**（下記「上流主張の再実測」を参照）。

## メタ

| 項目 | 値 |
| --- | --- |
| Date | `2026-07-26` |
| Base commit | `11f1ad61f5ea4942332da5bd6e3e433c44aa4cab`（前 intent `260725-worktree-ref-fixes` の observed） |
| Observed commit | `e12259ba78b8c56bf3572c9bfd44a7bdf84d681c`（= 現 HEAD、`git rev-parse HEAD` 実測） |
| ブランチ / worktree | `.claude/worktrees/1497-standing-grant-scope-gate` |
| 祖先性 / 距離 | `git merge-base --is-ancestor 11f1ad61f e12259ba7` exit 0 / `git rev-list --count` = **4** |
| 区間規模 | **452 files changed, +68,457 / -2,792**（大半は dist×6 + self-install×4 の生成物増幅） |
| Scope | `amadeus-bugfix`、Brownfield、単一 repo `amadeus` |
| 方式 | 差分リフレッシュ（cid:reverse-engineering:c1）。フルスキャン不実施 |
| 測定 ref | 全 file:line・件数は observed `e12259ba7` の実ファイル直読、`grep -n` / `wc -l` / `find` 出力、`python3 -c json` によるデータファイル直接読取 |

## Focus

| Issue | 内容 | 本 scan での位置づけ |
| --- | --- | --- |
| [#1497](https://github.com/amadeus-dlc/amadeus/issues/1497) | standing grant がカスタムスコープで機能しない | 根本原因を `standingGrantSatisfiesGate` の `stage.scopes` 直読と確定。**語彙の追記漏れではなく解決方式の誤り** |

## 区間サマリ

`git log --reverse 11f1ad61f..e12259ba7` 全4件:

| コミット | 内容 |
| --- | --- |
| `bbd74a942` | record のみ（metrics snapshot） |
| `77d871d57` | [PR #1483](https://github.com/amadeus-dlc/amadeus/pull/1483) solo mode の standing delegation grants — **患部の導入元** |
| `272f4bd58` | record のみ（metrics snapshot） |
| `e12259ba7` | [PR #1493](https://github.com/amadeus-dlc/amadeus/pull/1493) worktree セッションのパス／ref 解決修正（#1497 とは非交差） |

PR #1483 の正本増分: 新規 `amadeus-grant-authorization.ts`（876 行）/ `amadeus-presence-reservation.ts`（512 行）、既存 `amadeus-state.ts` `+540` / `amadeus-orchestrate.ts` `+188` / `amadeus-directive.ts` `+168` / `amadeus-lib.ts` `+160` / `amadeus-audit.ts` `+8`、`audit-format.md` `+13`（`GRANT_ISSUED` / `GRANT_REVOKED` / `GATE_AUTHORIZATION_SELECTED`）、`stage-protocol.md` `+16`。

## 確定した根本原因

`standingGrantSatisfiesGate`（`amadeus-lib.ts:3985-4017`）の `inScope` クロージャが `stage.scopes` を直読する:

```ts
const inScope = (stage: StageEntry): boolean =>
  stage.scopes === undefined || stage.scopes.includes(scope);
```

observed `e12259ba7` の実測により、composed scope はここに構造上現れない:

| 実測項目 | 値 |
| --- | --- |
| `stage-graph.json` の stage 数 | 32 |
| `scopes` キーを持たない stage | **0**（`undefined` 緩和分岐は実運用で不発） |
| `stage.scopes` の語彙全数 | **10**（`bugfix` / `chore` / `enterprise` / `feature` / `infra` / `mvp` / `poc` / `refactor` / `security-patch` / `workshop`） |
| `scope-grid.json` のキー数 | **15**（上記 + `amadeus` / `amadeus-bugfix` / `amadeus-feature` / `amadeus-refactor` / `installer-distribution`） |

非対称は設計上の意図であり、`amadeus-graph.ts:1350-1359` の doc comment が明示する（composed scope は composer が承認時に grid へ追記し、frontmatter producer を持たない）。

## 2 症状（単一原因）

| 症状 | 機序 | 状態 |
| --- | --- | --- |
| A（#1497 本体） | 全 stage で `inScope` false → `next === null` → `crossesPhaseBoundary` 恒真 → 既定グラント（opt-out）が全ゲート ineligible | ユーザー可視。**fatal error ではなく無音 no-op**（`amadeus-grant-authorization.ts:762` が directive 無変更返却） |
| B（未報告・より重大） | 同じ `inScope` で `firstConstruction === undefined` → `isFirstConstructionGate`（`amadeus-lib.ts:4011`）恒偽 → walking-skeleton 除外へ到達しない | project.md Forbidden / Mandated への**現在進行の違反**。実測: `amadeus-feature` + stance on + opt-in グラントで `functional-design` が covered=true |

再現プローブ実測（`includesPhaseBoundary` false / true）:

| scope | reverse-engineering | requirements-analysis | functional-design | code-generation | build-and-test |
| --- | --- | --- | --- | --- | --- |
| `bugfix`（stock） | true/true | false/true | true/true | true/true | false/true |
| `amadeus-bugfix` | false/true | false/true | false/true | false/true | false/true |
| `feature`（stock） | true/true | true/true | false/false（skeleton） | true/true | true/true |
| `amadeus-feature` | false/true | false/true | true(!) | false/true | false/true |

## 上流主張の再実測

Step 3 で独立に確認した項目（すべて一致、または下記の精密化）:

| 上流主張 | 再実測 | 結果 |
| --- | --- | --- |
| `amadeus-grant-authorization.ts` 876 行 / `amadeus-presence-reservation.ts` 512 行 | `wc -l` | 一致 |
| `stage-graph.json` 32 stages / 語彙 10 / キー欠落 0 | `python3 -c json` | 一致 |
| `scope-grid.json` 15 キー | 同上 | 一致 |
| `SKELETON_ON_SCOPES` に `amadeus-feature`（`:3900`） | `sed -n '3896,3904p'` | 一致 |
| `isPerUnitStage` / `isPerUnitFinalGate` ハードコード `:4012-4013` | `sed -n '4010,4015p'` | 一致 |
| `standingGrantSatisfiesGate` 呼び出し元 4 箇所 | `grep -n` 全域 | 一致（`grant-authorization :336` / `state :2470` / `state :3269` + import 2 箇所） |
| allowlist の `amadeus-lib.ts` 行ピン 4 件 | `python3 -c json` | 一致（`2195-2196` / `2708-2710` / `3886-3887` / `5491-5493`） |
| `.coverage-registry.json:3509` UNCOVERED | 直読 | 一致（`coveredBy: []` / `status: "UNCOVERED"`） |
| fixture の `scopes: ["amadeus-feature"]` 捏造 | 直読 | 一致（integration `:47-59` / seam `:305-315`） |
| `routeSoloStandingGrantDirective` `:738-800` | `grep -n` | **精密化**: 関数宣言は `:739`（上流は 1 行前を記載）。receipt append は `:776`、grant null 返却は `:762` で一致 |
| `amadeus-lib.ts` の実コピー「全11個」 | `find` | **精密化**: 複製面は 10（self-install 4 + dist 6）、正本を含む実ファイル総数が 11 |

## センサー不適用と代替検証

RE ステージが宣言する3センサー（required-sections / upstream-coverage / answer-evidence）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に構造的に不適合で発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わない**。代替検証:

1. 更新した全成果物へ `grep -c '^## '` を実行し H2 ≥ 2 を機械確認
2. 上流入力（Developer スキャン結果）の参照を各成果物本文で直接検証
3. 旧「現在」マーカーの残存を `grep -rn "、現在、" *.md` で 0 件確認（cid:reverse-engineering:c3-relabel）

## 更新した成果物

| 成果物 | 変更 |
| --- | --- |
| `architecture.md` | 認可アーキテクチャ節を新設（新規モジュール、route receipt フロー + Mermaid + テキストフォールバック、方式の二重化、team mode への波及） |
| `component-inventory.md` | 新規 2 モジュールと主要関数、既存モジュールの増分、テストコンポーネント |
| `code-structure.md` | 正本 / dist / self-install の対応、データファイルと write path、scope 解決 2 系統、テスト配置 |
| `code-quality-assessment.md` | 欠陥 A / B、fixture 語彙捏造による検出不能性、欠けているテスト面、coverage / allowlist リスク |
| `api-documentation.md` | 新設 CLI verb 2 種、監査イベント 3 種、directive 契約への影響 |
| `dependencies.md` | 新規モジュールのエッジと共有述語の扇状依存、既存の非対称エッジ |
| `business-overview.md` / `technology-stack.md` | 冒頭ブロックのみ最小追記 |
| `reverse-engineering-timestamp.md` | 鮮度ポインタを本 intent へ更新、前 intent を履歴へ降格 |

## Delivery boundary

codekb 9 成果物 + 本記録のみ更新。実装・テスト・intent record・state・audit・生成配布物・commit・PR 操作は未実施。#1497 の修正方式（`inScope` の解決方式差し替え、fixture 是正、`isPerUnitStage` 軸の扱い）は後続の requirements-analysis 以降で確定する。
