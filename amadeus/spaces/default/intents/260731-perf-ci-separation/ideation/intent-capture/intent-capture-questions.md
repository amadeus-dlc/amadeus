# Intent Capture 質問票 — 260731-perf-ci-separation

> 事前裁定(ユーザー承認済み・2026-07-31 の会話): 性能検証を PR blocking の ci.yml から分離し、run-tests に perf tier を新設して `--ci` から perf テストを除外、schedule + workflow_dispatch トリガーの perf.yml(PR 非 blocking、main 失敗は loud 可視化)へ移す方針は**確定済み**。本質問票は未決の判断のみを問う(cid:intent-capture:c1)。
>
> 各選択肢には事前裁定ベースに対する増減方向(縮小/維持/拡大)を明記する(cid:intent-capture:c1-option-direction)。

## Q1: perf.yml の定期実行頻度

perf.yml の schedule トリガーの頻度をどうしますか(workflow_dispatch は常時併設)。

- A. 毎日1回(夜間)— 退行検知の遅延最大24h。ベース記述「定期的なトリガー」の標準的解釈(維持)
- B. 週1回 — 実行コスト最小、検知遅延最大7日(縮小)
- C. 毎日1回+main への push ごと(非 blocking)— 検知即時性最大、コスト増(拡大)
- X. その他(自由記述)

[Answer]: A. 毎日1回(夜間 schedule)+ workflow_dispatch 常時併設

## Q2: distribution-benchmark ジョブ(3 replicas + aggregate)の扱い

現在 ci.yml で full PR ごとに実行される Intent Mirror benchmark 群を perf.yml へ移しますか。移すと PR blocking の性能ゲート(`distribution-required` の PERFORMANCE_RESULT 検査)が外れます。

- A. perf.yml へ移設し、PR blocking から外す — ベース記述「移設も設計対象」の採用側。分離の趣旨に一貫(維持)
- B. ci.yml に残す — 本 intent は bun test 系 perf テストの分離のみに絞る(縮小)
- C. 設計ステージで実測(ジョブ所要時間・偽赤履歴)を根拠に決める — 判断を design へ委譲(維持・判断先送り)
- X. その他(自由記述)

[Answer]: A. distribution-benchmark 群(3 replicas + aggregate)も perf.yml へ移設し、PR blocking から外す

## Q3: perf.yml が main 上で失敗したときの運用

schedule 実行の失敗(性能退行検知)をどう扱いますか。

- A. 自動で GitHub Issue を起票(bug/P2 相当、重複起票ガード付き)— 検知から起票まで機械化(拡大)
- B. workflow 失敗の loud 可視化のみ(GitHub の workflow 失敗通知に委ねる)— ベース記述どおり(維持)
- C. 失敗時に既存 Issue へのコメント追記のみ(専用 tracking Issue 方式)(維持)
- X. その他(自由記述)

[Answer]: B. workflow 失敗の loud 可視化のみ(GitHub の失敗通知に委ねる。自動起票なし)

## Q4: #1830 の予算・timeout 是正を本 intent に含めるか

#1830 は「120s timeout」と「絶対 median 予算 500ms の機種差」の2経路の偽赤を報告しています。分離(perf.yml 化)により PR blocking からは外れますが、perf.yml 上でも偽赤は起き続けます。

- A. 含める — 分離と同時に perf テスト自体の予算・timeout をランナー差に頑健な形へ是正(拡大)
- B. 含めない — 本 intent は分離のみ。#1830 の是正は別 intent(縮小)
- C. timeout 予算(経路A)のみ本 intent で是正し、絶対予算の基準変更(経路B)は別 intent(中間)
- X. その他(自由記述)

[Answer]: C. 経路A(テスト全体の 120s timeout)の是正のみ本 intent に含める。絶対 median 予算の基準変更(経路B)は別 intent

## 裁定の記録

AskUserQuestion(guided mode)による本人回答 4/4。Q1=A / Q2=A / Q3=B / Q4=C(いずれも推奨案の採用)。選挙対象なし(ユーザー直接裁定・ソロ運用)。

ユーザー承認: 2026-07-31T09:00:19Z
