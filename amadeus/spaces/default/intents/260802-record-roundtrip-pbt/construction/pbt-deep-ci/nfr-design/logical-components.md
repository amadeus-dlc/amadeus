# Logical Components — unit `pbt-deep-ci` (#1980)

上流入力(consumes 全数): business-logic-model.md(本文 §1 のモジュール分解・§2 の層別保証機構・§3 の実体インベントリで依拠。同 unit の business-rules.md 全 BR と domain-entities.md E-1〜E-7 も併読した — 宣言外の追加入力)(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用)

測定 ref: **worktree HEAD `26fc7ddb29228757d40e3d15d6d8c0513d505f63`**(`.github/workflows/`・`tests/formal-verif/support/ci-workflow-contract.ts` は business-logic-model.md の測定 ref `c8702be09` から差分ゼロ)。

---

## 1. 論理コンポーネント分解

本 unit はプロダクションの関数・型を新設しない(business-logic-model.md §1)。ここでいうコンポーネントは**ワークフロー宣言の中の論理的な役割区分**であり、ファイルやモジュールではない。

| ID | コンポーネント | 実体 | 責務 |
| --- | --- | --- | --- |
| **LC-1** | 起動ゲート | ジョブレベル `if: github.event_name == 'workflow_dispatch'` | `push` / `pull_request` での実行を止める |
| **LC-2** | 環境準備 | checkout / setup-bun / install の 3 ステップ | 実行環境を決定的に用意する |
| **LC-3** | 入力検証 | 対象パス集合の事前実在検査ステップ | 不在パスがあれば `bun test` に到達させない |
| **LC-4** | 深掘り実行 | `AMADEUS_PBT_DEEP=1` + `set -o pipefail` + `bun test … 2>&1 \| tee` | 対象 PBT を深掘り予算で走らせ、出力を保存する |
| **LC-5** | 実行検証 | `Ran <N> tests across <M> files` の M 照合ステップ | 無音の実行漏れを検出する |
| **LC-6** | 失敗提示 | `if: failure() && steps.<id>.conclusion == 'failure'` のサマリステップ | 反例の中身をステップサマリへ出す |
| **LC-7** | 形状ピン整合 | `tests/fixtures/formal-verif-ci-baseline.sha256` の再 baseline + テストヘッダの記録エントリ追記 | ci.yml 編集を承認済みとして記録する |

LC-1〜LC-6 は `.github/workflows/ci.yml` の 1 ジョブ内に順に並ぶ。LC-7 だけがジョブの外にある — 本 unit の変更が既存ピンを破ることへの後始末であり、実行時には関与しない。

### データフロー(ASCII)

```
  利用者(Run workflow)
        |
        v
  LC-1 起動ゲート ---- false ----> [skipped](正常)
        | true
        v
  LC-2 環境準備 ---- 失敗 ----> [failure F4](サマリなし)
        |
        v
  LC-3 入力検証 ---- 不在あり ----> [failure F1](サマリなし)
        |  対象パス集合(E-5)
        v
  LC-4 深掘り実行  <---- AMADEUS_PBT_DEEP="1" (E-4)
        |  実行ログ(E-6)
        +---- 反例 ----> [failure F2] --> LC-6 失敗提示(サマリあり)
        |
        v
  LC-5 実行検証 ---- M 不一致 ----> [failure F3](サマリなし)
        |
        v
     [success]

  (実行時フロー外)
  LC-7 形状ピン整合: ci.yml の最終形 --sha256(normalized)--> baseline fixture(E-2)
                                     --人間向け記録--------> 記録エントリ(E-3)
```

---

## 2. 保証機構の層別(一枚岩の「構造的保証」を置かない)

`cid:nfr-design:c4` に従い、「本 unit は構造的に安全である」といった全称命題を書かない。保証はコンポーネントごとに**別の機構**で成立しており、強度も異なる。以下は層別の実測である。

| ID | 守る性質 | 保証機構 | 機構の種別 | 強度 |
| --- | --- | --- | --- | --- |
| LC-1 | INV-1(手動起動限定) | ジョブレベル `if:` の評価 | GitHub Actions の実行時判定 | **強**(迂回不能) |
| LC-2 | 決定性の前提(clean checkout) | 毎回 fresh runner + `--frozen-lockfile` | ランナー仕様 + パッケージマネージャ | **強** |
| LC-2 | action の SHA ピン(BR-PDC-16) | **レビュー観点のみ** | 人間 | **弱**(§3 参照) |
| LC-3 | INV-5 前段(不在パスの検出) | 本 unit が新設するシェル述語 | 自作の fail-closed 検査 | **中**(落ちる実証を要する) |
| LC-4 | loud fail(INV-3) | `set -o pipefail` + `continue-on-error` 不記載 | シェル設定 + 不作為 | **中**(不作為は grep でしか守れない) |
| LC-4 | 深掘り予算の適用 | 既存規約の判定式(`t204:39` / `:41`) | 既存コードの所有 | **強**(本 unit は変更しない) |
| LC-5 | INV-5 後段(実行漏れの検出) | 本 unit が新設するシェル述語 | 自作の fail-closed 検査 | **中**(落ちる実証を要する) |
| LC-6 | 誤ラベル回避 | `steps.<id>.conclusion` 限定 | GitHub Actions の式評価 | **強** |
| — | INV-2(`ci-success` needs 8 要素) | **既存テストが assert 済み** | 機械ガード(他所有) | **強** |
| LC-7 | ci.yml 形状ピン | `inspectCiWorkflow` の sha256 比較 | 機械ガード(他所有) | **強** |
| LC-7 | 記録エントリの書式 | **レビュー観点のみ** | 人間 | **弱**(§3 参照) |

**強度が一様でないことがこの表の要点**である。「本 unit は既存の機械ガードに守られている」と一言でまとめると、弱い層(SHA ピン・記録エントリ・不作為による loud fail)が見えなくなる。

### INV-2 は本 unit が作る保証ではない

business-logic-model.md §5 が明記するとおり、INV-2(`ci-success` の `needs` が 8 要素のまま)は**すでに機械で守られている**。ADR-3 Rationale 3 が実測を記録しており、`tests/unit/t222-ci-snapshot-wiring.test.ts:121`(`ci-success remains independent from both publishers`)と `tests/integration/t222-ci-snapshot-branch.integration.test.ts:107`(`const ciSuccessNeeds = jobs["ci-success"]?.needs;`)が該当する。**本 unit は「守る仕組みを作る」のではなく「既存の仕組みに乗る」側**であり、新規テストを書かない。

---

## 3. 機械ガードで守られない箇所(弱い層の明示)

| 箇所 | なぜ守られないか | 代替 |
| --- | --- | --- |
| `pbt-deep` の action SHA ピン | `ci-workflow-contract.ts` の pin 検査は `formal-model-check` 限定。`inspectFormalSteps`(`:52`)が `stepById(formal, "formal-checkout")`(`:54`)等で formal ジョブのステップのみを引く | レビュー観点(BR-PDC-16)。機械化は `tests/formal-verif/support/` の契約変更となり components.md U5 の所在を超えるため本 unit のスコープ外(reliability-design.md R-3) |
| 再 baseline 記録エントリの書式 | 純粋な人間向けコメントで、テストコードのどこからも読まれない(domain-entities.md E-3「**このエントリは機械 parse されない**」) | レビュー観点(BR-PDC-15) |
| `continue-on-error` / `\|\| true` の不記載 | 「書かないこと」は既存テストが検査しない | レビュー観点 + `set -o pipefail` の実測(落ちる実証)。BR-PDC-9 |
| `timeout-minutes` の算出根拠コメント | コメントの内容は機械検査されない | レビュー観点(BR-PDC-8)。performance-design.md §2.2 の導出手続きが判定基準 |

**この 4 件はいずれもレビューでしか守れない。** レビュアーへの観点として明示することが唯一の担保であり、「設計上安全」と書いてはならない箇所である。

---

## 4. 実体インベントリ(設計確定後の導出)

`cid:nfr-design:c7` に従い、本節は本 nfr-design 5 成果物の設計がすべて確定した後に導出したものである。

### 4.1 変更するファイル

| ファイル | 変更 | 規模 |
| --- | --- | --- |
| `.github/workflows/ci.yml` | `pbt-deep` ジョブの追加(ブロックマーカー込み) | components.md U5 の見積 +35〜50 行 |
| `tests/fixtures/formal-verif-ci-baseline.sha256` | 値の更新 | 1 行 |
| `tests/integration/t-formal-verif-ci-workflow.integration.test.ts` | ヘッダの再 baseline 記録に 1 エントリ追記 | 同見積 +5〜10 行 |

**3 ファイル。** unit-of-work.md の Unit 定義「CI 41〜61行」と整合する。

### 4.2 変更しないファイル(明示)

| ファイル群 | 理由 |
| --- | --- |
| `tests/unit/*.pbt.test.ts` の判定式・予算値・seed | BR-PDC-12。所有は既存規約(`t204:38` / `:39` / `:41`) |
| `tests/unit/t222-ci-snapshot-wiring.test.ts` / `tests/integration/t222-ci-snapshot-branch.integration.test.ts` | INV-2 は既存のまま満たされる。ピンを触らないことが充足経路 |
| `tests/formal-verif/support/ci-workflow-contract.ts` | 正規化・照合の所有は既存。本 unit は値を更新するだけ |
| `.github/workflows/` の他 3 ファイル | BR-PDC-4。`ls .github/workflows/` = `ci.yml` / `metrics-maintenance.yml` / `perf.yml` / `release.yml` の 4 件のまま(HEAD 実測) |
| `tests/run-tests.ts` | 深掘り tier をランナーへ足さない(business-rules.md 適用外表) |
| `packages/framework/core/` 配下 | 本 unit は core を触らない → **dist 7 ハーネス再生成は不要**(project.md Mandated の発動条件に当たらない) |

### 4.3 新設する検査(落ちる実証の対象)

| 検査 | コンポーネント | 両側実測 |
| --- | --- | --- |
| パス実在(BR-PDC-5) | LC-3 | 赤: 対象列の 1 件を不存在パスへ差し替え → 実在検査で exit 非 0 / 緑: 正規の列で `bun test` に到達 |
| ファイル数照合(BR-PDC-6) | LC-5 | 赤: 期待数を 1 ずらす → 照合で exit 非 0 / 緑: 正規の期待数で M と一致 |
| baseline ピン(BR-PDC-14) | LC-7 | 赤: 再 baseline 前に `bun test tests/integration/t-formal-verif-ci-workflow.integration.test.ts` → `changes outside the three permitted U4 edits` / 緑: 再 baseline 後に緑、かつ既存の「未承認編集はハッシュを反転させる」ケースが引き続き緑 |

`cid:code-generation:corpus-sweep-for-new-guards` の両側実測(赤くなること + 正当な状態で赤くならないこと)を 3 件とも満たす。詳細は business-rules.md「落ちる実証の設計」。

---

## 5. 再利用棚卸し

新規の機構・ジョブ・ツールを 1 つも導入しない。既存で代替できないものが無いためである。

| 必要な機能 | 再利用元 | 新設か |
| --- | --- | --- |
| `workflow_dispatch` 限定ジョブの配置様式 | `.github/workflows/ci.yml` の `formal-model-check`(`:508-610`。`:511` 実文 `    if: github.event_name == 'workflow_dispatch'`) | 再利用 |
| 非ブロッキング loud-fail 契約 | `.github/workflows/perf.yml:6-11` | 再利用 |
| `set -o pipefail` + `tee` の実行様式 | `.github/workflows/perf.yml:61-63` | 再利用 |
| 失敗サマリの発火条件と本文様式 | `.github/workflows/perf.yml:74-87` | 再利用 |
| `timeout-minutes` の算出コメント様式 | `.github/workflows/perf.yml:39-42` | 再利用 |
| 深掘り予算の判定式と値 | `tests/unit/t204-audit-escape.pbt.test.ts:39` / `:41` | 再利用(変更しない) |
| CI 形状ピンの正規化・照合 | `tests/formal-verif/support/ci-workflow-contract.ts` の `normalizedCiBaseline`(`:38`)/ `inspectCiWorkflow`(`:125`) | 再利用(値のみ更新) |
| `ci-success` 独立性の検証 | `tests/unit/t222-ci-snapshot-wiring.test.ts` / `tests/integration/t222-ci-snapshot-branch.integration.test.ts` | 再利用(触らない) |
| 対象パス集合の全数実行検証 | **既存に無い** | **新設**(LC-3 / LC-5)。`cid:build-and-test:test-path-set-completeness` が要求する規律を CI ジョブへ焼く初めての実装 |

新設は LC-3 / LC-5 の 2 件のみ。いずれもシェルの数行であり、独立したツール・ジョブを作らない(`cid:ci-pipeline:c2` の二重生成回避と同じ方向)。

---

## 6. 上流成果物の本文参照(consumes の依拠箇所)

| 上流成果物 | 本書での依拠箇所 |
| --- | --- |
| business-logic-model.md | §1(§3.2 のジョブ内フロー [1]〜[7] を LC-2〜LC-6 へ写像、§1 の「新設関数ゼロ」= コンポーネントがワークフロー宣言の役割区分であること)、§1 データフロー(§7 のジョブ終端状態と F1〜F4)、§2(INV-1〜INV-6 の各機構と、§5 の「INV-2 はすでに機械で守られている / 本 unit は既存の仕組みに乗る側」)、§4.1(§1 の components.md U5 規模見積)、§4.3(§5 INV-4 の再 baseline 時点)、§5(§4 の既存 PBT 規約 canonical・§6 の perf.yml loud-fail 契約) |
