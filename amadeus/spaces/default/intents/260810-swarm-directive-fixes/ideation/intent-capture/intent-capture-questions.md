# Intent Capture 質問票 — 260810-swarm-directive-fixes

> **Mode:** chat（Intent grant による自動裁定。既存の詳細なユーザー指示と、両 Issue のクロスレビューコメントから回答を抽出）
>
> **根拠:** [Issue #2833](https://github.com/amadeus-dlc/amadeus/issues/2833) および [Issue #2834](https://github.com/amadeus-dlc/amadeus/issues/2834) の本文・全コメントを 2026-08-10 に確認した。クロスレビュー2名の精密化と leader のトリアージ記録を、起票本文より優先する。
>
> **自動裁定証跡:** Intent autonomy grant 承認: 2026-08-10T12:50:12Z。interaction mode decision: `auto-decision-e746c7c683de4707b8a04561c0b62a25`（selected option: `chat`）。

## Q1: 解決する問題は何か

- A. `{unit-name}` プレースホルダーの表示だけを直す
- B. swarm Abort 後の Stop hook だけを直す
- C. 2件を別 intent として個別に直す
- D. 共有する per-unit Construction directive 発行経路の契約欠陥を、1 intent 内の独立 Unit として閉じる
- X. その他（自由記述）

[Answer]: D. #2834 の非 per-unit consumer における per-unit input 解決欠落と、#2833 の halt-and-ask 裁定を engine 発行判断へ反映できない欠落を、同一領域の欠陥として1 intentで閉じる。並行化は Unit と Construction swarm で行う。

## Q2: 主な利用者・受益者は誰か（複数選択）

- A. Amadeus workflow を実行する利用者
- B. Construction swarm を運用する conductor / builder
- C. directive の `consumes` を信頼する stage agent / reviewer
- D. PR とマージ承認を管理する maintainer / leader
- X. その他（自由記述）

[Answer]: A, B, C, D. workflow 利用者は停止裁定が忠実に保存されること、実行者と reviewer は実在する入力パスと正しい終端状態を受け取ること、maintainer は回帰テストと Bolt 単位のレビュー可能な変更を得ることが必要。

## Q3: 成功をどう測るか

- A. #2834 の7 consumer stage すべてで、利用不能な未解決 Unit パスが required `consumes` に残らない
- B. #2833 の Retry / Skip / Abort が engine-owned な遷移としてテストされ、Abort 後に同一 Unit を再提示しない
- C. autonomous Construction の安全停止を Stop hook が1回で終端として扱い、未達 stage を成功扱いしない
- D. TDD、既存 suite、build、source-only / distribution 同期の検証がすべて green になる
- X. その他（自由記述）

[Answer]: A, B, C, D. #2834 は build-and-test 単独でなく同根7 stage と reviewer read scope を対象とする。#2833 は Abort だけでなく Retry / Skip、swarm / non-swarm の同根を閉じる。`report --result failed` の拒否は exit 0 + error directive として検証する。

## Q4: 今回の initiative の契機は何か

- A. 市場機会
- B. 規制対応
- C. 実運用で再現した重大な workflow 欠陥
- D. 任意のリファクタリング
- X. その他（自由記述）

[Answer]: C. #2833 は P1 / S2-CRITICAL として4つの契約ギャップが実測され、#2834 は P2 / S3-MAJOR / origin:bootstrap として required input の無音劣化が実測された。両方とも2名の独立クロスレビューで `ESTABLISHED_WITH_REFINEMENTS` に収束済み。

## Q5: intent 境界と実装境界をどう保つか

- A. Issue ごとに intent を分割する
- B. 1 intent・1 Unit・1 PR にまとめる
- C. 1 intentのまま Issue / 契約境界ごとに Unit と Bolt を分け、Bolt ごとに PR を作る
- D. Construction まで境界を決めない
- X. その他（自由記述）

[Answer]: C. `cid:intent-capture:c4-2` に従って intent は分割しない。units-generation で依存 DAG と競合面を確認し、Construction は隔離 worktree の swarm、成果は Bolt ごとの PR とする。PR のマージはユーザー承認後に leader が実行する。

## 回答分析

- 5問すべて回答済みで、空の `[Answer]:` はない。
- 単一 intent と Bolt 単位 PR は両立する。intent は追跡 anchor、Unit / Bolt / PR は並行実装とレビューの境界である。
- #2834 の `consumes_absent` 契約改訂と N×M fan-out 形状は、既存明文契約・固定テストとの衝突があるため、この段階では方式を確定しない。Reverse Engineering と Requirements Analysis で明示裁定する。
- #2833 は Stop hook の変更を前提にしない。engine が既存の終端 directive を発行できることを成果条件とし、具体方式は後続設計で確定する。
