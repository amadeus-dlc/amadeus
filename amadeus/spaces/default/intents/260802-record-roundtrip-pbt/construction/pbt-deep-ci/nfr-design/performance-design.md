# Performance Design — unit `pbt-deep-ci` (#1980)

上流入力(consumes 全数): business-logic-model.md(本文 §1「本 unit の実行時間の所在」・§2「timeout-minutes の導出規律」・§3「深掘り予算のスケール」で依拠。同 unit の business-rules.md BR-PDC-6 / BR-PDC-7 / BR-PDC-8 / BR-PDC-13 と domain-entities.md E-4 / E-5 も併読した — 宣言外の追加入力)(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用)

測定 ref: **worktree HEAD `26fc7ddb29228757d40e3d15d6d8c0513d505f63`**。`git diff --stat c8702be09..HEAD -- .github/workflows/ tests/fixtures/formal-verif-ci-baseline.sha256 tests/unit/t204-audit-escape.pbt.test.ts tests/formal-verif/support/ci-workflow-contract.ts` が空(差分ゼロ)であるため、business-logic-model.md の測定 ref `c8702be09` の値と直接比較できる。

---

## 1. 本 unit の性能面はどこにあるか

本 unit は関数を1つも新設しない(business-logic-model.md §1「component-methods.md には **U5 の節が存在しない**」)。したがってレイテンシ・スループットのような実行時性能目標は存在しない。本 unit が所有する性能面は次の2つに限られる:

| 面 | 実体 | 支配する規範 |
| --- | --- | --- |
| P-1 | `pbt-deep` ジョブの `timeout-minutes` — 深掘り実行の**上限**をどう決めるか | BR-PDC-8 |
| P-2 | 深掘り予算(`numRuns: 50_000`)が対象集合へ**どうスケールするか** | BR-PDC-12 / BR-PDC-13 |

**NFR-4(決定性)の実行時間基準は本 unit の面ではない。** requirements.md NFR-4 は「新規 PBT ファイル群の `bun test` 直接実行の合計が **2秒以内**」を定めるが、これは**既定予算(numRuns 100)での PR CI 面**の基準であり、その充足責任は新規 PBT を書く election-readpath / state-pbt にある。本 unit は `AMADEUS_PBT_DEEP=1` を設定する側であり(business-logic-model.md §4「**本 unit は判定式にも予算値にも触れず、環境変数を `"1"` に設定する側だけを担う**」)、NFR-4 の 2 秒上限は深掘りジョブへは適用されない — 深掘りは定義上その 500 倍の探索を行う別階層である。

---

## 2. P-1: `timeout-minutes` の導出規律

### 2.1 なぜ値を今ここで決めないのか

本 unit の対象パス集合は**依存 unit の着地時点で確定する**(domain-entities.md E-5「**具体のファイル名は本 unit では確定しない**」)。存在しないファイルの深掘り wall clock は測定できない。ここで具体値を書けば、それは実測から導かれない数値になり、`cid:requirements-analysis:constants-from-code` と `cid:requirements-analysis:numbers-from-command-output-only` に正面から反する。

したがって本書が固定するのは **値ではなく導出手続き**である。BR-PDC-8 が要求する「算出根拠をジョブ直上のコメントに書く」の、その算出手続きの正本が本節である。

### 2.2 導出手続き(実装段が踏む順序)

```
  [D1] 対象パス集合の確定
        依存 unit(election-readpath / state-pbt)着地後、
        実在するファイル列を確定する
        v
  [D2] 深掘り wall clock の実測(ローカル、3回)
        AMADEUS_PBT_DEEP=1 /usr/bin/time -p bun test <対象パス列>
        → real の最大値を T_local(秒)として採る
        v
  [D3] セットアップ時間の加算
        checkout + setup-bun + bun install --frozen-lockfile = T_setup
        perf.yml の実績値 ~120 秒を初期値とし、
        初回 CI 実行後に実 run の所要へ差し替える
        v
  [D4] ランナー係数の適用
        T_ci = T_local * K + T_setup
        K = ローカル(Apple Silicon)と ubuntu-latest の性能比。
        初回実行までは K は未実測 → §2.4 の暫定運用
        v
  [D5] 2 倍して分へ切り上げ
        timeout-minutes = ceil(2 * T_ci / 60)
        v
  [D6] コメントへ算出式を verbatim で書く
```

`[D5]` の「2 倍して切り上げ」は既存の canonical 様式である。`.github/workflows/perf.yml:39-42` 実文:

```
    # 2x the expected wall clock: per-test caps 250s + 180s + 120s, plus the
    # remaining perf tests (~60s) and checkout/bun install setup (~120s) is
    # about 12.2 min; 2 x 12.2 = 24.4, rounded up to 25.
    timeout-minutes: 25
```

この形は (a) 内訳の項を列挙し (b) 合計を出し (c) 2 倍し (d) 切り上げる、の4段が読める。本 unit のコメントも同じ4段を満たす。`cid:nfr-requirements:derived-value-shows-formula`(派生値は算出式を併記)の要求はこの様式で充足する。

### 2.3 実測済みの下限傍証(推定の材料であって上限の根拠ではない)

測定 ref HEAD、コマンドは各行の記載どおり、値は出力からの転記:

| ファイル | 既定 real (s) | 深掘り real (s) | 既定 expect() | 深掘り expect() | 倍率(expect) | 倍率(wall) |
| --- | --- | --- | --- | --- | --- | --- |
| `tests/unit/t204-audit-escape.pbt.test.ts` | 0.11 | 0.21 | 500 | 250,000 | 500 | 1.9 |
| `tests/unit/setup-semver.pbt.test.ts` | 0.10 | 0.93 | 1,073 | 533,328 | 497 | 9.3 |
| `tests/unit/setup-manifest.pbt.test.ts` | 0.11 | 2.48 | 1,200 | 600,000 | 500 | 22.5 |

**expect の倍率がほぼ一定(約 500 倍 = 100 → 50,000)なのに wall の倍率は 1.9 〜 22.5 倍まで開く。** これは property 1 件あたりの本体コストの差である — t204 は文字列エスケープの純関数、setup-manifest は生成物の構造検査でオブジェクト構築を伴う。すなわち **深掘りの wall clock は「numRuns の倍率」からは予測できず、対象集合そのものの実測でしか決まらない**。

上表はいずれも `tests/unit/` の純関数層である。**実 FS を触る `tests/integration/` 層の深掘り実測は本ステージ時点で 1 件も存在しない**(対象ファイルが未着地。`cid:requirements-analysis:absence-claim-grep-verify` の反証: `grep -rln "AMADEUS_PBT_DEEP" tests/ scripts/ packages/ .github/ package.json | wc -l` = 4、いずれも `tests/unit/`)。P-EL2 / P-EL3 は components.md U2 節が「`tests/integration/`(実 FS 経由)」と規定する層に置かれるため、上表の 2.48 秒は**下限の傍証**であって上限の根拠にはならない。

### 2.4 未実測区間の扱い(受け入れ基準にしない)

`[D4]` の K(ランナー性能比)は本ステージ時点で未実測である。**推定**として K = 3 を初期値に置く(算出根拠: ローカルは Apple Silicon / ubuntu-latest は共有 x86 ランナーで、既存 CI ジョブの実行時間がローカル比で概ね 2〜4 倍という一般傾向。一次実測に基づく値ではない)。

`cid:nfr-requirements:estimates-not-acceptance-criteria` に従い、**この推定値を受け入れ基準に使わない**。実装段の運用は次のとおり:

1. 初回は `[D2]` の T_local と K = 3(推定)で暫定値を置き、コメントに「K は推定。初回 run 後に実測へ差し替える」と明記する。
2. 初回 CI 実行後、実 run の所要時間(Actions の job duration)を一次実測として `[D4]` の K を再計算し、`timeout-minutes` とコメントを同一 PR 内で確定させる。
3. 確定後のコメントから「推定」ラベルを外す。

### 2.5 timeout に当たったときの意味

`timeout-minutes` 超過はジョブを `cancelled` にする(domain-entities.md E-7)。これは `failure` ではないため**ステップサマリが出ない** — BR-PDC-10 の発火条件 `failure() && steps.<id>.conclusion == 'failure'` を満たさないからである。すなわち timeout は「反例を検出した」ではなく「予算設計が現実と乖離した」というシグナルであり、両者が終端状態で区別できる。これは意図した設計であって、timeout をサマリ対象へ広げてはならない(広げると F2 = 反例検出との判別子が失われる)。

---

## 3. P-2: 深掘り予算のスケール(scalability-design.md への引き渡し)

対象集合の要素数を n、要素 i の深掘り wall clock を t_i とすると、ジョブの実行時間は近似的に

```
  T_deep ≈ T_setup + Σ(i=1..n) t_i
```

である。**t_i は numRuns に線形ではなく、property 本体のコストに支配される**(§2.3 の実測が示した 1.9 〜 22.5 倍の開き)。この非線形性がスケール面の中心であり、詳細は scalability-design.md §2 で扱う。本書では性能面の帰結だけを記す:

- 対象集合に FS を触る property が 1 件加わるだけで T_deep が桁で変わりうる。したがって **対象集合を変更したら `timeout-minutes` を再導出する**(§2.2 を再実行する)。これは BR-PDC-13 が実行対象を「本 intent が新設した PBT ファイル群に限る」と縛る理由の性能面の裏づけでもある — `--release` tier 全体を回すと集合が制御不能になり、導出手続きが成立しなくなる。

---

## 4. 本 unit が PR CI のリードタイムに与える影響

**ゼロである。** `if: github.event_name == 'workflow_dispatch'` により `push` / `pull_request` では `skipped` になる(business-logic-model.md INV-1、§3.1)。skipped ジョブはランナーを消費せず、`ci-success` の `needs` にも不在である(BR-PDC-3)。したがって深掘りの実行時間がどれだけ長くなっても PR のリードタイムには一切乗らない。

この性質が「深掘り予算を潤沢に取れる」ことの根拠であり、逆に「だから timeout の実測導出を怠ってよい」という含意は持たない — 手動起動した利用者は結果を待つのであり、暴走したジョブを 6 時間(GitHub 既定上限)待たせないために `timeout-minutes` は必要である。

---

## 5. 上流成果物の本文参照(consumes の依拠箇所)

| 上流成果物 | 本書での依拠箇所 |
| --- | --- |
| business-logic-model.md | §1(§1 の「新設関数ゼロ」= 実行時性能目標が存在しない根拠)、§2.2(§4「本 unit は判定式にも予算値にも触れず環境変数を設定する側」)、§2.3(§4「実測: 深掘りの実コスト」の対照実験の手法と、FS 層では倍率が wall clock に乗るという指摘)、§2.5(§7 のジョブ終端状態と F1〜F4 の区別)、§4(INV-1 / §3.1 の起動フロー) |

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T23:28:14Z
- **Iteration:** 1
- **Scope decision:** none

FD 逸脱なし・数値ラベル分離・ID cross-artifact 一貫。GoA 2(留保 = consumes 注記は全 unit 共通条件のため非ブロッキング、conductor が是正)。

### Findings

- [Minor] 全 unit 共通の consumes 注記沈黙(conductor 是正)
- [Minor] NFR-4 の出典が許可パス外で裏取り不能(conductor 確認事項)
- [Info] t204 real 値の測定ノイズ差 — 矛盾ではない
