# Intent Capture — 質問(260814-coverage-quick-norm)

> ユーザー起動文で対象ファイル・追記先節・ノルム3点・根拠 PR/Issue・PR 運用・禁止事項は確定済み。既決事項は再質問しない(cid:intent-capture:c1 / cid:requirements-analysis:c5)。以下は stage 様式の4題で、選択肢 A が起動文の逐語確定を写す。Intent autonomy = full のため回答は `amadeus-bolt decide-question` 梯子で裁定する(cid:scope-definition:c1-semi-ladder-routing)。Grill me は semi/full 下で提示しない。
>
> 承認: 2026-08-14T06:16:30Z — Intent autonomy `full` グラント(intent-grant-aeaf503d752d1b5b3fb8612f5557822f)に基づく AUTO_DECIDED 裁定。Q1 = auto-decision-7fa1d89d88bc62c4e579b35af540c2f8、Q2 = auto-decision-f7ba2de94f66a36fcef09c116c185163、Q3 = auto-decision-6b5dee750dce1e1bd735c7c539e08b6c、Q4 = auto-decision-d7e81e47e93208177ae6e32bc112c810。solo-election は native 結果不在のため loud degrade のうえ agent-recommendation。

## Q1: 解決する問題は何か

- A. CI Patch Coverage Gate は判定 3 秒に対し合流 lcov 生成が実測 11 分 03 秒級で、ローカルのフル `coverage:ci` が開発の律速になっている。push 前の内側ループを `coverage-patch-quick` の advisory 判定へ寄せ、フル計測をゲート直前の最終確認1回に限る運用ノルムを Inbox へ追記する(推奨 — 起動文の逐語)
- B. フル `coverage:ci` を push 前の義務にする
- C. CI の Patch/Project Coverage Gate を advisory に落とす
- X. Other (please specify)

[Answer]: A(AUTO_DECIDED auto-decision-7fa1d89d88bc62c4e579b35af540c2f8)

## Q2: 受益者と痛みは誰か

- A. このリポジトリで自己開発する conductor / エージェント。痛みは「push して CI で赤を知る」往復と、フル coverage 並行実行による相互破壊(推奨 — Issue #2933 / 既存 cid:code-generation:c1-coverage-single-owner)
- B. 配布先の利用プロジェクト(プラグインを汎用化する)
- C. CI インフラ担当のみ
- X. Other (please specify)

[Answer]: A(AUTO_DECIDED auto-decision-f7ba2de94f66a36fcef09c116c185163)

## Q3: 成功の定義は何か

- A. `project.md` の Learnings Inbox(未蒸留)へ、様式を既存エントリに合わせた1件を追記し、引用数値・PR/Issue を実測照合した単独 PR を CI green・レビュー READY まで持って停止する。蒸留済み本文・無関係ファイル・他 intent record は触らない。マージはしない(推奨 — 起動文の完了条件)
- B. 蒸留済み Corrections / Testing Posture 本文へ直接昇格する
- C. README / `docs/` も同時に書き換える
- X. Other (please specify)

[Answer]: A(AUTO_DECIDED auto-decision-6b5dee750dce1e1bd735c7c539e08b6c)

## Q4: なぜ今か(トリガー)

- A. PR #2965(Issue #2933、クロスレビュー成立済み)で `plugins/coverage-patch-quick` が着地し、このワークスペースの `amadeus/config.json` で有効化済み。ツーリング半分は着地、運用ノルム半分が未蒸留 Inbox に無い(推奨 — #2965 / #2962 の役割分担)
- B. ツーリング未着地のままノルムだけ先に書く
- C. 定期蒸留ラウンドでまとめて扱う
- X. Other (please specify)

[Answer]: A(AUTO_DECIDED auto-decision-d7e81e47e93208177ae6e32bc112c810)
