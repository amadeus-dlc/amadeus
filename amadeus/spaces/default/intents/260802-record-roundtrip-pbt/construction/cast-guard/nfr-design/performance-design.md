# Performance Design — cast-guard (#1980 / AD U4)

上流入力(consumes 全数): business-logic-model.md(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用。加えて decisions.md(ADR-1〜4)・components.md・component-methods.md も宣言外の追加入力として本文で file:line 引用している)

本書は business-logic-model.md §4(処理フロー = SCAN → CENSUS → DIFF)・§9(CI 実行位置)・§11(規模と再利用)に依拠し、同書 §7 の「本 unit は PBT の対象ではない」という確定を性能予算の適用範囲判定にそのまま用いる。宣言外の追加入力として同 unit の business-rules.md(BR-CG-6 / 33 / 39〜41)と domain-entities.md §4(所有関係)を併読した。

## 測定 ref

本書の実測値はすべて worktree HEAD **`26fc7ddb29228757d40e3d15d6d8c0513d505f63`**(`git rev-parse HEAD`)。business-logic-model.md :5 の測定 ref `c8702be09` との関係は `git diff --stat c8702be09..HEAD -- tests/ .github/workflows/ packages/framework/core/ scripts/` が**出力 0 行 / exit 0** であることを本ステージで再実測しており、FD が確定した file:line・件数は HEAD でそのまま成立する。application-design(measured ref `5a6f79727`)からの実測転記も同様に成立する。

## 1. 予算対象の同定 — 何が性能要件で、何が本 unit に適用されないか

| 候補 | 本 unit への適用 | 根拠 |
| --- | --- | --- |
| NFR-4(新規 PBT 群の直接実行 2秒以内・PBT_SEED 固定) | **非適用** | business-logic-model.md §7 が「requirements.md `FR-4a`(:35)が定める PBT の常駐対象は state / election 境界であり、**本 unit は PBT の対象ではない**」と確定。本 unit の対応 FR は `FR-3a〜3c` のみ(同 §1) |
| lint ジョブ内 1ステップの実行時間 | **適用(唯一の実行時予算)** | business-logic-model.md §9 が CI 実行位置を「ci.yml lint ジョブの callsite-guard 直後・ブロッキング」と確定 |
| 常駐サービスのレイテンシ / スループット / 同時実行数 | **非適用** | 常駐プロセスが存在しない。CLI 1プロセス、1回の走査(`cid:nfr-design:c1` — CLI/テスト基盤に常駐サービス向け設計を機械適用しない) |
| ガード自身のテストの実行時間 | **予算契約は置かない** | unit / integration とも既存スイートの一部として走る。個別の時間契約を新設する根拠(強制メカニズム)が無い |

予算の**強制メカニズム**は `.github/workflows/ci.yml:98` 実文 `    timeout-minutes: 10`(対象ジョブは `:93` 実文 `  lint:` / `:94` 実文 `    name: Lint and complexity`)である。本書の数値はすべてこの 600 秒から導出するか、実測値の転記のいずれかであり、それ以外の由来を持つ数値は置かない。

## 2. 実測基点

### 2.1 走査コスト(application-design 実測の転記)

decisions.md ADR-2「引用元との意図的相違」節(`:117`)の実測を転記する(測定 ref = AD の `5a6f79727`、上記のとおり HEAD で不変):

| 対象 | 実測 | 回数・手段 |
| --- | --- | --- |
| 本 unit の AST 走査(SCAN_ROOTS 全域) | **0.29 / 0.29 / 0.31 秒** | 3回、`/usr/bin/time -p` |
| 既存 `bun tests/callsite-guard.ts --check`(語彙走査) | **0.20 / 0.20 秒** | 2回、同上 |
| 差 | **約 +0.1 秒** | 上記2列から |

### 2.2 走査母集団(本ステージでの独立再測定)

| 指標 | 値 | 測定コマンド(HEAD で実行) |
| --- | --- | --- |
| SCAN_ROOTS の `.ts` ファイル数 | **236** | `find packages/framework/core scripts -name '*.ts' -not -path '*/node_modules/*' \| wc -l` |
| 同 総行数 | **97,154** | `find packages/framework/core scripts -name '*.ts' -not -path '*/node_modules/*' -print0 \| xargs -0 cat \| wc -l` |
| うち `packages/framework/core` | 210 ファイル / 87,893 行 | 同上をルート別に実行 |
| うち `scripts` | 26 ファイル / 9,261 行 | 同上 |

ファイル数 236 は decisions.md `:117` が記録する母集団と一致する(`cid:requirements-analysis:enumeration-reverify-at-implementation` の再列挙)。

## 3. 予算消費率(派生値 — 算出式を併記し、受け入れ基準には使わない)

以下はすべて §2 の実測からの**派生値**であり、実測値ではない(`cid:nfr-requirements:derived-value-shows-formula`)。

| 派生値 | 算出式 | 結果 |
| --- | --- | --- |
| 最悪観測の予算消費率 | 0.31 秒 ÷ 600 秒 | **0.052%** |
| 増分(AST 化による)の予算消費率 | 0.1 秒 ÷ 600 秒 | **0.017%** |
| 1ファイルあたりの償却コスト | 0.31 秒 ÷ 236 ファイル | **約 1.31 ms/file**(推定) |
| 1行あたりの償却コスト | 0.30 秒 ÷ 97,154 行 | **約 3.1 μs/line**(推定) |

「AST 走査の増分は lint ジョブの予算に対して無視できる」という decisions.md ADR-2 の判断は、この 0.017% という消費率で裏付けられる。本 unit はこの判断を再検討しない。

## 4. 受け入れ基準(実測可能な形)

| # | 基準 | 判定手段 | 由来 |
| --- | --- | --- | --- |
| PERF-CG-1 | `lint` ジョブが `timeout-minutes: 10` に達せず完了する | CI そのもの(機械) | `.github/workflows/ci.yml:98` |
| PERF-CG-2 | 実装段で SCAN_ROOTS 全域 `--check` の実行時間を **3回測定**し、値・測定コマンド・測定 ref を code-summary へ転記する | `/usr/bin/time -p`(AD と同一手段) | `cid:requirements-analysis:numbers-from-command-output-only` |
| PERF-CG-3 | PERF-CG-2 の実測が **3 秒**を超えた場合、事前フィルタ(BR-CG-6、§5)適用の可否を実測付きで判断し、判断根拠を記録する | 同上 | 3 秒の由来 = 予算 600 秒 × 0.5%(導出値。絶対契約ではなく再検討トリガーの方針値) |

PERF-CG-3 の 3 秒は「AD 実測 0.31 秒の約 10 倍」に相当し、§3 の償却コストが一桁悪化した場合にのみ発火する。この閾値自体を合否基準として PR を赤くする機械ゲートは**新設しない** — CI に時間ゲートを足すと、ランナー負荷変動による偽赤(`cid:code-generation:fanout-load-settle-before-integration` と同型のクラス)を持ち込むためである。

## 5. 事前フィルタ(BR-CG-6)— 設計はするが既定では有効化しない

business-rules.md BR-CG-6 は「性能目的の事前フィルタ(`JSON.parse` を含む行が1つも無いファイルの AST 生成スキップ)を導入する場合、述語判定には使わず AST 生成前の足切りにのみ使う」と定め、business-logic-model.md I-8 が「事前フィルタの無害性 — 見逃しを作らない」を不変量に置く。

### 5.1 効き幅の実測

| 指標 | 値 | 測定コマンド(HEAD) |
| --- | --- | --- |
| SCAN_ROOTS 上で `JSON.parse` を含むファイル数 | **60** | `grep -rl "JSON\.parse" --include='*.ts' packages/framework/core scripts \| wc -l` |
| 省ける `ts.createSourceFile` の割合 | **約 74.6%**(派生値 = 1 − 60 ÷ 236) | 上記と §2.2 から |

### 5.2 既定で有効化しない理由

増分は予算の 0.017%(§3)であり、最適化を要する実測上の根拠が無い。フィルタは無害性の検証コスト(census 一致テスト)を恒久的に背負う一方で、削減できるのは既に無視できる量である。**未計測の最適化を先に入れない。**

### 5.3 有効化する場合の契約(PERF-CG-3 が発火したときにのみ適用)

- フィルタ述語は「ファイル本文に文字列 `JSON.parse` を含まない」の1形のみとする。`as` 側・型名側でのフィルタは多行形(business-logic-model.md §3 実測で 33 件中 5 件)を落としうるため採らない。
- 検証: SCAN_ROOTS 全域について**フィルタ ON / OFF の census が完全一致**することを assert する(BR-CG-6 の検証手段そのもの)。一致しないフィルタは I-3(述語の全数性)の破れであり、そのまま検証劇場になる。
- フィルタは `detectUncheckedCasts` の**外側**(走査層)に置く。純関数の述語本体にフィルタ分岐を混ぜると、domain-entities.md §4 が定める「『無検査キャストか』の判定は `detectUncheckedCasts` のみが所有する」を破る。

## 6. 計測の決定性

走査時間の入力はディスク上のソースのみであり、ネットワーク・時計・並行性・乱数に依存しない(reliability-design.md §4 と同じ根拠)。したがって同一ホストでの再測定は再現する。ただし CI ランナーの負荷変動は制御下にないため、記録は**3回測定の実値列**として残し、平均・中央値は派生値としてのみ併記する(単一値へ丸めない)。

## 7. coverage 計測との関係(性能を理由に spawn へ寄せない)

business-rules.md BR-CG-33 は integration テストを「spawn ではなく in-process」と定め、BR-CG-39 が patch coverage の実測を要求する。spawn 版のほうがテスト記述は単純だが、`bun --coverage` は spawn したサブプロセスを計測しない(`cid:code-generation:bun-coverage-spawn-blindspot`)ため、**テスト実行時間を理由に spawn 駆動へ切り替えることは本 unit では認めない**。この制約は requirements.md `NFR-2`(:56)由来であり、性能予算より優先する。

## 8. 本 unit で行わない性能設計(根拠付き)

| 施策 | 行わない理由 |
| --- | --- |
| 走査結果のキャッシュ(前回 census の永続化) | 予算消費 0.05% に対して、キャッシュ無効化の正しさを保証するコストが釣り合わない。加えてキャッシュは「台帳は常に全域走査から導出する」(business-logic-model.md I-6 = 数値の走査由来性)を壊す |
| 増分走査(git diff ベースで変更ファイルのみ走査) | 同上。全域走査でないと census が母集団を表さなくなり、残存レポート(BR-CG-28)の意味が失われる |
| ファイル並列化(worker 分割) | 逐次で 0.31 秒。並列化の複雑性(順序の非決定化 → reliability-design.md §4 の決定性の破れ)に見合わない |
| 型解決(TypeChecker)の導入 | decisions.md ADR-2 代替 B で却下済み。クロスファイル型解決は構文解析より桁違いに重く、scalability-design.md §5 のとおり線形性そのものを壊す |

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段3(バリデータ非経由の読み戻し経路新設の CI 機械ブロック)に対応する。ガードが lint ジョブ予算を脅かさないことは、この価値が「CI を遅くする代償なしに」得られることの条件である。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T23:28:14Z
- **Iteration:** 1
- **Scope decision:** none

測定 ref・数値・層別保証は高水準で一貫、FD 逸脱なし。consumes 5件の沈黙 Major で REVISE(GoA 5)。手続き自己開示: 許可外 ls/grep を check-read なしで実施(傍証扱い・正式エビデンス非算入と自己申告)。

### Findings

- [Major] 5成果物ヘッダが宣言 consumes 6件中 business-logic-model.md のみ列挙 — stage frontmatter の nfr-requirements 系5件への参照・N/A 根拠が沈黙(注: 実測では engine 解決済み directive の consumes は1件のみで sensors 60/60 PASSED — 残る実質は SKIP 根拠の明記)
- [Minor] レビュー手続き — 許可外読取の自己開示(nfr-requirements ディレクトリ不在の傍証)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T23:31:54Z
- **Iteration:** 2
- **Scope decision:** none

Major(consumes 沈黙)は閉包。数値検算・c1/c3/c4/c7 準拠を再検証し適合。新規 Minor(宣言外欄が実引用より狭い — conductor が列挙拡張是正)を開示のうえ iteration 予算到達で READY。GoA 2。

### Findings

- [Minor] 宣言外の追加入力欄が実引用(decisions/components/component-methods)より狭い(是正: 列挙を拡張済み)
