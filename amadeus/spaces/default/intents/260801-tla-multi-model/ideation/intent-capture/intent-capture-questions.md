# Intent Capture 質問記録 — 260801-tla-multi-model

上流入力(consumes 全数): なし(ideation 起点)。参照: Issue #1921 / #1920(クロスレビュー verdict 2名ずつ投稿済み)

E-OC1 判定: 本ファイルの3問はいずれもスコープ境界・設計方式・成功定義の裁定であり、ソロモードでは仕様裁定はユーザー専権(エスカレーション正準リスト(4)・auto-solo-election の対象外)のため選挙を実施せず、AskUserQuestion によるユーザー直接裁定で回答を確定した。記入は裁定受領後(cid:code-generation:election-answer-after-ruling)。
ユーザー承認: 2026-08-01T14:50:00Z

## Q1: バッチ境界 — `tla-arm.ts:322-332` の `TLA_NAMED_INVARIANTS`(FormalElection 固有 frozen 集合)の unpin を本 intent に含めるか

クロスレビュー reviewer-2 の見落とし指摘: 対応案1(変数列のモデル別化)だけでは MirrorLifecycle の反例が依然 parse 不能で、#1920 受け入れ条件「落ちる実証(注入で赤)を両モデルで実測」が充足できない。

- A. 含める — #1920 の AC 充足に必須であり、同根の単一モデル前提の一員として本バッチで unpin する
- B. 含めない — 別 Issue に切り出す(その場合 #1920 の「両モデルで落ちる実証」は本 intent では未達を明示する)
- X. Other (please specify)

[Answer]: A. 含める

## Q2: #1921 の修正方式の方向(スキーマ変更の裁定)

Issue 本文が「案の選定は裁定事項」とする2案。

- A. モデルエントリに補助モジュール(EXTENDS/INSTANCE 先)の identity 配列を明示宣言させる — 宣言的で監査しやすいが、宣言漏れで再び無音化しうる
- B. `.tla` の EXTENDS/INSTANCE を静的解決して推移的にピンする — 宣言漏れが起きないが、parser 相当の実装が増える
- C. A+B 併用(明示宣言を正とし、推移解決で宣言漏れを検出して赤にする)
- X. Other (please specify)

[Answer]: C. A+B 併用(明示宣言を正とし、推移解決で宣言漏れを検出して赤にする)

## Q3: 成功の定義(測定可能な成果)

- A. (i) CI の formal-model-check ジョブが MirrorLifecycle AsIntended を完全探索で green、(ii) drift ガードが MirrorLifecycleCore.tla への意味論編集を赤で検出、(iii) FormalElection 側の結果・receipt identity 不変、の3点
- B. A に加えて両モデルで注入による落ちる実証(red 実証)を恒常 CI の証跡として残す
- X. Other (please specify)

[Answer]: A. 3点
