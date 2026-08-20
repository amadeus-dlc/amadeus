# Requirements — 260820-fmc-drift-batch

## 上流入力

本書は次を消費する: `ideation/intent-capture/intent-statement.md`(問題定義・Success Metrics)、`ideation/scope-definition/scope-document.md`(確定境界・依存・制約)、`ideation/intent-capture/issue-evidence.md`(4 Issue 本文 + クロスレビュー確定事実 — 一次入力として引用で消費し再導出しない)、codekb の `business-overview.md`(:285 の 260820 節)/ `architecture.md`(:6110 の 260820 節)/ `code-structure.md`(:906 の 260820 節)— いずれも本 intent の RE 差分リフレッシュが書いた「260820-fmc-drift-batch、現在、observed `e86fbe125`」節を参照する。`team-practices` は宣言上 optional で不在(設計どおり)。file:line はすべて observed 断面(RE の行番号訂正3件を反映済み)。

用語: 本書で「**腕(arm)**」とは、tla-authoring 適用性判定に追加する独立した検出・強制起動経路(入力 → 述語 → route への効果、の1組)を指す。

## Intent 分析

目標は機能追加そのものではなく、「TLA+ モデルが実装と共に生き続ける」閉ループの成立: 乖離を**検出**し(FR-ARM)、改訂を**commit でき**(FR-REG)、plugin 実装まで**governed に被覆し**(FR-BND)、発火し得ない死経路を**退役する**(FR-RET)。裁定 provenance: 本ステージ4問の梯子裁定は `requirements-analysis-questions.md`(RA Q1〜Q4 = 全て A)。FR-010 への replace 意味論追加はユーザー実 HUMAN_TURN(バッチ承認)で確定済みで、その成果物反映は FR-REG-6 が担う。

## Functional Requirements

### FR-ARM: #3186 適用性判定の2本の腕(unit: applicability-arms)

- **FR-ARM-1**: tla-authoring 適用性判定は**語彙 drift 検出の腕**を持つ。判定対象 subject が登録済みモデルと交差する(#3261 の document-identity 交差契約 `tla-applicability.ts:121-133` の上で)とき、model-map の `vocabulary`(`namedInvariants` / `traceStateVariables`)**および検査プロパティのクラス**(cfg が PROPERTY を持たない事実を含む — issue-evidence の事実5)と対象実装の現行形の意味的整合を検査し、drift 検出時は impl-only への静かな落下を禁じて revise-model の明示評価を強制する。明示裁定で「改訂不要」とする場合、その裁定は terminal-route receipt(FR-ARM-3)として記録され、**検証されない宣言面を新設しない**(NFR-1/NFR-2 に接続: 裁定の記録は実行結果由来の receipt のみで、裁定済みを理由に以後の検査をスキップする分岐を作らない)。受け入れ基準: PrConvergenceGate の `landed` 不在(`PrConvergenceGate.tla:14` 逐語 `Verdicts == {"none", "created", "converged", "override"}`)を実 corpus とした落ちる実証(現状のまま赤)→ 是正経路の提示 → 緑、の1セット。
- **FR-ARM-2**: 同判定は**欠陥再発トリガの腕**を持つ。入力ソースは intent record の `issue-evidence.md`(RA Q4=A): bug Issue が名指す実装パスと governed entries(`implPath`)の交差で authoring 評価を強制起動する。GitHub への実行時照会は行わない。**「再発」の意味論(単発交差か、同一 implPath への複数 Issue か)と件数・重大度の発火閾値は、実 corpus(過去 intent の issue-evidence 群)へ述語を適用した観測レンジの内側で functional-design〜実装時に確定し**(cid:code-generation:c1-threshold-inside-observed-range)、確定値と観測レンジを成果物に記録する。発火率の見積り(全変更への一律義務化にならないこと — team.md two-layer posture との整合)も同時に記録する。受け入れ基準: 交差ありの fixture で強制起動、交差なしで非発火、の両側テスト + 閾値の両側固定(観測最小値 < 閾値 < 観測最大値)。
- **FR-ARM-3**: 両腕の判定結果は既存の terminal-route receipt 契約(#3262、`tla-authoring.ts:447` の fail-closed)と整合し、drift/再発による強制評価の verdict も監査可能な receipt を残す。
- **FR-ARM-4**: 腕の検出対象は特定モデルにハードコードせず登録済み全モデルに適用される一般形とする(BoltPrAttestationGate にも同型の `landed` 欠落 — `BoltPrAttestationGate.tla:22-23` が逐語同一)。
- **FR-ARM-5**: 判定手順は**ピン集合の被覆確認**を含む(#3186 完了条件2): 判定対象 subject の実装面が governed entries に覆われているかを確認し、覆っていない場合は不足面を判定成果物へ明記し、entries 拡張を裁定対象として提示する(#2929 の境界拡張[FR-BND]は被覆を「可能」にするだけで、この確認義務は本腕が担う — Issue 逐語「#2929 単独では本 Issue を閉じない」)。
- **FR-ARM-6**: 2本の腕の契約は team.md § Testing Posture の二層検証姿勢(two-layer-verification-posture — 日常 CI は PBT/unit/integration、形式検証の完全探索は並行プロトコルの spec 変更時のみ)との整合を成果物(判定契約の文書面)に明記する(#3186 完了条件5)。腕は「モデル改訂の要否判定」を強制するのであって「全変更への TLC 実行」を強制しない。
- **FR-ARM-7**(スコープ確認): terminal-route receipt 永続化(#3262 着地済み)と bare stable id 交差(#3261 解消済み)は対象外。既存の分類クラス(a)・revise-model 強制規則(c)(`stages/tla-authoring.md:51,55-56`)は変更せず、欠落している発火述語(b)= 2本の腕のみを追加する。

### FR-REG: #2289 registration committer の revise-model 置換(unit: revise-model-commit)

- **FR-REG-1**: `composeRegisteredMap`(`tla-registration.ts:229-243`)を route 依存にする: `revise-model` = 同名既存エントリの置換 / `author-new` = append(同名衝突は従来どおり validator-rejected)。route は `commit`(`:338`)から compose へ渡す。3面テスト(置換成功 / 置換対象不在 / author-new 同名衝突)を TDD で先行。
- **FR-REG-2**: 現存する fail-open(XR-260820-2289 F1: revise-model + 不在名が ok=true で map を書く)を閉じる: `commit` は route と draft 名・既存集合の整合を検査し、revise-model で置換対象が存在しない場合は明示エラーで拒否する。既存挙動の維持ではなく置換(後方互換分岐禁止)。
- **FR-REG-3**: 置換後エントリの `authoringProvenance` は draft が運ぶ値を持つ(RA Q1=A、last-writer-wins)。置換対象の provenance 不在(現行 3/4 モデル)は置換可否に影響しない。map スキーマの optional は変更しない。
- **FR-REG-4**: `tests/unit/t448-tla-registration.test.ts:294-307` の同名拒否 pin を author-new アームへ再スコープする。その際、既存の zero-assertion 形(`if (!snapshot.ok) return;` の早期 return — RE 発見)を明示的な失敗へ変える(#1982 silent-success ゲートの検出クラスを残さない)。
- **FR-REG-5**: `AUTHORING_ROUTES` の重複定義(`tla-applicability.ts:302` / `tla-registration.ts:87`)の1定義への集約(cg2-agreeing-predicate-drift 是正)は、**applicability-arms unit(直列末端、C-3187 → C-3186 の後段)が実施する** — revise-model-commit unit は `tla-registration.ts` / t448 のみを書き、`tla-applicability.ts` に触れない(ownership 交差の回避。両 unit の並列性は保存される)。
- **FR-REG-6**: 承認済み FD からの意図的改訂を record に裁定付きで残す(#2289 完了条件4): `260804-tla-authoring/construction/registration-committer/functional-design/business-logic-model.md` 手順3(append 前提)と FR-010(replace 不規定)に対する改訂裁定 — 「replace-by-name を追加する。裁定 provenance = ユーザー実 HUMAN_TURN のバッチ承認(2026-08-20)+ RA Q1=A」 — を本 intent の functional-design 成果物に明記し、旧 FD の該当箇所へ改訂ポインタを追記する(P3: 逸脱ではなく裁定済み改訂であることを監査可能にする)。

### FR-BND: #2929 実装境界の3面同時是正(unit: boundary-three-face)

- **FR-BND-1**: `IMPLEMENTATION_PATHS`(`amadeus-formal-verif-model-map.ts:248-251`)へ一般形タプル `plugins/<kebab>/tools/<kebab>.ts` を追加する(RA Q2=A)。セルフインストール投影は境界対象外のまま。
- **FR-BND-2**: ローダー第二境界(`tla-model-loader-internal.ts:291` の `implementationRoot` ハードコード)を撤去し、containment 判定を `IMPLEMENTATION_PATHS` 単一正本から導出する(RA Q3=A)。validator/loader の述語不整合(#2890 由来の休眠バグ)はこの1定義化で同時に解消する — クロスレビュー両名は別 bug 分離起票を推奨したが、RA Q3=A(1定義集約が #2929 完了条件の不可分な一部)と intent-capture Q3=C の裁定により本 unit へ内包する(分離起票しない判断の記録)。
- **FR-BND-3**: sensor manifest の `matches` glob(`sensors/amadeus-model-completeness.md:8`)を model-map の現行 entries 全13件 + 新規 plugin entries を被覆する形へ更新し、glob と境界定義・登録 entries の整合を検査する drift テストを新設する(RA Q3=A)。現状の非対称: 13 entries 中 自動発火 9(= 13 − PR系2モデルの4、内訳 FormalElection 5 + MirrorLifecycle 4)。
- **FR-BND-4**: PrConvergenceGate / BoltPrAttestationGate の entries へ、各モデルが実際に写像する plugin 実装(`plugins/github-pr-convergence/tools/` 配下 — FR-2/3/4 面。対象ファイルは functional-design で trace-rows から確定 = OQ-2)を governed entry として追加登録し、SOURCE_DRIFT 検知が機能することを実測する。
- **FR-BND-5**: 落ちる実証は**両境界**について行う(XR-260820-2929 refinement 3): validator 境界は既存テスト(`t-formal-verif-canonical-core.test.ts:96`)の拡張、ローダー境界はテスト不在(census 0 hit / exit 1、対照付き確認済み)のため新設。
- **FR-BND-6**: 1定義化の対象はモデル実装境界を判定する2述語(`isCanonicalImplementationPath` / loader `isContained`)。`run-model-check-artifacts.ts:129` の `isContained` は用途が異なる(アーティファクト出力の containment)ため対象外。

### FR-RET: #3187 advisory authoring-hold 経路の完全退役(unit: advisory-retirement)

- **FR-RET-1**: `plugin.json:77` の `authoring-hold` advisory 宣言、`tla-authoring.ts` の advisory 経路(`advisoryHold` `:574-599`・`defaultSubjectsPath` `:529-530`・`GovernedSubjects` 型・failure kind `governed-subjects-unreadable`)、および**書き手側**(`subjectsDeclare` `:649-670`・`publishSubjects` `:632-647`・dispatch `:900-901`・USAGE `:77,80-81`)を同一変更で完全撤去する。宣言と実態の乖離だけでなく「発火し得ない advisory に給餌する書き手」も残さない(Issue 完了条件3より広い — RE census 準拠)。
- **FR-RET-2**: stage 契約 `stages/tla-authoring.md:53`(`subjects declare` 手順)を撤去し、doc 面(`docs/reference/22-formal-model-supply.{md,ja.md}` — advisory authoring-hold を説明する唯一の doc)を同一変更で更新する。
- **FR-RET-3**: テスト処理: t528(`tests/integration/t528-authoring-hold-end-to-end` 系)と t524(`t524-subjects-declare-writer`)は削除。t450(`t450-tla-authoring-stage-e2e`)の `subjects declare` pin は撤去に追随。t526/t529/t532/t444/t445/t353/t113 は advisory 宣言集合の期待値更新(削除ではない)。`amadeus-orchestrate.ts:5675,6606,6639` の `advisoryHold` は**同名別物**(汎用 advisory 機構、spec-change が使用)であり触らない。
- **FR-RET-4**: 後方互換レイヤー・フォールバック分岐・deprecation シムを一切残さない(ユーザー直接指示 2026-08-20 + org.md Forbidden)。撤去後の残存ゼロ census は再実行可能な述語で行う: **キー集合** = {`authoring-hold`, `authoring-subjects`, `advisoryHold`, `defaultSubjectsPath`, `subjectsDeclare`, `publishSubjects`, `GovernedSubjects`, `governed-subjects-unreadable`, `subjects declare`} を `git grep -l -F` で1キー1実行、**対象集合** = `plugins/ packages/ tests/ docs/ .github/ scripts/ amadeus/spaces/default/specs/`、**除外** = `packages/framework/core/tools/amadeus-orchestrate.ts` の `advisoryHold`(同名別物)と工程記録(intents/ elections/ memory/ 配下・git 履歴)。`.claude/` 投影と `dist/` は `bun run build` 再生成後に同 census を再適用して 0 を確認(正本撤去の投影確認)。対照リテラル(実在既知)を1本併走させ述語健全性を担保する。

### FR-X: 横断要件

- **FR-X-1**: 全 unit は TDD 既定(team.md)に従い、blocking CI 集合 + 台帳 resync(coverage-registry regen / coverage-patch-allowlist / model-map ハッシュピン(engine ファイル接触時)/ prose リテラル pin テスト / #1982 silent-success 3ゲート / t3078 plugin tools 宣言)を同一変更で満たす。検証は push-first(remote CI 正)。
- **FR-X-2**: 配送は Bolt PR ごとのスカッシュマージ。マージは常任承認条件(必須 CI green ∧ converged:true 実測 — ユーザー再確認 2026-08-20「CI green ならマージしていいよ」)の範囲でのみ自律実行。Issue クローズは着地面の実読確認後。
- **FR-X-3**: 正本は `plugins/` / `packages/framework/core/` を編集し `bun run build` で再生成。dist・セルフインストール面の直接編集禁止。
- **FR-X-4**: t448 自己参照比較(`:2-3`/`:74-82`、検証劇場クラス)の **bug Issue 起票**は本 intent 内の作業とする(修正は対象外)。起票は remote write として承認境界(梯子 → 必要なら人間)に従い、起票前 dup 検索と canonical body 様式を満たす。

## Non-Functional Requirements

- **NFR-1(検証劇場禁止)**: 新設ゲート・検出述語はすべて落ちる実証(注入→赤→revert または実 corpus 赤)を経る。status ハードコード・自己参照比較・どのコードも消費しない検証フィールドを作らない。t448 の既存自己参照比較の修正はスコープ外(FR-X-4 で起票のみ)だが、FR-REG-4 の変更で悪化させない。
- **NFR-2(fail-closed)**: 新設の検出・拒否経路は不明状態を fail-closed に倒す(drift 判定不能 = 素通りではなく明示 halt)。
- **NFR-3(性能)**: 適用可能な数値 NFR は宣言されていない — 性能・security の専用検査は生成しない(no-test-theatre-for-absent-nfr)。将来この判定を覆す条件: 適用性判定の実行時間が体感劣化としてユーザーから報告された場合に別 intent で NFR 化する。

## Constraints

scope-document §制約 を継承(ブロッキング CI 集合、TDD、remote-first、worktree 分離、grant 禁止効果)。unit 間依存は C-3187 → C-3186 の1本(`tla-authoring.ts` / `stages/tla-authoring.md:51,:53` 隣接面の共有)。FR-REG-5 の集約作業を applicability-arms unit(直列末端)へ割り当てることで、`tla-applicability.ts` の ownership は applicability-arms unit に一本化され、revise-model-commit / boundary-three-face / advisory-retirement の3 unit は相互にファイル所有権が交差しない(並列可)。

## Assumptions

- A-1: model-map の `vocabulary` は4モデル全てに存在する(RE 実測、凡例: `namedInvariants 件数 / traceStateVariables 件数`: PrConvergenceGate 5/8、BoltPrAttestationGate 11/21、FormalElection 7/5、MirrorLifecycle 3/3)— FR-ARM-1 の入力面として新機構は不要。
- A-2: TLC 全4モデルは現行断面で NOT_DETECTED(本 intent の formal-model-check single-run、2026-08-20)— 本 intent の変更前ベースラインは緑。

## Out of Scope

#3246(別 intent 裁定済み)/ t448 自己参照比較の**修正**(起票は FR-X-4 で本 intent 内)/ plugin 単位の宣言的境界 opt-in(RA Q2=B 不採用)/ provenance 履歴機構(RA Q1=C 不採用)/ sensor manifest の生成物化(RA Q3=C 不採用)/ リリース・publish 等の不可逆外部操作。

## Open Questions(後続ステージへ)

- OQ-1: FR-ARM-1 の drift 検出述語の具体形 — 語彙トークン(namedInvariants / traceStateVariables)**と検査プロパティのクラス**(PROPERTY 有無を含む)の照合方法。functional-design で確定。
- OQ-2: FR-BND-4 の governed entry 追加対象ファイルの確定(FR-2/3/4 写像 — 260811 の trace-rows から `pr-convergence-{predicate,attestation}.ts` 等を trace して確定)。functional-design で確定。
- OQ-3: FR-BND-1 の一般形が既存 `plugins/formal-model-check/tools/` タプルを包含した後、旧タプルを残すか統合するか — 実装時に P5(最小)で判定。
- OQ-4: FR-ARM-2 の再発閾値の観測レンジ実測(過去 intent の issue-evidence corpus への述語適用)。functional-design〜実装で確定し両側固定。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-20T12:14:16Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の BLOCKER 3件(FR-REG-6 / FR-ARM-5・2・6 / FR-REG-5+Constraints)の解消を file:line で確認。引用健全性・上位裁定との整合・FR数27(Standard帯内)を確認。残余は後続ステージで機械的に閉じられる FOLLOW-UP 4件と NIT 1件。

### Findings

- FOLLOW-UP | MAJOR-1: AUTHORING_ROUTES 集約の移設が ownership 交差を除去でなく移設した疑い — 集約後の正本定義の所在・tla-registration.ts:87 への書込有無・依存辺追加の要否・XR refinement 5「両方の棚卸し」の担当 unit を functional-design で明記
- FOLLOW-UP | MAJOR-2: FR-RET-3 の退役テスト処分リストに t481 / t527 が不在(architecture.md:6221,:6224,:6225 の census 由来)— 処分区分を functional-design で確定
- FOLLOW-UP | MAJOR-3: FR-RET-4 の残存ゼロ census が as-written では充足不能 — specs/rfc/0001-intent-autonomy-modes.md:249 の authoring-hold 言及が除外条件に該当しない。除外条件の追加か RFC への退役ポインタ追記かを functional-design で確定。docs 面「唯一の doc」は docs/ 限定の主張と明示
- FOLLOW-UP | MINOR-1: FR-ARM-5 が #3186 完了条件2の禁止節(non-target への再分類は行わない — J2d undecidable 反証確定)を落としている — FR-ARM-5 か OQ-1 へ functional-design で明記
- NIT | FR-REG-5 が FR-REG 見出し配下で作業実施者を applicability-arms unit と定める — units-generation の機械読取での取り違え源。見出し帰属の例外である旨の注記が安全
