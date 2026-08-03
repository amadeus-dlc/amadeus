# Reliability Design — unit `pbt-deep-ci` (#1980)

上流入力(consumes 全数): business-logic-model.md(本文 §1 の非ブロッキング契約の信頼性面・§2 の loud fail・§3 の決定性・§4 のリスクで依拠。同 unit の business-rules.md BR-PDC-7 / BR-PDC-9 / BR-PDC-10 / BR-PDC-11 / BR-PDC-14 と domain-entities.md E-2 / E-6 / E-7 も併読した — 宣言外の追加入力)(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用)

測定 ref: **worktree HEAD `26fc7ddb29228757d40e3d15d6d8c0513d505f63`**(`.github/workflows/` は business-logic-model.md の測定 ref `c8702be09` から差分ゼロ)。

---

## 1. 非ブロッキング契約の信頼性面 — 何が壊れやすいのか

本 unit のジョブは `ci-success` の `needs` に参加しない(BR-PDC-3)。この設計には**固有の信頼性リスク**がある: **誰も見なければ、赤いまま永久に放置される。**

ブロッキングジョブは赤くなれば PR がマージできないので、必ず誰かが対処する。非ブロッキングジョブにはその強制力が無い。したがって非ブロッキングであることは「壊れても構わない」ではなく、**壊れたことが必ず見える設計を別途用意する義務**を生む。

`.github/workflows/perf.yml:6-11` の契約はまさにこの義務を明文化している(実文、逐語):

```
# Non-blocking loud-fail contract: this workflow is deliberately absent from
# ci.yml's `ci-success` needs list and from branch protection, so a red run here
# never blocks a pull request. Failures stay loud instead: the workflow run goes
# red in the Actions tab and each failing job appends the tail of its output to
# the run's step summary. Silencing a failure (continue-on-error, `|| true`) is
# not an acceptable way to keep this workflow green.
```

3 要素の合成である: (a) needs 非参加 → PR を塞がない、(b) 失敗はジョブが赤になる → Actions タブで見える、(c) 失敗時に末尾をステップサマリへ追記 → 中身が見える。business-logic-model.md §6 が同旨を記す。**本 unit は 3 要素すべてを採る。**

### 手動起動ゆえの追加リスクと、その受容

perf.yml は `schedule`(毎日 02:47 JST)を持つため、放置された赤は翌日の run でも赤として残り続け、Actions タブで蓄積する。**本 unit は `schedule` を持たない**(FR-5a が Out と定める)ため、起動しない限り赤も緑も生じない。

これは信頼性の観点では **「最新の結果が古くなる」** リスクである。深掘りジョブが最後に緑だったのが 3 か月前でも、それは可視化されない。

本 unit はこれを**受容する**。理由: FR-5a が手動起動を選んだのは「深掘りは必要になったときに回す」という運用意図であり、鮮度の保証は要件に含まれない。鮮度が要るなら `schedule` を足すことになるが、それは ADR-3 Alternatives Rejected B が退けた方向である(business-rules.md 適用外表)。**受容したリスクとして §4 の R-1 に記録する** — 無記録の受容は後続 intent から見て「見落とし」と区別できないため。

---

## 2. loud fail の実装上の必要条件

### 2.1 `continue-on-error` を書かない

BR-PDC-9 のとおり、実行ステップ・実在検査ステップ・照合ステップのいずれにも `continue-on-error` と `|| true` を書かない。

**引用元の `formal-model-check` は逆の形を採っている**点に注意する。実測(`.github/workflows/ci.yml`、HEAD、逐語):

```
      - name: Checkout
        id: formal-checkout
        continue-on-error: true
        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
```

これは「どのステップが落ちても最後まで進み、証跡 JSON を必ずアーティファクトへ上げてから、終端ステップで exit code を決める」という証跡優先の設計であり、`ci-workflow-contract.ts` の `inspectFormalSteps` がその形をピンしている。本 unit は**採らない** — 本ジョブの証跡はジョブログそのもの(fast-check の既定出力)であり、アップロードすべき成果物ファイルが無いため、`continue-on-error` で先へ進む必要が無い。business-rules.md「引用元との意図的相違」がこの合成(配置様式は `formal-model-check` から、失敗方針は `perf.yml` から)を申告済みである。

### 2.2 `set -o pipefail` は loud fail の必要条件

`tee` を挟む場合、パイプの終端(`tee`)の exit code が採られると `bun test` の失敗が exit 0 に化ける。これは `cid:code-generation:no-exit-capture-through-pipe` が記録する既知の失敗様式そのものである。

perf.yml の実行ステップも同じ形を採る(`.github/workflows/perf.yml:61-63`、逐語):

```
        run: |
          set -o pipefail
          bash tests/run-tests.sh --perf 2>&1 | tee perf-run.log
```

BR-PDC-7 が本 unit へ同形を要求する。**`set -o pipefail` の欠落は「テストが落ちてもジョブが緑」という最悪の壊れ方**をする — org.md Forbidden の検証劇場に該当し、非ブロッキングであることと相まって永久に気づかれない。したがってレビュー観点として最優先に置く。

### 2.3 失敗サマリの発火条件を絞る

BR-PDC-10 のとおり `if: ${{ failure() && steps.<実行ステップ id>.conclusion == 'failure' }}` とし、素の `failure()` を使わない。perf.yml が理由を実文で書いている(`.github/workflows/perf.yml:75-76`、逐語):

```
        # Scope the summary to the test step itself: a bare failure() also
        # fires on checkout/setup/install failures and would mislabel them.
```

信頼性面での意味: **サマリの有無が「PBT が落ちたのか、環境が落ちたのか」の判別子**になる(domain-entities.md E-7)。素の `failure()` にするとこの判別子が失われ、npm レジストリの一時障害が「反例を検出した」ように見える。誤ラベルは調査コストを生むだけでなく、次に本物の反例が出たときの信頼を削る。

---

## 3. 決定性と flake 回避

### 3.1 固定 seed による再現性

深掘り実行も既定実行と同じ固定 seed を使う。`tests/unit/t204-audit-escape.pbt.test.ts:38` 実文 `const PBT_SEED = 0xa0_d17;`、`:41` 実文 `const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 50_000 } : { seed: PBT_SEED };` — **深掘り側も `seed: PBT_SEED` を持つ**。すなわち同じ seed で 100 件ではなく 50,000 件を探索する形であり、深掘りの反例も決定的に再現できる。

`workflow_dispatch` に `inputs` を定義しない設計(BR-PDC-12 / frontend-components.md 出力契約 4)は、この決定性を利用者入力から守るためである。numRuns や seed を UI から可変にすると、実行ごとに条件が変わり「前回赤かった run を再現する」ことができなくなる。

### 3.2 flake の分類と扱い

| 分類 | 兆候 | 扱い |
| --- | --- | --- |
| 真の反例 | 同じ seed で再実行しても同じ縮小反例が出る | 修正対象。`t204:23-25` の規約に従い、縮小反例を example-based テストへ写して恒久ピンにする |
| 環境起因 | 再実行で消える。サマリが出ない(= F4) | 再実行。コード修正しない |
| 時間起因 | `cancelled`(timeout 超過) | `timeout-minutes` の再導出(performance-design.md §2.2)。反例ではない |

**この 3 分類が終端状態から判別できることが本 unit の信頼性設計の中核**である。F2(反例)だけがサマリを出し、F4(環境)はサマリなしの failure、timeout は cancelled — 3 者が Actions タブの表示だけで区別できる。

### 3.3 実行漏れという静かな flake

`cid:build-and-test:test-path-set-completeness` が記録するとおり、Bun は不存在 path を無音で除外したまま exit 0 になり得る。これは「緑になる flake」であり、通常の flake より危険である(赤い flake は誰かが見るが、緑の flake は誰も見ない)。

BR-PDC-5(事前実在検査)と BR-PDC-6(事後ファイル数照合)が両側から塞ぐ。security-design.md §4 が同じ機構をセキュリティ面(偽の検証記録)から扱っており、本書は信頼性面(実行漏れの静かな成功)から扱う — 同一機構の2つの側面である。

事後照合の抽出述語は数値部のみを取り語尾に依存しない(HEAD 実測で単数形 `file` と複数形 `files` の両方が現れる)。語尾を含む正規表現は 1 ファイル時に常時赤という別の壊れ方をする。

---

## 4. リスク登録

| ID | リスク | 現況 | 扱い |
| --- | --- | --- | --- |
| R-1 | 手動起動のため結果の鮮度が保証されない(最後の緑が古くなる) | `schedule` を持たない設計上の帰結 | **受容**(§1)。鮮度保証は FR-5a のスコープ外。必要になれば別 intent で `schedule` の是非を裁定する |
| R-2 | 非ブロッキングの赤が放置される | (a)(b)(c) の 3 要素で可視化する | **緩和**。可視化以上の強制力は非ブロッキング契約と両立しない |
| R-3 | `pbt-deep` の action SHA ピンが既存テストで強制されない | `inspectFormalSteps` は `formal-model-check` 限定(security-design.md §3) | **レビュー観点で担保**(BR-PDC-16)。機械化は `tests/formal-verif/support/` の契約変更となり components.md U5 の所在を超えるため本 unit のスコープ外 |
| R-4 | 対象パス集合の具体が本 unit で確定しない(依存 unit 着地待ち) | domain-entities.md E-5 | **順序で解消**。unit-of-work-dependency.md の batch 4 配置がこの依存を表現している |
| R-5 | baseline fixture が cast-guard 着地前の値で採られる | INV-4 | **順序で解消**。再 baseline を本 unit の最終手順に置く(BR-PDC-14) |

---

## 5. Git 資産としての fixture — 埋め込みフォールバックを持たない

`tests/fixtures/formal-verif-ci-baseline.sha256` は Git 管理下の 1 行ファイルであり、読み側は失敗時のフォールバック値を持たない。実文(`tests/integration/t-formal-verif-ci-workflow.integration.test.ts:9-12`、逐語):

```ts
const BASELINE_SHA = readFileSync(
  "tests/fixtures/formal-verif-ci-baseline.sha256",
  "utf8",
).trim().split(/\s+/)[0]!;
```

`readFileSync` が直に投げる形であり、`?? "<既定ハッシュ>"` のような埋め込み既定値が無い。`cid:nfr-design:c3`(Git 管理資産では埋め込み fallback を二重保持せず、Git 履歴からの復元・単一ソース・drift 検出を優先する)に照らして**この形は正しく、本 unit は変更しない**。

本 unit が行うのは値の更新だけである。値は `sha256(normalizedCiBaseline(ci.yml))` の計算コマンドの出力からの転記のみとし、手で組まない(`cid:requirements-analysis:sha-no-manual-expansion` / `cid:requirements-analysis:numbers-from-command-output-only`)。

**フォールバックを足してはならない理由**を明記する: 埋め込み既定値があると、fixture が失われたときにテストが「既定値との比較」で緑になりうる。それは ci.yml のピンが実質的に消えた状態であり、検証劇場である。fixture 不在で loud に落ちることが正しい挙動である。

---

## 6. 回復手順

| 事象 | 回復 |
| --- | --- |
| 再 baseline 忘れで `t-formal-verif-ci-workflow` が赤 | `sha256(normalizedCiBaseline(ci.yml))` を計算して fixture へ転記。cast-guard 着地後の ci.yml から採る(INV-4) |
| cast-guard と本 unit の ci.yml 編集が衝突 | 直列化(batch 3 → batch 4)により本来起きない。起きた場合は cast-guard 側を先に着地させ、本 unit が後発として再 baseline を採り直す |
| 深掘りが timeout | `timeout-minutes` を実測から再導出(performance-design.md §2.2)。安易な増値でなく、対象集合の実測をやり直す |
| 反例を検出 | 縮小反例を example-based テストへ写して恒久ピンにし(`t204:23-25` の規約)、property は探索を続けさせる |

---

## 7. 上流成果物の本文参照(consumes の依拠箇所)

| 上流成果物 | 本書での依拠箇所 |
| --- | --- |
| business-logic-model.md | §1(§6 の loud fail 成立条件と perf.yml の 3 要素、INV-3)、§2(§3.2 のジョブ内フローとステップ [7] の発火条件限定)、§3(§4 の固定 seed・深掘り予算、INV-5 の全数実行)、§4(INV-4 の baseline 採取時点、§2 の cast-guard との共有資源直列化)、§6(§7 のジョブ終端状態と F1〜F4 の区別) |
