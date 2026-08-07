# Code Generation Plan — Bolt 3: fix-2358-unit-done-declaration

上流入力(consumes 全数): `requirements`(`amadeus/spaces/default/intents/260807-failclosed-recovery-path/inception/requirements-analysis/requirements.md` — FR-3 全項と AC-3a〜3g、NFR-1〜NFR-5、C-1〜C-5 を本計画の唯一の要件正本として使用)。

## 目的

#2358(unit DAG 無し per-unit ステージの全被覆 deadlock)を **明示宣言によるゲート発行**(#2385 Q4-B + 本ステージ Q3-A = `amadeus-state.md` 新 H2)で是正する。変更面は multi-unit アームのみ、単一 unit(t367 test 14、E-OBB2-CG1 の INTENTIONAL 非対称)は不変。

## state reader 棚卸し(FR-3.2 / #2385 §11 RAID 種2 — 記録先は本 plan)

builder の grep 全数棚卸し(完了報告からの転記):

- **A. 行スコープ field reader/writer**(`getField`/`setField`/`setFieldStrict`/`setOrInsertField`/`fieldExists`/`removeField`): amadeus-state.ts(38+34+7+3+2)/ orchestrate(34)/ utility(22+17)/ lib(15+7+3+2)/ workflow-completion(12+3)/ jump(6+9)/ goal(6+6)/ bolt(4)/ mirror-lifecycle(5)/ swarm(4)/ runtime(4)/ intent-autonomy-production(2)/ hooks session-start(7)・stop(5)。全て `^- **Field**:` の行一致 — 新セクションの影響なし。新フィールド名2件は repo 全域で一意。
- **B. checkbox ガード**: `parseCheckboxes`(lib 7 / utility 5 / orchestrate 4 / state 3 / runtime 2 / jump 2)、`parseScopedCheckboxes`(state 2)、`setCheckbox`(state 11 / jump 5)。`parseCheckboxes` は文書全体走査(`^- \[([ xSR?-])\] …`)— 新セクションは checkbox 形の行を意図的に含まない(t480 unit test + 宣言前後の byte 同一 assert で pin)。
- **C. セクション範囲/全域 reader(リスク класс)**: `amadeus-migrate.ts:77 STATE_V7_SECTIONS` + `validateStateSections:924`(V7 の9節を順序・一回性で要求 — `## Session Resume Point` の後への追記で両立、機械検証済み)/ `amadeus-validate-state.ts:47-48`(includes 検査 — additive 安全)/ `markdownSectionRange`/`replaceSection`(state:4534,4565,4603 — practices ファイル専用で amadeus-state.md 非対象)/ **mirror ブロック**(`amadeus-mirror-state-store.ts` — sentinel 区切りの byte-range splice、EOF 追記。**再宣言は `replaceSection` でなく行スコープ `setFieldStrict` を使う設計根拠**: セクション範囲書換は後続の Mirror ブロック(`## ` 見出しでない)を巻き込む)。

## 設計(宣言 H2 と verb 契約)

```
## Degrade Unit Declaration
<!-- Written by `amadeus-state declare-units-done`; read by the engine's degrade per-unit arm (issue #2358). -->
- **Degrade Units Declared Done**: unit-alpha, unit-beta
- **Degrade Units Declared At**: <iso>
```

- 書き込み verb: `amadeus-state.ts declare-units-done --units <comma-separated>` → `{"declared":true,"units":[...],"declared_at":"<iso>"}` exit 0。fail-closed(書込前検証、`^[A-Za-z0-9][A-Za-z0-9_-]*$` — パス脱出・空白・改行偽造を拒否)。`withAuditLock` 下で書込、新規は EOF 追記・再宣言は行スコープ更新。
- 読み契約: `parseDegradeUnitDeclaration` は fail-closed(units と timestamp の片欠けは宣言でない)。`decideDegradeUnitCompletion(declaration, coveredUnits)` は被覆集合との**完全一致**時のみゲート発行(不足/過剰は refuse に理由を列挙)。stale 宣言はゲートを差し控える方向にしか働かない。
- 判断2件(builder 申告、FR の裁量内 — **実装中に確定し完了報告で申告されたもの**を plan へ事後転記した。plan 起草時点の織り込みではない): (1) `--units` 明示リスト必須(ディスク listing の snapshot 化では宣言が常に自明一致し FR-3.3(ii) の実データ検証が無意味化) (2) 完全一致(superset 不可 — 宣言後に現れた dir は宣言を stale 化し refuse)。

## 実装ステップ(TDD — AC 述語は requirements から逐語で写す)

1. Red→Green ×3(lib writer/reader/decision → engine アーム → state verb)。
2. FR-3.1 逐語: 「multi-unit アームのみ(`degradeUnitResolutionError` の `uncovered.length === 0` 分岐)。単一 unit の covered 解決(t367 test 14 が INTENTIONAL として pin)は不変に保つ」。
3. FR-3.3 逐語: (i) 「`unitCovered` の関数実装と既存呼び出し行を編集しない — 新分岐は算出済みの `uncovered` を消費する側にのみ追加。機械確認は git diff を関数本体と既存呼び出し行の範囲に適用して差分ゼロ」 (ii) 「宣言受理から directive 発行までの間に、被覆済み unit 集合を引数として受け取れる単一の関数境界が存在する。in-process アサーションは…実際の被覆済み unit 集合(fixture の実データ)を渡していることを assert — ダミー実装では通らない形」。
4. FR-3.4: t367 test 13 → 13a(宣言なし = 従来 refuse)/ 13b(宣言あり = ゲート発行)へ明示改訂(根拠コメント付き)。
5. 落ちる実証(AC-3b 逐語「宣言なしは従来どおり fail-closed の error directive(退行なし — 落ちる実証を含む)」): 2独立注入。
6. FR-3.5(conductor): `project.md` の `cid:code-generation:c1-degrade-batch-directive-capture` への追補を**同一 PR に同乗**(conductor が文面を起草し builder が verbatim 適用)。
7. 検証: typecheck / lint / t367+t480+state/mirror reader 群 / build 後 status 空 / complexity / source-only。
8. PR 発行(**Bolt 1 着地後** — C-1)→ 収束 → 承認マージ。FR-3.6(Issue コメント)は conductor 投稿済み(2026-08-07)。

## AC(requirements FR-3 の AC-3a〜3g — 逐語参照)

AC-3a(宣言あり→ゲート発行 fixture)/ AC-3b(宣言なし refuse + 落ちる実証)/ AC-3c(test 14 バイト不変)/ AC-3d(既存 reader green 維持)/ AC-3e(diff ゼロ機械確認 + 実データ搬送 assert)/ AC-3f(project.md 追補の実在 + 同一 PR 同乗)/ AC-3g(#2358 コメント実在)。

## 逸脱規律

FR-3 から逸脱する必要に気づいたら実装前に停止して conductor へ報告(既存様式への準拠と判断する場合も停止対象)。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T06:49:57Z
- **Iteration:** 1
- **Scope decision:** none

FR-3 逐語保存・reader 棚卸し・AC-3e 非ダミー化・新 base 再実測は良好。AC-3f の参照 grep 証跡と NFR-5(orchestrate 行挿入の allowlist 3点セット)の実測欠落が BLOCKER。

### Findings

- BLOCKER | AC-3f の grep 機械確認(親 cid / #2385 / 選挙記録2件への参照 hit 数)が summary に不在 — conductor 実測のうえ追記
- BLOCKER | NFR-5: amadeus-orchestrate.ts への行挿入(+50/−11)に対する coverage-patch-allowlist の機械 remap + reason 直読照合 + span 膨張検査の記録が不在(registry/ratchet 再生成は代替にならない)
- FOLLOW-UP | C-1(Bolt 1 着地後の PR 発行)の対応関係(取込コミットと Bolt 1 PR 番号の一致)を一行明記
- NIT | builder 判断2件の確定タイミングを plan に一言添える

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-07T07:15:01Z
- **Iteration:** 2
- **Scope decision:** none

i1 の BLOCKER 2件(AC-3f grep 証跡 / NFR-5 allowlist 検査)はいずれも実測付きで閉包 — 特に NFR-5 は実害 stale 1件の検出・是正過程まで示され検証劇場ではない。#509 の reason 無変更判断と非 straddle 判定の論理も cid 定義と整合。二次欠陥・新規 findings なし。

### Findings

- None
