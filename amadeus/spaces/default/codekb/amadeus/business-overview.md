# ビジネス概要

## 形式検査 advisory の人間判断境界（260803-advisory-human-choice、履歴、observed `498c3034a`）

- **利用者価値**: [Issue #2129](https://github.com/amadeus-dlc/amadeus/issues/2129) は、形式モデル検査を早期に実行するか、リスクを認識して後へ送るかを人間が選べる状態を守る。対象は `requirements-analysis`、per-unit の `functional-design`、`build-and-test` の3チェックポイントであり、後段の `formal-model-check` 実行可否とは別の上流判断である。
- **現状の成立範囲**: plugin activation は advisory を生成し、engine は `run-stage` directive の `advisories` と stderr に載せられる。既存テスト28件は、この発火・directive掲載・同一run内の `(plugin, code)` latchを固定している。
- **現状の欠陥**: advisory固有の人間選択を入力し、意味を保持し、後続遷移で検証する状態機械がない。一般の `HUMAN_TURN`、standing grant、`GATE_APPROVED` は「このadvisoryに対して何を選んだか」のreceiptではないため、AIだけで先へ進める構造を閉じていない。
- **影響範囲**: main / `--single`、初回 / 再入 / 新session / spec変更、not-ready / changed / never-run / current / not-composed、通常stage / per-unit stage、現行 `run-stage` / 将来の `dispatch-subagent` を同じ契約で扱う必要がある。特に `functional-design` は最初の `gate:false` directive でadvisoryが消費・latchされ、全unit後の `gate:true` では再提示されない。
- **証拠上の限界**: 凍結証拠から、実際のAI発話内容と実損量は確定できず **INCONCLUSIVE** である。構造的な欠落はCONFIRMEDだが、過去runで必ず黙殺された、または損失が発生したとは断定しない。
- **次段の判断**: Requirements Analysis で、人間選択の意味、鮮度、再利用可否、hold境界、保護された記録主体を要件化する。receiptの媒体・フィールド・canonical event名は未承認であり、Reverse Engineeringでは確定しない。

## subagent 型規律と model 可観測性の業務境界（260805-subagent-type-guard、現在、observed `7060956c5`）

測定 ref: base `b938898f364160d4b5857e153579b40b5ab18372` → observed `7060956c5617125dd2f4e284957aa180cb306484`（34 commits / 493 files）。

本 intent（[Issue #2279](https://github.com/amadeus-dlc/amadeus/issues/2279) / mirror [#2288](https://github.com/amadeus-dlc/amadeus/issues/2288)、scope `self-feature`）の目的は、subagent の spawn 記録に**型の規律**と**実効 model の可観測性**を持ち込むことである。現在 audit に残る `Agent Type` は所属検査を一切受けておらず、本来は型（`subagent_type`）を記録すべきフィールドに実運用では個体名（`name:`）が入っている（実測: distinct 200 のうち 184、261 イベントが定義済み persona でもハーネス組込型でもない）。同時に、どのモデルで動いた subagent なのかが記録されないため、コスト・品質・失敗傾向をモデル別に振り返る手立てがない。本 intent は (1) 型を許可集合と照合して集合外を loud に警告する **advisory** ガード（fail-closed 拒否はしない）、(2) `明示指定 > agent 定義の model ピン > セッション継承` の解決順で実効 model を記録し解決不能時は欠落を明示する、(3) 型別・モデル別の spawn 内訳を1コマンドで導出できる集計、の3能力を出荷する。

業務上の受益は「振り返りの材料が揃うこと」である。型が規律されれば役割ごとの spawn 内訳が意味を持ち、model が記録されれば同じ役割を別モデルで回した際の差を後から比較できる。advisory に留める判断（Issue #2279 が代替案2の fail-closed を明示非採用）は、運用を止めずに規律を浸透させるためであり、実績を見てからの将来判断として残されている。

境界の外に置いた事項は行き先が確定している: 汎用 builder persona の新設は [#2298](https://github.com/amadeus-dlc/amadeus/issues/2298)（本 intent 完了後の型内訳を設計入力にする）、live `.claude/settings.json` の `PreToolUse` 配線欠落は [#2297](https://github.com/amadeus-dlc/amadeus/issues/2297)、`CXR-33`（transcript / prompt 本文の読取禁止）は制約として受容する。

本 RE が業務判断へ返す新しい事実は2点ある。第一に、**model の供給有無はハーネスによって異なる** — Codex は hook payload に model を載せており core hook の入口まで届いているが、Claude Code は明示指定時を除いて載せない。したがって「全ハーネスで同じ粒度の model 記録」は約束できず、供給できないハーネスでは欠落の明示で運用を継続する（CON-3）。第二に、**start 側イベントは Claude Code で構造的に記録されていない**（全 132 intent で 0 件）。原因は2層あり、#2297 が扱う配線欠落だけでなく、dispatch tool 名の語彙不一致（core が `"Task"` を期待、実 payload は `"Agent"`）が独立に存在する。**#2297 の修正だけでは start 側の記録は回復しない** — この含意は #2297 の受入基準に書かれておらず、型別集計を START × COMPLETE のペアで組むか COMPLETED 単独で組むかという設計判断に直接効く。

## phase boundary 承認の業務境界（260804-phase-boundary-approval、履歴、observed `b938898f3`）

本節の測定 ref はすべて observed `b938898f364160d4b5857e153579b40b5ab18372`。差分 base は `9458bbda85eb7257310a80882b4858dc6ce3d1fc`（祖先性 exit 0、距離 134 commits / 1041 files）。全数列挙は `re-scans/260804-phase-boundary-approval.md` を正本とする。

- **対象**: [Issue #2143](https://github.com/amadeus-dlc/amadeus/issues/2143)。scope は `self-fix`、Depth: Minimal。phase 境界の traceability 検証（`verification/phase-check-<phase>.md`）を「いつ書くか」について、規約・ガード・ハーネス手順の3層が食い違っていた。
- **守っている価値**: phase 境界で上流成果物との追跡可能性を実際に検証してから次 phase へ渡す、という規律。ガードは fail-closed（artifact がなければ承認が拒否され state file は無傷）なので、**偽の緑は生まない**。壊れているのは安全性ではなく**進行性と一貫性**である。
- **区間内で解消した部分**: 規約 `stage-protocol-governance.md:14-18` の記述は、base 時点の「最終ステージが承認された後に検証する」という順序（ガードが承認前に発火する事実と矛盾）から、observed では「`phase_boundary` を持つゲートの承認を report する前に検証する。artifact が存在するまで承認遷移は fail-closed」へ書き換わっている。帰属は `f7273b9ab`（#2166、Pi ハーネス追加）1件のみ。**#2143 の前提である「3契約すべてが不整合」は observed では成立しない。**
- **残っている利用者影響**: conductor が実際に読むのはハーネスごとの annex である。8ハーネスを全数実読した結果、**`phase_boundary` → artifact → 承認 の順序を記述しているのは `pi` 1本だけ**で、`claude` / `codex` / `kimi` / `kiro` / `kiro-ide` は artifact 前提に触れずに承認 report を直呼びさせる。したがってこれら5ハーネスの利用者は、phase 境界で**承認がガードに拒否されて初めて artifact の必要性を知る**。作業は失われないが、境界ごとに一度必ず躓く。
- **新たに生じたリスク**: autonomy `full` は phase 境界も自動承認する（`stage-protocol.md:129`）。この経路には artifact を書く人間ターンが存在しないため、ガードが必ず拒否して**進行不能**になる。fail-closed なので損失はないが、`full` の売り文句である「無人完走」が phase 境界で成立しない可能性がある。`full` grant 下の実 run を再現していないため **UNCONFIRMED**。
- **出荷単位**: 公開契約の変更はない。是正は (a) pi の既存記述を残り5つの skill-bearing annex へ横展開すること、(b) autonomy `full` × phase 境界の責務を裁定すること、の2面に閉じる。annex 間 drift を CI で止める機械検査を含めるかは裁定事項。
- **次段の裁定**: (1) 横展開の範囲（skill-bearing 5本のみか、`cursor` / `opencode` の薄い `commands/amadeus.md` も含めるか）、(2) `full` で phase 境界だけ人間へ戻すか / conductor が autonomy 下でも artifact を書くか / ガードを autonomy 認識にするか、(3) 規約が既に是正済みである事実を #2143 の受入基準へどう反映するか、(4) drift 検査を本 intent に含めるか。

### 区間内で製品面に加わったもの（本 intent の対象外だが業務境界に影響する）

- **第8ハーネス `pi`**: Amadeus が対応するエージェントハーネスが7種から8種になった。`pi` は既存の hook / plugin 構成ではなく driver / guardian / replay-store / extension 構成をとる。皮肉にも、phase-check の手順を正しく持つ唯一の annex である。
- **Intent Autonomy（`none` / `semi` / `full`）**: ゲート承認の自動化水準を Intent 単位の監査済み grant で選ぶ製品機能。`none` は stage / phase 両ゲートで人間を要し、`semi` は phase 内を自動承認しつつ phase 境界で人間を要し、`full` は両方を自動承認する。
- **Quality Repair と Loop Monitor**: `semi` / `full` の下で品質不合格を承認に変えないための機構。修復の証跡履歴を保持し、閾値で一度リプランし、非生産的な修復は `REPAIR_STALLED` として park する。利用者が carrier JSON を書くことは一切ない。
- **goal lineage（`ACHIEVED` / `DEVIATED` / `UNVERIFIED`、#2171）**: ワークフロー完了の前提条件として goal receipt が要求されるようになった。`amadeus-goal.ts`（582行）と `amadeus-goal-reconciliation.ts`（883行）が担う。`tests/unit/t-phase-check-gate-seam.test.ts` の `complete-workflow` ケースが `seedGoalReceiptForFinalStage("build-and-test")` へ再シードされているのはこの帰結である。

## no-silent-drop evidence の revision 再バインドの業務境界（260804-evidence-revision-rebind、履歴、observed `9458bbda8`）

本節の測定 ref はすべて observed `9458bbda85eb7257310a80882b4858dc6ce3d1fc`（= `origin/main`）。差分 base は `498c3034a78bd432dc426f9f807b79c8ae980762`（祖先性 `git merge-base --is-ancestor` exit 0、距離 11）。全数列挙・実測手順は `re-scans/260804-evidence-revision-rebind.md` を正本とする。

- 対象: [Issue #2156](https://github.com/amadeus-dlc/amadeus/issues/2156)（`bug` / `P0` / `S1-FATAL`、クロスレビュー2名 `XREV-2156-20260804` CONFIRMED_WITH_REFINEMENTS 成立済み）。scope は `self-fix`、Depth: Minimal。
- 利用者影響: **`main` の必須チェックが不成立で、マージ経路が全面停止している。** 必須チェックは ruleset `main`（id `18843917`、`enforcement: active`）の `required_status_checks` = `['CI Success']` の1件のみ（classic protection は 404 `Branch not protected`）だが、`CI Success` は `ci.yml:893-906` の `needs: [changes, typecheck, lint, distribution-contract, plugin-conformance-e2e, tests, reproducible-build, drift-check, coverage]` + `if: ${{ always() }}` の集約ジョブであるため、`tests` の赤がそのまま必須チェックの赤になる。
- 例外: `paths-ignore` により record / docs-only PR は `Tests` が skipped となり着地しうる（実例 `498c3034a`）。「以後の全 PR がブロック」は厳密には過大であり、同時にこの迂回が導入時の赤を長期間不可視にした一因でもある（`cid:build-and-test:ci-paths-ignore-doc-guard-blindspot` の再演）。
- 出荷単位: 業務構造・公開契約の変更はない。是正は (a) 台帳3層の revision 再バインドによる止血と、(b) 「PR ブランチ SHA が台帳へ入らない／着地後に main SHA へ再バインドされる」再発防止の2面に閉じる。(b) の方式は未裁定であり、**即時の再バインドだけでは次に registry を更新する PR で再発する**。
- 業務上の性質: この欠陥は **PR 上では原理的に観測できない**。PR ブランチでは記録 SHA が到達可能なので緑になり、スカッシュ着地の瞬間に到達不能へ反転する。レビューでも PR CI でも捕捉できないため、同一設計から4回中3回再発した（記録元の追跡はレビュー verdict 2件が独立に一致）。

## state integrity の業務境界（履歴: 260803-state-integrity、2026-08-03、observed `6c15af23a`）

> **測定 ref の訂正（Step 1 preflight の後追い実施）。** 本 intent の RE は、ステージ Step 1 の preflight（差分リフレッシュ前に trunk を統合する）を**当初スキップしたまま**走った。preflight は事後に是正パスとして実施され、observed はその統合後の HEAD `6c15af23a` である。統合した 6 コミットは患部ソース 6 ファイルを **1 行も変更していない**（`git diff --stat 498c3034a..origin/main -- packages/framework/core/tools/{amadeus-lib,amadeus-state,amadeus-audit,amadeus-jump,amadeus-utility,amadeus-bolt}.ts` が空出力・exit 0。Architect が独立に再実測）。したがって本節の行番号・引用はいずれも preflight 前後で不変である。経緯の全文は `re-scans/260803-state-integrity.md` §実行メタデータ。

- **目的**: [Issue #1906](https://github.com/amadeus-dlc/amadeus/issues/1906)（P2 / S1-FATAL / `origin:bootstrap`）の audit lock 相互排他破れと、[Issue #1875](https://github.com/amadeus-dlc/amadeus/issues/1875)（P3 / S4-MINOR / `origin:bootstrap`）の `Completed` カウンタ定義三分裂を是正する。両 Issue とも本 observed SHA でクロスレビュー2名成立済み。価値は「1 件の競合を塞ぐこと」ではなく、**監査記録と state の整合性が無音で壊れる経路を閉じること**にある。
- **現存する利用者影響（#1906）**: audit lock の reaper には 2 つの steal 分岐があり、うち **live-owner-over-age 分岐（分岐 B）は CAS 後検証が構造的に不活性**である。生きている holder は取得後に stamp を更新しないため、検証は守るべきケースそのものに対して必ず通過する。critical section が `lockStaleMs()` を超えるだけで相互排他が破れ、実測では 20 並行増分のうち 14–16 が**全プロセス exit 0 のまま**失われた。もう一方の分岐（old-unstamped-dir、分岐 A）は単独では到達しにくいが、acquire の fail-open（`amadeus-lib.ts:6345`）により、一時的な stamp 書込失敗が**恒久的に steal 可能な live lock** へ変換され、タイミングの幸運なしに成立する。監査シャードは append-only であるため、ここでの無音損失は後から検出も復元もできない。
- **重要な訂正 — 既定構成は fail-CLOSED である**: 既定ノブ下の decisive run は 41 成功 + 19 の loud な非ゼロ終了 = 60 で、無音損失ゼロだった。失われた作業はすべて `exit 1` として表面化する。**Issue 原文の「全プロセスが exit 0 のまま増分が消える」という記述は既定構成の挙動を描写していない。** 無音損失は `lockStaleMs()` を下回る短い閾値、または stamp 書込失敗という前提条件の下で発現する。この訂正は要件のリスク記述に反映する必要がある。
- **現存する利用者影響（#1875）**: `Completed` フィールドに 3 つの定義（生カウント R / EXECUTE 実効 E / graph 由来 G）が並存し、9 箇所の書き手に分散している。3 定義すべてが append-only の audit 行と CLI JSON へ到達するため、**同じワークフローの進捗が、どのコマンドが最後に書いたかによって別の数値として記録される**。さらに approve の fail-closed 検証器（`amadeus-state.ts:3377`）は自分が書いたのと同じ定義で再計算するため、乖離を検出することが構造的に不可能で、検証しているように見えて何も守っていない。
- **成功境界**: (i) 相互排他が破れる経路を、無音ではなく loud failure か正しい排他のどちらかへ倒すこと、(ii) `Completed` を単一の正準定義から単一の書き手経路で導出し、検証器をその正準定義へ接続すること。いずれも「落ちる実証」— 修正前に赤くなり修正後に緑になるテスト — を受け入れ基準に含める。
- **スコープ境界**: 生成済み harness 面（7 dist + 5 self-install の計 12 コピー）を手編集せず `packages/framework/core/` の正本を直し、投影整合は既存 `dist:check` / `promote:self:check` に委ねる。ロック機構の全面再設計、監査シャード形式の変更、`Completed` 以外の派生フィールドの整理は本 intent に含めない。ロック bucket の統一と UNLOCKED な state RMW のロック化を含めるかは裁定事項とする。
- **次段の裁定**: (1) 3 定義のどれを正準とするか — 定義 R と E は既存 e2e / integration テストで**矛盾して pin されており**、どの裁定でも既存テストの明示改訂が必然的に発生する（仕様判断であり実装判断ではない）、(2) live PID の over-age reap を heartbeat 付きで残すか除くか — 除く場合は wedge holder の回復手段を別途定義する必要があり、現行挙動は `amadeus-audit.ts:429-433` で意図的と文書化されている、(3) bucket 統一と UNLOCKED RMW のロック化を本 intent に含めるか繰り延べるか、(4) 2 つの Bolt を直列化するか — 生成面 12 コピーは分割しても衝突するため並行化の実益は限定的である。

## registry drift guard の業務境界（260802-registry-drift-guard、履歴、observed `64b44a9f8`）

- **目的**: [Issue #2037](https://github.com/amadeus-dlc/amadeus/issues/2037) の文書バックフィルとは分離し、CLI が実際に受理する verb とエラー時の `Valid:` 一覧、および stage schema が受理するフィールド集合と参照文書の機械レジストリを双方向に照合する。今回の価値は「欠落した3 verb／複数 field を個別に直すこと」ではなく、次の追加時に同型 drift を CI で止める再発防止にある。
- **現存する利用者影響**: `amadeus-state.ts` は 33 verb を dispatch する一方、未知 verb の診断は 30 verb しか列挙せず、`set-construction-iteration`、`archive`、`unarchive` を案内できない。stage field は実装が25件を受理するのに、権威ある仕様表は9件不足し、英日 Field reference は意図的に判断を要する9見出しだけを詳説する。このため「実装できるが発見・説明できない」契約が蓄積している。
- **成功境界**: 実装由来の集合を正とし、CLI dispatch ↔ `Valid:`、schema accepted fields ↔ 英日文書の machine registry を多集合・cardinality・空抽出拒否つきで比較する。negative tamper で dispatch-only、phantom help、docs omission、empty extraction が実際に赤くなることを要求する。
- **スコープ境界**: 生成済み harness 面を手編集せず `packages/framework` の正本と docs を直し、既存 `package.ts --check` / `promote:self:check` に投影整合を委ねる。Issue #2037 が求める文書本文の完全な補修、CLI UX 全体の再設計、stage schema の新フィールド追加は本 intent に含めない。
- **次段の裁定**: Field reference の全25件を H3 化するのではなく、全25件の機械レジストリを冒頭に置き、判断を要する既存H3を維持する案を推奨する。`stage-definition.md` の欠落9件と `when` の「reserved」記述、`t62` の stale 前提を同じ intent で是正するかは Requirements Analysis で明文化する。

## scope-grid 面間同期の業務境界（260802-scope-grid-face-sync、履歴、observed `47574fbab`）

- 判断: Issue #2033（クロスレビュー 2 名 CONFIRMED_WITH_REFINEMENTS 済み）の self-fix。利用者影響は「同じ scope を選んでも起動したハーネスによって実行ステージ列が変わる」こと — 2026-07-28 の self-feature lightening（4 ステージ SKIP 化）が `.claude` 1 面にしか着地せず、他 4 面は決定前の 18 ステージ路線のまま 4 か月運用された。公開契約の破壊的変更はなく、是正は決定済みの姿へ 4 面を揃える止血と、面間差分を検出する再発防止に閉じる。業務構造の変化は患部外（#2017 リネーム等）のみで、`architecture.md` 現在節と `re-scans/260802-scope-grid-face-sync.md` に委ねる。

## 2026-08-03 差分更新 — Issue #2018 projection parity 修復

- [Issue #2018](https://github.com/amadeus-dlc/amadeus/issues/2018) は PR [#2049](https://github.com/amadeus-dlc/amadeus/pull/2049) 後も残る配布欠陥である。PR #2049 は opt-in と起動時 self-healing を実装したが、Claude の plugin 関係 58 ファイルだけが tracked で、Codex／Cursor／OpenCode／Kimi の self-install 面には同等の commit 済み projection がない。
- 正しい利用者価値は、fresh worktree で初回起動前から選択済み plugin を利用でき、通常 startup が検証だけの no-op となって `git status` を汚さないこと。起動時 compose は欠損・drift の修復経路として残すが、通常の配布経路にはしない。
- 対象は root self-install 5面（Claude／Codex／Cursor／OpenCode／Kimi）と package 7 face。Kiro CLI／IDE は root dogfood 対象外の package-only で、共有 `.kiro` へ二重投影しない。

## formal-model-check 複数モデル化の業務境界（260801-tla-multi-model、履歴、observed `33e196b8`）

- 判断: 同根の 2 Issue（#1920 ESTABLISHED_WITH_REFINEMENTS / #1921 ESTABLISHED、クロスレビュー成立済み）を 1 intent で扱う self-feature。model-map v2 は複数モデルを登録できるが実行・照合・CI が FormalElection 固定のため、MirrorLifecycle を恒常 CI ジョブにできず（#1920）、MirrorLifecycleCore.tla 等の補助モジュールを identity pin に載せられない（#1921）。利用者影響は formal-model-check の検証対象が選挙モデル 1 本に閉じること。公開契約の破壊的変更はなく、aux は optional 追加で既存 identity 値を不変に保てる。

## no-silent-drop 静的ゲートの業務境界（260801-silent-drop-gate、履歴、observed `d72f60b5a`）

- 利用者価値: authored source の失敗が「空／ログのみの catch」「成否を返す API の戻り値破棄」「永続化を伴わない偽成功」の3 shape で無音化されることを、pull_request の blocking CI で新規混入時に拒否する。
- 対象: `packages/framework/core/`、`packages/framework/harness/`、`scripts/`。`dist/`、ルートの生成投影、テスト fixture は検査対象外とし、正本だけを数える。
- 移行契約: 既存違反は shrink-only baseline で債務として固定し、意図的な best-effort は「非空理由 + 直近1 AST node」の exemption に限定する。baseline と exemption は別台帳とし、新規増加を更新操作で受理しない。
- runtime 修正対象: #1878 の `persistBlocked` は永続化失敗を結果へ反映し、#1874 の `setCheckbox` / `setStageSuffix` は対象 slug 不在を成功相当に扱わない。
- 回帰保護: #1963 は [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) で修正済み。再実装せず、malformed section・decoy checkbox・invalid graph が loud failure になる既存契約を維持する。
- 成功境界: gate 単独で15秒以内、fixture 分類100%、偽陽性率5%以下。tool／rule／baseline の欠落・不正、zero scan、partial scan は型付き診断と非0 exit で fail-closed にする。

## kimi ハーネス bootstrap デッドロック修正の業務境界（260801-kimi-bootstrap-deadlock、履歴、observed `861688c31`）

- 判断: Issue #1922 単一バグの修正。kimi harness でアクティブ intent 無しのワークスペースを開くと `.current-session` が永久に書かれず、main conductor 認可が恒久 fail-closed となって初回起動がデッドロックする。利用者影響は kimi harness 利用者の初回起動不能（アクティブ intent 誕生後は自己解消）。修正は `writeCurrentSessionId` のガード前段への移動1点で、公開契約の変更なし。

## CG 計画整合ガードの業務境界（260801-cg-plan-guard、履歴、observed `cb809c4de`）

- 利用者価値: 計画（units-generation/delivery-planning）で合意した並行実行が CG で無音に直列化される事故（実測 18 intent 中4件）を engine が構造的に阻止。逃し弁は計画訂正のみ — 乖離理由が必ず成果物に残る。
- Delivery boundary: B1（判定基盤+#1893）→ B2（発行側+3部メッセージ）→ B3（approve 突合）→ B4（docs）。self-feature につき Bolt 1 は walking-skeleton gate 維持。
- 編入前提: #1893 はクロスレビュー2名成立後（進行中）。

## オープンバグ一括修正バッチ第5弾の業務境界（260801-open-bug-batch-5、履歴、observed `c49e385ac`）
## 価値チェーン3件の業務境界（260731-formal-verif-value-chain、履歴、observed `da51af375`）

file:line はすべて HEAD `16486d3c` 断面の実測。本 intent の業務目的は **formal-model-check を「実験の成果物」から「利用者が使える機能」へ引き上げること**。3 Issue はその価値チェーンの別々の切断点に対応する。

### 現状の価値チェーンと切断点

```
[実装を書く] → [仕様を書く] → [仕様と実装を結ぶ] → [検証を実行] → [結果を受け取る]
                                     ▲                                    ▲
                                     │ #1510 で切断                        │ #1738 で細い
                                     │（impl 変更後に model-map を         │（advisory は build-and-test
                                     │  正規手順で更新できない）            │  1点の stderr 1行のみ）
[配布する] ─────────────────────────────┘
     ▲
     │ #1829 で切断（実行器 54 本が repo の scripts/ に居座り、plugin として自立していない）
```

### 業務境界 1 — 配布自立化（#1829）

**利用者から見た問題**: plugin を install しても実行器が付いてこない。`plugins/formal-model-check/` の正本は `plugin.json` / `README.md` / `stages/` の3点のみで `tools/` は存在せず、stage 本文（`:12` frontmatter inputs、`:41` の `bun scripts/formal-verif/run-model-check.ts`）が**この repo の `scripts/` を前提にしている**。他プロジェクトへ配ると動かない。

**業務上の境界**:

| 判断 | 誰が決めるか |
| --- | --- |
| 群 A（16 本）を plugin 配下へ移すこと | 確定（#1829 の本旨） |
| 群 B（CI ラッパ 7 本）の帰属 — plugin か repo か | 要件段の裁定。CI（`ci.yml:584` / `:600`）が消費するため、字義どおり「16 抜き出し + 残余削除」は CI を壊す |
| 群 C（診断 1 本）の帰属 | 要件段の裁定 |
| 群 D（到達不能 30 本）+ 関連テストの削除範囲 | 要件段の裁定。本番からは死んでいるがテスト 72 本が参照する |
| manifest スキーマに `tools` を足す形 | 要件段の裁定（型 + parser + `composeWriteSet` + `ownedPaths` の4点が同時に動く） |

**利用者価値の最小単位**: 「install した plugin が単体で `--stage formal-model-check` を完走できる」。群 A のみの移設ではこれが成立するが CI が壊れるため、**群 B の扱いを決めない限り出荷可能な単位にならない**（`cid:intent-capture:ux-first-scope-for-distribution-intents` — 作り手都合の段階昇格ではなく利用者の最小実行可能単位から逆算する）。

### 業務境界 2 — 価値チェーン貫通（#1738）

**利用者から見た問題**: 検証機構は存在するが、ワークフローの中で「いつ・何を検証するか」が細い。

現状の貫通点は1つだけ:

- 発火は `build-and-test` ステージ直前の1回のみ（`amadeus-orchestrate.ts:1293` / `:1306`）
- 出力は stderr 1行（`:209` CHANGED / `:211` no recorded verdict）
- 未 compose なら完全沈黙（0-plugin zero-impact）
- 検証対象は `FormalElection`（選挙プロトコル）ただ1モデル

**多ハーネス化のギャップ**: compose は 1 回 = 1 ハーネスツリー（`amadeus-plugin.ts:377-380`、`:272-274` コメント）で、staging（`.amadeus-plugin-src`）も**実測で `.claude/` にしか存在しない**。7 ハーネスへ配るには 7 回別々に compose するか multi-host を新設するかの業務判断が要る。

**新モデル題材としての mirror lifecycle**: 25 ファイル / 12,174 行の mirror 群のうち骨格は types（608）+ reducer（823）に閉じ、有限ドメイン 10 種・遷移 21 種・終端 4・ガード 4 が全列挙可能。**既知の実バグ（[#1838](https://github.com/amadeus-dlc/amadeus/issues/1838) 重複 create、機序候補は `amadeus-mirror-coordinator.ts:230-244` の `intent-capture-approved` → `create` 固定）を検査できる不変量を最初のモデルに含めれば、「形式検証が実バグを捕まえた」という価値の実証になる。**

### 業務境界 3 — model-map 正規更新経路（#1510）

**利用者から見た問題**: 実装（`amadeus-election*.ts`）を直すと、次の検証実行が `SOURCE_DRIFT` で止まる（`tla-model-loader-internal.ts:232`）。ところが model-map を正規手順で更新しようとすると `MODEL_UNCHANGED` で拒否される（`amadeus-sensor-model-completeness.ts:650-659` — 判定は model/cfg identity のみ）。**手編集以外に前へ進む道がない。**

センサーは `matches`（`.claude/sensors/amadeus-model-completeness.md:8`）に `amadeus-election*.ts` を含むため**発火はする** — 発火して警告するが直す手段を提供しない、という業務上最も悪い形。

**業務価値**: これが塞がっている限り、「実装を直したら仕様との整合を機械で確かめる」という価値チェーンの根が使えない。#1829 で配布を自立させ #1738 で貫通させても、**#1510 が塞がったままなら利用者は最初の実装変更で詰む**。したがって3件の中で**利用者価値への影響が最も直接的**。

修正は依存追加を伴わず判定条件の対称化で足りるが、`.claude/sensors/amadeus-model-completeness.md:39-41` が MODEL_UNCHANGED 拒否を**仕様として記述している**ため、文書改訂を同一変更に含める必要がある（`cid:code-generation:same-root-inventory`）。

### 分割と出荷単位

| Bolt 候補 | 対象 | 単独で利用者価値を持つか |
| --- | --- | --- |
| #1510 | 更新判定の対称化 + 文書改訂 | **持つ**（詰みが解ける） |
| #1738 | advisory の貫通 + 新モデル題材 | 持つ（検証対象が増える） |
| #1829 | 実行器移設 + manifest 拡張 | 群 B の帰属確定が前提 |

**共有ソースファイルはゼロ**であり並行実装できる。交差するのは `tests/.complexity-baseline.json` と `tests/.coverage-patch-allowlist.json` の2台帳のみ（#1829 の移設で行シフトが確実に起きる）。1 Issue = 1 Bolt = 1 PR の境界を維持し、台帳を触る #1829 の着地順序だけを調整する。

### 検証姿勢との整合

`cid:build-and-test:two-layer-verification-posture` は「日常 CI は PBT/unit/integration、並行プロトコルの spec 変更時のみ形式モデルの完全探索を専用ジョブで」と定める。現行の `ci.yml:547` の `workflow_dispatch` 限定はこの姿勢の配線であり、本 intent は**この姿勢を変えずに、その手前（配布・貫通・整合）を通す**ことを業務範囲とする。PBT 単独では取りこぼす欠陥クラスが実測されている（`cid:build-and-test:pbt-oracle-cancellation` — 7 欠陥中 4 件をオラクル相殺で恒久見逃し）ため、mirror 題材でも形式モデル側の価値が期待できる。

## オープンバグ4件の業務境界（260731-open-bug-batch-4、履歴、observed `6e7a9d701`）
## perf 検証の CI 分離が扱う業務境界（260731-perf-ci-separation、履歴、observed `da51af375`）
## オープンバグ一括修正バッチ第5弾の業務境界（260801-open-bug-batch-5、履歴、observed `c49e385ac`）

- 利用者影響の序列: P1 2件（#1838 mirror 境界の順序逸脱、#1860 workflow 完了の恒久ブロック — 製品内回復手段なし・state 手術でのみ回復した実績）が最優先。P2 4件（#1846 set-autonomy 不能、#1849 合成後 intent の report 拒否、#1856 偽 green リスク、#1861 main 偽赤15%+ダッシュボード stale、#1863 plugin セル無音消失）。P3 2件（#1857 latent、#1864 台帳1行）。
- Delivery boundary: 5 Bolt =5 PR（Bolt 1: #1838+#1860 → Bolt 2: #1846+#1849 → Bolt 3: #1856+#1857 → Bolt 4: #1863+#1864 → Bolt 5: #1861）。優先度が高いものから着地する（ユーザー指示 2026-08-01）。
- 除外: #1829（plugin 配布、別 intent）、#1830 path B（別 intent）。#1864 の同型21件は #1622（P1）の材料としてコメント提供済み。

## OTel メタ情報スキーマ実装の業務境界（260801-otel-meta-schema、履歴、observed `9c8df859e`）

本節の file:line はすべて observed `9c8df859e` 時点（`cid:reverse-engineering:measurement-ref-in-artifacts`）。

### 何が解決される問題か

現在のテレメトリは「何が起きたか」を記録するが「**どの条件下で**起きたか」を記録しない。resource は `service.name` と `telemetry.sdk.language` の2キーのみ（`tracer-provider.ts:137`）で、ログ行にはハーネス名もモデル名も git 断面も載らない。

結果として答えられない問い:

- 「この失敗は特定のハーネス固有か」 — `amadeus.harness` が無い
- 「モデルを変えてから増えた失敗か」 — `gen_ai.request.model` が無い
- 「どのコミット断面で走った結果か」 — `vcs.ref.head.*` が無い。チームのノルムは成果物に測定 ref を書くことを求めている（`cid:reverse-engineering:measurement-ref-in-artifacts`）が、テレメトリ側に同じ規律が及んでいない
- 「同一 intent を複数セッションが並走で触った切り分け」 — `session.id` が無く、監査行の `amadeus.session.started` も `Source` しか持たない（`event-registry.ts:245-253`）
- 「サブエージェントが起動したが完了報告なく落ちたか」 — 完了イベントのみ観測（`amadeus.subagent.completed`）で、開始側の発火点が存在しない
- 「バグの一次証拠であるスタックトレース」 — `recordException` が `exception.message` のみを載せ `err.stack` を捨てている（`tracer-provider.ts:155-156`）

### 利用者への価値

| 受益者 | 得られるもの |
|---|---|
| バグ修正を行うチーム | スタックトレースと git 断面が一次証拠として保全され、再現条件の特定が短縮される |
| 運用・ノルム保守 | ハーネス別・モデル別の失敗率が測れ、ノルムの実効性を発生率で監視する既存運用（ローリング PM のバグトレンド報告）に定量的裏付けが付く |
| conductor | サブエージェントの「起動したが無応答」を構造的に検知できる。現在は `cid:code-generation:disk-evidence-early-takeover` のようにディスク上の兆候から人が推測している |
| 外部ダッシュボード利用者 | OTel GenAI semantic conventions 準拠のため、Grafana 等の既製 GenAI ダッシュボードがそのまま使える（#1868 設計原則1 が独自語彙を禁じる理由） |

### 業務上の制約とプライバシー境界

- **ユーザー個人情報系は意図的に除外**（#1868 v1 完成宣言）。redaction 方針との整合を優先し、識別性より安全側に倒す判断
- `host.name` はホスト名（環境によりユーザー名を含みうる）。ローカルの監査シャード名には既に含まれている（`amadeus-lib.ts:4277` が正規化して使用）が、**OTLP 送出は機外へ出す行為**であり露出面が異なる。resource が現在ローカルストアで redaction を通っていない構造（`local-span-exporter.ts:88-99`）と併せて、送出境界の扱いは要件として明示すべき事項
- スタックトレースは絶対パス（ホームディレクトリ = ユーザー名等）を含む。#1868 §4 がリポジトリルート相対への書換えを求めるのはこのため
- `Purpose`（§5 の dispatch 要約）は自由文であり、長文プロンプトの流入を防ぐため1行制限が要件に置かれている
- **チームノルムの Mandate**: 「telemetry の export 境界でも redaction filter を通す — write-time のみの redaction に留めない」（`cid:practices-discovery:export-boundary-redaction`）。#1868 の新属性群はこの二層要件の適用対象

### スコープの境界

- **log attributes は変更なし**（§3）。event-registry の required/optional 全数管理を正とする既存統制を維持する
- 属性追加の統制は「本 Issue のスキーマを正とし、逸脱追加は Issue の改訂を経る」（設計原則5）— log の registry fail-closed に対し、resource / span は**文書による統制**であり機械ガードは v1 の範囲外
- 取得不能なメタは省略（fail-open）。取得失敗が emit を止めることはない — テレメトリが業務フローを塞がない既存の分類線（telemetry は fail-open、canonical は fail-closed）と一致

### 関連 Issue

#1672（着地済み親 — registry / canonical emit 経路の確立）、#1803（SpanExporter スロット）。

## perf 検証の CI 分離が扱う業務境界（260731-perf-ci-separation、履歴、observed `da51af375`）

本節の file:line はすべて observed `da51af375` 時点（`cid:reverse-engineering:measurement-ref-in-artifacts`）。

### 解こうとしている問題

perf/ベンチマーク検証が PR ブロッキングの日常 CI に同居しているため、(a) 負荷感受性のある予算が競合ランナー上で評価され偽赤を生み、(b) 同じ integration tier が1 PR あたり最大3回（`tests` / `coverage-head` / `coverage-base`）実行されて perf コストが多重に支払われる。直近の #1797（t259 の窓分離由来の偽赤、`20230b90d` で交互計測へ是正）と #1800（spawn 枯渇のリトライ seam、`7ec3e0eae`）は、いずれもこの同居がもたらした症状である。

### 利用者影響

| 利用者 | 現在の影響 |
| --- | --- |
| PR を出す全開発者 | 負荷起因の perf 偽赤で再実行・切り分けコストが発生する。最厳予算は `t269...performance.integration.test.ts:102` の 1ms 判定で、ランナー負荷に直接晒される |
| CI 資源の管理者 | integration tier が最大3回、加えて mirror ベンチマークが replica 3本 + aggregate（+ release gate）を消費する |
| perf 退行を検知したい人 | 現状の予算は日常 CI の許容ノイズに合わせて緩められる圧力を受ける。分離すれば専用条件下で厳しく保てる |

### 既に分離済みの境界（意思決定に効く事実）

- **e2e tier は既に PR ブロック外**: `tests/run-tests.ts:197-202` の `--ci` は smoke / unit / integration のみを立て、e2e は `--release` / `--all`（`:203-211`）にしか含まれない。
- **mirror distribution ベンチマーク鎖は既に非ブロッキング**: `distribution-release-gate`（`ci.yml:279`）は `ci-success` の `needs`（`:651-659`）に含まれず、さらに GitHub ruleset `18843917`（name `main`）の required status check は **`CI Success` 1件のみ**（2026-07-31 実測）。したがって de jure でもブロックしない。

この2点から、本 intent の実質的な対象は**スイート内 perf テスト**（t258 / t257 / t259 / t269 / t292 / t-plugin-stage-discovery）に絞られる。mirror ベンチマーク鎖については、残る論点は「ブロックするか」ではなく「毎 PR でランナー時間を使い続けるか」である。

### 出荷境界

`self-feature` スコープ。Bolt 単位で PR を切り、`main` へスカッシュマージする。[Pull Requests 一覧](https://github.com/amadeus-dlc/amadeus/pulls)


## オープンバグ4件の業務境界（260731-open-bug-batch-4、履歴、observed `6e7a9d701`）

本節の file:line はすべて observed `6e7a9d701` 時点（`cid:reverse-engineering:measurement-ref-in-artifacts`）。

### 利用者影響

| Issue | P/S | 影響を受ける利用者 | 症状 |
| --- | --- | --- | --- |
| #1811 | P1/S2 | テストスイートを回す全開発者（ローカル・CI 双方） | テスト終了後もプロセスが残留し、ホストのプロセス表と資源を蝕む。ライブ実測で**84本の残留**（全 PPID=1、1 launch = 7 role）。累積するとホスト負荷を押し上げ、他のテストを負荷起因で不安定にする |
| #1800 | P3/S3 | テスト失敗を調査する開発者 | 失敗時の出力が `expected 1, received -1` に留まり、signal 終了なのか spawn 失敗なのかが読めない。切り分けコストが直接発生する |
| #1797 | P3/S4 | CI を待つ全開発者 | 負荷変動で比 assert が偽赤になり、無関係な PR が塞がれる。実測 `2.5065` vs 閾値 `2.5`（マージン 0.26%） |
| #1816 | P3/S4 | mirror Issue を共有面として読むチーム・ステークホルダー | 完了した Intent の mirror Issue が `## Status: Running` のまま close される。**外部から見える面の情報が事実と食い違う** |

### 影響の質的な差

**#1811 は他3件の前提条件でもある。** 残留プロセスはホスト負荷そのものであり、#1800（spawn `EAGAIN` が第一容疑）と #1797（負荷変動による比のずれ）の発火確率を押し上げている。P1 の位置づけはこの波及効果を含む。

**#1816 だけがエンドユーザー可視である。** 他3件は開発者体験（DX）と CI 安定性の問題だが、#1816 は GitHub Issue という**共有面の正確性**の問題である。record を正本、Issue を一方向の共有ビューとする設計（`cid:requirements-analysis:intent-first-mirror-issue`）において、共有ビューが正本と食い違うことは設計意図の破れに当たる。

### Delivery boundary

4件を1 Intent で追跡し、**1 Issue = 1 Bolt = 1 GitHub Pull Request**とする。[Pull Requests 一覧](https://github.com/amadeus-dlc/amadeus/pulls)

| Issue | Bolt | 既存 open PR |
| --- | --- | --- |
| [#1811](https://github.com/amadeus-dlc/amadeus/issues/1811) | Bolt 1 | なし（conductor が起動前に実測、0件） |
| [#1800](https://github.com/amadeus-dlc/amadeus/issues/1800) | Bolt 2 | なし |
| [#1797](https://github.com/amadeus-dlc/amadeus/issues/1797) | Bolt 3 | なし |
| [#1816](https://github.com/amadeus-dlc/amadeus/issues/1816) | Bolt 4 | なし |

既存 open PR の棚卸しは `cid:reverse-engineering:c1-preexisting-pr-inventory`（バグ修正 intent の起動時に対象 Issue ごとの既存 PR を検査する）に従い実施済みで、**4件とも 0件**。前 intent（260730-open-bug-batch-2）で発生した「既存 PR を見落として再実装する」経路は本 intent では発生しない。

`self-fix` スコープのため walking-skeleton のセレモニーは適用しない（org.md § Walking Skeleton — 既存コードベースへのインクリメンタルな作業）。

### スコープ境界

**スコープ内**:

- #1811: テスト fixture の stub 設計と `afterEach` 掃引（本番非改変を推奨）
- #1800: 失敗系診断の対称化（必須）と spawn-error 限定リトライ（要件段で確定）
- #1797: 計測設計の是正。数値は負荷スイープ実測から導出
- #1816: **表示層に限定した**終端化

**スコープ外（要件段で明示的に申告する）**:

| 事項 | 理由 |
| --- | --- |
| #1800 の並列度制御 | 別課題。診断の是正で切り分け可能になった後に判断する |
| #1816 の「record 着地前 close」挙動 | PR #1689 の設計帰結であり `tests/integration/t361-amadeus-mirror-lifecycle-completion.integration.test.ts:262` で契約固定済み。**仕様裁定マター**（`cid:reverse-engineering:c1-pinned-behavior-ruling`） |
| #1811 の本番 supervisor 改変 | 本番は既に fail-closed 実装済み（`team-up-codex-safety-wait.ts:643`、`:561-582`）。改変すると生成面で #1816 と交差する |

**「再現しなかったので閉じる」は認めない** — #1800 は負荷条件依存で発火するため、再現不能時の受理条件を要件段で明示する（`cid:build-and-test:no-silent-scope-narrowing` — 要件・RAID が規定した検証項目を conductor 判断で先送りしない）。

### 前 intent からの継続

本区間（`3f73823b1..6e7a9d701`）で前 intent（260730-open-bug-batch-3）の3件が**全件着地した**。

| Issue | 着地 | 業務上の意味 |
| --- | --- | --- |
| #1773 | `25f54b066` | 未開票中の票が共有ファイル・`git status` から読めた blind 性の破れを解消。選挙の独立性という第一原理 P1 の実装面が回復 |
| #1772 | `75367ba67` | 投票者が設問文すら受け取れなかった状態を解消。判断に必要な情報が投票者へ届く |
| #1752 | `8a8abf567` | 指示に従った利用者が自分の成功で拒否される自己矛盾を解消 |

本 intent の4件はいずれもこれらと機構が重ならない。共有面の正確性（#1816）は #1752 と同じ mirror 領域だが、患部は表示層であり boundary 判定層ではない。

## オープンバグ3件の業務境界（260730-open-bug-batch-3、履歴、observed `3f73823b1`）

3件は「選挙の情報設計が投票者・非投票者の双方に対して誤っている（#1773 / #1772）」と「mirror の指示と受理条件が矛盾する（#1752）」の2系統に分かれる。所有機構は選挙層（`amadeus-election-*`）と mirror/engine 層（`amadeus-orchestrate.ts`）で完全に分離しており、1 Issue = 1 Bolt = 1 GitHub Pull Request を維持したまま並行実装できる（`cid:code-generation:c6` の非交差判定）。

### 利用者影響

| Issue | 誰が困るか | どう困るか | 深刻度の性質 |
| --- | --- | --- | --- |
| #1773 | 選挙を運用する全チーム（ソロモードの subagent 選挙を含む） | 未開票（collecting）中の全票本文 — 選択・GoA・留保・根拠 — が単一の共有ファイル `ledger.json` に平文で載る。voter subagent は選挙ディレクトリを直接読む運用のため、先行票が後続投票者から構造的に到達可能。さらに同ファイルは git tracked のため `git status` / `git diff` にも現れる（第2の露出面） | **独立性（P1・アンカリング防止）の基盤が崩れる**。blind 配布そのものは設計どおり機能しているのに、格納面から迂回できる |
| #1772 | 選挙の全投票者 | 配布ビュー（`DistributionView`）に設問文（question）が無く、選択肢は `label` のみ。起草者が書いた選択肢の説明（description）は parse 時に無音で捨てられる。投票者は「何を問われているか」も「各案が何を意味するか」も配布物から得られない | **投票の情報基盤の欠落**。無音 drop（fail-open、exit 0）のため起草者は説明が消えたことに気付けない |
| #1752 | `auto-mirror` を prompt モードで運用する利用者 | ask が「先に create を実行せよ」と指示するのに、その指示に従って create を実行してから report すると「offered choices と一致しない」と拒否される。自分の成功が拒否条件になる自己矛盾 | **指示と受理の矛盾**。boundary が前進せず、利用者は迂回手順を自力で発見する必要がある |

### 業務上の優先度所見

- **#1773 が最も性質が悪い。** 設計された配布面（`status` / `vote` 出力 / ShortNotification）は健全であり、blind lift（開票時の materialize）も設計どおり機能している。破れているのは**格納設計と配置**の2点だけで、ガバナンス上の「独立検証（P1）」がその2点で無音に空文化する。加えて blind 性を assert するテストが 0件のため、退行が検知されない。
- **#1772 と #1773 は同じ選挙層の情報設計だが方向が逆。** #1773 は「見えてはいけないものが見える」、#1772 は「見えるべきものが見えない」。同一 intent で扱うと `Election.parse` の write⇔read 対称性という共通の設計面を1度で棚卸しできる。
- **#1752 は #1791（本区間で着地）の後も残る。** 初回 create boundary の新設（`intent-initialized`）は auto モード優先の分岐であり、prompt モードは従来 ask 経路へ落ちるため再現経路がそのまま温存されている。「新機能が着地したから直った」と扱わない。

### Delivery boundary

3件を1 Intent で追跡し、1 Issue = 1 Bolt = 1 GitHub Pull Request。[Pull Requests 一覧](https://github.com/amadeus-dlc/amadeus/pulls)

`packages/framework/core/` を触るのは3件すべてで、いずれも `bun scripts/package.ts` による dist 7ハーネス再生成と `bun run promote:self` による self-install 面同期を伴う。ファイル単位では非交差（#1773 / #1772 = `amadeus-election-*.ts`、#1752 = `amadeus-orchestrate.ts`）だが生成面が競合するため、着地順は静的目録でなく実 diff で再評価する。

### 仕様裁定を要する2件（要件段へ持ち越し）

- **#1772 はテスト契約の明示改訂を伴う。** `tests/unit/t234-election-model.test.ts:190` が配布ビューのキー集合を verbatim 固定しており、`amadeus-election-model.ts:304-305` のコメント（`BR-2 pins the key set`）と型宣言と合わせて3重に固定されている。3重固定は「バグでない」ことの証明ではなく「変更に裁定が要る」ことの証明である（`cid:reverse-engineering:c1-pinned-behavior-ruling`）。
- **#1773 は方式裁定（格納分離 vs 通知抑制）が未決。** 修正面が大きく変わるため、実装着手前に確定する。

## オープンバグ5件の業務境界（260730-open-bug-batch-2、履歴、observed `c42ef4d77`）

5件は「フレームワークが自らの文書・契約どおりに動かない」という共通テーマを持つ一方、所有機構と同期対象ファイル集合が互いに重ならないため、1 Issue = 1 Bolt = 1 GitHub Pull Request を維持したまま並行実装できる。

### 利用者影響

| Issue | 誰が困るか | どう困るか | 深刻度の性質 |
| --- | --- | --- | --- |
| #1750 | `auto-mirror: auto` かつ Ideation を SKIP するスコープ（`self-fix` 等）で intent を回す利用者 | 共有面（mirror Issue）が Inception 完了まで作られず、intent 進行中の可視性が失われる。intent-first 運用（record を正本・Issue を共有ビューとする team.md ノルム）が最初の業務ステージ中は成立しない | 可視性の欠落。データ喪失はない |
| #1749 | phase boundary を書くすべての利用者・エージェント | governance protocol の指示どおり `[phase-boundary]-verification.md` を書くと engine が fail-closed で拒否する。正しい名前は運用知識（既決ノルム）でしか得られず、新規参加者・他ハーネス利用者ほど踏みやすい | 指示と実装の矛盾。約3週間、運用回避で迂回されていた |
| #1742 | 全ステージの実行者 | 非成果物（`memory.md`・`learnings-selections.json`）に対してセンサーが FAILED を出し、宣言済み成果物（`codekb/` 配下）には発火しない。**偽の赤と偽の緑が同時に出る** | 検証信頼性。advisory 契約のため exit code は 0 で、ワークフローは止まらないが判断を誤らせる |
| #1735 | codex ハーネスのソロモード利用者（`auto-solo-election: true` 設定済み） | 設定したはずの自動選挙が一度も発動しない。設計逸脱・ブロッカー・§13 学習選定の3類型が独立検証（P1）を経ずに単独判断で進む | ガバナンスの静かな不成立。設定が効いていないことが無音 |
| #1734 | `bun run promote:self` を実行する開発者（自己開発のみ） | self-install の scope-grid に無関係な144行 churn が出る。`promote:self:check` は sync と判定するため、churn の発生を事前検知できない | 差分ノイズ。現 HEAD では再現しないが潜在欠陥は残存 |

### 業務上の優先度所見

- #1742 は**偽の緑を含む**点で最も性質が悪い。宣言済み成果物への発火 0 は「センサーが通った」ではなく「センサーが対象外だった」であり、ゲート報告の verdict 判定を誤らせる（`cid:requirements-analysis:manual-sensor-fire-before-gate-report` の追補2が扱う既知ハザードの構造的原因）。
- #1735 は**ガバナンス層の不成立**であり、コードの正しさではなくチーム規範の執行に効く。auto-solo が発動しないまま進んだ intent では、本来独立検証されるべき判断が単独判断で確定している。
- #1749 は影響範囲が広い（全 phase boundary）が、既決ノルムによる運用回避が確立しているため実害は封じ込め済み。ただし運用回避の存在自体が負債である。
- #1750 は Issue 受入条件に「日英リファレンス + 全 harness 配布物同期」が含まれ、配布面の同期コストが最も大きい。
- #1734 は自己開発面のみに閉じ、利用者配布物に影響しない。

### Delivery boundary

5件を1 Intent で追跡し、1 Issue = 1 Bolt = 1 GitHub Pull Request。[Pull Requests 一覧](https://github.com/amadeus-dlc/amadeus/pulls)

`packages/framework/core/` を触るのは #1735（protocol md）・#1742（hook ts）・#1750（tools ts）の3件で、いずれも `bun scripts/package.ts` による dist 7ハーネス再生成と `bun run promote:self` による self-install 同期を伴う。ファイル単位では非交差だが生成面の再生成が競合するため、着地順は実 diff で再評価する（`cid:code-generation:c6`）。#1749（散文のみ）と #1734（`scripts/` のみ）は独立で先行着地できる。

## SKILL/reviewer 2件の業務境界（260730-skill-reviewer-fixes、履歴、observed `278d61d8e`）

測定 ref: observed `278d61d8e`。

本 intent は2件のバグ修正であり、業務ドメイン・利用者集合・提供価値の境界そのものに変更はない。両件はいずれも「フレームワークが自分の指示どおりに動かない」クラスの欠陥で、利用者から見た影響面が異なる。

| Issue | 利用者から見た症状 | 影響を受ける利用者 | 修復される価値 |
| --- | --- | --- | --- |
| [#1736](https://github.com/amadeus-dlc/amadeus/issues/1736) | 稼働中の intent と並行して新しい作業を始めたいと申し出て CONFIRM したとき、SKILL.md の指示どおりに実行すると未知 verb でコマンドが失敗する（`amadeus-utility.ts` に `next` は存在しない） | claude / codex / kimi / kiro / kiro-ide の5ハーネス利用者。cursor / opencode は SKILL.md を持たず command 面が正しいツールを指すため影響なし | new-work offer から2本目の intent を birth する経路が指示どおりに通ること。経路の実装（`amadeus-orchestrate.ts:2405`）は既に健全で、直すのは散文のツール名のみ |
| [#1711](https://github.com/amadeus-dlc/amadeus/issues/1711) | units-generation を SKIP するスコープ（`fix` / `refactor` / `chore` / `security-patch` / `infra` / `poc` および dogfood の `self-*`）で code-generation のレビュー段が `required review artifact is missing: …/construction/{unit-name}/…` で exit 1 する | 上記スコープを使う全利用者。軽量スコープ（バグ修正・リファクタ）は最も日常的に選ばれる経路であるため影響は広い | レビューゲートが構造的に成立すること。現状は conductor の手作業回避（実 unit 名へ解決した directive を渡す）に依存しており、その回避自体が `stage-protocol.md:898` の「unchanged directive JSON」規定からの逸脱である |

### Delivery boundary

2件を1 Intent で追跡し、**1 Issue = 1 Bolt = 1 GitHub Pull Request**とする。両件は所有コンポーネントが完全に分離しており（#1736 = harness SKILL.md の散文、#1711 = core engine + reviewer 層）、同期対象ファイル集合も重ならないため並行実装が可能である。

### 本 intent 自身が当事者である点

本 intent は `self-fix` スコープで走る。`self-fix` は units-generation を SKIP する（scope-grid 実測）ため、**#1711 の患部経路を自ら通る**。すなわち本 intent の code-generation ステージのレビューは、修正対象のバグの影響下で実行される。

## Open bug 6件の業務境界（260729-open-bug-batch、履歴、observed `22ee27dbe`）

Amadeus は、AI-DLC の Intent を決定的なステージ遷移、監査証跡、隔離された Bolt、複数ハーネスへの同等配布で実行する Bun/TypeScript の CLI 製品である。本 intent は新機能を追加せず、開発者と運用者が「成功」と判断する6つの信頼境界を修復する。6件は1つの `amadeus-bugfix` Intent で追跡する一方、変更・回帰テスト・レビュー可能性を分離するため **1 Issue = 1 Bolt = 1 GitHub Pull Request** とする。作成後の各 Pull Request は [amadeus-dlc/amadeus の Pull Requests](https://github.com/amadeus-dlc/amadeus/pulls) から個別に追跡する。

| Issue | 利用者が失っている信頼 | 回復する業務成果 |
| --- | --- | --- |
| [#1667](https://github.com/amadeus-dlc/amadeus/issues/1667) | book-pack の検証が並列 CI 負荷下でテスト自身の制限時間に先に殺される | pack drift guard の成否を verifier の実結果で判断できる |
| [#1664](https://github.com/amadeus-dlc/amadeus/issues/1664) | t224 の間欠失敗が status しか示さず、原因調査に必要な stdout/stderr を失う | migration/doctor 境界の失敗を再現時に診断できる |
| [#1663](https://github.com/amadeus-dlc/amadeus/issues/1663) | Team Mode の並列 checkout が個別失敗を集約せず、最終走査だけで成功判定する | 失敗メンバーと失敗理由を欠落なく報告できる |
| [#1662](https://github.com/amadeus-dlc/amadeus/issues/1662) | patch coverage の diff と LCOV が異なるソース断面を測りうる | 同一 snapshot に対する coverage 判定を保証できる |
| [#1336](https://github.com/amadeus-dlc/amadeus/issues/1336) | safety-wait の起動完了を固定50msと PID 生存で推定し、初期化前終了を成功扱いしうる | supervisor の readiness を明示的に確認できる |
| [#1607](https://github.com/amadeus-dlc/amadeus/issues/1607) | final report が Intent を complete・audit seal・cursor release した後に mirror completion boundary が走るため、最終同期を永続化できない | workflow 完了、mirror 最終同期、audit seal を単一の完了トランザクションとして閉じられる |

### 価値境界と順序制約

- #1667 / #1664 / #1663 は「間欠失敗の原因を推測で閉じない」ことが価値である。診断出力の追加だけで製品根因を修正済みとは扱わず、再現テストから原因を確定する。
- #1662 / #1336 / #1607 は成功判定の原子性・同一性・readiness を回復する整合性修正であり、成功条件を最終ファイル存在や固定 sleep で代用しない。
- #1336 と #1663 は同じ `team-up.sh` を変更するため直列に扱い、readiness の基盤を先に直す。#1662 と #1667 は主ファイルが分離しており、独立 Bolt として並行可能である。
- 進行中の OTel Intent [#1679](https://github.com/amadeus-dlc/amadeus/issues/1679) は audit/journal/state の完了経路と交差する。#1607 は Construction 前の必須前提、#1664 は Journal v2 の診断契約確定前に着地させるのが安全である。

## OTel/observability upstream イニシアチブの業務境界（260729-otel-upstream、履歴、observed `22ee27dbe`）

Amadeus の業務目的・利用者ジャーニー・公開機能に変更はない。本 intent は [GitHub #1672](https://github.com/amadeus-dlc/amadeus/issues/1672) の OTel/observability upstream イニシアチブを扱い、長期的な利用者価値は「監査・観測データを OpenTelemetry の標準エコシステム（OTLP collector / Jaeger / 任意の OTLP バックエンド）へ一本化して届ける」ことにある。ただし現行コード（observed `22ee27dbef9027203658a6cd98bf97501c4b222c`、base `ca8ff0af40d6250edffe42246d3f5538819c22af`（祖先 exit 0）、距離 **13**）では **OTel API ファミリはまだ一切導入されていない**（`package.json` / `bun.lock` の `@opentelemetry` grep ヒット 0）— 現状は Issue #1628 の 3 Phase が築いた「ゼロ依存 OTLP/HTTP JSON」構成であり、#1672 の置換（audit writer → OTel EventRecord→AuditLogExporter、`observe()` / `observeSubprocess()` → Trace API spans、otel-projector の pure OTLP relay 化）は**すべて未着手の将来計画**である。本 scan は将来差分の基点として現行断面を固定するもので、コード変更を伴わない。区間では別系統の価値として GitHub Projects ボード連携（mirror-project サブシステム 9 モジュール新設）と intent 選択ロジックの分離（`amadeus-intent-selection.ts`）が着地し、前 intent `260728-slop-cleanup` の修正（journal コメント是正・未使用フィールド削除）も本 HEAD に含まれる。直後の `260728-slop-cleanup` 断面は履歴として保持する。

## Slop cleanup の業務境界（260728-slop-cleanup、履歴、observed `ca8ff0af4`）

Amadeus の業務目的・利用者ジャーニー・公開機能に変更はない。本 intent は、現行挙動を変えずに、誤った移行コメント、状態を二重表現する未使用フィールド、Markdown の空白ノイズを除く内部品質修正である。対象は 5 パス・3 カテゴリに限定し、新機能、API 変更、データ移行、外部サービス操作を伴わない。`v0.1.6`（`68f2d6699ccb8148c0427b1ff56d37116e565f89`）から observed `ca8ff0af40d6250edffe42246d3f5538819c22af` までの 47 コミットを現行断面の確認材料としたが、旧 codekb observed `afb93a825...` は現 HEAD の祖先ではないため差分 base には採用していない。直後の `260727-plugin-verb-skills` 断面は履歴として保持する。

### 履歴: 260727-plugin-verb-skills

> **2026-07-28（intent `260727-plugin-verb-skills`、amadeus-feature / Brownfield）: plugin 導入 UX の信頼性は #1596 バッチで回復した。本 intent の価値は「その導入 UX の CLI 面・スキル面をどこまで利用者に届けるか」（測定 ref: observed `afb93a825917220660a3d9bbfdb23d83474b94a6`、base `0c4709102`（祖先 exit 0）、距離 **16**）。** 前 intent が「未解消の 4 Issue」として記録した業務上の欠陥は**いずれも本区間 `f1d561904`（[PR #1596](https://github.com/amadeus-dlc/amadeus/pull/1596)）で解消済み**である — **#1585** 0 件ホストで `doctor` が無言だった体験は解消（standalone も `Plugins: 0 installed` を返す）、**#1586** `drop` が痕跡を残しながら「baseline restored」と宣言する体験は解消（FS 実測の合議へ）、**#1575** 配布境界を壊しうる定数二重定義は canonical の import へ一本化、**#1589** 導入体験そのものが未検証だった構造は `t341` の conformance journey と専用 blocking CI ジョブで封鎖。あわせて **#1591 裁定 B** で「CLI が書く先」と「エンジンが読む先」がハーネスディレクトリへ統一され、**#1592** で compose 後の 2 段 recompile により合成ステージが実際に到達可能になった。加えて区間には **v0.1.6 リリース**（`68f2d6699`）と docs 同期 3 本（#1584 / #1587 / #1600）が含まれる。**本 intent が扱う業務課題**は、回復した導入体験の「入口」の使い勝手である — (a) plugin CLI は 4 動詞（`compose` / `doctor` / `drop` / `status`）で `install` を持たず、利用者は「バンドルを `.amadeus-plugin-src/` へ置く」手作業と CLI 実行の 2 手を踏む (b) plugin CLI は統合 CLI（`amadeus-utility`）から到達できず、利用者は `bun <harnessDir>/tools/amadeus-plugin.ts <verb>` を直に叩く必要がある (c) 他の運用機能（mirror / election）はユーザー起動スキルとして届けられているのに、plugin にはスキル面が無い。**利用者価値は「plugin 操作を他の運用機能と同じ導線（統合 CLI 動詞 / スキル）へ載せ、導入・撤去の敷居を下げること」に閉じ、plugin 機能そのものの仕様追加はスコープ外**。なお運用上の残存リスクとして [#1598](https://github.com/amadeus-dlc/amadeus/issues/1598)（compose 済みホストで stage-runner ドリフト検査が exit 1 になる）があり、これは plugin を導入した利用者だけが踏む — 本 repo では構造的に再現しない。詳細は本 scan の `architecture.md` / `code-quality-assessment.md` 新節。

> **2026-07-27（intent `260727-e2e-plugin-conformance`、Issue #1575 / #1585 / #1586 / #1589、Brownfield）: 業務境界に変化なし。提供機能「plugin 導入 UX」の品質保証面に 4 件の欠落・欠陥（測定 ref: observed `0c4709102cfa1d13e5aca6b49c65f31a903d72f2`、base `1673c433209c74820881c75a0816bbce3fb2d512`（祖先 exit 0）、距離 **60**）。** 本区間で plugin ホスト配信（#1554 walking skeleton、#1568 全 7 ハーネス面追従）と第 7 ハーネス Kimi Code が着地し、利用者は「install バンドルを `.amadeus-plugin-src/` へ置く → SessionStart / `compose` でホストへ合流 → `doctor` で確認 → `drop` で撤去」という導入体験を得た。本 intent が扱う 4 件の業務上の含意は次のとおり。**#1585**: 0 件のホストで `doctor` が完全に無言（exit 0 / stdout 0 バイト）となり、利用者は「壊れているのか、0 件なのか」を判別できない（統合 doctor は「Plugins: 0 installed」と表示するため面ごとに体験が食い違う）。**#1586**: `drop` が「baseline restored」と宣言しながら空ディレクトリ 3 階層を残す — 撤去したはずのプラグインの痕跡が残る、という信頼を損なう体験。**#1575**: 内部の定数二重定義で利用者影響は現時点で顕在化していないが、7 面パッケージ / 5 面セルフインストールの境界が壊れると配布物の欠落・過剰として顕在化しうる。**#1589**: 上記 3 件をどのテスト層も検出できなかった構造的理由（plugin の e2e 検証が 0 件、`git ls-files tests/e2e/ | grep -c plugin` = 0）— すなわち **導入体験そのものが未検証のまま出荷されている**ことが本 intent の中心価値。利用者価値は「plugin 導入体験の信頼性回復と、それを守り続ける検証面の獲得」に閉じ、plugin 機能の仕様追加はスコープ外。詳細は本 scan の `architecture.md` / `code-quality-assessment.md` 新節。

> **2026-07-27（intent `260727-install-doc-mismatch`、[Issue #1569](https://github.com/amadeus-dlc/amadeus/issues/1569)、amadeus-bugfix / Brownfield）: 業務境界に変化なし。ただし提供機能「plugin 導入 UX」に案内誤りが混入（測定 ref: observed `46a75f2e7c53aaa475a19cc217d10c9172ad4129`、base `0d83aa48b`、距離 70）。** 本区間で前 intent `260726-plugin-host-delivery` の plugin ホスト配信（プラグインを 7 ハーネス面へ install bundle として配布し、`compose` でホストへ合流させる導入体験）が着地した。#1569 の業務上の含意は、**その導入手順ドキュメント（INSTALL.md / 19-plugins ガイド）がユーザーに誤ったコピー先を案内している**こと — doc は `<harness-dir>/plugins/<name>/` へ置けと言うが、CLI discovery が実走査するのは `.amadeus-plugin-src/<name>/` であり、doc どおり置くとプラグインが検出されず compose されない（ユーザーが導入に失敗する）。ユーザー裁定 A により **CLI discovery を正**とし、doc 側を `.amadeus-plugin-src/<name>/` へ是正する。提供機能そのもの（plugin 配布・compose）は正しく動作しており、修正は導入ガイダンスの整合に限る。詳細は本 scan の `architecture.md` 新節。

> **2026-07-27（intent `260727-docs-impl-sync`、amadeus-document / Brownfield）: 業務ドメインに構造変化なし。ただし利用者が最初に読む面の記述が実装から乖離していると判明。** 測定 ref: observed `aabc0527d`、base `1673c4332`（祖先 exit 0 / 距離 **47**）。本 intent は機能を追加せず、**docs と実装の乖離の同期**を扱う。業務上の含意は「利用者が受け取る製品像の正確性」に閉じる — `README.md` / `README.ja.md` は Amadeus が **6 ハーネスで動く**と宣言するが実態は **7**（Kimi Code が区間内 #1522 で着地、`grep -ci kimi README.md` = 0）、`docs/guide/19-plugins.{md,ja.md}` は plugin が **6 面へ投影・4 面へセルフインストール**と説明するが実態は **7 / 5**、JA 側 4 ファイルは hook が **11 個**と記述するが実態は **12**。これらは製品の**採用判断に直接影響する数値**（自分のハーネスがサポートされているか）であり、特にクラスタ B は kimi を面リストから欠落させているため「Kimi ではプラグインが使えない」と誤読されうる。加えて JA 読者だけが 12 番目の hook（plugin 自動合成）の存在を知り得ない情報格差が生じている。利用者価値は「製品説明の正確性の回復」と「EN/JA 読者の情報等価性の回復」に閉じ、機能・CLI 契約の変更はスコープ外。詳細は `code-quality-assessment.md` / `architecture.md` / `code-structure.md` / `component-inventory.md` の同 intent 節、および `re-scans/260727-docs-impl-sync.md`。

> **2026-07-27（intent `260726-answer-manual-binding`、[Issue #1548](https://github.com/amadeus-dlc/amadeus/issues/1548) bug、amadeus-bugfix / Brownfield）: 本 intent 断面は対象外（ビジネス面に変化なし）。** 測定 ref: observed `ad1ff5de9`、base `09c669901`、距離 2。区間 2 コミットは record-only で mirror answer/guard スタックの source 変更ゼロ。#1548 は mirror lifecycle の **manual-boundary ask への answer 不成立**（`amadeus-mirror-lifecycle.ts:969-985` の転送欠落 + guard `:257-265`）という内部欠陥で、業務価値・利用者ジャーニーの新設はない。影響は「manual create 後に prompt 化した ask を answer で承認/skip できず、以後の create/sync/close prompt が safety-blocked で塞がりうる」信頼性面に限る。詳細は上流入力 `re3-dev-scan-result.md` と本 scan の `architecture.md` / `code-quality-assessment.md` 新節、`re-scans/260726-answer-manual-binding.md`。

> **2026-07-27（intent `260726-t258-p95-flake`、[Issue #1511](https://github.com/amadeus-dlc/amadeus/issues/1511) bug/P2/S3-MAJOR、amadeus-bugfix / Brownfield）: 業務境界に変化なし。** 測定 ref: observed `09c669901`、base `f9a0fb86a`、距離 2。区間 32 ファイルはすべて `amadeus/` record で source/test 変更ゼロ。本 intent は新機能を持たず、CI 性能契約テスト（`t258` の絶対 p95 予算 500/750ms）が共有ランナーのジッタで偽赤になるフレークの修正である。業務上の含意は**開発者体験・パイプライン信頼性の回復**（偽赤による再実行コストと真の退行の見落としリスクの除去）に閉じ、ユーザー可視の機能・契約は不変。詳細は上流入力 `re2-dev-scan-result.md` と本 scan の `code-quality-assessment.md` / `architecture.md` 新節、`re-scans/260726-t258-p95-flake.md`。

> **2026-07-26（intent `260726-mirror-state-split`、[Issue #1547](https://github.com/amadeus-dlc/amadeus/issues/1547) + [Issue #1534](https://github.com/amadeus-dlc/amadeus/issues/1534)、amadeus-bugfix / Brownfield）: 業務境界に変化なし。ただし auto-mirror の状態追跡が構造的に不成立と判明（測定 ref: observed `f9a0fb86a`、base `1673c4332`、距離 38）。** 本 intent は新機能を持たず、同根の既存バグ 2 件の修正である。業務上の含意は、**Intent record → GitHub Issue ミラー同期の状態追跡が破綻している**こと — lifecycle が Issue を作成しても status/orchestrate は「ミラー未作成」と見なし続け（write=v1 ブロック ⇔ read=legacy field の分裂、#1547）、毎境界で重複 create を促す。加えて過去 legacy 経路で生成された 10 record は ownership marker を持たず in-tool 復旧経路がゼロ（#1534）。`cid:requirements-analysis:intent-first-mirror-issue` が定める「record を正本、ミラー Issue を共有面とする」運用のうち、共有面の状態同期が base 以前から成立していない状態が継続している（fail-closed 側の設計どおり record 正本は無影響、workflow も停止しない）。利用者価値は「ミラー状態の正確な追跡の回復」と「取り残された legacy Issue の救済経路の提供」に閉じ、ユーザー可視の CLI 契約変更は本来スコープ外。ただし legacy field への互換書き戻しは org.md Forbidden（要求なき互換シム禁止）との照合が要る。詳細は上流入力 `inception/reverse-engineering/scan-notes.md`。

> **2026-07-26（intent `260726-mirror-envelope-lf`、[Issue #1498](https://github.com/amadeus-dlc/amadeus/issues/1498) P1/S2、amadeus-bugfix / Brownfield）: 業務境界に変化なし。ただし提供機能 1 つが実環境で全面不成立と判明（測定 ref: observed `e39402224`、base `1673c4332`、距離 27）。** 本 intent は新機能を持たず、クロスレビュー 2/2 成立済みの既存バグ 1 件の修正である。業務上の含意は、**auto-mirror（Intent record → GitHub Issue の一方向同期）が create / find / view / edit / close の 5 verb すべてで機能していない**こと — 症状は `GitHub unavailable (invalid-response; no-effect-confirmed; exit=0; http=none)`。`cid:requirements-analysis:intent-first-mirror-issue` が定める「record を正本、ミラー Issue を共有面とする」運用のうち、共有面の自動同期が成立していない状態が base 以前から継続している（fail-closed 側の設計どおり record は無影響、`ALWAYS continue the workflow after GitHub … failures` に従い workflow も停止しない）。区間 27 コミットで着地した価値は前 intent のバグ 6 修正（election の検証健全化、audit の fail-closed、plugin discovery の堅牢化、distributed timeline の記録）と CI・metrics 面であり、mirror 面の価値は本 intent で回復させる。詳細は上流入力 `inception/reverse-engineering/scan-notes.md`。

> **2026-07-26（intent `260726-crossreviewed-bug-batch`、クロスレビュー済みバグ7件、amadeus-bugfix / Brownfield）: 業務境界に変化なし（測定 ref: observed `1673c4332`、base `e12259ba7`、距離 2）。** 本 intent は新機能を持たず、クロスレビュー2名成立済みの既存バグ7件（#1489 / #1457 / #1377 / #1459 / #1462 / #1458 / #1388）の修正バッチである。利用者価値は「偽赤 CI ゲートの解消」「選挙記録の検証実効性の回復」「監査シャードの不変条件保護」「plugin 探索のスキーマ契約遵守」に限られ、ユーザー可視の契約変更は本来スコープ外。ただし #1458 の一方の案（既定 transport 廃止）と #1388（FR-6 既決の変更）は仕様変更に当たりうるため、着手前に性格判定が要る。詳細は上流入力 `inception/reverse-engineering/scan-notes.md`。

> **2026-07-26（intent `260726-metrics-visualization`、amadeus-feature / Standard）: 変更なし、確認済み（測定 ref: observed `1c43438df`、base `11f1ad61f`、距離 5）。** 業務ドメイン（AI-DLC 自己ホスト開発）に構造変化なし。本 intent は既存 `metrics/` スナップショット（**123 件**、2026-07-12〜07-25）の可視化機能の追加であり、利用者価値は「蓄積済みの品質メトリクス時系列を人が読める形で見られるようにする」という**開発者体験の内部品質**に閉じる。エンドユーザー向けの業務ドメイン・機能面には影響しない。**ただし現状 `docs/` に metrics 系の言及が 0 ファイルであるため、可視化を出荷する場合は利用者向けドキュメント（日英ペア）の新設が価値の一部になる。** 詳細は `architecture.md` / `code-structure.md` / `component-inventory.md` / `code-quality-assessment.md` の同 intent 節。
> **2026-07-26（intent `260726-grant-scope-gate`、[#1497](https://github.com/amadeus-dlc/amadeus/issues/1497)、amadeus-bugfix / Brownfield）: 最小追記（測定 ref: observed `e12259ba7`、base `11f1ad61f`、距離 4）。** 業務ドメイン（AI-DLC 自己ホスト開発）の構造に変化はない。区間で導入された solo standing grant（[PR #1483](https://github.com/amadeus-dlc/amadeus/pull/1483)）は「ソロモードでもステージゲートごとの人間承認を、一定範囲・一定期間の常任グラントで事前に済ませられる」という**運用効率面の価値**を追加したが、本 intent の #1497 はその価値が **composed scope（`amadeus-*`）では一度も届いていない**ことを扱う。ユーザー可視の症状は「グラントを発行したのに毎ゲートで承認を求められる」であり、fatal error ではなく無音の no-op である。加えて未報告の欠陥 B（walking-skeleton ゲートまでグラントが覆う）は、**チームが明示的に守ると宣言した安全境界の無音喪失**という逆向きの業務影響を持つ。詳細は `architecture.md` / `code-quality-assessment.md` の同 intent 節。

> **2026-07-26（intent `260725-worktree-ref-fixes`、[#1482](https://github.com/amadeus-dlc/amadeus/issues/1482) / [#1481](https://github.com/amadeus-dlc/amadeus/issues/1481) / [#1455](https://github.com/amadeus-dlc/amadeus/issues/1455)、amadeus-bugfix / Minimal）: 変更なし、確認済み（測定 ref: observed `11f1ad61f`、base `ec624022f`、距離 10）。** 業務ドメイン（AI-DLC 自己ホスト開発）に構造変化なし。本 intent が扱う3欠陥はいずれも**開発者体験の内部品質**に閉じる — worktree セッションで hook が本線 state を読むこと（#1482）と、worktree で3 integration スイートが常時赤になること（#1481 / #1455）。エンドユーザー向けの業務価値・機能面には影響しない。詳細は `architecture.md` / `code-quality-assessment.md` の同 intent 節。

> **2026-07-25（intent `260725-teamup-launch-hardening`、[#1476](https://github.com/amadeus-dlc/amadeus/issues/1476) / [#1478](https://github.com/amadeus-dlc/amadeus/issues/1478)、amadeus-feature / Standard）: 変更なし、確認済み（測定 ref: observed `4a0f91ad0`、base `ec624022f`、距離 9）。** 業務ドメイン（AI-DLC 自己ホスト開発）に構造変化なし。区間の実装面は既存 bash ツール `team-up.sh` の watcher 検証ガード（PR #1477）のみで、利用者価値は Team Mode 起動の信頼性と待ち時間に閉じる。本 intent も同ツール内の2改善（初期プロンプトの actas 移行 / worktree 並列作成）に閉じる。詳細は `architecture.md` / `code-quality-assessment.md` の同 intent 節。

> **2026-07-25（intent `260725-teamup-attach-latency`、[#1449](https://github.com/amadeus-dlc/amadeus/issues/1449)、amadeus-bugfix / Minimal）: 変更なし、確認済み（測定 ref: observed `ec624022f`、base `6d4df9056`、距離 125）。** 業務ドメイン（AI-DLC 自己ホスト開発）に構造変化なし。既存 bash ツール `team-up.sh` の起動レイテンシ（実測 200.85 秒）の解消に閉じ、利用者価値は Team Mode 起動の待ち時間短縮のみ。詳細は `architecture.md` / `code-quality-assessment.md` の同 intent 節。

## Issue #1466 solo standing grant（260725-solo-standing-grants、2026-07-25、履歴）

base `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`、observed `4491310cc0b432eb404524ef30a7d8a0a3f68f73`。[Issue #1466](https://github.com/amadeus-dlc/amadeus/issues/1466) は、solo 運用でも期限付き standing grant を承認源として使い、route 後・commit 前に失効／取消された場合はエラーを残さず通常の人間承認へ戻す利用者体験を検討する。standing grant は設定値ではなく、引き続き `GRANT_ISSUED` / `GRANT_REVOKED` 監査イベントから導出する。[PR #1468](https://github.com/amadeus-dlc/amadeus/pull/1468) は凍結試作で参考のみ、実装前提にしない。

現行 team flow は fresh `HUMAN_TURN` に基づく発行と `GRANT_ISSUED`、全 intent audit の失効・取消・provenance 探索、gate 適格性判定、必要時の `DELEGATED_APPROVAL`、lock 内認可、`GATE_APPROVED` / `STAGE_COMPLETED`、state advance から成る。solo は remote delegation を必要としないため、gate existence と authorization source を分離したまま route / commit 間の認可相関を追加することが課題である。exact Grant Id、opaque claim、commit-only 再探索、typed non-error fallback の選択は後続設計で裁定する。

## Issue #1466 の成功境界

commit 時不適格では `ERROR_LOGGED`、`GATE_APPROVED`、`STAGE_COMPLETED`、state advance を発生させない。phase boundary、walking skeleton、per-unit 最終 gate、issuer provenance、protected audit mint の既存不変条件と team delegation path は維持する。

## PR #1469 レビュー修正の業務境界（260725-mirror-review-fixes、履歴）

観測 HEAD は `70336937529f5be31c011de5d368c0f03e534506`、差分 base は `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`。

Amadeus は Git 管理された Intent record を正本とし、その進行状況を GitHub Issue へ一方向に反映する Mirror 機能を持つ。[PR #1469](https://github.com/amadeus-dlc/amadeus/pull/1469) は `off | prompt | auto` の自動モード、永続 receipt、provenance、repair、完了時 close を追加したが、レビューで安全保証を迂回または完了扱いを誤る6面が確認された。

- lifecycle の boundary/manual コマンドは、副作用が `pending`、`safety-blocked`、`suppressed` のままでも exit 0 を返す。呼出側が phase receipt を `completed` に進めるため、GitHub へ未反映の状態を完了済みにできる。
- 既定 `prompt` モードは durable `expectedPrompt` を保存して `ask` を返す一方、公開 CLI に approve/skip 回答経路がない。さらに回答型と `ask` outcome は保存済み `bindingId` を運ばず、approve は event/operation だけを照合し、skip はその照合も迂回するため、保存済み prompt binding と回答の一致を外部契約として証明できない。
- legacy `amadeus-mirror.ts create|sync|close` は lifecycle の permit、receipt、provenance、repair/close guard を通らず GitHub を直接変更する。
- config、state codec、coverage source 正規化には、それぞれ TOCTOU、未エスケープ制御文字、Cursor/OpenCode 投影の正準化漏れがある。

本 intent の成功条件は、上記6面を失敗する再現テストで固定し、外部契約を「未完了は非成功」「prompt 回答は保存済み binding と一致」「mutation は lifecycle 一経路」「読み取り・codec・coverage は fail-closed」に回復することである。巨大ファイル分割と gateway lexer 共通化は別の `amadeus-refactor` intent で扱う。

> **2026-07-25（intent `260725-kimi-harness`、amadeus-feature）: 変更なし、確認済み。** 新ハーネス「kimi」追加に向けた差分リフレッシュ + 移植面再測定。区間変化（ハーネス検出の `amadeus-harness.ts` 分離、plugin 中立バンドル出荷・信頼層、intent birth provenance）はフレームワーク内部構造に閉じ、業務ドメイン（AI-DLC 自己ホスト開発）に構造変化なし（base `6d4df9056` → observed `d31b8a5db`）。

> **2026-07-24（intent `260724-watcher-timeout-fix`、[#1449](https://github.com/amadeus-dlc/amadeus/issues/1449)、amadeus-bugfix / Minimal）: 変更なし、確認済み。** Team Mode ランチャー `team-up.sh` の watcher arming 検証が mux_attach を最大 270 秒ブロックする性能問題で、業務ドメイン（AI-DLC 自己ホスト開発）に構造変化なし（base `a81c11dde` → observed `6d4df9056`）。

## 260723-t241-ci-residency の業務境界（履歴: 2026-07-23）

差分リフレッシュ（base `a81c11dde` → observed `78bce876`、距離 35、bugfix / Minimal、[#1294](https://github.com/amadeus-dlc/amadeus/issues/1294)）。業務ドメイン（AI-DLC 自己ホスト開発）に構造変化なし。本 intent は自動 CI のテスト tier 契約に閉じたテスト配置の欠陥修正で、`tests/e2e/t241` の「CI-resident」表明を実行実態（`--ci` は e2e 非実行）へ整合させる範囲（測定 ref: scan-notes @ observed HEAD `78bce876`）。

## 260722-teamup-prompt-race の業務境界（2026-07-22、履歴）

bugfix / Minimal（observed `a81c11dde83e0059c48ecc912d2d22dd6bca60eb`、距離101）。利用者価値は team 起動（`scripts/team-up.sh`）の信頼性回復に限定する。[Issue #1384](https://github.com/amadeus-dlc/amadeus/issues/1384): claude メンバーの初期プロンプト `/agmsg mode monitor` が TUI 起動レースで消失し watcher（agmsg monitor）が起動しない不具合（再現率 5/6）を、起動後の readiness 検証・再送で修復する。フレームワーク中核（core/harness の投影・配布契約）には非交差で、業務ドメイン境界は変化しない。詳細は `re-scans/260722-teamup-prompt-race.md`。

> 以下は過去 intent の履歴。

## 260720-upstream-sync-230 の業務境界（2026-07-20、履歴）

Amadeus は、単一の AI-DLC core を6ハーネス（Claude Code、Codex、Cursor、Kiro CLI、Kiro IDE、OpenCode）へ決定的に投影する brownfield フレームワークである。本 intent は、承認済みの upstream `awslabs/aidlc-workflows` v2.2.0→v2.3.0 同期計画を実装可能な要件・設計へ落とすため、24件の ADOPT/ADAPT 項目を現行コード `545e69c836d46f7bec2fa351c8e668026eb5fad5` で再照合した差分リフレッシュである。

利用者価値は、既存ワークフローの正しさを回復しつつ、プラグインを「非アクティブなら現行 core とバイト同一、アクティブなら明示的な compose・投影・テスト契約として働く」拡張点として追加することにある。対象は次の8業務ドメインで、すべて Must として承認済みである。

| ドメイン | 項目数 | 現在の意味 |
|---|---:|---|
| D1 エンジン正しさ | 6 | DAG 自己修復、ゲート回復、help/compose/recompose の fail-closed 化 |
| D2 エンジン機能 | 4 | Unit kind、major iteration、cost preview、次ステージ名の公開 |
| D3 workspace 検出 | 2 | nested root と submodule を advisory として検出 |
| D4 ハーネス統合 | 3 | `execPath`、Kiro IDE context、project-dir quote を6面へ適応 |
| D5 reviewer 品質 | 2 | 日付・persona と bounded read scope を明文化 |
| D6 プラグイン | 5 | schema→packager→compose→reference plugin→docs の最小閉路 |
| D7 テスト | 1 | upstream 由来シナリオを現行 Bun テストへ再著作 |
| D8 文書 | 1 | 採用した公開契約だけを利用者・開発者文書へ同期 |

Developer scan の現状判定は MISSING 19、PARTIAL 4、EQUIVALENT 候補 1（測定 ref: `a326f47bc..545e69c8`、24項目の file:line 照合）である。明確な縮小候補は D1-3 `swarm-batch-advance` のみで、D2-10 `gate-next-stage-naming` は state/audit 内部情報があるだけで directive 契約としては未完成である。最大の新規価値かつ最大の実装ブロックは D6 プラグイン機構であり、schema と Unit kind の共有 blast radius、6ハーネス投影、source/dist/self-install の所有権分離を同時に満たす必要がある。

成功条件は、(1) 24項目を MISSING/PARTIAL/EQUIVALENT の実測から再確定する、(2) `packages/framework/core/` と `packages/framework/harness/{name}/` を正本として6ハーネスの生成物を同期する、(3) `bun scripts/package.ts --check` と `bun scripts/promote-self.ts --check --no-build` を維持する、(4) 採用項目ごとの回帰テストと docs を同じ着地単位へ含める、である。SKIP 6件（既存 EQUIVALENT 3件、生成物・フォーク固有3件）は履歴境界として維持する。

> 以下は過去 intent の業務境界であり、今回の current marker ではない。

## 260713-swarm-driver-migration の業務境界（2026-07-13、履歴）

Amadeus の Construction では、依存関係を持つ複数 Unit を同一バッチで実装し、Unit ごとの隔離 worktree と決定的な収束判定を組み合わせる。現行の公開スイッチ `AMADEUS_USE_SWARM` は boolean だが、実際の実行方式は Claude Code の `Task`／Dynamic `Workflow`、Codex の Unit ごとの `codex exec`、Kiro の native `subagent` とハーネスごとに異なる。この差を利用者が明示・検証できる共通 driver 契約は、観測コミット `cf3dc88b46a2b23bcfd71b1136632d1739cdd7e5` 時点では未実装である。

今回の intent は、Construction の multi-Unit `invoke-swarm` に限って `AMADEUS_SWARM_DRIVER` を公開契約とし、次の利用者価値を成立させるための brownfield 変更である。

- `auto` はハーネス能力と task topology から決定的に driver を選び、fallback を画面と監査の両方へ残す。
- 明示 driver は利用不能なら実行開始前に hard error とし、別方式で成功扱いしない。
- Claude Code Agent Teams、Claude Ultra Code、Codex Ultra、Kiro subagent を、2 Unit 以上の native 実行証跡と既存 referee の収束結果で検証する。
- `AMADEUS_USE_SWARM` は 0.1.x の警告付き互換に閉じ、0.2.0 での削除は後続 Issue とする。

対象外は、通常の `run-stage`／対話 conductor／Responses API Multi-agent／custom driver SDK／新しい credentialed CI job である。engine の eligibility、Unit worktree、Bolt、保護 spec、`prepare`／`check`／`finalize` の収束境界は維持し、driver 選択と native 実行証跡をその外側へ追加する。

> 以下は過去 intent の業務境界を履歴として温存したもの。`260710-source-unreferenced-check` の source-side 検査ギャップは、現行 `scripts/package.ts:711-725` で解消済みである。

## 260710-source-unreferenced-check(intent、履歴)の業務境界

`bugfix` スコープの intent。packaging(`scripts/package.ts` + harness manifests)の **source 側 unreferenced 検査**(Issue #735)を対象とする。既存の drift guard(`dist:check`)は「committed dist に混入した stale ファイル(出力側 orphan)」を検出するが、「`harness/<name>/` に置かれた authored ソースが manifest のどの行からも参照されず build に不可視のまま滞留する(source 側 unreferenced)」ことを検出しない。#719/#737 でこのギャップの実害(kiro CLI harness の7個の stale `.kiro.hook` が vacuous exemption に隠れて滞留)が顕在化しており、当該 intent はその一般的な検査機構を検討した。

> **前回 intent の2バグは出荷済み**: **#685 delegate-rejection は #729** で解消(`DELEGATED_REJECTION` イベント + `delegate-rejection` subcommand を追加、agent-team topology でリモート conductor がゲートを拒否可能に)、**#670 sibling-worktree guard は #727** で解消(worktree write パスをメインチェックアウトへアンカーし、sibling dev worktree からの `create`/`bolt --worktree` を許容)。以下の「260709-gate-mechanics」節は歴史的記録。

## 260709-gate-mechanics(前 intent、履歴)の業務境界

前回バッチ(`260709-bug-zero-batch`)完了後の新しい bugfix intent。既存 2 バグに絞ったバッチであり、対象コード領域は前回バッチと重複しない(前回対象の `amadeus-swarm.ts`/`packages/setup/` 系ではなく、gate 解決・worktree 実行系)。

- **#685 delegate-rejection**: human-presence gate の REJECT パスに、agent-team topology でリモートの conductor がゲートを拒否するための遠隔委任機構がない。#671 で APPROVE 側にのみ追加された `delegate-approval`(issuer の実 `HUMAN_TURN` を根拠に検証する仕組み)と対称な仕組みを REJECT 側に追加する必要がある。`DELEGATED_APPROVAL` イベントを REJECT 目的に転用すると意味論が破綻するため、新規の delegated-rejection イベント種別を要する。
- **#670 sibling-worktree guard**: `assertNotSiblingWorktree`(`packages/framework/core/tools/amadeus-worktree.ts`)が、マルチワークツリーのチーム体制で sibling worktree から `amadeus-worktree create`/`bolt --worktree` を実行するケースをすべて拒否してしまい、この運用形態での Bolt worktree モード利用をブロックしている。

## 目的

Amadeus は AI-DLC ワークフローを複数の AI harness(Claude、Codex、Kiro CLI、Kiro IDE)に配布するための framework リポジトリである。前々回 intent `260708-installer-distribution` で `packages/setup`(`@amadeus-dlc/setup`)が完成し、前回 intent `260709-framework-repair-batch` で4件のバグ(#656/#657/#641/#661)の修理対象が特定された。intent `260709-bug-zero-batch` はさらに新しく見つかったバグ6件(#674〜#678、#668)をまとめて修理するバッチである。前回バッチの4件とは対象コード領域が異なる、独立したバグ群である。

## 現在の業務境界

配布フローの三層構造(`packages/framework/core/`、`packages/framework/harness/<name>/`、root `dist/<name>/`)と独立配布パッケージ `packages/setup/` は変更しない。この intent はその内側で発見された6件の具体的な欠陥を修理する。

## この intent が対象とする業務境界(バグ6件)

- **#674 amadeus-swarm.ts finalize の merge-back 失敗が results/audit に反映されない**: `handleFinalize()`(`packages/framework/core/tools/amadeus-swarm.ts:484-631`)は、まず claimed unit を再検証して `results` 配列に `status: "converged"` を確定させ(L551-553)、その後に merge-back ループ(L588-599)で `amadeus-bolt.ts complete --merge` を実行する。merge が失敗しても `mergeFailures` にだけ記録され、既に確定済みの `results` エントリは書き換わらない。結果として `emitUnitConverged`(L604-605)が実行され、失敗した merge であっても audit trail 上は「converged」として記録される。
- **#675 amadeus-state.ts reject に human-presence guard が無い**: `handleApprove()`(`amadeus-state.ts:1286-1379`)は L1316-1337 で human-presence guard(autonomous mode / suite-wide off-switch / `humanActedSinceGate` チェック)を実装しているが、`handleReject()`(`amadeus-state.ts:1430-1487`)には同等のガードが一切存在しない。approve は「ゲートに人間が実際に反応したこと」を強制するが、reject は誰(または何)が呼んでも無条件に通る非対称な実装になっている。
- **#676 amadeus-bolt.ts start --worktree の audit shard 迷子**: `start`(`amadeus-bolt.ts:196-220`)は `--worktree` パスで `emitAudit(pd, "BOLT_STARTED", fields, flags.intent, flags.space)` を呼ぶ(L220)。この呼び出しは内部で `auditFilePath()`(`amadeus-lib.ts:1267-1270`)を経由するが、`recordDir(pd, intent, space)` が解決できない(intent がまだ resolve できない/存在しない)場合、`auditFilePath` は L1269 の bare fallback(`spaceRecordRoot` 直下の `audit/<shard>`)に落ちる。intent 固有の record dir 外に BOLT_STARTED が書かれ、後で intent の audit trail を読む側(`audit/*.md` glob)から見失われる。
- **#677 packages/setup/src/ports/http.ts getJson の json() が未保護**: `getJson()`(`http.ts:23-28`)は `fetchChecked()` のエラーを Result 型で受け取るが、成功後の `checked.value.json()`(L27)は `fetchChecked` の try/catch の外で await されている。GitHub API が 200 を返しつつ body が不正 JSON の場合、`json()` の reject が `Result.err` に変換されず、呼び出し元まで未処理の Promise rejection として伝播する。
- **#678 packages/setup/src/internal/tar-archive-extractor.ts の PAX/GNU longname 状態喪失**: `extractTarGz()`(`tar-archive-extractor.ts:36-148`)は `pendingLongName`(モジュール内のローカル変数、L37)を使って PAX(`x`)/GNU longname(`L`)ヘッダの値をチャンク境界を越えて保持する設計だが、`drain()` はネットワークチャンク単位で呼ばれる非同期ジェネレータの内側にあり、chunk 跨ぎで `pendingLongName` の値そのものは保持される(クロージャ変数のため状態は生きている)ものの、PAX/GNU ヘッダとその後続のファイルエントリヘッダが異なる `drain()` 呼び出し(異なる chunk)に分かれて到着した場合の境界処理を実測で確認する必要がある(次工程での検証対象)。
- **#668 amadeus-utility.ts / amadeus-lib.ts の codekb-path `<repo>` セグメント導出**: `codekbRepoName()`(`amadeus-lib.ts:501-504`)は `intentRepos()` が複数または0件のリポジトリを返した場合、`basename(projectDir)` にフォールバックする。worktree で作業している場合 `projectDir` はワークツリーのディレクトリ名(例: `claude-engineer-1`)であり、実際のリポジトリ名(例: `amadeus`)と一致しない。`codekb-path` コマンド(`amadeus-utility.ts:2690-2699`)はこの `codekbRepoName()` を経由するため、worktree からの実行では `<repo>` セグメントがワークツリー名になり、複数の worktree(`claude-engineer-1`、`claude-engineer-2` 等)がそれぞれ別の codekb ディレクトリを持つことになる。

## 現状の制約・未整備事項

- 6件とも未修正(コード上に修理の痕跡なし)。bug-zero-batch のスキャンで全件の実在を確認した。
- 前回バッチの対象だった #656/#657/#641/#661 のうち、#656(`LegacyLayout.isUnsupported` の呼び出し配線)は `upgrade.ts:192` で `Installation.detect` の evidence を消費する形で解消済みと確認できた。#657(`bunx tsc` の無条件使用、`amadeus-sensor-type-check.ts:157,174`)は本スキャン時点でも未修理のまま残存している。#641・#661 の状態は本スキャンの重点対象外のため未確認。
- bug-zero-batch はこれら旧バッチのバグの修理を担わない。スコープは #674/#675/#676/#677/#678/#668 の6件のみ。

## 成功条件

この stage の成果は実装ではなく、後続 stage(requirements-analysis 等)が依拠する CodeKB 更新である。成功条件は次の通り。

- 6件のバグそれぞれの再現条件・原因コード位置を、テスト可能な形で後続 stage へ引き継いでいる。
- 各バグの修理が波及する箇所(audit shard 読み手、CLI 契約、テスト)を棚卸ししている。
- `bugfix` スコープの test posture(既存スイートのグリーン維持 + 各バグへのリグレッションテスト追加)に沿った修理範囲の見積りができる状態にする。

## Issue #857 差分スキャン（2026-07-23）

[Issue #857](https://github.com/amadeus-dlc/amadeus/issues/857) の業務上の焦点は、`doctor` の診断契約を維持したまま、巨大な CLI ハンドラを in-process で検証できる境界を明示することである。`handleDoctor` は既に export され、monkeypatch 型の in-process テスト6ファイル104ケースが成功しており、LCOV は437/771行 hit である。したがって旧来の「全行0」という評価は失効した。

維持すべき利用者向け契約は、stdout への診断行と集計、成功時0／失敗時1の終了コード、audit 追記、stale lock cleanup、および spawn CLI/cwd 契約である。未解消なのは正式な戻り値 seam がないこと、`process.exit`・stdout・env の monkeypatch が重複すること、`worktreeBaseDir` から `resolveMainCheckout` へ至る解決が session cwd に依存すること、stage graph/harness が env と cache に結合することである。

## 後続設計への業務判断

推奨する最小境界は `runUtilityMain → 薄い CLI wrapper → doctor core → checks/dependencies` であり、全 check の純関数化は本 Issue のスコープ外とする。Functional Design では、戻り値を終了コードだけに絞る `runDoctor(): number` と、観測結果を明示する `{ results, output, exitCode }` のどちらを正式契約にするか決定する。

## 記録系 round-trip PBT の業務境界（260802-record-roundtrip-pbt、履歴、observed `9750f8aea`）

- 判断: 本 intent での実質変更なし — 利用者向けの業務機能・提供価値・ステークホルダー構成に変化がないため。Issue #1980（クロスレビュー 2 名 CONFIRMED_WITH_REFINEMENTS、対象 SHA `8e5dc6c4`）は開発基盤（テスト）の拡充とコア読み側の fail-closed 化であり、公開 CLI 契約・ワークフロー体験は不変。業務上の効果は「書いた記録が読めない／発行した承認が消費されない」不整合バグ族の shift-left（分類第 2 位 44 件 — #1979 と同一の全量調査、bug Issue 全 259 件中 分類済み 181 件が分母）であり、機構面は `architecture.md` 現在節、患部配置は `code-structure.md` 現在節、被覆分布は `code-quality-assessment.md` 現在節、実測全数は `re-scans/260802-record-roundtrip-pbt.md` に委ねる。
