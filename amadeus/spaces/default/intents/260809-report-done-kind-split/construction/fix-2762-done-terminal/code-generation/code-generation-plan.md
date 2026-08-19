# Code Generation Plan — fix-2762-done-terminal

上流入力(consumes 全数): requirements.md(FR-1〜7 の正本として逐語準拠)。設計系 consumes(business-logic-model / business-rules / domain-entities / performance-design / security-design / deployment-architecture)は self-fix スコープ SKIP により不在(expected)— 代替正本は Issue #2762 クロスレビュー+RE 正本 `re-scans/260809-report-done-kind-split.md`。unit-of-work.md も units-generation SKIP により不在(expected)。

## 実装ステップ(受け入れ基準は requirements.md の逐語 — 縮小しない)

1. **FR-6(Red 先行)**: t524 に「非終端 done ack が terminal:false で terminal 完了と区別可能」+「terminal 未指定 done が validator 拒否」を先に書き、修正前コードで赤を実測(TDD Red ログ)。CLI 契約ポート(t115 様式、プロセス境界 spawn で自己参照隔離)
2. **FR-1**: `amadeus-directive.ts` の `DoneDirective`(:332-335)へ `terminal: boolean`、`DONE_FIELDS`(:474)へ要素、`FIELD_CHECKS_BY_KIND` の done row へ boolean 検査、golden sample(:1201 近傍)を同期。validator rule 3(unknown key strict、:590-594)と整合 → terminal 必須検査
3. **FR-2**: `:5382`(handleAuthorizedApprovalReport)/ `:5849`(handleReport)を既存 `isFinal`(:5298-5299 / :5674)で分岐して terminal 設定。`:5849` の reason を terminal/非終端で文言分離(terminal 時の「State advanced. Run next to continue.」誤りを是正)。判別子は committed 配列でなく isFinal(gated 最終で不十分 — RE 実測)
4. **FR-3**: 終端4サイト(:2987/:3582/:4933/:5744)= terminal:true、非終端 :5765 = terminal:false。7サイト全て terminal 明示(未設定 0 を grep)
5. **FR-4**: Stop hook(amadeus-stop.ts:932 近傍)の done allow 判定を terminal 参照へ。next 再 spawn kind 判定のバックストップ構造は不変。t121 系スタブ engine 経路へ「非終端 done を stop 誤認しない」を注入
6. **FR-5**: SKILL.md 6面(逐語同一5+pi)+docs/reference 17-skill-system(英日 :38 契約行含む)を terminal 参照契約へ同期。**件数語(ten/nine/seven)は触らない**
7. **FR-7(negative)**: 件数語ドリフト行の diff 0・VALID_KINDS 要素不変・他 directive kind 不変を機械確認
8. **検証**: typecheck / lint / build+porcelain(全ハーネス dist 投影)/ run-tests.sh --ci / patch gate。全ハーネス SKILL.md 6面の同期を build 再生成で確認
9. **配送**: Bolt PR 発行(`Refs #2762, #2764, #2661`)→ 収束スキル `github:j5ik2o-gh-pr-converge-loop` 実発動 → 収束後 conductor が pr-convergence-report.md 生成 → §12a → approve(plugin overlay 順序)

## 委任・分担

- 実装 = amadeus-builder-agent(worktree 隔離、FR 全文焼き込み)。record 書込・engine 操作は builder 禁止
- record 成果物・§12a・ゲートは conductor 所有
- **自己参照注意**: 本修正は実行中の report ループが使う契約面。固定は t115(隔離 state のプロセス境界)で行い実行時と独立化(RE 調査項目4)

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-19T08:01:27Z
- **Iteration:** 1
- **Scope decision:** none

着地面(#2767 / 34888d840)の実測と #3236 が record 専用である旨の帰属表明は概ね誠実だが、逸脱節が実行不能と実測済みの override 経路を配送手段として記載しており、さらに FR-7 を「不変」と読み替えたまま同節でその受け入れ基準の破れ(VALID_KINDS 追加・件数語の同期)を報告し、FR-6 の落ちる実証(赤)が測定も未検証宣言もされていない。

### Findings

- BLOCKER | code-summary.md:87 — 逸脱節が Step 9 を「override による記録へ置換(監督者裁定)」と記すが、同ファイル :74-79 は override を実行不能と実測(exit 1、逐語『created report is missing; run create first』/ ブランチ不一致)し :80 で選択肢 A′(record 専用 PR #3236)が裁定と記録している。実行されなかった配送機構を成果物が事実として主張している状態。是正: :87 を A′/#3236(record のみ)と実装着地 #2767 / 34888d840 の二層で書き直す。
- BLOCKER | code-summary.md:17,64 — 方式 B の読み替えが「FR-7 不変」と宣言する一方、同 FR-7 節は受け入れ基準が禁じる2事実(`VALID_KINDS` への `committed` 追加(:502)、件数語行の実数への同期)を自ら報告しており、FR-7(「件数語を含む行の diff 0」「VALID_KINDS の要素追加・削除なし」)を満たさないまま満たしたかのように提示している。加えて件数語同期には述語も測定 ref も付いていない。是正: FR-7 の受け入れ基準は Q1 の方式 B 改訂により失効した旨を明示し、件数語行の実 diff を述語付きで示す。
- BLOCKER | code-summary.md:55-60 — FR-6 の受け入れ基準は「修正前コードで赤 → 修正後緑」だが、測定されているのは緑側のみ(t528: 7 pass / 0 fail、既存 38 pass / 0 fail)で、#2767 における赤の実証も、赤が本セッションから再導出不能である旨の理由付き未検証宣言も存在しない。緑のみで落ちる実証要件を満たしたと扱っている。是正: #2767 側の赤の一次証跡を引くか、未検証面として根拠付きで明記する。
- FOLLOW-UP | code-summary.md:27-40 — FR-2/FR-3 のサイト分類表は「python 走査」とだけ記され実行可能な述語(スクリプト本文・コマンド)が残っておらず、旧行番号 :5382/:5765/:5849 → 6317/6793/6879 の対応も導出手順なしに断定されている。再実行可能な述語と対応の導出根拠を同じ場所に記録すべき。
- FOLLOW-UP | code-summary.md:46-53 — FR-5 の受け入れ基準は「`done` を stop 集合に無条件で挙げる旧記述の残存 0(核心トークン grep)」という不在主張だが、測定されているのは存在側(`grep -c committed` の件数)と claude 面3行の逐語引用のみで、8面+docs 横断の残存ゼロ grep が実行されていない。
- FOLLOW-UP | code-summary.md:19,35 — FR-2 の受け入れ基準「gated 最終は terminal:true」が方式 B へ読み替えられていない。6317(handleAuthorizedApprovalReport)を非終端と分類する一方、gated 最終経路で終端信号が最終的にどこから出るか(approve → committed → next → 3931 handleNext の `done`)の測定・明記がなく、RA が多義と実測したサイトの曖昧性解消が分類の断定だけで扱われている。
- FOLLOW-UP | code-summary.md:44 — 「`committed` の emit は全て `report` 系ハンドラであり `next` 経路は 1 件も発行しない」は所有関数名(handleFailureRuling を含む)からの推論であり、CLI verb からの dispatch を示す述語がない。FR-4 の結論自体は `committed !== "done"` で allowStop に到達し得ないことから独立に成立するため、推論である旨を明示するか当該前提を落とすべき。
- FOLLOW-UP | code-summary.md:9 と pr-convergence-report.md:17-19 — summary の測定 ref(HEAD e7c0515fe)と report が attest する local/remote/pr head(b47609ada)が食い違い、両者の関係(record checkpoint による前進か否か)が書かれていないため、監査者は FR 実測が attest 断面でも成立するかを判定できない。
- FOLLOW-UP | pr-convergence-report.md — 機械 mint の report(kind: created / converged: false / PR #3236)単体には #3236 が intent record のみを運ぶ旨の標識がなく、実装配送との区別は code-summary.md:80 の記述だけに依存する(構造欠落は Issue #3239 として起票済み)。
- NIT | code-generation-plan.md / code-summary.md — plan の各実装ステップにステージ Step 2 が要求するチェックボックスがなく、summary も Minimal depth の「bullet lists only, no narrative sections」より散文寄り。次回接触時に整えれば足りる。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-19T08:11:03Z
- **Iteration:** 2
- **Scope decision:** none

iteration-1 の BLOCKER 3件はすべて閉包した: 逸脱節は override を実行不能と実測し未実行であること・配送は A′ の二層(#3236 は record のみ / 実装は #2767 の 34888d840)であることを明記し、FR-7 は「満たした」ではなく Q1 方式 B 改訂による失効として宣言し件数語 diff を named commit に対して提示し、FR-6 は #2767 の赤の一次記録と理由付き未検証面宣言を持つ。改訂は新たな虚偽主張も無申告の逸脱も導入しておらず、残りは測定の網羅性と成果物間の currency に関する項目で、失敗や要件違反を示すものではない。

### Findings

- FOLLOW-UP | requirements.md が Intent analysis / FR-1 / FR-7 を通じて方式 A のまま記述され Q1 の A→B 改訂への参照を持たないため、summary の対応表を併読しない読み手には正本の要件成果物が着地実装と矛盾して見える。後続ステージで要件レベルへ改訂を反映すべき。
- FOLLOW-UP | FR-5 の不在側 census は 7 ハーネス面 + pi は覆うが、FR-5 の behavior が名指す docs 2面(17-skill-system.md / .ja.md)を覆っておらず、この測定集合の縮小が未検証面の節に列挙されていない。
- FOLLOW-UP | 緩和後の FR-7 基準(count-free 化)は docs についてのみ実証されており、SKILL 面は実数へ同期されたまま現行 main は 17 要素の VALID_KINDS に対し thirteen kinds と読む。summary が RA 仮説C に帰した残余ドリフトは現存し、RA の Open questions が指す別 Issue は未起票のまま。
- FOLLOW-UP | 検証コマンド表が requirements の NFR ブロッキング集合のうち3つ(隔離2回ビルドの再現性検査・グラフ不変量検査・test:ci)を欠く。test:ci は build-and-test へ委ねられているが、観測された非ゼロ exit が exit-0 が並ぶ表の隣に併記されておらず、残る2つは測定も「コード差分ゼロゆえ N/A」の宣言もされていない。
- FOLLOW-UP | gated 最終の終端信号の主張のうち第2の腕(emitDeferredCompletionBoundary、6313-6316)は列挙述語の対象外であり(述語は kind: done / kind: committed の逐語行のみに一致する)、再実行可能な測定ではなく読解に依拠している。
- FOLLOW-UP | mirror-docs-contract.ts と scan-public-projections.ts は初回 exit 1 を観測し、単独再実行の exit 0 を併走負荷に帰して記録しているが、2つの配布 drift ガードについてその帰属を支持する識別的な測定がない。
- NIT | FR-7 の diff 述語がプレースホルダの pathspec <SKILL/docs> を使い、#3236 のスコープ述語が checkout も ref も名指さない裸の origin/main...HEAD であるため、監査者は再実行前に両方の対象集合を再構成する必要がある。
- NIT | iteration-1 の NIT は未対応のまま: plan はステージ Step 2 が要求する各ステップのチェックボックスを持たず、summary は Minimal depth の指針に対して散文寄りのまま。
