# Business Logic Model — fix-1170-retreat-guard(functional-design)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md、decisions.md

## 中核ロジック(FR-1 の写像)

set-status(handleSetStatus)の書き込みロジックを「無条件 RMW」から「ロック内比較付き RMW」へ置き換える(旧挙動は削除して置換 — 互換シムなし)。

```
handleSetStatus(projectDir, flags):                     # export される(ADR-5)
  事前検証(die 経路 — 変更なし、ロック取得前)          # amadeus-utility.ts:3667-3674 既存
  withAuditLock(projectDir, () => {                      # ADR-1、lock→read→compare→write
    content = readStateFile(...)                         # ロック内再 read
    cb = parseCheckboxes(content).find(c => c.slug === stage)   # ADR-4
    if cb?.state ∈ {completed, awaiting-approval}:       # ADR-2 単一述語(FR-1a)
      stderr advisory 1行; return                        # FR-1c: 全体 no-op、書き込みゼロ
    setField×6 + setCheckbox + writeStateFile            # FR-1b: 前進系は従来どおり
  }, flags.intent, flags.space)
  exit 0                                                 # 後退/前進いずれも(FR-1c)
```

- 判定は「ロック内で再 read した現在値」に対して行う(E-SMF-RA Q2 留保の順序要件)— ロック保持者(engine RMW 含む)間で TOCTOU が閉じる
- advisory 書式(component-methods.md C1): `set-status: retreat write suppressed for "<stage>" (checkbox=<state>)` 相当の1行、stderr のみ(stdout-directive-stderr-advisory)

## 状態遷移の観点

対象 stage の checkbox 状態 × set-status の許可判定:

| 現 checkbox(parseCheckboxes state) | set-status(→ in-progress)の扱い | 根拠 |
|---|---|---|
| pending(`[ ]`) | 許可(書く) | FR-1b 前進 |
| in-progress(`[-]`) | 許可(冪等再書き込み) | FR-1b(自己再マーキングは後退でない) |
| awaiting-approval(`[?]`) | **抑止(no-op)** | FR-1a(gate open の取り消し禁止) |
| completed(`[x]`) | **抑止(no-op)** | FR-1a(完了の取り消し禁止) |
| revising(`[R]`) | 許可(書く) | FR-1a+ADR-2(保護対象は x/? の2状態限定 — reviewer Finding 3 是正)。補足: FR-1e の趣旨どおり reject 後の再着手(engine が [R] を設定→builder 再開で in-progress 化)を阻害しない |
| skipped(`[S]`)/行なし(null) | 許可(既存挙動維持 — `cb` が undefined(state に対象 stage の checkbox 行が未生成)または state=skipped の場合は述語 false で通過。findStageBySlug の die は stage graph 上の未知スラッグ検査であり別モード) | NFR-1 契約不変(ガード対象は FR-1a の2状態のみ — 最小差分。reviewer Finding 1 是正) |

## エラー処理(construction ガードレール)

- ロック取得失敗: withAuditLock の既存 throw(50×100ms リトライ後)を継承 — loud 失敗、サイレントなし。hook 側は非ゼロ exit を recordHookDrop で可視化(既存経路)
- 事前検証失敗(state 不在・stage 不明): 既存 die(exit 1)を不変維持 — ロック取得前のため解放漏れなし(reviewer 実測済み)

## Review

**Verdict:** READY
**Reviewer:** amadeus-architect-agent
**Date:** 2026-07-18T00:19:14Z
**Iteration:** 1

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Major | business-logic-model.md:36 | 状態遷移表の「skipped(`[S]`)/行なし(null)」行の根拠欄が「事前検証の findStageBySlug が未知 stage を die 済み」を挙げているが、これは別の失敗モードの引用である。`findStageBySlug` は stage graph 上のスラッグ存在を検査するだけで(amadeus-utility.ts:3673-3674)、state ファイル中に対象 stage の checkbox 行が存在するか(=「行なし(null)」ケース、`parseCheckboxes(...).find(...)` が `undefined` を返す場合)は検査しない。既知スラッグだが checkbox 行が state に無いケースは pre-validation を通過してロック内へ到達し、`cb?.state` が `undefined`(`{completed, awaiting-approval}` に非該当)となって許可される — 挙動自体は正しいが、表の「根拠」記述は citation-semantics-check(引用の意味論適合)違反であり、実装者・後続レビュアーがこの行を「die で守られている」と誤読しうる。 | 根拠欄を「`cb` が undefined(state に対象 stage の checkbox 行が未生成)の場合は述語 `cb?.state ∈ {completed, awaiting-approval}` が false となり通過 — NFR-1 の互換維持が根拠」に訂正する。 |
| 2 | Major | business-rules.md:9-16(BR-1〜BR-7) | 状態遷移表(business-logic-model.md:29-36)は「許可」カテゴリを4行(pending / in-progress / revising / skipped・null)列挙しているが、BR-4 のテストは「pending/in-progress/revising への書き込み成功」の3状態のみを assert 対象とし、「skipped(`[S]`)/行なし(null)」の許可(パススルー)を検証する BR・テストが存在しない。レビュー観点1(状態遷移表の完全性・判定根拠の FR 遡及)に照らすと、この行は NFR-1(互換不変)を根拠に「許可」と明記された設計判断であるにもかかわらず、述語の実装ミス(例: `{completed, awaiting-approval}` を書き間違えて `skipped` を含めてしまう等)を検知するテストが計画されていない。 | BR-4 に「skipped(`[S]`)/checkbox 行なし(cb undefined)の2ケースで書き込みが成功する」旨を追加するか、新規 BR-8 として独立させ、unit テストの対象に含める。 |
| 3 | Minor | business-logic-model.md:35 | revising(`[R]`)行の根拠欄が「FR-1e」を引いているが、FR-1e は「ガードは set-status にのみ適用しエンジン RMW 経路を変更しない」という**適用範囲**の要件であり、「revising 状態が set-status 経由で in-progress へ書き込み可能である」ことの直接根拠ではない。実際の根拠は FR-1a(保護対象は `[x]`/`[?]` の2状態のみ)+ ADR-2(単一述語)が revising を非該当集合として扱うことの帰結である。 | 根拠欄を「FR-1a(保護対象は x/? の2状態限定)+ADR-2」に差し替え、FR-1e は「(エンジンが [R] を設定する側の裏付け)」として併記に留める。 |
| 4 | Minor | business-rules.md:14(BR-6) | BR-6 は「CLI 引数契約不変・audit 非 emit 維持」を1行にまとめているが、対応する「テスト」列は CLI 引数互換のみを検証し、後退 no-op 経路が audit を emit しないことを直接 assert するテストが明記されていない(NFR-5 の「ガードは audit を emit しない」という積極的主張に対する検証手段が手薄)。 | BR-6 のテスト列に「後退 no-op 実行後、audit シャードに新規エントリが追記されていないことの実測(diff 前後行数比較等)」を追加する。 |

### Validation Tool Results

該当する自動検証ツール(validate-domain-model 等)はこのステージ定義に見当たらず、実測は本レビューアーによる手動照合(下記)で代替した。

| 検証項目 | 結果 | 根拠 |
|---|---|---|
| `CheckboxLine`(amadeus-lib.ts:3744-3748)実在 | PASS | grep 実測(interface CheckboxLine { slug, state, suffix }) |
| `CheckboxState`(amadeus-lib.ts:58)実在・6値網羅 | PASS | `"pending" \| "in-progress" \| "awaiting-approval" \| "revising" \| "completed" \| "skipped"` を確認、状態遷移表が6値+null(no-line)を全て被覆 |
| `parseCheckboxes`(amadeus-lib.ts:3750)既存 export | PASS | ADR-4 の「新設なし」主張と一致 |
| `withAuditLock` リトライ 50×100ms | PASS | amadeus-lib.ts:4224/4275 実測(コメント「50 × 100ms = 5s」+ `acquireAuditLock(projectDir, 50, 100, ...)`) |
| 事前検証 die(amadeus-utility.ts:3667-3674) | PASS(ほぼ一致) | 実ファイルは 3666(関数宣言)〜3674(Unknown stage die)。ADR-1 の「3666-3690」は関数全体と完全一致、business-logic-model.md の「3667-3674」は pre-lock die 部分とほぼ一致(functionally correct) |
| `handleSetStatus` 現状(未 export・ロック未参加・setField×6+setCheckbox+writeStateFile) | PASS | amadeus-utility.ts:3666-3690 実測、setField 呼び出し6回+setCheckbox1回を確認、旧挙動記述と一致 |
| sync-statusline hook が stdout を無視(`stdout: "ignore"`) | PASS | amadeus-sync-statusline.ts:69-73 実測。後退時 stdout 空化(frontend-components.md)が既存呼び出し元を壊さないという NFR-1 主張を裏付ける |
| t145-state-lock-concurrency.test.ts 実在・ロック内 read→decide→write 様式 | PASS | tests/integration/t145-state-lock-concurrency.test.ts 冒頭コメント実測、BR-3/FR-4a の「t145 様式」引用は妥当 |
| findNextExecuteStage(:5322)引用(ADR-4/component-methods.md、上流 application-design) | FAIL(上流の既存欠陥・本レビュー対象外) | repo 全域 grep で `findNextExecuteStage` は0件。line 5322 の実イディオムは `nextInScopeStage`(amadeus-lib.ts:5292)内の `checkboxStates.find((c) => c.slug === slug)` であり、関数名の引用が誤り(mechanism-cite-verify-at-draft 違反)。ただし本ステージの対象4ファイル(business-logic-model/business-rules/domain-entities/frontend-components)はこの誤引用を再掲していない — 上流 application-design(ADR-4・component-methods.md)側の既承認済み欠陥であり、functional-design の判断・実装契約には影響しない。参考記録として残す。 |

### Summary

FR-1a〜1e・NFR-1/4/5 は決定表・BR・出力契約表を通じて完全にトレース可能であり、引用した機構(CheckboxLine/CheckboxState/parseCheckboxes/withAuditLock/setField×6/hook の stdout 無視)はすべて実測で裏付けられた。互換シム・adapter の先行着地・無申告の逸脱は見当たらない。落ちる実証の設計(BR 末尾)は inject-runtime-consumed-lines / falling-proof-injection-one-set に整合する。一方、状態遷移表の「skipped/null」行は(1)根拠記述が別の失敗モードを誤って引用しており、(2)対応するテスト(BR)が欠落している — この2件は Major だが、いずれも実装可能性を損なう構造欠陥ではなく、コミット前の是正で解消できる文書・テスト計画の精度問題である。Major 2件・Minor 2件で「>2 Major」の閾値には達しないため READY とするが、次イテレーション(あるいは code-generation 着手前)で Major 2件の是正を推奨する。
