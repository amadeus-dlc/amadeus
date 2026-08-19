# Election Record
Election ID: E-260819-RFC0001-CG-S13
Run ID: run-1
Lifecycle: tallied
Established questions: 1
Hold questions: 0
Held question IDs: none

## Question q-learnings-selection: intent 260815-rfc-autonomy-modes の code-generation ステージ §13 学習選定。候補は1件(c1、Deviations 由来)。この候補を project.md のノルムとして採用するか、0 件で可とするかを裁定せよ。判断は候補の一般化可能性(将来の runner が同じ罠を避けられるか)と、既存ノルムとの重複・矛盾の有無で行う。既存ノルムは amadeus/spaces/default/memory/project.md と team.md を実読して確認すること。
Established: c1 を採用(project.md ## Corrections へ) (choice 1)
Choice counts:
- Choice 1 c1 を採用(project.md ## Corrections へ): 2
- Choice 2 0 件で可(採用しない): 0
GoA: favor=2 against=0 abstain=0 discuss=0
GoA frequency: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
Reservations:
- Reservation subagent-1 [original:2026-08-19T07:47:00Z] GoA 2: 採用にあたり本文の書き方に3条件を付す。(1) トリガ非依存の一般形で書くこと。旧CLIのconverged->landed書き換えは現行CLIが拒否するため再発せず、『旧CLI固有の回避策』として書くとproject.md ## Corrections 冒頭の『個別intentの一回性の罠・ツール世代依存の回避策は記録しない』に自ら抵触する。恒久知として成立するのは『版管理下の生成物 + 前進するツール契約』という構造から反復生成される recovery discipline の面(手書き修正でもゲート迂回でもなく、当該ツールが生成したbytesの復元 + 現行ツールでの再実行)であり、この面が書けないなら Corrections ではなく Learnings Inbox へ置くべき。(2) cid:build-and-test:c1-ablation-before-artifact-repro が『byte-copy は自変更由来の欠陥を masking するため禁止』と無条件文で述べているため、admission check が表層矛盾と読む可能性がある。新エントリは適用面を『同一成果物が過去に自分自身として生成したbytesの原状復元(回復操作)であって、帰属切り分け時のツリー間byte-copyではない』と明示的にスコープすること。(3) 予防側の既存則 cid:pr-convergence:converged-final-no-landed-rewrite(project.md:192)を相互参照し、本エントリが回復側のみを扱うことを明記して二重規定を避けること。
- Reservation subagent-2 [original:2026-08-19T07:46:47Z] GoA 2: 採用に賛成するが配置に留保。project.md:136 の Corrections 受入規則は逐語で「個別 intent の一回性の罠・ツール世代依存の回避策は記録しない」と定めており、候補 c1 は旧世代 CLI 由来という点でこの除外文言に正面から触れる。よって選択肢1のラベルが指す ## Corrections への直接投入ではなく、project.md:152 の Learnings Inbox(日常の §13 学習はまずこの節へ追記し、蒸留ラウンドで昇格を裁定)へ、候補記載の一般形を主文として置くことを条件とする。あわせて記載時に既存2則との境界を明記すること: (a) cid:deployment-pipeline:c3 は append-only 生成物の誤りを git revert で回復すると定めるため、c1 の適用面が「append-only でない、ツール attest 済み単一状態の成果物」であることを書き分ける(本件は破損書込が他 record を含む checkpoint commit 03fcd00ec に同梱されており revert が過剰破壊になる点が実例) (b) cid:pr-convergence:converged-final-no-landed-rewrite は予防側(converged へ landed を再発行しない)を既に覆うため、c1 は回復側の補完であることを追補として示す。この2点を欠くと蒸留時に重複と誤読される。
Late responses:
- None
Run lineage: run-1

## Timeline
- tallied at=2026-08-19T07:47:10Z run=run-1