# Scalability Design — unit `pbt-deep-ci` (#1980)

上流入力(consumes 全数): business-logic-model.md(本文 §1 の N/A 判定・§2 の深掘り予算スケール・§3 の対象集合スケールで依拠。同 unit の business-rules.md BR-PDC-12 / BR-PDC-13 と domain-entities.md E-4 / E-5 も併読した — 宣言外の追加入力)(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用)

測定 ref: **worktree HEAD `26fc7ddb29228757d40e3d15d6d8c0513d505f63`**。

---

## 1. horizontal scaling は N/A — 根拠と代替

本 unit の成果物は GitHub Actions ジョブ 1 本と baseline fixture 1 行であり、常駐サービス・リクエスト処理・同時接続を1つも持たない(business-logic-model.md §1「本 unit の対象は **`.github/workflows/ci.yml` に追加する非ブロッキングジョブ 1 本**と…**`tests/fixtures/formal-verif-ci-baseline.sha256` の再 baseline**」)。

`cid:nfr-design:c1`(CLI や library の NFR 設計では、常駐 service 向けの cache・horizontal scaling・circuit breaker を機械的に適用せず、決定的な file 境界と fail-closed 契約へ置き換える)に従い、次の項目は**適用外**とする:

| 項目 | 判定 | 根拠 |
| --- | --- | --- |
| 水平スケール(レプリカ数) | **N/A** | ジョブは手動起動 1 回につき 1 実行。同時実行数を増やす意味がない |
| ロードバランシング | **N/A** | 受け付ける要求が無い |
| キャッシュ層 | **N/A** | 実行のたびに clean checkout から走ることが決定性の前提。キャッシュは再現性を損なう方向に働く |
| 自動スケール(auto-scaling) | **N/A** | ランナーは GitHub が割り当てる ubuntu-latest 1 台。本 unit に割当制御は無い |
| コネクションプール / スロットリング | **N/A** | 外部サービスへの継続的な接続が無い(security-design.md §1) |

**代替として本書が扱うスケール面は次の 2 つ**である: (SC-1) 深掘り予算 `numRuns` のスケール、(SC-2) 対象パス集合 n のスケール。いずれも「決定的な file 境界の中で、入力量が増えたときに何が線形で何が非線形か」を固定するものであり、上記 c1 が求める置換にあたる。

---

## 2. SC-1: 深掘り予算 `numRuns` のスケール

### 2.1 予算の写像(所有は本 unit の外)

深掘り階層の予算は既存規約が所有する。`tests/unit/t204-audit-escape.pbt.test.ts:41` 実文(逐語):

```ts
const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };
```

既定は fast-check の既定 numRuns = 100、深掘りは 50,000 で **500 倍**。判定式は同 `:39`(逐語):

```ts
const DEEP = process.env.AMADEUS_PBT_DEEP === "1" || process.env.AMADEUS_PBT_DEEP === "true";
```

BR-PDC-12 のとおり**本 unit はこの 2 行を変更しない**。本 unit は環境変数を `"1"` に設定する側であり、スケールの「係数」は所有しない。

### 2.2 実測: 探索量は線形、wall clock は線形でない

測定 ref HEAD、値は `/usr/bin/time -p` および bun の出力からの転記:

| ファイル | 既定 expect() | 深掘り expect() | 探索量の倍率 | 既定 real (s) | 深掘り real (s) | wall の倍率 |
| --- | --- | --- | --- | --- | --- | --- |
| `tests/unit/t204-audit-escape.pbt.test.ts` | 500 | 250,000 | 500.0 | 0.11 | 0.21 | 1.9 |
| `tests/unit/setup-semver.pbt.test.ts` | 1,073 | 533,328 | 497.0 | 0.10 | 0.93 | 9.3 |
| `tests/unit/setup-manifest.pbt.test.ts` | 1,200 | 600,000 | 500.0 | 0.11 | 2.48 | 22.5 |

**探索量(expect 呼び出し)は numRuns にきれいに線形**(倍率 497〜500 = 100 → 50,000 の比)である一方、**wall clock の倍率は 1.9 〜 22.5 と一桁以上開く**。

倍率の開きは、既定実行では property 本体のコストがプロセス起動・モジュールロードの固定費に埋もれているのに対し、深掘りでは本体コストが支配的になるためである。したがって:

```
  T_deep(file) ≈ T_fixed + numRuns * c(file)
```

`c(file)` は property 1 件あたりの本体コストで、**ファイルごとに桁が違う**。numRuns を上げたときの伸び方は `c(file)` に完全に支配される。

### 2.3 帰結: 予算からは所要時間を予測できない

上表の 3 ファイルはすべて `tests/unit/` の純関数層である。**実 FS を触る `tests/integration/` 層の深掘り実測は本ステージ時点で 0 件**(`grep -rln "AMADEUS_PBT_DEEP" tests/ scripts/ packages/ .github/ package.json | wc -l` = 4、いずれも `tests/unit/`)。P-EL2 / P-EL3 は integration 層に置かれるため、`c(file)` は上表より確実に大きい — ファイル作成・読み書きの syscall が 1 run ごとに乗るためである。倍率がどうなるかは**推定を書かず、実測を待つ**(performance-design.md §2.4 の運用に合流)。

この非線形性が、`timeout-minutes` を「numRuns 倍率からの計算」ではなく「対象集合そのものの実測」から導けと定める理由である(BR-PDC-8 / performance-design.md §2.2)。

---

## 3. SC-2: 対象パス集合 n のスケール

### 3.1 現在の n と将来の n

対象集合は依存 unit の着地物と 1:1 対応する(domain-entities.md E-5)。本 intent では P-EL1〜P-EL3(election-readpath)と P-ST1〜P-ST4(state-pbt)の供給元ファイルのみで、**n は小さい**(具体のファイル名は本 unit では確定しない)。

後続 intent が新しい PBT を追加した場合、n は増える。そのときの本 unit への影響:

| 影響 | 線形か | 対処 |
| --- | --- | --- |
| ジョブ実行時間 | Σt_i なので**要素数には線形、要素の中身には非線形** | `timeout-minutes` の再導出(performance-design.md §2.2 を再実行) |
| 事前実在検査(BR-PDC-5)のコスト | 線形(n 回の存在判定) | 対処不要 |
| 事後照合(BR-PDC-6)の期待値 | 期待ファイル数 M を n に合わせて更新する必要がある | **手作業の同期点**。§3.3 |
| baseline fixture(BR-PDC-14) | ci.yml を編集するたび再 baseline | 対象列の変更は ci.yml の編集なので毎回発生 |

### 3.2 集合を有界に保つ設計判断

BR-PDC-13 は実行対象を「本 intent が新設した PBT ファイル群に限る」と縛り、`--release` tier 全体や `tests/` 全体を深掘りで走らせないと定める。これはスケール設計として読むと **「n を宣言的に有界にする」判断**である:

- tier 全体を回す形にすると、n は「その tier に将来置かれる全ファイル」となり、本 unit の制御外で増える。
- 明示列挙にすると、n は ci.yml の diff としてレビューに現れる。増えるときは必ず人間が見る。

services.md S2 が実行コマンドを `AMADEUS_PBT_DEEP=1 bun test <新規 PBT ファイル群>` と指定する理由の、スケール面の裏づけである(business-logic-model.md §4 が「`--release` tier 全体を深掘りで回すと、深掘りを意図していない既存4本まで 50,000 runs で走ることになる」と同旨を記す)。

### 3.3 n の増加が壊しうる箇所(将来の同期点)

BR-PDC-6 の期待ファイル数 M は、対象列と**別の場所に書かれる数値**である。列を増やして M を更新し忘れると、照合が不一致で赤になる — これは fail-closed 側に倒れるので安全な壊れ方だが、原因が分かりにくい。

対処: **M を対象列から機械的に導出する**(列を配列として持ち、その要素数を M に使う)ことで同期点そのものを消せる。`cid:code-generation:count-comment-sync-on-catalog-change` が記録する「件数語は可視な同期相手がある場合にのみ許す」の適用であり、本件は count-free 化が可能なケースにあたる。実装段はこの形を第一手とし、シェルの制約で導出できない場合に限り明示数値+同期コメントへ落とす。

---

## 4. 並行実行の扱い

本 unit は `concurrency` グループを宣言しない。理由:

- 手動起動のジョブであり、同じ利用者が同時に 2 回起動する状況は想定しない。
- 仮に 2 実行が重なっても、両者は独立の clean checkout で走り、共有状態(ファイル・ロック・外部リソース)を持たない。読むのはリポジトリのテストファイルのみ、書くのはランナーローカルの `pbt-deep-run.log` のみ(domain-entities.md E-6)。
- したがって並行実行の相互干渉が構造的に起こらない。

`perf.yml:28-30` は `concurrency: { group: perf, cancel-in-progress: false }` を宣言するが、あれは `schedule` トリガを持ち定期実行が重なりうるためである。本 unit は `schedule` を持たない(FR-5a が Out と定める)ので同じ必要は生じない。**引用元の様式をここでは採らない**という意図的相違として記録する(`cid:application-design:citation-semantics-check`)。

---

## 5. 上流成果物の本文参照(consumes の依拠箇所)

| 上流成果物 | 本書での依拠箇所 |
| --- | --- |
| business-logic-model.md | §1(§1 の対象境界 = ジョブ1本+fixture1行で常駐サービス面が無いこと)、§2(§4 の `AMADEUS_PBT_DEEP` 判定式・予算値と「実測: 深掘りの実コスト」の対照実験、および FS 層では倍率が wall clock に乗るという指摘)、§3(§4 の「`--release` tier 全体を回すと既存4本まで 50,000 runs で走る」)、§3.3(INV-5 = 対象パス集合の全数実行)、§4(§7 のジョブ終端状態) |
