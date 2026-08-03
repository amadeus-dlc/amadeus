# Frontend Components — unit `pbt-deep-ci` (#1980)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md(参照実体は本文各節+末尾の上流参照補足。設計裁定の引用元として decisions.md / unit-of-work-dependency.md も併読した — 宣言外の追加入力)

測定 ref: **worktree HEAD `c8702be09d74daa8091d99d3eae48987b9fd7527`**。

---

## N/A — 本 unit は UI を持たない

本 unit の成果物は `.github/workflows/ci.yml` に追加する GitHub Actions ジョブ 1 本と、`tests/fixtures/formal-verif-ci-baseline.sha256` の再 baseline のみである(components.md U5 節が所在を「`.github/workflows/ci.yml`(ジョブ追加)+ `tests/fixtures/formal-verif-ci-baseline.sha256`(再 baseline)」と規定、unit-of-work.md が本 unit を「CI 41〜61行」と定義)。画面・コンポーネント・状態管理・ルーティングのいずれも存在せず、利用者が触れる面は GitHub Actions の Web UI(Actions タブの Run workflow ボタンと実行ログ)であって、それは GitHub が所有する既存 UI であり本 unit が実装するものではない。services.md も「本 intent は UI を持たない。『サービス』に相当するのは (S1) ガード CLI と (S2) CI ジョブの2つで、いずれも**出力文言 + exit code** が契約面である」と明記し、API/UI 仕様ではなく**出力契約**として書くことを指示している。component-methods.md に U5 の節が存在しないこと(同書の節見出しは U1 / U2 / U3 / U4 / U8 と共通規約節のみ)も、本 unit が描画物を1つも新設しないことの裏づけである。decisions.md ADR-3 も配置(ci.yml へのジョブ追加)だけを裁定しており、表示面に関する裁定は含まない。

以下は、UI 仕様の代替として本 unit が守る**出力契約**である。

---

## 代替の出力契約 1: ジョブログ(利用者が最初に見る面)

FR-5a が求める「失敗 seed をジョブログへ可視化」の実体。

| 項目 | 契約 |
| --- | --- |
| 出力元 | `bun test` の stdout / stderr(`2>&1` で統合) |
| 加工 | **なし**。fast-check の既定出力(seed / replay path / 縮小反例)をそのまま素通しする(services.md S2「失敗 seed の可視化」、business-rules.md BR-PDC-11) |
| 保存 | 同時に `tee` でログファイルへ複製(BR-PDC-7)。パイプ先の exit code を採らないため `set -o pipefail` を先頭に置く |
| 根拠 | `tests/unit/t204-audit-escape.pbt.test.ts:21-22` 実文 `// 2. FAILURE OUTPUT. On failure fast-check prints the seed, replay path, and` / `//    the SHRUNK counterexample — enough to reproduce with no extra wiring.` |

## 代替の出力契約 2: ステップサマリ(失敗時のみ)

| 項目 | 契約 |
| --- | --- |
| 発火条件 | `if: ${{ failure() && steps.<実行ステップ id>.conclusion == 'failure' }}` — 実行ステップに限定し、素の `failure()` は使わない(BR-PDC-10) |
| 内容 | ログ末尾 N 行を fenced code block で `$GITHUB_STEP_SUMMARY` へ追記 |
| 様式 | `.github/workflows/perf.yml:78-87` と同形(見出し行 → 空行 → 説明行 → 空行 → ``` → `tail -n <N> <log>` → ```) |
| 発火しない場合の意味 | checkout / setup / install の失敗、またはパス実在検査・ファイル数照合の失敗。**サマリの有無が「PBT が落ちたか、環境が落ちたか」の判別子**になる(business-logic-model.md §7) |

perf.yml がこの限定を採る理由の実文(`:75-76`):

```
        # Scope the summary to the test step itself: a bare failure() also
        # fires on checkout/setup/install failures and would mislabel them.
```

## 代替の出力契約 3: ジョブの終端状態(Actions タブでの見え方)

| 終端 | 利用者から見た意味 |
| --- | --- |
| `skipped`(灰) | `push` / `pull_request` での起動。深掘りは手動専用なので**正常**(FR-5a) |
| `success`(緑) | 対象 PBT 集合が全数・深掘り予算で実行され、反例なし |
| `failure`(赤) | 反例検出、またはパス集合・実行数の不整合、または環境失敗。**PR は塞がない**(`ci-success` の `needs` に不参加 — BR-PDC-3)が、Actions タブでは赤く残る |
| `cancelled` | 中断または `timeout-minutes` 超過 |

「PR を塞がないが、赤は赤として見える」という非対称が本 unit の表示契約の核であり、`.github/workflows/perf.yml:6-11` の非ブロッキング loud-fail 契約(実文 ``# Silencing a failure (continue-on-error, `|| true`) is`` / `# not an acceptable way to keep this workflow green.`)をそのまま継承する。

## 代替の出力契約 4: 起動導線

| 項目 | 内容 |
| --- | --- |
| 導線 | GitHub の Actions タブ → ワークフロー **CI** → Run workflow |
| 権限 | 書き込み権限を持つ利用者のみ(`workflow_dispatch` の GitHub 側仕様。decisions.md ADR-3 Security/Compliance 影響) |
| 新規 UI 要素 | **なし** — `ci.yml:8` の `  workflow_dispatch: {}` が既存であり、本 unit はトリガ定義を追加しない(BR-PDC-2)。すなわち Run workflow ボタンは既に存在し、本 unit はそこにジョブを1本ぶら下げるだけである |
| 入力フォーム | **なし**(`workflow_dispatch` の `inputs` を定義しない)。深掘り予算・seed はコードの定数が所有し、実行時パラメータにしない(BR-PDC-12) |

`inputs` を設けない選択は意図的である。numRuns や seed を UI から可変にすると、実行ごとに条件が変わって**再現性(FR-4c の決定性)が利用者の入力に依存する**ようになる。既存規約が seed を定数(`tests/unit/t204-audit-escape.pbt.test.ts:38` `const PBT_SEED = 0xa0_d17;` の様式)で固定しているのは同じ理由であり、本 unit はその方針に従う。

---

## 上流成果物の本文参照(consumes の依拠箇所)

| 上流成果物 | 本書での依拠箇所 |
| --- | --- |
| requirements.md | 出力契約 1(FR-5a の seed 可視化)、出力契約 3(FR-5b の非ブロッキング)、出力契約 4(FR-4c の決定性 = inputs を設けない根拠) |
| unit-of-work.md | N/A 節(本 unit の規模定義が「CI 41〜61行」であること) |
| unit-of-work-dependency.md | 出力契約 3(`ci-success` needs 非参加 = 共有資源 ci.yml への書き込みが本 unit の唯一の利用者可視面であること) |
| components.md | N/A 節(U5 の所在 = ci.yml + fixture のみで描画物ゼロ) |
| component-methods.md | N/A 節(U5 節が存在しない = 新設メソッド・描画コンポーネントゼロ) |
| decisions.md | N/A 節(ADR-3 が配置のみを裁定し表示面の裁定を含まないこと)、出力契約 4(ADR-3 Security/Compliance 影響の権限記述) |

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段4(手動深掘りによる浅い探索の見逃し回収と失敗 seed 再現)に対応する。
