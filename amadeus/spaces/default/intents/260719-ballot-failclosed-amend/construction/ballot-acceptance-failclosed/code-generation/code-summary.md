# Code Summary — U1 ballot-acceptance-failclosed

上流入力(consumes 全数): requirements.md、business-logic-model.md、business-rules.md、domain-entities.md、performance-design.md、security-design.md、unit-of-work.md(+code-generation-plan.md)

実装は requirements.md FR-1〜FR-5 と unit-of-work.md の U1 受け入れ条件を充足し、business-logic-model.md のフロー・performance-design.md の O(n) 設計・security-design.md の二層 fail-closed を実装で実現した。

## 実装(bolt/ballot-acceptance-failclosed、HEAD 91fc00105e89edd5b33111700009864be7342824、push 済み)

2段構え(plan どおり): Phase A(#1268 非依存 — 6分類化・kind/ref・resolveBallots・unknown-ref・t234/t235)→ #1268 着地後 Phase B(再接地・配線・t236・落ちる実証・sweep)。builder = developer subagent(worktree 隔離、再開は E-TCRCGS13 準拠の worktree 明示 resume — 再開直後 cwd/branch 実測一致)。

| ファイル | 変更 |
| --- | --- |
| scripts/amadeus-election-model.ts | BallotError 7分類(#1268 の unknown-choice と本 intent の invalid-timestamp が統合順で共存)/ SUBMITTED_AT_RE+isValidSubmittedAt(二段)/ parseKindRef・parseBallotRef(complexity gate 対応の抽出)/ Ballot.parse の AmendBallot 生成 / resolveBallots(:278-283、構造的不変コメント付き)/ tally 先頭適用(:417、GoA counts :421・winner 母集団 :434 とも resolved) |
| scripts/amadeus-election-store.ts | StoreError に unknown-ref / appendBallot の読取フェーズ照合(書込前 fail) |
| scripts/amadeus-election.ts | resolveBallots import(:28)/ render 適用点 #3(:376→:393)/ verify 適用点 #2/#5(:454→:462/:465/:471) |
| tests | t234 +125(6分類・順序決定性・kind/ref・resolveBallots・classifyLate 非解決)/ t235 +57(unknown-ref 拒否+ledger 無変更 / amend 共存+timeline)/ t236 +82(vote verb amend 閉包・tally 単一計上・verify green) |

## 検証(builder 実測+conductor 裏取り)

- builder: typecheck 0 / lint 0 / --ci 0(PASS、Failed 0/0)。落ちる実証: pre-fix 面切替(origin/main=#1268 込み)で t234 1 error+t235 1 fail の赤 → HEAD 復元で 32 pass 緑(復元 ref = fix コミット SHA 明示、E-GMECG 手順)。sweep: 42 ledger・98 ballots 赤 0(leader ツリー read-only)。lcov: 全 diff 配線行 DA>0(:278-283/:417/:434/:376/:389-393/:454/:462/:465/:471 個別確認)。deslop 済み。
- conductor 裏取り: pushed blob 直読で配線5行実在・merge parent 2(完遂機械確認)・marker 0・diff 規模 6 files +386/-20(見積り 255 行に対し統合テスト増分で超過 — 交差統合分)。PR CI が独立再実行になる。

## 統合判断の申告(builder 申告を conductor が検分・承認)

1. BallotError 統合順 = unknown-choice(識別子)→ invalid-timestamp(内容先頭)— E-TCRRA4 留保(挿入位置原則)どおり。
2. tally の GoA counts 母集団が resolved 集合になる — E-TCRRA1「全票横断」は choice 別分割の否定であり、FR-4(a)(同一 voter 非二重計上)が resolved 化を命じる。#1268 コメントの「amend 未実装」予告どおりの完成であり仕様変更でない。#1268 側コメント2箇所を resolved 基準へ更新済み。

## 残工程

PR 発行 → 実装者以外レビュー → CI green → ユーザー承認 → leader マージ(スカッシュ)。#1262(e1)は当方先行着地の直列合意済み。
