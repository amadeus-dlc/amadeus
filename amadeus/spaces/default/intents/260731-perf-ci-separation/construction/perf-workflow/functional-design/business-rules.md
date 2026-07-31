# Business Rules — U2 perf-workflow

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

前提: 本 BR 群は unit-of-work.md U2 の充足 FR(requirements.md の FR-2/AC-2、NFR-2)と unit-of-work-story-map.md ジャーニー2 の3体験(検知・可視化・drift 観測 = BR-U2-1/4/7 が対応)から導出する。

## ルール一覧

- BR-U2-1: perf.yml は schedule(cron `47 17 * * *`)+ workflow_dispatch の2トリガーのみ(FR-2a / ADR-5)。push / pull_request トリガーを持たない(services.md の非 blocking 区分)
- BR-U2-2: perf.yml の job を ci.yml `ci-success` の needs・branch protection required checks に追加しない(FR-2c / AC-2)
- BR-U2-3: 全 job に timeout-minutes を明示(25/5/5 — component-methods.md C-3 の実測導出。NFR-2 / FR-2e)
- BR-U2-4: 失敗時は STEP_SUMMARY へ要約を追記(FR-2d)。Issue 起票・外部通知の step を置かない(Q3=B)
- BR-U2-5: distribution-benchmark / aggregate の step 列は ci.yml :224-277 と機能等価(スクリプト・引数・artifact 名は不変 — FR-3d 対照表 V-1〜V-4 の受け皿)
- BR-U2-6: 新規 secrets / GitHub App token を導入しない(既定 GITHUB_TOKEN — components.md C-3 の意図的相違)
- BR-U2-7: perf-tests は test-size-report を artifact 化(retention 14日 — R-2/V-8 の受け皿)
- BR-U2-8: ヘッダコメントに (i) 非 blocking の設計意図(loud-fail 契約 — ci-pipeline:c3) (ii) perf tier は CI-resident 主張不可(ADR-6) (iii) schedule 60日 suspend 仕様(R-3)を文書化

## 落ちる実証

- マージ後の workflow_dispatch 初回実行で全 job green を実測(AC-2)。加えて負の対照: perf.yml が PR CI に現れないこと(本 PR 自身の check 一覧に perf 系 job が無いことを実測)
