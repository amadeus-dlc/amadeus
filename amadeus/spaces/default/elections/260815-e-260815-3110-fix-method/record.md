# Election Record
Election ID: E-260815-3110-FIX-METHOD
Run ID: run-1
Lifecycle: tallied
Established questions: 1
Hold questions: 0
Held question IDs: none

## Question q-3110-method: Issue #3110: created attestation が stale 化した(create 後に head が前進した)MERGED self PR に pr-convergence の正規最終化経路がない。根本は team.md『record checkpoint 同梱可』ノルムと CLI『create 後 head 前進禁止』(currentSelfContext の attestationBindsIdentity が verb 分岐より先に評価)の規範衝突。修正方式を選定する。共通制約: fail-closed ゲートの無音バイパス禁止 / attestation 偽装禁止 / head 不変ケースの既存 created→landed 経路(#3062/t3062)無退行 / MERGED head での create 誤 PR 作成防止(#3109)を同時に閉じる。
Established: C: 混合 — A の祖先実測つき landed 最終化を主経路にしつつ、create の MERGED-head 誤作成防止(loud 拒否)と、stage 文書・ノルムの規範衝突記述の是正を同一変更で行う(A + #3109 防止 + 文書整合) (choice 3)
Choice counts:
- Choice 1 A: landed 側で head 前進を許容 — report の self 経路で、PR が MERGED の場合は attested prHead が merged head の祖先であることを実測して landed record を書く(landed の束縛は merge commit SHA + mergedAt。head-integrity ゲートは未マージ経路では不変)。checkpoint 同梱ノルムは不変: 0
- Choice 2 B: 運用側で stale を作らせない — CLI は不変とし、create 後の同一ブランチ追加 push を検知した時点で created epoch の再 mint を必須化する機械ガード(pre-push/収束ループの deterministic check)を追加。既に stale 化した merged record は override 系の新 verb(人間 ruling 必須)で個別最終化: 0
- Choice 3 C: 混合 — A の祖先実測つき landed 最終化を主経路にしつつ、create の MERGED-head 誤作成防止(loud 拒否)と、stage 文書・ノルムの規範衝突記述の是正を同一変更で行う(A + #3109 防止 + 文書整合): 2
GoA: favor=2 against=0 abstain=0 discuss=0
GoA frequency: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
Reservations:
- Reservation subagent-1 [original:2026-08-15T12:42:30Z] GoA 2: C の主経路が FR-1 の deleted-branch 条項と FR-3 を満たすには、merged/landed アームのスコープに (a) pr-convergence-git-runner.ts:184-185 の remote-branch 先行拒否 (remote branch origin/<head> is missing; push it) と :186-188 の localHead===remoteHead===expected.oid、(b) amadeus-sensor-pr-convergence-report-format.ts:284-291 の checkAttestationEnvironment (receipt.localHead===remoteHead===prHead と git rev-parse HEAD 一致) を明示的に含めることを実装スコープの必須条件として固定すべき。この2点を merged アーム限定で置換(緩和ではなく merge commit 祖先実測への差し替え)しない限り、A/C いずれの祖先実測も遮断点2・3で到達不能なまま残る。あわせて stage 文書 pr-convergence.md:315-318 の『identity, epoch, and attestation prerequisites are unchanged』は実装挙動と矛盾するため FR-4 の同一変更での是正対象に必ず含めること。
- Reservation subagent-2 [original:2026-08-15T12:43:35Z] GoA 2: (1) 祖先実測の対象を『merge commit の祖先』と実装してはならない。org.md はスカッシュマージを規定しており、実測(PR #3092: headRefOid ad60b8afa / mergeCommit 7a9e362de、`git merge-base --is-ancestor ad60b8afa 7a9e362de` → exit 1)のとおり attested prHead は merge commit の祖先にならない。述語は『attested prHead が PR の merged headRefOid の祖先(= 同一ブランチ系譜の prefix)』であること、束縛は merge commit SHA + mergedAt、と実装前に明文化すること。あわせて head ブランチ削除後は当該 commit object の取得性が保証されないため、refs/pull/<n>/head の fetch か gh の compare API のいずれを一次証拠にするかを設計時に確定する。(2) 第3遮断点(pr-convergence-git-runner.ts:185 `remote branch origin/<head> is missing; push it`)は attestation 検査より前に評価される(cli.ts:642-650 → :666-672)。attestationBindsIdentity(:714-723)だけを緩めても FR-1 の『head ブランチ削除済みでも回復』は満たせないため、merged arm の git 前提条件の扱いを明示的にスコープへ入れること。(3) FR-3 は sensor の checkAttestationEnvironment(amadeus-sensor-pr-convergence-report-format.ts:284-289 の local==remote==prHead と現チェックアウト HEAD 一致)に landed 固有の意味論を与える必要があり、fail-closed 性は merge commit / mergedAt 束縛の改竄検査で置換して保存すること(緩和ではなく束縛対象の付け替え)。(4) C の文書是正は本裁定の反映に限定し(pr-convergence.md:311-318 の『identity, epoch, and attestation prerequisites are unchanged』と :341-346)、ノルム本文の再設計へ広げないこと。
Late responses:
- None
Run lineage: run-1

## Timeline
- tallied at=2026-08-15T12:44:28Z run=run-1