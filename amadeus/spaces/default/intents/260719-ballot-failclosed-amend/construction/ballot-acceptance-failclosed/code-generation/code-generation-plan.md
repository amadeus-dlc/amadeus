# Code Generation Plan — U1 ballot-acceptance-failclosed

上流入力(consumes 全数): requirements.md、business-logic-model.md、business-rules.md、domain-entities.md、performance-design.md、security-design.md、unit-of-work.md(補助参照: reliability-design.md、logical-components.md)

実装は requirements.md の FR-1〜FR-5、business-logic-model.md の処理フロー、performance-design.md の Map 単一走査、security-design.md の二層 fail-closed、unit-of-work.md の U1 受け入れ条件に従う。

## 2段構えの実装計画(e1 #1261 = PR #1268 直列合意)

PR #1268(OPEN・MERGEABLE、着地待ち)との交差面(tally/verify/render)を後段へ分離する:

- **Phase A(#1268 非依存 — 即時着手)**: model の parse ラダー(invalid-timestamp 6分類化、BR-1/BR-2)+ kind/ref 対応(BR-3 parse 段)+ resolveBallots 純関数新設 + store の unknown-ref 照合(BR-3 store 段、挿入点 = dup 判定 :134 の直後・Store.load/state 分岐前)+ t234 unit テスト + t235 integration テスト(store 面)。
- **Phase B(#1268 着地後 — 再接地と同時)**: base-advance-regrounding(--no-ff 明示+完遂機械確認)→ #1268 の新 tally(choice 多数決・TallyResult 拡張)へ resolveBallots を統合(適用点 #1)+ handleVerify/handleRender の resolved 消費(適用点 #2/#3/#5、#1268 後の実 diff で行番号再実測)+ t236 疎通テスト + 落ちる実証(BR-6、fix コミット後切替・SHA 明示復元)+ corpus sweep(glob 全数)+ 検証統合(typecheck/lint/--ci/deslop/lcov)。

## ND 持ち越し minor の反映

- **構造的不変の明示**: resolveBallots の同時刻タイ「amend 優先」は、store の unknown-ref 照合が「amend は必ず参照先(original/先行 amend)より配列後方に append される」ことを保証するため、後着優先(>=)比較で正しく実現される — 実装コメントにこの不変を1行明記する。
- **適用点の対応表**: #1=tally 内部(model)/ #2=handleVerify の :447/:448/:450 / #5=verifySelf :456 / #3=handleRender :372→:386(行番号は #1268 着地後に再実測して plan 追記でなく code-summary に実測値を記録)。

## worktree・ブランチ運用

- builder は bolt ブランチ `bolt/ballot-acceptance-failclosed`(origin/main 起点)を本 worktree 内で使用(単一 builder・並行なし — swarm 不使用、conductor 直下の subagent 1名)。
- 割当ツリー(本 worktree)以外での git 操作禁止・本線絶対パスの参照は worktree 内相対で(c2)。逸脱は実装前停止(既存様式への準拠と判断する場合も停止対象 — deviation-applicability-not-solo)。
- builder 再開が必要な場合は SendMessage resume を使わず新規 Agent+文脈再投入(E-TCRCGS13 実測 — resume は worktree 隔離を保証しない)。

## テスト計画(FD テスト面表+ND テスト層の確定形)

| テスト | 層 | ケース |
| --- | --- | --- |
| t234 追加 | unit(純関数) | invalid-timestamp 6ケース(__NOW__ / 2026-07-19 / ms 形 / +09:00 形 / 空文字 / 正当形)+分類順序決定性 / kind 不正・ref 欠落 = parse-failure / amend 正常 parse / resolveBallots 4ケース(最新勝ち・同時刻 amend 優先・original のみ・空)+ classifyLate 非解決(R-4) |
| t235 追加 | integration(実 FS) | unknown-ref 拒否(ledger 無変更確認)/ ref 一致 amend 受理・共存・timeline amendment 行 |
| t236 追加 | integration | vote verb で amend 疎通(FR-3(b)(d) 閉包)/ original+amend 後の tally 単一計上・verify green(FR-4(a)(b)) |
| 落ちる実証 | Phase B | 新テストを pre-fix 正本(checkout <fix コミット SHA> 明示)へ適用し赤実測 → 復元 green |
| corpus sweep | Phase B(コミット外検証) | leader store elections/*/ledger.json glob 全数の保存済み submittedAt へ新述語適用、赤 0 |

## 検証コマンド(完了条件)

`bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` 全 green(exit 0 併記)+ push 前 lcov で diff 追加行未カバー 0(配線行・catch 行の個別確認 — lcov-wiring-line-checklist)+ deslop。
