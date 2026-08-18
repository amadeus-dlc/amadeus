# Issue Evidence — 260817-inception-cost-batch

## メタデータ

- fetched-at: 2026-08-18T01:34:06Z / repo: amadeus-dlc/amadeus / tool: issue-evidence fetch

## Issue #3181: enhancement: self-fix の RE/RA がクロスレビュー済み Issue エビデンスを上流入力として消費せず、インセプション固定費(中央値47分/intent)を毎回再導出している

- state: OPEN / labels: 未取得(本 verb の read 面は本文・状態・コメントのみ) / url: https://github.com/amadeus-dlc/amadeus/issues/3181 / target-sha: 215855ea757b70cecc10b9920bfe9e7b4d2de074
- review-run-id: xrev-3181-20260817 / 独立レビュアー: 2名(marker 計数)

### 本文(verbatim)

### 重複・現行状態の確認

- [x] open/closed の両方を対象に、同じ課題・提案・質問の Issue を検索しました（`gh issue list --state all --search "<q>"` を `answer-evidence` / `pr-convergence-report-format` / `requirements-analysis 軽量` / `インセプション` / `self-fix 固定費` の5述語で実行 — 同一提案なし。隣接は #2415〈RE 差分リフレッシュへの工程記録混入 — RE 入力の汚染除去で相補〉と #993〈chore マイクロスコープ — PR #996 で実装済みだが self-* 開発は Scope Overrides ノルムで対象外〉で、いずれも「Issue エビデンスの上流入力化」ではない）
- [x] origin/main と関連する open/merged PR を確認し、現行状態でも起票が必要だと確認しました（観測 ref = origin/main `e157be644`。`packages/framework/core/amadeus-common/stages/inception/requirements-analysis.md` frontmatter の `consumes` は intent-statement / scope-document / business-overview / architecture / code-structure / team-practices のみで GitHub Issue 系 artifact は存在せず、`reverse-engineering.md` は `consumes: []`。本文 grep でも `issue` / `cross-review` への言及 0 件）

### エレベーターピッチ

[クロスレビューで確定済みの事実を self-fix のインセプションが毎回再導出する固定費をなく] したい
[self-fix intent を回す conductor と、その成果物を裁定する人間・レビュアー] 向けの、
[Issue エビデンス上流入力（issue-evidence upstream）] というプロダクトは、
[起票 Issue 本文と独立2名クロスレビューの実測コメントを RE/RA の第一級上流入力として取り込む stage 契約+取り込み機構] です。
これは [インセプション固定費（RE+RA active 中央値 47 分/intent）の圧縮と、RA の upstream-coverage 引用の一次資料への接地] ができ、
[関連 Issue のバッチ化による按分（現行で唯一の実効策 — 5 unit バッチで 12 分/unit を実測）] とは違って、
[関連 Issue が揃わない単発修正の self-fix にもそのまま効く] のが備わっている。

### 背景・対象範囲

self-fix scope の入口は Issue クロスレビュー（独立2名・実測エビデンス付き — team.md `cid:requirements-analysis:issue-cross-review`）を通過済みであることが多く、そこには機序・file:line・再現結果・受け入れ基準の一次資料が既に揃っている。しかし現行の stage 契約では、この一次資料は RE / RA のどの `consumes` にも現れず、`WORKFLOW_STARTED` の Request 自由文として人手で要約転記されるだけである（実測例: intent 260815-stale-epoch-landed の Request に「クロスレビュー独立2名成立（ESTABLISHED_WITH_REFINEMENTS）。精緻化済みの機序: …」が in-line 記載）。結果として RA は同じ事実を成果物様式（upstream-coverage 引用・E-OC1 証跡）に載せ直すために再導出しており、self-fix の最頻クラス（単発 Issue 修正）で intent ごとに中央値 47 分の固定費が発生している。

対象範囲: `requirements-analysis.md` / `reverse-engineering.md` の stage 契約（consumes・本文）、issue-first intent での Issue 本文+クロスレビューコメントの record への取り込み面。SKIP 判断の変更は対象外（後述の既決に従う）。

### 根拠・実測証拠

**計測（事実）** — 測定 ref = ローカル record ツリー HEAD `215855ea7`（audit shard は append-only のため測定窓に対して確定値）。ソース = `amadeus/spaces/default/intents/*/audit/*.jsonl`。述語 = `WORKFLOW_STARTED` の `attributes.Scope == "self-fix"`（該当 47 intent、完了 41）。stage 時間 = `STAGE_STARTED`→`STAGE_COMPLETED` の時系列ペアリング、active = ウィンドウ内の連続監査イベント間隔を 900 秒キャップで総和（長時間放置・CI 待ちを除外する実働推定）、park 期間は控除:

- 直近時代（260811 以降、21 intent）: reverse-engineering active 合計 9.0h（中央値 24 分/回）、requirements-analysis 8.0h（中央値 24 分/回）、code-generation 27.2h（中央値 49 分/回）。**RE+RA 中央値 47 分/intent、(RE+RA)/(RE+RA+CG) の per-intent 中央値 48%**
- 固定費は unit 数に依存しない: 単一 Issue intent の RE+RA は 24〜73 分（20 件）に対し、**5 unit バッチの 260814-open-bug-batch-6 は合計 61 分 = 12 分/unit**（unit 数は監査イベント Unit 属性の distinct 数、按分値は算出式併記の派生値）
- RA は手戻り最多の inception ステージ: `SENSOR_FAILED` の (stage, sensor) 集計で requirements-analysis に upstream-coverage 74 件・answer-evidence 50 件（成果物様式・証跡儀式での往復）

**構造（事実）** — 観測 ref = origin/main `e157be644`: RA の `consumes` に Issue 系 artifact なし、RE は `consumes: []`（上記チェックボックス参照）。Issue 一次資料の流入経路は Request 自由文のみ。

**観測** — answer-evidence advisory の FAILED→PASSED 窓（RA 中央値 15 分級）は専用の手戻りではなく RA 通常作業（起草・レビュー・裁定）と並走し、PASSED はステージ完了直前に立つ（260813-remove-team-up / 260814-unit-failure-autoelectio の監査タイムライン実読）。すなわち RA コストの主体はセンサ是正ではなく成果物儀式そのものである。

**仮説** — クロスレビュー済み一次資料を消費すれば RE+RA active は下がる。効果量は未実測（導入後の再実測で確定する — 完了条件 (4)）。

### 期待結果・完了条件

実装形（取り込みを artifact 化するか、consumes 拡張か、CLI での fetch か）は設計裁定事項であり本 Issue は方向のみを固定する:

1. issue-first の self-fix intent で、起票 Issue 本文と独立2名クロスレビューコメントが record 内の一次入力として取り込まれ、RA/RE の upstream-coverage 引用先として成立すること（第三者確認: 当該 intent の record に取り込み成果物が実在し、requirements.md の引用がそこへ解決する）
2. RA の stage 契約に「クロスレビューで確定済みの機序・file:line・受け入れ基準は再導出せず消費する」が明文化されること（project.md `cid:requirements-analysis:c5`〈決定済み事項の再質問禁止〉と整合）
3. 取り込みに検査・ゲートを新設する場合は落ちる実証（欠落 fixture で FAILED）を伴うこと（team.md Mandated 準拠）
4. 効果測定: 導入後の self-fix N 件（実装 intent の requirements で N と目標低下幅を観測レンジ内で確定 — `cid:code-generation:c1-threshold-inside-observed-range` 準拠）で RE+RA active 中央値を同一手法で再実測し、ベースライン（中央値 47 分/intent）と比較すること

### 影響・価値

self-fix は本 space の最頻 scope（audit 実測で 47 intent）で、直近時代 21 intent のインセプション固定費 17.0h は code-generation 27.2h の 6 割強に相当する。導入すれば、単発 Issue 修正の pipeline 固定費のうち「既に確定している事実の再導出」分が消え、upstream-coverage 引用も一次資料へ接地して監査可能性が上がる。導入しない場合、対策はバッチ化按分のみに留まり、バッチを組めない単発修正（priority 修正・緊急是正はたいてい単発）の固定費は不変のまま残る。

### 関連 Issue・PR・intent

- #2415 — RE 差分リフレッシュへの工程記録混入で RE コストが修正規模と無関係に増大（RE 入力の汚染除去。本提案の RE 側と相補）
- #993 / PR #996 — chore マイクロスコープ新設（RE/RA を SKIP する前例。ただし project.md § Scope Overrides により self-* 開発は self-fix 系に限定され chore は適用不可）
- `packages/framework/core/scopes/amadeus-self-fix.md` — evidence-mined 2026-07-28 の既決「RE 9/12・RA 8/12 で成果を変えたため SKIP しない。mechanical corrections は per-intent `/amadeus compose` SKIP を推奨」。**本提案はこの既決の再議ではない**（SKIP せず費用だけ下げる）
- team.md `cid:requirements-analysis:issue-cross-review`（独立2名の実測コメント — 本提案が消費する一次資料の生成側）
- intent 260814-open-bug-batch-6（バッチ按分 12 分/unit の実測点）、intent 260815-stale-epoch-landed（Request 自由文への人手要約転記の実測例）

### 優先度（いつ対応するか）

P2 — 通常

### 代替案・非採用理由

- **RE/RA を SKIP する軽量 scope（chore 型）**: amadeus-self-fix.md の evidence-mined 既決（RE 9/12・RA 8/12 が成果を変える）と正面衝突し、Comprehensive 検証水準も落ちる。非採用
- **関連 Issue のバッチ化按分（units-generation EXECUTE）**: 実測 12 分/unit まで下がる有効策で併用推奨。ただし関連 Issue が揃わない単発修正に効かず、代替ではなく相補
- **per-intent `/amadeus compose` SKIP（scope 文書の現行推奨）**: mechanical correction にのみ適用でき、適用判断が毎回人手に残る。本提案は SKIP 判断そのものを不要にし、通常経路の費用を下げる


### クロスレビューコメント(verbatim、コメント URL 併記)

#### j5ik2o — 2026-08-17T12:45:46Z — https://github.com/amadeus-dlc/amadeus/issues/3181#issuecomment-5316222090

## クロスレビュー（1人目・reviewer-1）: CONFIRMED_WITH_REFINEMENTS

<!-- issue-cross-review
review-run-id: xrev-3181-20260817
reviewer-id: reviewer-1
execution-subject-id: esid-844052e4d83f39b0
target-sha: 215855ea757b70cecc10b9920bfe9e7b4d2de074
-->

### 独立性と対象

- 起票者・他レビュアーの結論を参照せず独立検証（Issue コメントは一切取得していない）
- Review run: `xrev-3181-20260817`
- Reviewer: `reviewer-1`
- Execution subject: `esid-844052e4d83f39b0`
- 対象: `215855ea757b70cecc10b9920bfe9e7b4d2de074`（測定 ref）／構造主張は `e157be6443ec2a13dc59a7a11426610342e02658` と現行 origin/main `0b652d2cd1a6fbf2d5a905736d3a3eb887e9d810` の両方で照合
- 適用ノルム: `amadeus/spaces/default/memory/team.md`、`amadeus/spaces/default/memory/project.md`、`.claude/skills/j5ik2o-gh-issue-cross-review/references/protocol.md`

### Claim ledger

★ = core claim

| 主張 | 判定 | 独立エビデンス |
|---|---|---|
| ★ RA の `consumes` に Issue 系 artifact なし | CONFIRMED | `git show <ref>:packages/framework/core/amadeus-common/stages/inception/requirements-analysis.md`（exit 0）— consumes は intent-statement / scope-document / business-overview / architecture / code-structure / team-practices の6件のみ |
| ★ RE は `consumes: []` | CONFIRMED | 同 `reverse-engineering.md` 逐語 `consumes: []`（exit 0） |
| ★ 両 stage 本文に issue / cross-review 言及 0 件 | CONFIRMED | 述語分割 `grep -i` が全て **exit 1**、陽性対照は exit 0。`grep` が ugrep ラッパのため Python の部分文字列カウントでも二重確認（issue=0 / cross-review=0 / クロスレビュー=0 / github=0） |
| ★ Issue 一次資料の流入は Request 自由文のみ | CONFIRMED（反証テスト通過） | `packages/**` `plugins/**` 全域で `--comments` exit 1・`/comments` exit 1（コメント読取コードは皆無）。唯一の `gh issue view` は `packages/framework/core/tools/amadeus-mirror.ts:271`、戻り値は同 :227 → `compareMirrorStatus`（:126-160）で **record から描画した** `expectedBody` と比較する record→Issue 一方向 drift 検知のみ |
| ★ 260815-stale-epoch-landed の Request に人手要約が in-line | CONFIRMED | `WORKFLOW_STARTED.attributes.Request` に逐語「クロスレビュー独立2名成立(ESTABLISHED_WITH_REFINEMENTS)。精緻化済みの機序: …」 |
| ★ 該当 47 intent / 完了 41 | CONFIRMED（完全一致） | 独立集計 `self-fix intents=47 completed=41` |
| 直近時代 21 intent | CONFIRMED | `recent(>=260811)=21` |
| RE 9.0h・中央値 24 分 | CONFIRMED | `RE=9.03h/med 24.1m`（park 控除有無で不変） |
| RA 8.0h・中央値 24 分 | REFINED | 中央値 23.6 分→24 分は一致。合計は park **非控除** 7.97h→8.0h、**控除** 7.91h→7.9h（本文の「park 控除」記述と報告値が不一致。差 0.06h） |
| CG 27.2h・中央値 49 分 | REFINED | 中央値 48.9 分→49 分は一致。合計は非控除 27.16h→27.2h、控除 27.14h→27.1h |
| ★ RE+RA per-intent 中央値 47 分 | CONFIRMED | `RE+RA med=47.4m`（park 控除有無で不変） |
| (RE+RA)/(RE+RA+CG) 中央値 48% | CONFIRMED | `ratio med=48.2%` |
| ★ obb6 = RE+RA 61 分 / 5 unit = 12 分/unit | CONFIRMED | `RE+RA=61.5min units=5 -> 12.3min/unit`（distinct `Unit` 属性 5 件） |
| 単一 Issue intent 24〜73 分（20 件） | REFINED | レンジは完全一致（24.2〜72.8 分・20 件）だがラベルが不正確（下記「訂正」） |
| RA は手戻り最多の inception ステージ | CONFIRMED | SENSOR_FAILED: requirements-analysis 134 ≫ application-design 11 / delivery-planning 4 / units-generation 4 / **reverse-engineering 0** |
| ★ RA SENSOR_FAILED = upstream-coverage 74 / answer-evidence 50 | CONFIRMED（完全一致） | `{'upstream-coverage': 74, 'answer-evidence': 50, ...}`。eventId / idempotencyKey de-dup でも不変（重複 0/18415） |
| answer-evidence 窓 RA 中央値 15 分級 | REFINED | 15 分は非再現。first-FAILED 起点 19.2 分（全時代）/ 23.9 分（直近）、last-FAILED 起点 8.4 分（全時代） |
| PASSED はステージ完了直前に立つ（窓は並走） | CONFIRMED | 監査タイムライン直読（下記） |
| self-fix は最頻 scope | CONFIRMED | v2: self-fix 47 > self-feature 26 > self-document 2。全 schema でも 51 > bugfix 31 > amadeus 23 |
| インセプション 17.0h は CG の 6 割強 | CONFIRMED | `RE+RA sum=17.00h`、17.00/27.16 = 62.6% |
| self-fix scope の evidence-mined 既決（RE 9/12・RA 8/12） | CONFIRMED（逐語） | `packages/framework/core/scopes/amadeus-self-fix.md` に該当文を確認 |
| #2415 OPEN / #993 CLOSED / PR #996 MERGED closes 993 | CONFIRMED | `gh issue view` / `gh pr view --json`（exit 0） |
| 同一提案の重複なし | CONFIRMED | 独自 6 述語で `gh issue list --state all --search`（exit 0）。最近接は #1238 だが別提案 |
| 前提「入口はクロスレビュー通過済みが多い」 | INCONCLUSIVE（非 core） | 直近 21 の Request で言及 10 件。ただし Request 不記載は不在の証拠にならない（クロスレビューは GitHub コメント側にあり監査は記録しない） |
| 母集団述語の網羅性 | REFINED（非 core） | `attributes.Scope` は audit schemaVersion 2 専用。v1（`fields.Scope`）側に self-fix が別途 4 件（全 schema で 51 dir） |

### 再現・コード実読

Issue の述語をそのまま実装した集計スクリプトを**リポジトリ外の scratch** に置き、`amadeus/spaces/default/intents/*/audit/*.jsonl`（283 shard）を read-only で読んで実行した。実装した述語は、母集団 = `WORKFLOW_STARTED.attributes.Scope == "self-fix"`、stage 窓 = 同一 `Stage` 属性の `STAGE_STARTED`→`STAGE_COMPLETED` 時系列ペアリング、active = 窓内の連続監査イベント間隔を 900 秒キャップで総和、park = `WORKFLOW_PARKED`→`WORKFLOW_UNPARKED` の重なりを控除、直近時代 = intent dir 先頭 6 桁 >= 260811。

```
POP  self-fix intents=47  completed=41  recent(>=260811)=21
[park-subtracted] RE=9.03h/med 24.1m | RA=7.91h/med 23.6m | CG=27.14h/med 48.9m | RE+RA med=47.4m | ratio med=48.2% | RE+RA sum=16.95h
[no-park-sub   ] RE=9.03h/med 24.1m | RA=7.97h/med 23.6m | CG=27.16h/med 48.9m | RE+RA med=47.4m | ratio med=48.2% | RE+RA sum=17.00h
BATCH 260814-open-bug-batch-6: RE+RA=61.5min units=5 -> 12.3min/unit
SENSOR_FAILED@RA: {'upstream-coverage': 74, 'answer-evidence': 50, 'question-budget': 3, 'depth-budget': 7}
EXIT=0
```

park 感度: 直近時代で RE/RA/CG 窓に重なる park は合計 3.4 分（RA のみ 1.7 分 ×2）。RE の 9.03h は控除有無で完全不変。

反証テスト（既存の Issue→record 取り込み経路の探索）— パイプ経由の `$?` は `head` の 0 を拾うため、パイプなしで真の exit code を取得:

```
A: '--comments'  in packages/** plugins/**  -> exit 1（該当なし）
B: '/comments'   in packages/** plugins/**  -> exit 1（該当なし）
C: gh issue view                            -> exit 0、amadeus-mirror.ts:271 のみ
D: 陽性対照 compareMirrorStatus              -> 4 hits, exit 0
```

観測の直読（answer-evidence 窓の性質）:

```
260813-remove-team-up （RA 窓 34.4min）
  +1.7〜2.4min  SENSOR_FAILED answer-evidence
  +34.1min（完了の 0.3min 前） SENSOR_PASSED
  +34.4min  STAGE_AWAITING_APPROVAL → GATE_APPROVED → STAGE_COMPLETED

260814-unit-failure-autoelectio （RA 窓 34.6min）
  +2.3 / 2.8 / 30.2min  SENSOR_FAILED answer-evidence
  +31.6〜31.8min  SENSOR_PASSED
  +32.0min  STAGE_AWAITING_APPROVAL ／ +34.6min  STAGE_COMPLETED
```

### 機序・影響・ラベル

**観測事実。** `packages/framework/core/tools/amadeus-sensor-upstream-coverage.ts` は stage の `consumes` slug 一覧を入力に取り、`consumes.length === 0` なら `pass: true, reason: "no upstream"` で即 PASS する（:74-84）。非空なら各 slug について本文に `\b<slug>\b` または `[[<slug>]]` が現れるかを大文字小文字非区別で検査する（:92-98）。Issue 系 artifact が `consumes` に無い以上、このセンサは Issue 一次資料への参照を要求も報酬もできない。RE が全 47 intent で SENSOR_FAILED **0 件**であることは `consumes: []` による早期 PASS の直接の帰結で、構造主張を機序側から裏づける独立の傍証になる。

**推論（明示）。** upstream-coverage は「slug 文字列が本文に出現するか」しか見ておらず、引用が一次資料へ解決することは検証していない。したがって RA の 74 件は「引用が一次資料に接地していない」ことの計測ではなく「宣言 slug への言及が本文に無い」ことの計測である。完了条件 (1) が求める「upstream-coverage 引用先として成立」は既存検査の修復ではなく**新しい能力の追加**にあたる。方向は否定しないが、実装形の裁定で誤読されうる差なので明示する。

**根本原因の所在（推論）。** 実装欠陥ではなく stage 契約の設計上の欠落。self-fix の入口で生成される一次資料が、ワークフローの入力語彙に型として存在しない。

**影響。** 直近 21 intent の RE+RA 合計 17.0h は CG 27.16h の 62.6%（「6 割強」は正確）。per-intent 中央値 47.4 分の固定費は再現済み。

**ラベル。** `team.md` の issue-type-decision で上から判定すると、本件は「既存の合意済み契約への違反」ではなく「契約を追加・意図的に変更する」に該当するため `enhancement` は適合。`P2` はユーザー可視の破損がなく既知の緩和策（バッチ按分 12 分/unit、compose SKIP）が存在する一方で全 self-fix に恒常的に効くコストである点と整合する。ただし優先度はレビュアーの裁定事項ではないため、これは適合性の所見であって優先度の承認ではない。

### 訂正・未解決事項

**訂正1（母集団ラベル）。** 「単一 Issue intent の RE+RA は 24〜73 分（20 件）」の数値レンジは正確（24.2〜72.8 分・20 件）だが、この 20 件は「単一 Issue intent」ではない。少なくとも 2 件は Request 本文で明示的な複数 Issue バッチ:

- `260814-priority-bug-batch` — 対象 #3065 / #3034（必要に応じ #3040 / #3035）、RE+RA 48.9 分
- `260815-priority-bug-batch-2` — 対象 #3077 / #3074 / #3075 / #3079、RE+RA 45.8 分（Request 逐語「単一 unit・単一 Bolt・単一 PR 構成(oq-singleton)」）

正確な記述は「open-bug-batch-6 を除く直近時代 self-fix 20 intent（distinct `Unit` 属性で 17 件が 1、1 件が 2、3 件が 0）」。**この訂正は論旨を弱めず、むしろ強める** — 4 Issue を載せた 2 件が 45.8 / 48.9 分とレンジ中央に収まる事実は「固定費は unit 数に依存しない」の追加の実証点になる。論点は Issue 数ではなく unit 数なので、ラベルを「単一 unit intent」へ改めれば主張と証拠が一致する。

**訂正2（park 控除規約）。** 方法記述は「park 期間は控除」と述べるが、報告値 RA 8.0h / CG 27.2h / インセプション 17.0h は控除**なし**の計算に一致する（控除ありでは 7.9h / 27.1h / 16.9h）。差は最大 0.06h（3.4 分）で結論は動かない。方法記述か報告値のどちらかを揃えることを推奨する。

**訂正3（「15 分級」）。** どちらのペアリング規約でも逐語値が再現しない。first-FAILED 起点で全時代 19.2 分・直近 23.9 分、last-FAILED 起点で全時代 8.4 分。「10〜20 分級」と規約併記へ書き換えるのが実測に忠実。なお、この数値が支える推論（窓は並走であり専用手戻りではない）は上記タイムライン直読で独立に確認済みで、数値の訂正は推論を損なわない。

**未解決1。** 前提「入口はクロスレビュー通過済みであることが多い」は監査からは決定できない（言及 10/21 だが、クロスレビューの実体は GitHub コメント側にあり監査は記録しない）。完了条件 (4) の効果測定を設計する際は、この前提が成り立つ intent の識別方法を先に決める必要がある — でないと母集団が定義できない。

**未解決2。** 述語 `attributes.Scope` は audit schemaVersion 2 専用である旨を本文に明記すべき（v1 は `fields.Scope` + top-level `event` の別形状を持ち、self-fix が別途 4 件、全 schema で 51 dir）。直近時代の分析はすべて v2 のため結論には影響しない。

**limitation。** enhancement のため破損の動的再現は存在しない。本レビューは (a) 監査台帳からの数値の独立再導出、(b) 凍結 ref に対する stage 契約・センサ実装・mirror 実装の実読、(c) 既存取り込み経路の不在に対する反証テスト、の 3 本で構成される。効果量は Issue 自身が仮説と明記しており、私も未検証 — この点で事実／観測／仮説の分離は適切である。

### 同根・対称面

- **対称面（範囲の拡張）**: 同じ欠落は self-fix 固有ではない。RE / RA の stage 契約は scope 横断で共有されるため、`self-feature`（26 intent、RE+RA per-intent 中央値 69.4 分）と `self-refactor`（1 intent、102.6 分）にも同一構造で当てはまる。self-fix への限定は頻度（47 > 26）に基づく優先順位付けとして妥当だが、**欠落そのものの境界ではない** — self-fix 専用の機構を作ると同根の対称面が残る。
- **同根の副次観測**: RE の SENSOR_FAILED が全 47 intent で 0 件であることは `consumes: []` が upstream-coverage を構造的に無効化している帰結であり、RE 側には「上流を引けているか」を測る手段が現状まったく存在しないことを意味する。Issue の RE 側の主張を強める。
- **未記載の隣接**: #1238「enhancement(engine): stage-start scaffold — 宣言 consumes から成果物ヘッダー雛形を自動生成する」は、Issue artifact を `consumes` へ載せる実装形を採る場合の自然な統合点。重複ではないが実装形の裁定で参照すべき隣接として追記を推奨する。

### 後続検証者向けメモ

1. **監査台帳は 2 スキーマ混在。** v1 は top-level `event` + `fields`、v2 は `attributes.Event` + `attributes.*`。`attributes.Scope` だけを見る述語は v1 を無音で落とす（本件で self-fix 4 件）。全史を数えるなら両形状を扱う。
2. **`grep` は ugrep ラッパ。** 不在主張は exit code を確認し（1=不一致、2=エラー）、grep 以外の手段（Python の部分文字列カウント等）で二重確認する。陽性対照も同時に走らせる。
3. **`cmd | head` は真の exit code を隠す**（`$?` は `head` の 0）。不在確認ではパイプを外すか `set -o pipefail` を使う。本レビューで実際に一度踏み、取り直した。
4. **属性名が非対称。** `STAGE_STARTED` / `STAGE_COMPLETED` は `Stage`、`SENSOR_*` は `Stage slug`。取り違えると集計が空になる。
5. **park 控除は RE/RA でほぼ無効果**（直近時代で合計 3.4 分）だが RA/CG 合計の小数第1位の丸めを動かす。0.1h 級の食い違いはまずこの規約を疑う。
6. **shard 重複は存在しない**（eventId 重複 0/18415）ので生カウントで安全。逆に同一タイムスタンプで同種イベントが 2 行並ぶのは重複ではなく別 output path への発火なので、安易に de-dup しない。
7. **FAILED→PASSED 窓は規約で 2 倍以上動く。** first-FAILED 起点か last-FAILED 起点かを必ず明記する。窓長を「手戻り時間」と解釈する前に、PASSED が STAGE_COMPLETED のどれだけ手前で立つかを直読すること（本件では 0.3〜2.8 分前 = 並走の証拠）。

### Verdict

`CONFIRMED_WITH_REFINEMENTS`

この verdict は Issue の実在性確認であり、実装着手・優先順位・
クローズの承認ではありません。


#### j5ik2o — 2026-08-17T12:45:48Z — https://github.com/amadeus-dlc/amadeus/issues/3181#issuecomment-5316222403

## クロスレビュー（2人目・reviewer-2）: CONFIRMED_WITH_REFINEMENTS

<!-- issue-cross-review
review-run-id: xrev-3181-20260817
reviewer-id: reviewer-2
execution-subject-id: esid-867a3bd3a46f58cc
target-sha: 215855ea757b70cecc10b9920bfe9e7b4d2de074
-->

### 独立性と対象

- 起票者・他レビュアーの結論を参照せず独立検証（本 Issue のコメントは未取得）
- Review run: `xrev-3181-20260817`
- Reviewer: `reviewer-2`
- Execution subject: `esid-867a3bd3a46f58cc`
- 対象: `215855ea757b70cecc10b9920bfe9e7b4d2de074`
- 構造主張の currency 検証 ref: `origin/main` = `0b652d2cd1a6fbf2d5a905736d3a3eb887e9d810`（Issue 引用の `e157be644` から 3 コミット前進）
- 適用ノルム: `amadeus/spaces/default/memory/team.md`、`amadeus/spaces/default/memory/project.md`、`.claude/skills/j5ik2o-gh-issue-cross-review/references/protocol.md`
- 二次レンズ: 主張の完全性・由来・影響・ラベル・同根/対称面

### Claim ledger

| 主張 | 判定 | 独立エビデンス |
|---|---|---|
| **[core]** RA の `consumes` に Issue 系 artifact なし（6項目のみ） | CONFIRMED | `git show <ref>:packages/framework/core/amadeus-common/stages/inception/requirements-analysis.md`、`e157be644` / `0b652d2cd` の両 ref で intent-statement / scope-document / business-overview / architecture / code-structure / team-practices のみ（exit 0） |
| **[core]** RE は `consumes: []` | CONFIRMED | 同上 `reverse-engineering.md`、両 ref で `consumes: []`（exit 0） |
| **[core]** RA/RE 本文に `issue` / `cross-review` 0 件 | CONFIRMED | `git grep -n -i -F` を 2 ファイル × 3 語 × 2 ref＝12 回実行、全て exit 1（不一致）。陽性対照 `consumes` は exit 0 / 2 hit。core stage 全 32 本でも `cross-review` は 0 件 |
| **[core]** Issue 一次資料の流入経路は Request 自由文のみ | CONFIRMED | RA frontmatter `inputs:` が `<record>/audit/<host>-<clone>.jsonl` を逐語で名指し。`docs/reference/16-artifact-vocabulary.md` に issue / cross-review 0 件（exit 1）。`packages/framework/core/tools/amadeus-mirror.ts:206-233` の `gh issue view` は `compareMirrorStatus(view, parsed.body)` による record→Issue 投影の drift 比較専用 |
| 260815-stale-epoch-landed の Request に人手要約が in-line | CONFIRMED | audit shard 実読、「クロスレビュー独立2名成立(ESTABLISHED_WITH_REFINEMENTS)。精緻化済みの機序: …」を逐語一致で確認 |
| **[core]** self-fix 該当 47 intent / 完了 41 | CONFIRMED（REFINED 付） | 記載述語 `attributes.Scope == "self-fix"` を再実装 → started 47 / completed 41 で完全一致。ただし legacy `fields.Scope` 形式の self-fix が別に 4 件あり実数は 51 / 45 |
| **[core]** 直近時代 21 intent、RE 9.0h・RA 8.0h、RE+RA 中央値 47 分、比率 48% | CONFIRMED | 21 intent 一致。RE 9.03h（中央値 24.1 分）、RA 7.97h（23.6 分）、RE+RA 中央値 47.4 分、比率中央値 48.2% |
| CG 27.2h（中央値 49 分/回） | REFINED | 中央値 48.9 分は再現（ただし per-intent 中央値。per-run は 44.6 分）。合計は未閉窓の扱いで 24.36h〜29.32h に振れ、27.2h は帯の内側だが記載手法から一意に再現できない |
| **[core]** バッチ 61 分 / 5 unit = 12 分/unit、他 24〜73 分（20 件） | CONFIRMED（REFINED 付） | 260814-open-bug-batch-6 = 61.5 分、distinct Unit = 5、12.3 分/unit。他 20 intent は min 24.2 / max 72.8 分 |
| **[core]** RA の `SENSOR_FAILED`: upstream-coverage 74 / answer-evidence 50 | CONFIRMED | self-fix 母集団での `(Stage slug, Sensor ID)` 集計で 74 / 50 完全一致 |
| RA は手戻り最多の inception ステージ | CONFIRMED | self-fix 内 RA 計 134 件に対し RE 0 件。リポジトリ全体でも inception 最上位（RA upstream-coverage 347 > delivery-planning 172） |
| answer-evidence advisory 窓は RA 中央値 15 分級、PASSED は完了直前 | REFINED（数値は INCONCLUSIVE） | `default_severity: advisory` は CONFIRMED。PASSED→STAGE_COMPLETED は 0.3 分 / 2.8 分で「完了直前」CONFIRMED。中央値は 19.2 分（全 self-fix, n=17）/ 23.9 分（直近 21, n=8）で 15 分級を再現できず。ペアリング規則が未規定のため保留 |
| **[core]** self-fix scope の evidence-mined 既決と SKIP 非再議の枠組み | CONFIRMED | `packages/framework/core/scopes/amadeus-self-fix.md`（origin/main）に「reverse-engineering changed an outcome in 9/12 and requirements-analysis in 8/12」「no stage moves to SKIP」「Prefer a per-intent `/amadeus compose` SKIP for mechanical corrections」が逐語で存在。完了条件 (1)〜(4) は RE/RA を実行したまま消費対象のみを変えるため既決と非衝突 |
| team.md `issue-cross-review` / project.md `c5` の実在と意味 | CONFIRMED（注記付） | `team.md:63` / `project.md:19` に実在、文面一致。c5 は「再質問」の禁止であり、完了条件 (2) の「再導出しない」は類推的拡張 |
| #2415 / #993 / PR #996 の特徴づけ | CONFIRMED | #2415 OPEN（enhancement, P2）、#993 CLOSED/COMPLETED、PR #996 MERGED 2026-07-15 closes #993。`packages/framework/core/scopes/amadeus-chore.md` は origin/main に実在し RE/RA を SKIP |
| self-* 開発は Scope Overrides により chore 適用不可 | REFINED | memory 配下に `chore` は 0 件（`git grep -i -F`、exit 1、陽性対照通過）。§ Scope Overrides は正規スコープを 4 つに定める積極規定で、廃止列挙は legacy `amadeus-*` のみ。除外は妥当な推論だが規範の明文ではない |
| 重複なし | CONFIRMED（完全性に REFINED） | 独自に本文検索 8 述語 + タイトル限定 7 述語を open+closed で再実行 → 同一提案なし。ただし隣接 #1238 が未記載 |
| 17.0h は CG 27.2h の 6 割強 | CONFIRMED（REFINED 付） | 9.0+8.0=17.0、17.0/27.2 = 62.5%。CG 変種帯では 58%〜70% に振れるが結論は頑健 |
| P2 + enhancement | CONFIRMED | ラベル定義と Issue Form 選択肢に照合（下記） |

### 再現・コード実読

読み取りのみ。計測前に `git status --porcelain -- 'amadeus/spaces/default/intents/*/audit/'` が空（exit 0）であることを確認し、working tree の shard が target SHA と一致することを担保しました。

- `git rev-parse origin/main` → `0b652d2cd…`（exit 0）。`e157be644` は origin/main の祖先（`git merge-base --is-ancestor` exit 0）で 3 コミット遅れ、HEAD の祖先ではない（exit 1）
- `git diff --name-only e157be644 0b652d2cd -- <stages> <scopes> <memory>` → `amadeus/spaces/default/memory/project.md` のみ（全体 18 ファイル）。差分は Learnings Inbox への 2 件追記で引用面に無関係。**stage / scope ファイルは両 ref で byte 同一**。引用された 2 つの cid は origin/main でも実在（`git grep -c -F` exit 0）
- 監査集計は shard 283 本・160,077 行を走査。イベントは legacy（`event` / `fields`）と canonical（`eventName` / `attributes`）の二形式が混在（canonical 63,778 件）。属性キーは `Stage slug` / `Sensor ID` / `Scope` / `Unit`
- `SENSOR_FAILED` 総数 4,706 件。self-fix 母集団の RA は upstream-coverage 74 / answer-evidence 50 / depth-budget 7 / question-budget 3
- ステージ active 時間は「`STAGE_STARTED`→`STAGE_COMPLETED` 窓 × 全監査イベント間隔 × 900 秒キャップ」で実装。RE 9.03h / RA 7.97h / RE+RA 中央値 47.4 分 / 比率 48.2%
- self-fix の実行ステージ集合を frontmatter `scopes:` から機械列挙 → workspace-detection / workspace-scaffold / state-init / reverse-engineering / requirements-analysis / code-generation / build-and-test の 7 本。`issue` を含むのは build-and-test の 3 箇所のみで、いずれも英語の一般名詞用法（`build issues` / `fix the issue`）

再現できなかった点（いずれも手法の未規定に起因）:

- CG 合計は未閉窓の扱いに依存。`260815-priority-bug-batch-2` は CG の `STAGE_STARTED` に対応する `STAGE_COMPLETED` を欠き、`260814-failopen-error-paths` は開始 2 / 完了 1。窓を捨てると 24.36h、intent の最終イベントで閉じると 29.32h、当該ステージの最終イベントで閉じると 28.50h
- answer-evidence の FAILED→PASSED 窓は「最初の FAILED → 次の PASSED」で中央値 19.2 分 / 23.9 分。参考: upstream-coverage の同窓は中央値 1.5〜1.7 分で、「センサ是正は主コストではない」という本 Issue の観測を独立に補強します

### 機序・影響・ラベル

**観測事実**: 欠落は stage 契約レベルにあります。RE は `consumes: []`、RA は 6 artifact のみで、artifact 語彙自体に Issue／クロスレビュー相当の第一級 artifact が存在しません。RA frontmatter の `inputs:` が audit shard を逐語で名指していることが、Request 自由文が唯一の流入口である最も直接的な機構証拠です。

**推論（実装者への申し送り。Issue の主張を否定するものではありません）**:

1. upstream-coverage は「stage frontmatter の `consumes:` を読み、出力散文が各上流 artifact を参照しているか」を検査します（`packages/framework/core/sensors/amadeus-upstream-coverage.md`）。したがって Issue artifact を素朴に consumes へ足すと、74 件を生んでいる義務集合が**拡大**し当該センサの FAILED はむしろ増えうる構造です。consumes 拡張で実装する場合、この副作用の相殺が設計要件になります
2. 完了条件 (2) を強く実装すると issue-first の RA が実質無内容化し、evidence-mined 既決が価値を認めた RA（8/12 で成果を変えた）を事実上 SKIP へ近づける経路が開きます。「消費」と「de-facto SKIP」の境界を設計側で明示的にガードする必要があります

**ラベル**: `enhancement` = "New feature or request"、`P2` = "重要だが急がない"（ラベル説明）/「P2 — 通常」（Issue Form）。team.md `cid:requirements-analysis:issue-type-decision` を上から適用すると、回答だけで閉じず、文書面だけの変更でもなく、既存の合意済み契約への違反でもない（consumes に Issue 系がないのは契約違反ではなく未定義）ため、契約の追加＝`enhancement` に落ちます。bug ではないので重大度ラベル不在も正しい状態です。`P2` も接地しています——正しさ・安全性の破綻ではないため P0 ではなく、代替策（バッチ按分、実測 12 分/unit）が現存するため緊急でもなく、一方で直近 21 intent の 17.0h は無視できません。ただし Issue Form の P1「重要だが回避可能」と P2「通常」は本件のような回避策のある重要案件を鋭く弁別しないため、P2 は測定事実ではなく妥当な判断として位置づけるのが正確です。Issue Form の必須 9 フィールドはすべて本文に存在します。

事実／観測／仮説の分離は健全です。効果量を「未実測」と明示して完了条件 (4) へ送った点、12 分/unit を「按分値は算出式併記の派生値」と明記した点、answer-evidence の並走を観測節に置いて事実節へ混ぜなかった点は、team.md P2 に適合しています。

### 同根・対称面

**構造欠落はスコープ非依存です。** `consumes` は stage の属性であり scope の属性ではないため、RE/RA を実行する全スコープが同じ欠落を共有します。実測: RE または RA を実行した intent は 173 件・14 スコープで、self-fix はそのうち 51 件 = 29.5% にすぎません（bugfix 31、self-feature 27、amadeus 23 など）。**費用計測が self-fix 固有であるだけで、構造欠落は self-refactor / self-document / self-feature および全ジェネリックスコープに等しく及びます。** この一文を Issue へ加えることを推奨します。

**self-* 間に非対称が 1 点あります。** `packages/framework/core/amadeus-common/stages/ideation/scope-definition.md:58` は「Read the intent statement and any linked Issue, prior ruling, or approved artifact it cites」と本文で指示しており、Issue を読む散文レベルの部分経路を持ちます。しかし scope-definition の `scopes:` は enterprise / feature / mvp / installer-distribution / **self-feature** のみで、self-fix / self-refactor / self-document を含みません。self-feature だけが弱い部分経路を持ち、self-fix にはそれすらない——この非対称は Issue の self-fix 限定の枠組みを支持する追加根拠です。

### 訂正・未解決事項

1. **47 は述語の副作用を含みます。** 記載述語 `attributes.Scope == "self-fix"` は正しく 47 を返しますが、legacy `fields.Scope` 形式の self-fix 4 件（`260730-open-bug-batch-2`、`260730-open-bug-batch-3`、`260730-skill-reviewer-fixes`、`260731-open-bug-batch-4`）を無音で落とします。実数は 51 / 45。4 件は 2026-07-30〜31 で直近時代の外にあるため 21 intent の分析には影響せず、「最頻 scope」の結論も不変です。母集団の定義に二形式の混在を明記してください
2. **「単一 Issue intent」の呼称が不正確です。** 24〜73 分（20 件）の集合は実際には「直近時代 self-fix のうち open-bug-batch-6 以外の 20 件」で、`260811-pr-convergence-gate` は distinct Unit を 2 つ持ち、`260814-priority-bug-batch` / `260815-priority-bug-batch-2` はバッチ名の intent です。レンジと 12 分/unit の対比は成立しますが、呼称は「バッチ以外の 20 intent」に改めてください
3. **CG 27.2h は記載手法から一意に再現できません。** 未閉窓の扱いが未規定で、合理的な変種で 24.36h / 28.50h / 29.32h に振れます。手法に「未閉窓をどう閉じるか」を 1 行足せば再現可能になります
4. **「中央値 15 分級」は再現できませんでした**（19.2 分 / 23.9 分）。ペアリング規則が未規定のため CONTRADICTED ではなく保留とします。観測節の質的結論（並走・完了直前 PASSED）は独立に確認済みで強く成立しています
5. **chore 除外は推論であり規範の明文ではありません。** memory 配下に `chore` の記載は 0 件です。「§ Scope Overrides により chore は適用不可」は規範が明示的に禁じているように読めるため、「正規スコープを 4 つに限定する規定からの帰結」と書き換えるのが正確です
6. **隣接 Issue の棚卸しに欠落があります。** #1238（OPEN、enhancement/P2、「宣言 consumes から成果物ヘッダー雛形を自動生成する」）は、同じ症状（RA の upstream-coverage FAILED 反復）を同じ宣言面（`consumes`）から攻める提案で、実装面が直接干渉しうる最も近い隣接 Issue です。#2815 は弱い隣接。重複ではありませんが関連 Issue 節への追加を推奨します
7. **c5 の援用は類推です。** c5 は人間への「再質問」の禁止で、完了条件 (2) の「再導出」は成果物起草の話です。「整合」という語選択は妥当なので訂正不要ですが、実装時に c5 を根拠として引かないでください
8. **未解決: 効果量。** Issue 自身が仮説と明記し完了条件 (4) へ送っており、本レビューでも判定不能です。Issue の欠陥ではありません

### 後続検証者向けメモ

- **zsh の `:a` 修飾子。** `git show $SHA:amadeus/...` はクォートなしだと zsh が `${SHA:a}`（絶対パス修飾子）として展開し `<sha>madeus/...` という壊れたパスになって `fatal: ambiguous argument` で落ちます。必ず `git show "${SHA}:amadeus/..."` と書いてください（実際に一度踏みました）
- **audit shard は二形式混在。** legacy（`event` / `fields`）と canonical（`eventName` / `attributes` + `amadeus.*` 名）が同居し、総 160,077 イベント中 canonical は 63,778。`attributes.X` だけを見る述語は legacy 期を無音で落とします（本件では self-fix 4 件）。`fields or attributes` を吸収する読み方を既定にしてください
- **属性キーは表示名。** センサーイベントは `Sensor ID` / `Stage slug`（`sensor` / `stage` ではない）。`Stage` で引くと空集合が返り、それが「0 件」に見えます。まずキー名をヒストグラムで確認してから集計してください
- **絶対時間の再現前に窓の閉じ方を決める。** `STAGE_STARTED` に対応する `STAGE_COMPLETED` を欠く intent が実在します。中央値は閉じ方に鈍感ですが合計は 20% 近く振れます
- **grep は exit code を必ず読む。** `git grep` の exit 1 は「エラーなく不一致」、128 がエラー。本件の不在主張はすべて exit 1 + 陽性対照（`consumes` で exit 0）で二重確認しました。ローカル `grep` が ugrep ラッパの環境では複雑な選言や `\b` が無音で exit 1 を返すため、`-F` と単一パターンへの分割を推奨します
- **shard 計測前に `git status --porcelain -- '<audit glob>'` を実行する。** 空であることが「working tree の計測 = target SHA の計測」を保証する唯一の根拠です

### Verdict

`CONFIRMED_WITH_REFINEMENTS`

この verdict は Issue の実在性確認であり、実装着手・優先順位・
クローズの承認ではありません。


### その他コメント(verbatim、任意)

(なし)

## Issue #2415: enhancement(reverse-engineering): 差分リフレッシュの入力に工程記録が混入し、RE コストが修正規模と無関係に増大する(13/15 スコープ該当)

- state: OPEN / labels: 未取得(本 verb の read 面は本文・状態・コメントのみ) / url: https://github.com/amadeus-dlc/amadeus/issues/2415 / target-sha: 23d4ae767956cd56fc28fa78abe28096712eff8a
- review-run-id: xrev-2415-20260818 / 独立レビュアー: 2名(marker 計数)

### 本文(verbatim)

### 重複・現行状態の確認

- [x] open/closed の両方を対象に、同じ課題・提案・質問の Issue を検索しました
- [x] origin/main と関連する open/merged PR を確認し、現行状態でも起票が必要だと確認しました

検索は `gh issue list --state all --search` で「成果物 文量 self-fix コスト」「codekb 再生成 diff-refresh」「depth Minimal 成果物 冗長」「所要時間 レイテンシ workflow cost」の4クエリ、`gh pr list --state open --search "codekb OR depth OR 成果物"` で open PR を確認。ヒットした #2019 / #2033 / #1980 / #707 はいずれも別事象(kind-pruning 移植、scope-grid drift、round-trip PBT、codekb 並行 merge 衝突)で、本件の重複ではない。

### 背景・対象範囲

reverse-engineering の差分リフレッシュは、入力を「前回スキャンコミットからの全リポジトリ差分」として定義している。この差分には **他 intent が生成した工程記録が含まれ、実測で入力の 53.3% を占める**。工程記録はコードではないため codekb には一切寄与しないが、Developer scan / Architect synthesis は毎回それを読む。

結果として RE のコストは、修正の規模ではなく **前回スキャンからの経過 × チームの活動量** に比例する。intent が工程記録を書く → 次の intent の RE がそれを差分として読む → その intent がまた工程記録を書く、という自己増幅ループになっている。

対象は reverse-engineering を実行する全スコープ。コンパイル済みグラフの実測で **13/15 スコープ**が該当する(`chore` と `infra` 以外)。

```
scopes = ['enterprise', 'feature', 'mvp', 'poc', 'fix', 'refactor', 'security-patch',
          'workshop', 'installer-distribution', 'self-document', 'self-feature',
          'self-fix', 'self-refactor']
```

本 Issue は、差分から codekb に寄与しない入力を除外することを求める。codekb の鮮度契約(`Always rerun for freshness`)には触れない。

### 根拠・実測証拠

測定 ref: `main` @ `75a1c198d5101c1df2bee21f960f01ae1d7973d3`。

#### 1. RE の入力サイズは修正規模と無関係

各 intent の re-scan 記録(`codekb/amadeus/re-scans/<intent>.md`)に区間規模が実測値で残っている。

```
260805-cross-harness-resume        34 commits /   493 files / +43,826 insertions
260804-phase-boundary-approval    134 commits / 1,041 files / +84,296 insertions
260804-goal-reconciliation-guar    68 commits / 2,262 files / +318,811 insertions
```

いずれも `self-fix` スコープ、`Depth: Minimal` の intent である。数百行規模の修正に対し、RE は数万〜30万行の差分を読んでいる。

#### 2. 入力の過半がワークフロー自身の排出物

最新 intent `260805-cross-harness-resume`(base `b938898f3` → observed `7060956c5`、43,826 insertions)をパス種別で分解した。

```
① 他 intent の record   292 files   23,372 ins   53.3%   ← amadeus/spaces/*/intents/
⑦ 正本ソース            128 files    9,838 ins   22.4%
⑥ tests                 55 files    9,348 ins   21.3%
② codekb 自身            13 files    1,227 ins    2.8%
⑤ docs                    4 files       36 ins    0.1%
③ memory                  1 files        5 ins    0.0%
```

**他 intent の工程記録が 53.3%。**codekb 自身の 2.8% と合わせて 56.1% がワークフローの排出物であり、コード理解には寄与しない。

同じ分解を `260804-phase-boundary-approval`(base `9458bbda8` → observed `b938898f3`、84,296 insertions)に適用すると、他 intent の record 371 files / 30,185 insertions、codekb 自身 14 files / 1,763 insertions で、傾向は一致する。

過去にはさらに悪化していた。`260804-goal-reconciliation-guar` の区間 243,716 insertions のうち `dist/pi` が 121,221行、各ハーネスの plugin 投影が約 45,000行を占めていた。この生成物分は source-only 移行(2026-08-03)により追跡外となり、最新 intent では消えている — 同種の入力削減が一度成功している実績にあたる。

#### 3. コストは出力側ではなく入力側にある

RE の出力(codekb への正味書き込み)は小さい。`260804-phase-boundary-approval` の着地 `fc862e879` を、その intent の作業開始前の codekb 断面 `f8257f8e4` と直接比較した結果:

```
codekb 全体   1,384 insertions / 9 deletions
  うち architecture.md   174 insertions / 1 deletion
```

同 intent の実コード変更は 1,361 insertions(production 約240行 + テスト854行)であり、codekb 出力とほぼ 1:1 である。

一方、RE 系 subagent の実時間は後述のとおり 83.2分ある。**出力 1,384行に対し 83.2分**という乖離は、コストが入力側(差分の読解)にあることを示す。

注記: `fc862e879` の numstat は codekb に 13,718 insertions を示すが、これは親コミットが切り詰められた断面だったことによる復元分を含む。`5fb23ec2a`(#2201)が `architecture.md` から 3,174行を削除しており、`fc862e879` はその復元を伴っている。`architecture.md` の履歴で500行超の削除を含むコミットは `5fb23ec2a` の1件のみで、常態ではない単発事故である(別途の調査対象)。上記 1,384行は切り詰め前断面との直接比較であり、こちらが intent の正味出力である。

#### 4. エージェント時間の帰属(self-fix 4 intent、713.0分)

対象 intent: `260804-phase-boundary-approval` / `260804-evidence-revision-rebind` / `260804-goal-reconciliation-guar` / `260805-cross-harness-resume`。`260803-state-integrity` は park 12時間が支配的なため除外。

各 audit イベントの「直前イベント → 当該イベント」の区間を当該イベント種別へ帰属させ、`HUMAN_TURN` で終端する区間(人間の応答待ち)を除外して合算した。`Agent Type` で subagent の役割を、`Output path` / `File` / `Artifact` で書き込み先を分類している。

```
231.4 min  32.5%  C. 記録成果物 執筆
159.1 min  22.3%  A. 実装(コード/テスト)
109.7 min  15.4%  B. RE/codekb 生成
 56.2 min   7.9%  I. その他イベント
 45.5 min   6.4%  G. コンテキスト圧縮
 37.8 min   5.3%  F. state/ledger
 37.1 min   5.2%  D. §12a レビュー
 23.4 min   3.3%  H. subagent 分類不能
 12.8 min   1.8%  E. §13 選挙
─────────
713.0 min  合計(agent time / 平均 178分 per intent)
```

**subagent 168.2分の `Agent Type` 分解**

```
83.2 min  20件  RE系 (amadeus-developer-agent / amadeus-architect-agent / re-dev-scan / re-arch-synth)
37.1 min  17件  §12a レビュー系 (amadeus-product-lead-agent / amadeus-architecture-reviewer-agent / req-reviewer / cg-reviewer)
23.4 min  20件  分類不能 (Agent Type = unknown / default)
12.8 min   8件  §13 選挙 (subagent-1 / subagent-2 系)
11.6 min   2件  実装 builder (cg-dev-2143)
```

subagent 時間の約半分(83.2 / 168.2 = 49.5%)が RE 系である。分類 B の 109.7分 = subagent 83.2 + codekb 書き込み 19.2 + RE ステージ成果物 7.3。

#### 5. 全走査は取りこぼし防止の設計、差分化は既存の緩和策

ステージ契約 `packages/framework/core/amadeus-common/stages/inception/reverse-engineering.md` は毎回のフルスキャンを要求する。

> `condition: Execute when project is brownfield. Always rerun for freshness. Skip for greenfield projects.`(frontmatter `:5`)

> Step 2: Developer scans `<repo>`'s codebase (the sibling dir `<workspace>/<repo>/`; for a single-repo intent this is the whole codebase) for: All packages, modules … External and internal APIs … Test directories … Technical debt signals(`:103-112`)

差分リフレッシュはプロトコルではなくノルム側の緩和策である。

> `project.md` — `cid:reverse-engineering:c1`: 「既存codekbがある場合、reverse-engineering はフルスキャンでなく前回スキャンコミットからの差分リフレッシュで実行し、Always rerun for freshness 条項を差分更新で満たす」(2026-07-07)

すなわちフルスキャンは既に一度緩和されている。残っている欠落は、**その差分に「何を除くか」の規定がないこと**である。「前回スキャンコミットからの差分」としか定義されていないため、工程記録が入力に混入する。

#### 6. RE は既に focus を宣言しており、それでも全区間を読む

re-scan 記録には患部の絞り込みが記載されている(`260804-phase-boundary-approval`)。

> `Focus: Issue #2143 — phase boundary verification の規約順序と approval guard の非両立。患部は (a) governance protocol § 13 …、(c) amadeus-state.ts の verifyPhaseCheckArtifact ガード、(d) 各ハーネス annex の approval 手順。`

> `Scan mode: focused differential refresh`

それでも全区間を読むのは、codekb 9成果物が repo 共有の鮮度義務を負うためである。

> `reverse-engineering.md:151` — every intent's RE run rewrites them, and the latest scan is authoritative.

したがって「今回の修正に関係するところだけ読む」形は採れない。共有 codekb が古いまま次の intent へ権威として渡り、取りこぼしのコストを後続へ先送りするだけになる。

### 期待結果・完了条件

1. **差分入力からの除外規定** — RE の差分区間から、codekb に寄与しないパスを除外する規定が置かれること。第一候補は `amadeus/spaces/*/intents/`(他 intent の工程記録)。除外しても codekb の鮮度は落ちないこと(工程記録はコードではなく、codekb 9成果物のいずれにも寄与しない)を根拠として明示すること。
2. **除外の実効の実測** — 除外適用後の intent で RE の差分区間を再測し、入力サイズの縮小率が記録されること。あわせて RE 系 subagent の実時間(現状 83.2分 / 4 intent)を再測して比較値が残ること。
3. **鮮度契約の非退行** — 除外が `Always rerun for freshness` と `reverse-engineering.md:151` の共有 codekb 権威性を損なわないことが、テストまたは機械検査で固定されること。

### 影響・価値

RE は 13/15 スコープで実行されるため、効果は brownfield 作業のほぼ全体に及ぶ。

現状の RE 入力は、直近実測で 43,826〜318,811 insertions。うち 53.3%(最新 intent 実測)が他 intent の工程記録である。除外により入力が半減する見込みで、これはコストの支配面(RE 系 subagent 83.2分 / 4 intent)へ直接効く。

さらに重要なのは自己増幅ループの遮断である。現状はチームの活動量が増えるほど1 intent あたりの RE コストが上がる構造で、intent を並行に回すほど悪化する。除外はこのフィードバックを切る。

同種の入力削減は一度成功している。source-only 移行(2026-08-03)により `dist/` と plugin 投影(合計約 166,000行)が追跡外となり、`260804-goal-reconciliation-guar` の 243,716 insertions 級の区間は最新 intent では再現しない。本件はその続きにあたる。

### 関連 Issue・PR・intent

- intent `260805-cross-harness-resume`(ミラー #2285) — 最新の入力分解対象(base `b938898f3` → observed `7060956c5`)
- intent `260804-phase-boundary-approval`(Issue #2143 + #2232、着地 PR #2242 / `fc862e879`) — 入力分解と出力実測の対象
- intent `260804-evidence-revision-rebind` / `260804-goal-reconciliation-guar` — 時間帰属の合算対象
- intent `260803-state-integrity` — park 支配のため時間帰属から除外
- #2425 — 同じ調査から派生。成果物の分量を制約する信号が存在しない問題(depth が directive にも契約にも検査にも接続されていない)。本 Issue の RE/codekb は 109.7分(15.4%)、#2425 の記録成果物執筆は 139.9〜231.4分(19.6〜32.5%)で、両者は独立した費目・独立した修正面
- #707(CLOSED) — codekb の並行 diff-refresh 衝突。per-intent scan record 分離の由来であり、本件の前提機構
- #2019(CLOSED) — NFR unit-kind-pruning による per-unit 成果物の間引き。成果物量の縮約という点で先例
- `5fb23ec2a`(#2201) — `architecture.md` から 3,174行を削除した単発の切り詰め。本件とは別事象だが codekb 完全性の調査対象
- 重複なし(上記4クエリで確認)

### 優先度（いつ対応するか）

P2 — 通常

### エレベーターピッチ

修正の大きさに比例した時間でワークフローを完了したい
Amadeus で brownfield の開発を回す開発者 向けの、
Amadeus AI-DLC の reverse-engineering というプロダクトは、
既存コードベースの共有知識ストアを鮮度維持する工程 です。
これは 自分たちが書いた工程記録を次の intent が読み直す自己増幅ループを断ち切ること ができ、
RE をフルスキャンから差分リフレッシュへ緩和する（既に実施済み） とは違って、
差分の中身から codekb に寄与しない入力を除外する規定 が備わっている。

### 代替案・非採用理由

**代替案1: RE を「修正に関係するところだけ読む」形にする** — 非採用。codekb 9成果物は intent 専用ではなく repo 共有であり、`reverse-engineering.md:151` は「every intent's RE run rewrites them, and the latest scan is authoritative」と定める。focus 限定のスキャンは共有ストアを部分的にしか更新せず、次の intent が古い codekb を権威として受け取る。取りこぼしのコストを後続へ先送りするだけで、総量は減らない。なお RE は既に `Focus` と `focused differential refresh` を宣言しており、患部の絞り込み自体は実施済みである。

**代替案2: codekb 更新を intent から切り離す(定期実行 / main 着地フック)** — 有力だが本 Issue では非採用。鮮度義務が repo 全体に対するものなら個々の intent に負担させる理由はなく、根本的にはこちらが正しい。ただし骨格の変更(`self-feature`)であり、`Always rerun for freshness` の設計意図をどう保つか、intent 開始時点の codekb が古い場合にどう扱うかの裁定が要る。除外(本 Issue)は鮮度契約に無干渉で即効性があるため、先に除外を入れて効果を測り、不足なら切り離しを検討する順序とする。

**代替案3: ステージをさらに削る(scope grid の軽量化)** — 非採用。`self-fix` は既に初期化 + RE + RA + CG + B&T の5ステージまで絞られており、`amadeus-self-fix.md` は「12 intent の実績で RE が 9/12、RA が 8/12 で結論を変えた」ためどのステージも SKIP へ移さないと明記している。RE の除去は codekb の鮮度を失う取引であり、コスト構造の是正にならない。

**代替案4: memory 層の蒸留を先に実行する** — 非採用。`weekly-distillation-round` として既に規定があり、memory 層 422,693 B / cid 634件は縮約余地がある。しかし実測では、成果物へ現れるノルム由来の引用装置は intent 配下 md 349,034 B のうち 21,876 B(6.3%)にとどまり、`SESSION_COMPACTED` も 6.4% である。所要時間短縮の主経路ではない。

**代替案5: 何もしない** — 非採用。自己増幅ループであるため、intent を並行に回すほど悪化する。放置は時間とともにコストが単調増加することを意味する。

### 測定の限界

**`SUBAGENT_STARTED` 不在** — audit に開始イベントが存在しない(4 intent で `SUBAGENT_COMPLETED` 67件のみ)ため、subagent 区間が (a) conductor が subagent を待って停止 か (b) conductor が audit に残らない作業を実施 かは区別できない。conductor 側イベントが interleave していないことは (a) の間接証拠であり、直接証拠ではない。

**入力サイズと RE 時間の相関は未検証** — 「コストは入力側にある」は、出力 1,384行に対し RE 系 subagent が 83.2分という乖離からの推論である。入力サイズと RE 時間の相関を複数 intent で取れば直接の裏付けになるが、実施していない。

**`Agent Type` 欠落** — `Agent Type` が `unknown` / `default` の subagent が 20件 / 23.4分ある。役割を分類できないため、RE 系(83.2分)と §12a レビュー系(37.1分)の比率には最大 23.4分の不確かさが残る。subagent 発火時に Agent Type を欠く経路があることを示しており、観測性の改善対象になりうる(別 Issue 候補)。

**C(記録成果物 執筆 231.4分)は上限値** — C のうち build-and-test が 91.4分を占めるが、B&T の成果物自体は小さい(602〜1,230 B)。区間帰属法の性質上、この区間は成果物を書く前に実行した CI / テストスイートの時間を含む。記録執筆の中核は code-generation 85.8 + requirements-analysis 41.2 + phase-check 12.9 = 139.9分であり、231.4分は上限、139.9分が下限である。



### クロスレビューコメント(verbatim、コメント URL 併記)

#### j5ik2o — 2026-08-17T17:42:42Z — https://github.com/amadeus-dlc/amadeus/issues/2415#issuecomment-5318290369

## クロスレビュー（1人目・reviewer-1）: CONFIRMED_WITH_REFINEMENTS

<!-- issue-cross-review
review-run-id: xrev-2415-20260818
reviewer-id: reviewer-1
execution-subject-id: xrev2415-r1@session-7727e262
target-sha: 23d4ae767956cd56fc28fa78abe28096712eff8a
-->

### 独立性と対象

- 起票者とは別の実行主体（`xrev2415-r1@session-7727e262`）による独立レビュー。本 Issue の既存クロスレビューコメントおよび Issue コメントは一切取得・参照していない（凍結済みの本文 JSON のみを入力とし、`gh` は本レビュー中に一度も実行していない）。
- 対象 SHA: `23d4ae767956cd56fc28fa78abe28096712eff8a`（`git rev-parse HEAD` で一致確認、`git status --porcelain` = 0 行）。リポジトリ状態は非変更、読み取り専用コマンドのみ。再現用スクリプトは repo 外の作業領域で実行した。
- Issue の測定 ref は `75a1c198d5101c1df2bee21f960f01ae1d7973d3`。凍結 SHA はその子孫（`git merge-base --is-ancestor` exit 0、区間 525 commits）。
- 二次観点: 再現・現行コード機序・反証。ヘッドライン数値は自前の述語で再計算した。

### Claim ledger

| 主張 | 判定 | 独立エビデンス |
| --- | --- | --- |
| RE 差分リフレッシュの入力に除外規定がなく、他 intent の工程記録が混入する | **CONFIRMED**（文言のみ要精密化） | ステージ契約に差分入力の定義自体が無い（`reverse-engineering.md:104-112` は「codebase 全体」を走査対象と規定）。差分化はノルム `project.md:142`（`cid:reverse-engineering:c1`）のみが規定し、パス範囲・除外の記述なし。差分を計算・フィルタするコードは不在（`amadeus-lib.ts:1490-1530` / `amadeus-utility.ts:5402-5427` はパス解決のみ） |
| 260805 区間 = 34 commits / 493 files / +43,826 | **CONFIRMED（完全一致）** | `git rev-list --count b938898f3..7060956c5` → 34 / `git diff --shortstat` → `493 files changed, 43826 insertions(+), 217 deletions(-)` |
| 他 intent の record が 292 files / 23,372 ins / 53.3% | **CONFIRMED（完全一致）** | 自前述語 `^amadeus/spaces/[^/]+/intents/` を numstat へ適用 → 292 files / 23,372 ins / **53.3291%**。292 件すべてが他 intent 由来（自 intent record は 0 files） |
| 分解表の他バケット（codekb 13/1,227、tests 55/9,348、docs 4/36、memory 1/5） | **CONFIRMED（完全一致）** | 同 numstat の分類集計。6 バケットの files 合計 493・ins 合計 43,826 と一致 |
| ⑦「正本ソース 128 files / 9,838 ins / 22.4%」 | **REFINED（過小評価）** | 内訳は選挙ストア `amadeus/spaces/*/elections/` 83 files / 1,650 ins ＋ `metrics/` 10 files / 802 ins ＋ 真の source 35 files / 7,386 ins。ワークフロー排出物は **61.74%**（56.1% ではない）、真の source は **16.85%** |
| 13/15 スコープが RE を実行（`chore` / `infra` 以外） | **CONFIRMED** | `amadeus-graph.ts:1407-1421` の transpose 機序を実読。全 32 ステージ frontmatter から scope universe を再計算 → 15、RE の `scopes:` → 13、差集合 = `{chore, infra}`。scope ファイル列挙 15 件とも完全一致 |
| currency: 測定 ref 以降に除外規定は着地していない | **CONFIRMED** | 区間 525 commits に対し RE 契約の差分は **+1 行のみ**（`question-budget` センサー追加）。`c1` は `bd567fd1b7`（#2919）で全面改稿されたが、追加されたのは observed 系譜・base 選定・引用規律であり除外規定ではない。ノルム＋契約への除外語彙 grep は 6 件ヒットするが全て無関係 |
| 工程記録は codekb 9 成果物のいずれにも寄与しない | **REFINED / 一部 CONTRADICTED** | 支持側: RE の `consumes: []`（`:20`）、Step 2 の走査対象はコード面のみ。反例: `codekb/amadeus/architecture.md:3450` が他 intent の `intents/260724-mirror-auto-modes/construction/mirror-github-gateway/nfr-design/security-design.md:37` を **verbatim 引用**、同 `:5513` が他 intent の `construction/` を `ls` で列挙して unit 数を確定。「いずれにも寄与しない」は成立しない |
| 260804-phase-boundary-approval = 134 / 1,041 / +84,296 | **CONFIRMED（完全一致）** | `git rev-list --count 9458bbda8..b938898f3` → 134、`--shortstat` → `1041 files changed, 84296 insertions(+), 11280 deletions(-)` |
| 260804-goal-reconciliation-guar = 68 / 2,262 / +318,811 | **CONFIRMED（完全一致）** | re-scan 記録の宣言と `git diff` が一致（numstat 合算は 318,812 で ±1 差） |
| 同 intent 区間「243,716 insertions」 | **CONTRADICTED** | 同一区間の実測は 318,811。候補述語 7 種（total / non-amadeus / non-intents / total−dist / dist only / non-amadeus non-dist / amadeus 全体）のいずれも 243,716 を返さない。Issue 自身の表の 318,811 と矛盾 |
| 同区間の `dist/pi` が 121,221 行 | **CONFIRMED（完全一致）** | 述語 `^dist/pi/` → 530 files / 121,221 ins（区間の 38.0%） |
| source-only 移行で生成物分が消え、最新 intent では再現しない | **CONFIRMED** | 260805 区間の `dist/` 該当ファイル数 = **0**。移行 `9458bbda85`（#2152）は committer date 2026-08-03 UTC（author date は 2026-08-04 JST） |
| codekb 正味出力 1,384 ins / 9 del、`architecture.md` 174/1 | **CONFIRMED（完全一致）** | `git diff --shortstat f8257f8e4 fc862e879 -- <codekb>` → `15 files changed, 1384 insertions(+), 9 deletions(-)`、architecture.md は `174 1` |
| `fc862e879` の numstat が codekb 13,718 ins | **CONFIRMED（述語復元）** | codekb 配下合計 13,990 − re-scan 記録 272 = **13,718**（＝本体 8 成果物＋timestamp） |
| `5fb23ec2a` が `architecture.md` から 3,174 行削除、500 行超削除は 1 件のみ | **CONFIRMED** | `--numstat` → `62 3174`。`--follow` 全履歴に「削除 > 500 行」述語を適用 → 該当は **1 件のみ** |
| RE 系 subagent 83.2 分 / 20 件、他バケットの件数 | **CONFIRMED（独立再現）** | Issue 記載の区間帰属法を自前実装 → RE 20 件 / **83.2 分**、レビュー系 17 件 / **37.1 分**、選挙 8 件 / **12.8 分**、builder 2 件 / **11.6 分**（いずれも完全一致） |
| `SUBAGENT_STARTED` 不在・`SUBAGENT_COMPLETED` 67 件 | **CONFIRMED（完全一致）** | 4 intent の audit シャード集計 → STARTED = 0、COMPLETED = 67（17/19/15/16） |
| §6 の `Scan mode: focused differential refresh` を 260804-phase-boundary-approval から引用 | **REFINED（誤帰属）** | 同ファイルへの `grep -c "Scan mode"` → **0**（exit 1）。当該語は別の 3 記録（`260804-goal-reconciliation-guar` 他）に実在。併記の `Focus:` 引用は同ファイルに逐語で実在 |
| 行番号引用 `:5` / `:103-112` / `:151` | **CONFIRMED（測定 ref で逐語一致）** | 測定 ref で 3 件とも逐語一致。凍結 SHA では `question-budget` 1 行挿入により `:5` / `:104-112` / `:152` へ **+1 remap** が必要 |

### 再現・コード実読

すべて凍結 SHA `23d4ae76` のツリーに対する読み取り専用実行。

1. 区間規模（exit 0）
   - `git rev-list --count b938898f3..7060956c5` → `34`
   - `git diff --shortstat b938898f3 7060956c5` → `493 files changed, 43826 insertions(+), 217 deletions(-)`
2. 分解（`git diff --numstat` を取得し、自前の順序付き述語で分類。exit 0）
   - `^amadeus/spaces/[^/]+/intents/` → 292 files / 23,372 ins / 53.3291%
   - `^amadeus/spaces/[^/]+/elections/` → 83 / 1,650 / 3.76%
   - `^amadeus/spaces/[^/]+/codekb/` → 13 / 1,227 / 2.80%
   - `^metrics/` → 10 / 802 / 1.83%、`^amadeus/spaces/[^/]+/memory/` → 1 / 5
   - ワークフロー排出物 小計 399 files / 27,056 ins / **61.74%**、残余（コード＋docs＋tests）94 files / 16,770 ins
   - 自 intent record の混入有無を分離検証 → 0 files（292 件すべて他 intent）
3. スコープグリッド（exit 0）
   - `amadeus-graph.ts:1407-1421` `transposeScopeGrid` を実読（「A stage that names a scope is EXECUTE under it; every other scope/stage cell is SKIP」）
   - 全ステージ frontmatter の `scopes:` 和集合 → 15、RE の列挙 → 13、差集合 → `{chore, infra}`、scope ファイル列挙 15 と一致
4. currency（exit 0）
   - `git diff --stat 75a1c198d HEAD -- <RE 契約>` → `1 file changed, 1 insertion(+)`（`+  - question-budget`）
   - `git log --oneline 75a1c198d..HEAD -S"Always rerun for freshness 条項を差分更新で満たす" -- <project.md>` → `bd567fd1b7`（#2919）
5. 時間帰属の独立再現（exit 0）
   - 4 intent の audit シャードを時刻・seq で合流ソートし、`SUBAGENT_COMPLETED` の直前イベントとの差分を `Agent Type` 別に合算（`HUMAN_TURN` 終端区間は除外）
   - RE 系（`amadeus-developer-agent` / `amadeus-architect-agent` / `re-dev-scan` / `re-arch-synth`）→ 20 件 / **83.2 分**
   - 合計は当方実装で 66 件 / 165.0 分（Issue は 67 件 / 168.2 分）。差は 1 件 / 3.2 分で、intent 先頭イベントに直前イベントが無く当方が落とした 1 区間に相当。RE 比率は 50.4%（Issue は 49.5%）で、いずれも「約半分」を支持
6. 反証試行（すべて実施し、結果は上表へ反映）
   - 243,716 を再現する述語の探索（7 種）→ 全て不一致
   - codekb 本体成果物が工程記録を引用していないかの全数 grep → 引用を 2 件検出
   - `architecture.md` の 500 行超削除コミットの全履歴走査 → 1 件のみ（Issue の主張を支持）

### 機序・影響・ラベル

**機序**: RE の差分入力は「機構」ではなく「散文」だけで定義されている。ステージ契約は差分化を一切規定せず（`:104-112` は codebase 全体の走査を指示）、差分化はノルム `project.md:142` の 1 行のみが担う。この行は base / observed の選び方は定めるが、**入力に含めるパス範囲を一切定めない**。差分を計算・除外するコードは存在せず、リポジトリ内の関連ツールはパス解決のみを行う。したがって既定は「リポジトリ全差分」となり、`amadeus/spaces/*/intents/` はリポジトリ内にあるため構造的に入力へ入る。Issue の因果（工程記録を書く → 次 intent の RE が読む → さらに工程記録が増える）は、53.3% という実測と、区間長がチーム活動量に比例するという構造から支持される。

**影響**: 13/15 スコープが RE を EXECUTE するため brownfield 作業のほぼ全体に及ぶ、という Issue の評価は妥当。むしろ当方の実測では削減余地は Issue の見積りより大きく、除外候補を選挙ストアと `metrics/` まで広げると入力の **61.7%** が非コードのワークフロー排出物である。

**ラベル**: `enhancement` は妥当。`.github/ISSUE_TEMPLATE/enhancement.yml`（`name: 機能・改善提案`、送信時に `enhancement` と P コードを自動付与）に照らし、本件は既存の合意済み契約への違反ではなく（現状挙動はノルム記述どおり）、新たな規定の追加を求めるものであるため、種別判定手順の (4) に該当する。`P2 — 通常` も同フォームの定義（P0 = 正しさ・安全性の破綻、P1 = 重要だが回避可能）に照らして矛盾しない。ただし Issue 自身が主張する自己増幅性（時間とともに単調増加）を重く見れば P1 も成り立ちうるため、優先度の再検討余地は残る。

### 訂正・未解決事項

**訂正が必要（実装着手前に本文を修正すべき）**

1. **`243,716 insertions` は誤り** — §2 と §影響・価値の 2 箇所。同一区間の実測は `318,811`（Issue 自身の §1 表と一致）。`dist/pi` の 121,221 行は 318,811 に対する 38.0% であり、243,716 を分母とする記述は成り立たない。
2. **`Scan mode: focused differential refresh` の帰属誤り**（§6）— 当該語は `260804-phase-boundary-approval` の re-scan 記録に存在しない（`grep -c` → 0 / exit 1）。同記録の宣言は `Focus:` のみ。当該語を持つのは別の 3 記録で、うち 1 件は同じ 4 intent 群の `260804-goal-reconciliation-guar`。§6 の論旨（focus を宣言しても全区間を読む）は `Focus:` 引用と各記録の実測区間規模で維持できるため、引用元の付け替えで足りる。
3. **完了条件 1 の根拠文を精密化する必要** — 「工程記録は codekb 9 成果物のいずれにも寄与しない」は反例がある（上表 C5）。除外設計は、設計 provenance の引用（他 intent の nfr-design 等を根拠として引く用法）をどう扱うか——許容して失うのか、別経路で残すのか——を明示する必要がある。除外の正当化を「一切寄与しない」に置いたままでは、この用法の喪失が無申告の退行になる。
4. **⑦ バケットのラベルが不正確** — 128 files / 9,838 ins のうち 93 files / 2,452 ins は選挙ストアと `metrics/` であり「正本ソース」ではない。訂正方向は Issue に有利（削減余地が増える）。

**未解決 / 本レビュー範囲外**

- 713.0 分の全体帰属（A〜I の 9 分類）は、分類器の実装が本文から一意に復元できないため未検証。ただし本 Issue の論拠として load-bearing な subagent 内訳（RE 83.2 / レビュー 37.1 / 選挙 12.8 / builder 11.6）は全て完全再現した。
- 「入力サイズと RE 時間の相関」は Issue 自身が未検証と申告しており、本レビューでも検証していない。「コストは入力側にある」は依然として推論である。
- `git diff --shortstat`（318,811）と numstat 合算（318,812）の ±1 差は未解明。結論に影響しない。

### 同根・対称面

1. **除外候補は `intents/` だけではない** — 同区間で選挙ストア `amadeus/spaces/*/elections/` が 3.76%、`metrics/*.json`（CI スナップショット）が 1.83% を占める。いずれもコード理解に寄与しないワークフロー／CI 排出物であり、`intents/` と同根。除外規定を設計するなら 1 パターンではなく「非コード排出物」という類として定義するのが対称。
2. **`infra` スコープ文書の記述が現状と不整合** — `packages/framework/core/scopes/amadeus-infra.md` は「This is the only scope where `reverse-engineering` is SKIP」と述べるが、凍結 SHA では `chore` も SKIP（RE の `scopes:` に不在）。`chore` スコープは後から追加されたため文が陳腐化している。本 Issue の 13/15 という数え（コンパイル済みグラフ由来）自体には影響しないが、「どのスコープが RE を飛ばすか」を散文から読む読者を誤らせる。別 Issue 相当。
3. **`c1` 改稿で鮮度契約との接続文が失われている** — 測定 ref 時点の `c1` は「`Always rerun for freshness` 条項を差分更新で満たす」と明記していたが、#2919 の蒸留後の現行文にはこの接続が無い。本 Issue の完了条件 3（鮮度契約の非退行を機械的に固定する）は、この接続が散文からも消えている現状を前提に設計する必要がある。
4. **機械検査の土台が現状ゼロ** — 差分を計算・フィルタするコードが一切存在しないため、完了条件 3 の「テストまたは機械検査で固定」は既存機構への追加ではなく新設になる。工数見積りに反映すべき。

### 後続検証者向けメモ

- 本文の数値は **ほぼすべて再現可能**である。再現の要は測定 ref と述語を明示することで、53.3% は `git diff --numstat <base> <observed>` に `^amadeus/spaces/[^/]+/intents/` を適用するだけで得られる。分解表は files 合計・ins 合計が区間合計と一致する全分割になっているため、**合計一致を先に確認**すると個別バケットの検算が速い。
- 行番号引用は測定 ref `75a1c198d` で照合すること。凍結 SHA では `question-budget` センサー 1 行が `:27` に挿入されているため、RE 契約の引用は一律 **+1** ずれる。`project.md` の `c1` は #2919 で全面改稿されており、**測定 ref の文面と現行文面が別物**である点に注意（結論は不変）。
- 反証は「不在の主張」に集中させると効率がよい。本件で効いたのは (a) 除外規定の不在を語彙 grep で確認、(b) codekb 本体成果物が工程記録を引用していないかの全数 grep（ここだけ反例が出た）、(c) 数値を再現する述語の探索（243,716 はここで落ちた）。grep の空出力は exit code を確認してから 0 件と扱うこと。
- 時間帰属は audit シャードを時刻＋seq で合流ソートし、`SUBAGENT_COMPLETED` と直前イベントの差を `Agent Type` 別に合算すれば再現できる。intent 先頭イベントの扱い（直前イベント無し）だけが実装差を生むので、合計を比べる際はここを合わせること。

### Verdict

**CONFIRMED_WITH_REFINEMENTS**

中核の主張——RE の差分入力に除外規定が存在せず、他 intent の工程記録が入力の 53.3% を占め、13/15 スコープが該当し、測定 ref 以降も是正が着地していない——は、いずれも独立の実測で確認でき、ヘッドライン数値は自前の述語で完全に再現した。一方で、(1) `243,716 insertions` は同一区間の実測 318,811 と矛盾し、(2) `Scan mode` 引用は別記録からの誤帰属であり、(3) 完了条件 1 が依拠する「工程記録は codekb に一切寄与しない」には実例の反例がある。(1)(2) は本文の訂正で閉じ、(3) は除外設計の前提として明示的に扱う必要がある。あわせて、削減余地は Issue の見積り（56.1%）より大きく実測 61.7% であり、除外候補は選挙ストアと `metrics/` へ対称に広げうる。

本 verdict は Issue の妥当性（起票内容が実測に裏付けられていること）を確認するものであり、実装方針の承認ではない。着手可否・実装形の決定はユーザーの判断に属する。


#### j5ik2o — 2026-08-17T17:42:47Z — https://github.com/amadeus-dlc/amadeus/issues/2415#issuecomment-5318290899

## クロスレビュー（2人目・reviewer-2）: CONFIRMED_WITH_REFINEMENTS

<!-- issue-cross-review
review-run-id: xrev-2415-20260818
reviewer-id: reviewer-2
execution-subject-id: xrev2415-r2@session-7727e262
target-sha: 23d4ae767956cd56fc28fa78abe28096712eff8a
-->

### 独立性と対象

起票者ではない独立レビュアー（2人目）として、本 Issue 本文を「検証対象の主張」として扱い、既存のクロスレビューコメントおよび Issue コメントを一切参照せずに検証した。リポジトリ状態は読み取り専用のみで変更していない。

- 対象 SHA: `23d4ae767956cd56fc28fa78abe28096712eff8a`（`git rev-parse HEAD` で一致を実測）
- Issue の測定 ref: `75a1c198d5101c1df2bee21f960f01ae1d7973d3`（2026-08-07）。両 ref の窓は `git rev-list --count 75a1c198d..23d4ae767` = **525 commits**
- 検証範囲: 機序（差分入力の定義と除外の不在）、スコープ 13/15、実測値の全数再現、由来・履歴、影響、ラベル、同根・対称面
- 副次レンズ: 主張の網羅性 / 由来 / 影響 / ラベル / 同根・対称ケース

結論を先に述べる。**本 Issue の中核主張・機序・実測値は独立に再現でき、妥当である。** 数値の再現率は極めて高い（後述のとおり分解・時間帰属とも完全一致）。一方で **排出物の分類に取りこぼしがあり、提案されている第一候補の除外は、Issue 自身が測った排出物すら全部は覆わない。** 対象 SHA では問題は起票時より悪化している。

### Claim ledger

| 主張 | 判定 | 独立エビデンス（対象 SHA `23d4ae767`） |
|---|---|---|
| 差分入力は「前回スキャンコミットからの差分」で除外規定がない | CONFIRMED | `memory/project.md:142` が現行 c1。RE 契約・ノルム・TS 実装のいずれにも除外語彙なし（述語と exit code は後述） |
| `condition: … Always rerun for freshness …`（`:5`） | CONFIRMED | 契約 `:5` が逐語一致 |
| Step 2 が全スキャン指示（`:103-112`） | REFINED | 内容一致。対象 SHA では **`:104-112`**（+1 シフト） |
| `every intent's RE run rewrites them, and the latest scan is authoritative`（`:151`） | REFINED | 逐語一致。対象 SHA では **`:152`**（+1 シフト） |
| c1 の由来は 2026-07-07 の緩和策 | CONFIRMED | 初出 `cb299113c5`（2026-07-07）。当時の文面は Issue の引用と**逐語一致** |
| c1 の引用文面（現行として） | REFINED | 2026-08-12 の `bd567fd1b7`（#2919 ノルム蒸留）で改稿済み。実質（差分リフレッシュ／除外なし）は不変 |
| 13/15 スコープが RE 実行（`chore`・`infra` 以外） | CONFIRMED | 契約 frontmatter `scopes:` = 13 件、`packages/framework/core/scopes/` = 15 件 |
| 区間規模 43,826 / 84,296 / 318,811 insertions | CONFIRMED | re-scan 記録と git 実測が一致 |
| ① 他 intent record 292 files / 23,372 ins / **53.3%** | CONFIRMED | 独立再現で **292 files / 23,372 ins / 53.33%** と完全一致 |
| ② codekb 2.8%、③ memory、⑤ docs、⑥ tests 21.3% | CONFIRMED | 4 クラスとも files・ins・% が完全一致 |
| ⑦「正本ソース」128 files / 9,838 ins / 22.4% | **REFINED（分類誤り）** | 合計は一致するが、うち **83 files / 1,650 ins は `elections/` ストア**＝工程排出物。真の正本ソースは **45 files / 8,188 ins（18.68%）** |
| 排出物は「①+② = 56.1%」 | **REFINED（過小）** | `elections` と `memory` を含めた実測は **59.90%** |
| `dist/pi` 121,221 行 | CONFIRMED | 530 files / **121,221 ins** と完全一致 |
| plugin 投影 約45,000行 / 合計約166,000行 | CONFIRMED | self-install 投影 238 files / **44,488 ins**、合算 165,709 |
| 当該区間は「243,716 insertions」 | **CONTRADICTED（内部不整合）** | 実測 **318,812**（記録は 318,811）。Issue §1 の表は正しく 318,811 を載せており、§2・§影響 の数値のみ不整合 |
| source-only 移行（2026-08-03）で dist が追跡外 | CONFIRMED | `9458bbda8` の committer date = 2026-08-03T17:31:43Z、`dist/` 追跡 **3,959 → 0**、対象 SHA でも 0 |
| codekb 正味出力 1,384 ins / `architecture.md` 174 ins | CONFIRMED | 15 files / **1,384 insertions / 9 deletions**、`architecture.md` **174/1** と完全一致 |
| `5fb23ec2a` が 3,174 行削除、500 行超削除はこの 1 件のみ | CONFIRMED | numstat **62/3174**。全履歴走査で >500 削除は当該 1 件のみ |
| 実コード変更 1,361 insertions | CONFIRMED | production 245 + tests 1,116 = **1,361** と一致 |
| その内訳「production 約240行 + テスト854行」 | REFINED | production 245 は一致。テストは実測 **1,116**（854 は非再現、内訳の和も 1,361 に合わない） |
| `SUBAGENT_COMPLETED` 67 件 / `SUBAGENT_STARTED` 不在 | CONFIRMED | 4 intent 合計 **67 / 0**（対象 SHA・測定 ref とも同一） |
| Agent Type 分解 20 / 17 / 20 / 8 / 2 件 | CONFIRMED | 5 区分すべて **完全一致**（合計 67） |
| subagent 168.2分・RE 系 **83.2分**・49.5% | CONFIRMED | 記載の帰属手法を独立実装して **168.2 / 83.2 / 37.1 / 23.4 / 12.8 / 11.6 分** と完全一致 |
| 合計 713.0分 | REFINED | 独立再現は **716.1分**（差 +3.1分 = +0.4%、結論に影響なし） |
| 自己増幅ループ（活動量 ↑ → RE コスト ↑） | CONFIRMED（機序として） | 最新区間の `intents/` 分は **100% が他 intent**（3 intent 由来）。排出ストアの産出速度も実測（後述） |
| 除外で入力が半減する見込み | CONFIRMED（推定として） | 直近 7 区間の `intents/` 比は **39.0%〜72.6%**、中央値 ≒ 52% |
| 起票時点以後、除外を実装した着地はない | CONFIRMED | 窓内 525 commits のうち RE 契約への変更は 1 件のみ、内容は sensor 1 行追加 |
| 代替案3 の根拠（RE 9/12・RA 8/12） | CONFIRMED | `scopes/amadeus-self-fix.md:28-29` が逐語一致 |
| `enhancement` / `P2` ラベル | CONFIRMED | Issue Form 準拠。種別判定で `bug`・`documentation` に該当しない |
| 「工程記録は codekb に一切寄与しない」 | **INCONCLUSIVE** | 提案全体を支える前提だが未測定。Issue 自身が完了条件1で根拠の明示を求めている |

### 再現・コード実読

すべて対象 SHA `23d4ae767` に対する読み取り専用実行。再現は リポジトリ外の scratch で行った。

**1. 分解の独立再現（Issue の中核実測）**

```
git diff --shortstat b938898f3..7060956c5
→ 493 files changed, 43826 insertions(+), 217 deletions(-)   （exit 0）
```

`git diff --numstat b938898f3..7060956c5` をパス種別へ分類（正規表現 `^amadeus/spaces/[^/]+/(intents|codekb|memory)/`、`^amadeus/`、`^tests/`、`^docs/`、他）:

```
intents_record   292 files    23372 ins   53.33%   ← Issue ①（完全一致）
codekb            13 files     1227 ins    2.80%   ← Issue ②（完全一致）
memory             1 files        5 ins    0.01%   ← Issue ③（完全一致）
elections         83 files     1650 ins    3.76%   ← Issue が ⑦ に混入させた分
docs               4 files       36 ins    0.08%   ← Issue ⑤（完全一致）
tests             55 files     9348 ins   21.33%   ← Issue ⑥（完全一致）
source(真)        45 files     8188 ins   18.68%
TOTAL            493 files    43826 ins
```

Issue の ⑦「正本ソース 128 files / 9,838 ins」は、`elections` 83 files/1,650 ins と真の正本ソース 45 files/8,188 ins の**合算**である（128 = 83+45、9,838 = 1,650+8,188）。合計値は正しいが**ラベルが誤っている**。

**2. 時間帰属の独立再現（コスト主張の核）**

Issue 記載の手法（直前イベント→当該イベントの区間を当該イベント種別へ帰属、`HUMAN_TURN` 終端区間を除外）を audit シャードから独立に再実装した:

```
GRAND TOTAL: 716.1 min        （Issue: 713.0 min、差 +0.4%）
SUBAGENT subtotal: 168.2 min  （Issue: 168.2 min — 完全一致）
  RE 系        83.2 min       （完全一致）
  §12a レビュー 37.1 min       （完全一致）
  分類不能      23.4 min       （完全一致）
  §13 選挙      12.8 min       （完全一致）
  builder       11.6 min       （完全一致）
```

`Agent Type` 分解も 5 区分すべて件数一致（RE 系 20 / レビュー 17 / 分類不能 20 / 選挙 8 / builder 2、合計 67）。`SUBAGENT_COMPLETED` = 67、`SUBAGENT_STARTED` = 0 は測定 ref・対象 SHA の双方で同値。**§4 は完全に再現可能である。**

**3. 除外規定の不在（機序の要）**

```
git grep -n -i -E "exclude|exclusion|除外|pathspec" -- <RE 契約>
→ 0 行、exit 1（クリーンな不一致）

git grep -n -i -E "git diff|rev-list|merge-base" -- <RE 契約>
→ 0 行、exit 1

git grep -n -E "\(exclude\)|scanExclude|excludePaths|EXCLUDE_PATHS" -- '*.ts'
→ 0 行、exit 1
```

ノルム 3 層（`org.md` / `team.md` / `project.md`）への `除外|exclude|exclusion` 走査は 6 hit あるが、いずれも docs の paths-ignore・CI blocking・consumer inventory・rsync exclude・数値規律・test path に関するもので、**RE 差分入力の除外規定は 1 件も存在しない**。

（注: 上記 exit code はパイプを介さず取得した。`| head` を挟むと `$?` がパイプ末尾の終了コードになり、不在主張の根拠として無効になる。)

**4. 現時点の実装状況**

```
git log --oneline 75a1c198d..HEAD -- <RE 契約>
→ 37f1c20f86 feat(sensor): 質問数を depth 上限に対して測定する (#2712)
```

窓内 525 commits のうち RE 契約に触れた唯一の変更で、差分は **frontmatter への sensor 1 行追加のみ**（`1 file changed, 1 insertion(+)`）。除外規定は導入されていない。この 1 行が、Issue の行番号引用が `:5` 以降で +1 ずれる原因でもある（`:103→:104`、`:151→:152`）。測定 ref `75a1c198d` では `:5` / `:103` / `:151` が**そのとおり一致**することを確認済みで、引用は起票時点では正確だった。

### 機序・影響・ラベル

**機序（根本原因）** — Issue の記述どおりで、実読により次の 2 層構造として確認した。

1. ステージ契約（`stages/inception/reverse-engineering.md`）は依然として**全スキャン**を指示する（`:5` の `Always rerun for freshness`、`:104-112` の「All packages, modules …」）。契約側には差分の計算式も除外も存在しない（`git diff` 等の語彙が 0 hit / exit 1）。契約が差分リフレッシュに言及するのは `:95` の "This keeps the differential refresh honest" だけで、既存概念として参照しているにすぎない。
2. 差分化は**ノルム側の緩和策**として `project.md:142`（c1）にのみ存在し、そこでも入力は「前回スキャンコミットからの差分リフレッシュ」としか定義されない。

さらに、この差分区間を計算する**実装は存在しない**。ツール層にあるのは path 解決だけで（`codekbReScanDir` / `codekbReScanFile` / `codekb-path --re-scan`）、base 選定も差分の取得もエージェントが散文指示に従って手動で行う。したがって「何を除くか」を挿し込める機械的な地点が現状どこにもない、というのが実装上の含意である（これは Issue の主張を超える観測）。

**影響（対象 SHA での再測）** — 起票時より**悪化している**。直近 7 区間で同じ分解を実行した:

| 区間（intent） | 総 ins | `intents/` | `elections/` | `codekb/` | 排出物計 |
|---|---:|---:|---:|---:|---:|
| 260814-t99-copytree-race | 5,687 | 51.8% | 15.7% | 17.6% | **85.2%** |
| 260815-per-unit-outcome | 3,091 | 39.0% | 5.0% | 14.1% | **59.9%** |
| 260815-priority-bug-batch-2 | 222 | 55.4% | 0.5% | 13.5% | **69.8%** |
| 260815-stale-epoch-landed | 4,856 | 72.6% | 6.6% | 7.2% | **86.5%** |
| 260816-open-bug-batch-7 | 22,808 | 42.3% | 0.7% | 1.6% | **46.5%** |
| 260816-priority-bug-batch-3（最新） | 6,597 | 54.4% | 20.2% | 9.2% | **84.0%** |

Issue の 53.3% は観測レンジ（39.0〜72.6%）の内側にあり、外れ値ではない。一方で**排出物の総量は 46.5〜86.5%** で、Issue が述べる 56.1% を大きく上回る区間が複数ある。最新区間では実コード（source+tests+docs）は **15.95%** にすぎない。

自己増幅ループも裏付けられた。最新区間の `intents/` 分 107 files / 3,586 ins は**全量が他 intent 由来**（`260816-open-bug-batch-7` 2,099 / `260815-rfc-autonomy-modes` 949 / `260815-priority-bug-batch-2` 530）で、スキャン主体自身の record は 0 である。排出物の産出速度も実測できる:

| ref | 日付 | intent ディレクトリ | intent ファイル | election ファイル |
|---|---|---:|---:|---:|
| `9458bbda8` | 2026-08-04 | 125 | 7,486 | 2,779 |
| `75a1c198d` | 2026-08-07（起票時） | 140 | 8,477 | 3,457 |
| `23d4ae767` | 2026-08-17（対象） | 188 | 10,536 | 4,338 |

起票からの 10 日で intent ディレクトリ +48（+34%）、intent ファイル +2,059（+24%）、election ファイル +881（+25%）。RE の入力は総量ではなく区間差分だが、**この産出速度こそが区間あたりの排出量を決める**ため、放置すればコストが単調増加するという Issue の主張は支持される。

**ラベル** — `.github/ISSUE_TEMPLATE/enhancement.yml` を正本として確認した。本文は同テンプレートの必須 8 節をすべて満たし（加えて「測定の限界」節を自主的に追加している）、`優先度` の選択肢に `P2 — 通常` が実在してラベル `P2` と対応する。種別判定（完了条件による上からの判定）でも: 回答だけで閉じない → `question` でない。完了条件3 がテストまたは機械検査を要求する → `documentation` でない。除外を要求する既存契約は存在しないため既存契約への違反ではない → `bug` でない。契約を**追加**する提案であり `enhancement` が正しい。**`enhancement` / `P2` はいずれも妥当。**

### 訂正・未解決事項

**訂正を要する点（いずれも結論を覆さない）**

1. **`243,716 insertions` は誤り。** `260804-goal-reconciliation-guar` の区間（`a8e1ce025..58761daa5`）の実測は **318,812**（re-scan 記録は 318,811）。Issue §1 の表は正しい値を載せているため、§2 と §影響・価値 の記述のみ内部不整合である。なお `dist/pi` 121,221 行と plugin 投影 約45,000行という**結論側の数値は正しい**ため、訂正は分母の記述に限られる。
2. **⑦「正本ソース 128 files / 9,838 ins」のラベルが誤り。** うち 83 files / 1,650 ins は `elections/` ストアで、これも工程排出物である。正本ソースは 45 files / 8,188 ins（18.68%）。結果として排出物の合計は 56.1% ではなく **59.90%**。
3. **「テスト854行」は非再現。** 実測 1,116 行（`production 245 + tests 1,116 = 1,361` で headline は一致）。
4. **c1 の引用が現行文面と異なる。** 引用は起票時点では逐語正確だったが、2026-08-12 の `bd567fd1b7`（#2919）で改稿された。実装時は現行 `project.md:142` へ再アンカーすること。
5. **行番号 `:103-112` / `:151` は対象 SHA で `:104-112` / `:152`。**
6. 合計 713.0分 は独立再現では 716.1分（+0.4%）。

**未解決事項**

- **「工程記録は codekb に一切寄与しない」は未測定の前提である。** 提案全体がこの前提に乗っているが、Issue は根拠を示していない（完了条件1 が自ら根拠の明示を求めている点は適切）。工程記録には file:line 引用や実装要約が含まれるため、「codekb 9 成果物のいずれにも寄与しない」は自明ではなく、除外の前に実測で確かめるべき論点として残る。
- 「入力サイズと RE 時間の相関」は Issue 自身が測定の限界として明示済み。本レビューでも未検証。
- `#707` と `#2201` の Issue 状態は GitHub API の一時障害（HTTP 503）で取得できなかった。ただし `#2201` に対応する `5fb23ec2a` はローカル履歴で確認済み。`#2425`（OPEN）、`#2019`（CLOSED）、`#2143`（CLOSED）は表題まで一致を確認した。

### 同根・対称面

1. **`elections/` ストアが未同定の排出物クラスである（最重要）。** Issue はこれを「正本ソース」に含めてしまっており、独立した排出面として扱っていない。最新区間では **20.22%** を占め、`intents/` に次ぐ第 2 の排出源になっている。対象 SHA で 4,338 ファイルが追跡されており、10 日で +881。
2. **提案されている第一候補の除外は、Issue 自身が測った排出物すら全部は覆わない。** `amadeus/spaces/*/intents/` が覆うのは 53.3%（最新区間 54.36%）のみで、`codekb` 2.8%（同 9.20%）と `elections` 3.76%（同 20.22%）は残る。最新区間では排出物 84.04% のうち **29.68 ポイントが除外外**に残る。完了条件2 の「縮小率の実測」を設計する際は、除外集合をこの 3 面（`intents` / `elections` / `codekb`）で検討することを推奨する。
3. **`amadeus/spaces/*/intents/` は git pathspec としてはそのままでは動かない。** 実測: `git diff --numstat <区間> -- 'amadeus/spaces/*/intents/'` は **0 件**、`-- 'amadeus/spaces/default/intents/'` は 107 件、`-- ':(glob)amadeus/spaces/*/intents/**'` は 107 件。Issue の表記は散文上のパターンとして妥当だが、実装時は `:(glob)` マジックか実スペース名が必要になる。
4. **`tests/no-silent-drop/` の追記型台帳**も性質としては排出物側だが、実測では小規模かつ断続的（直近 3 区間で 140 / 0 / 0 ins）。優先度は低い。
5. **軽微なドキュメント drift（本 Issue とは独立）**: `scopes/amadeus-infra.md:27` は「This is the only scope where `reverse-engineering` is SKIP」と述べるが、`scopes/amadeus-chore.md:15` も RE を skip すると明記しており、契約 frontmatter でも `chore`・`infra` の 2 スコープが RE を持たない。本 Issue の 13/15 という主張の側が正しい。
6. 由来の対称面として、**入力削減が過去に一度成功している**という Issue の主張は成立する（`dist/` 3,959 ファイルが `9458bbda8` で追跡外になり、対象 SHA でも 0）。ただしそれは追跡境界の変更による副次効果であり、RE 差分入力への明示的な除外規定という形は前例がない点は区別しておきたい。

### 後続検証者向けメモ

- **分解の再現は `git diff --numstat <base>..<observed>` を正規表現でクラス分けするだけで足りる。** ただし `amadeus/` 配下を `intents` / `codekb` / `memory` の 3 つだけで分類すると **`elections/` が「その他」へ落ちて正本ソースに混入する**。本 Issue の唯一の分類誤りはここから生じている。`amadeus/` 配下は必ず残余クラス（`amadeus_other`）を置いて中身を確認すること。
- **不在主張の exit code は絶対にパイプ越しに取らない。** `git grep ... | head` の `$?` は `head` のもので、常に 0 になる。本レビューでも一度この罠を踏み、パイプなしで取り直して exit 1（クリーンな不一致）を確定させた。
- **`amadeus/spaces/*/intents/` を git pathspec にそのまま渡すと 0 件で無音成功する。** 除外の実効を測る述語を書くときは、まず既知の非ゼロ区間へ当てて件数が出ることを確認してから使う。
- **audit の event 種別は `attributes.Event`（大文字）であり、トップレベルは `eventName`（ドット記法）。** 単純な `grep -c` は複数シャードを跨ぐと取りこぼす。JSON を parse して `attributes.Event` で数えると 67 件が安定して再現する。
- 時間帰属は intent ごとにシャードを合流し `(timestamp, seq)` で整列してから隣接差分を取る。`HUMAN_TURN` で終端する区間を落とすだけで、subagent 内訳は Issue と完全一致する。合計だけが +0.4% ずれるのは、おそらく「その他イベント」バケットの端点処理の違いで、追う価値は低い。
- 行番号引用は `37f1c20f86` の 1 行追加により `:5` 以降が +1 ずれている。測定 ref `75a1c198d` へ `git show <ref>:<path>` で当てれば起票時の引用が正確だったことを確認できる。
- 影響の現在地を測るなら、re-scan 記録の先頭から 40 桁 SHA を 2 つ抜いて base/observed とし、直近 5〜7 区間へ同じ分解を回すのが最も安価である。単一区間だけだと（`260816-open-bug-batch-7` の 46.5% のように）コード量の多い区間に当たって過小評価しうる。

### Verdict

**CONFIRMED_WITH_REFINEMENTS**

本 Issue の症状・機序・スコープ・由来・影響はいずれも独立に確認できた。とりわけ中核となる分解（53.3%）と時間帰属（RE 系 83.2分）は、手法を独立に再実装して**完全一致**で再現できており、証拠の質は高い。対象 SHA では除外規定は依然として存在せず（契約・ノルム・実装のいずれにも 0 hit / exit 1）、起票時点以後にこれを実装した着地もない。したがって本 Issue は現行状態でも有効である。

refinements として、(a) `243,716 insertions` の内部不整合、(b) ⑦「正本ソース」への `elections/` 混入とそれに伴う排出物 56.1% → 59.90% の訂正、(c) 「テスト854行」の非再現、(d) c1 引用と行番号の再アンカー、を求める。加えて **提案されている第一候補の除外（`amadeus/spaces/*/intents/`）は排出物の一部しか覆わない** ため、完了条件の設計時に除外集合を `intents` / `elections` / `codekb` の 3 面で検討することを推奨する。「工程記録は codekb に一切寄与しない」という前提は未測定のまま残っており、除外の設計前に実測で確かめるべき論点である。

なお本 verdict は **Issue の妥当性（起票内容が現行状態でも成立すること）を確認するものであり、実装方針の承認ではない。** 着手可否およびどの除外集合を採るかの決定はユーザーの裁定事項である。


### その他コメント(verbatim、任意)

(なし)
