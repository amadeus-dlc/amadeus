# §13 学習候補 — requirements-analysis(260719-mirror-productization)

提出: conductor e3、2026-07-23T01:45Z 頃。採否選挙用 verbatim 正本。

## 候補1(採用提案)

**候補文**: conductor がターン境界に到達できない同期レビュー回収(Stop hook 強制下)では、reviewer subagent の verdict を record 外 scratch ファイルへ併書させる配送形を許可する — 「成果物への書込禁止」は不変、最終テキスト返送も併用。conductor は verdict ファイルの出現を until ループで同期回収する。

**統合先想定**: cid:code-generation:builder-prompt-sync-completion の E-BFAADS13 追補(「verdict は最終テキストのみ」)の精密化 — 同追補の趣旨は成果物中間への Review 節挿入の防止であり、record 外 scratch への併書は趣旨と両立する。

**実測根拠**: 本ステージ初走(ra-review-i1)が最終テキスト経路で回収不能(SendMessage 2回・計10分無応答、Stop hook によりターン境界へ到達不能)→ scratch 併書形の再走(ra-review-i1b/i2)で verdict を2 iteration とも数分で決定的に回収。conductor-sync-subagent-collection と E-BFAADS13 の構造的デッドロックを埋める。

## 不採用(PM 違反実例カウントへ回付)

- **(a)** iteration 1 レビュアーが読取許可範囲に team.md を含まないまま「cid:approval-lineage-citation は存在しない」と不在断定(Major 誤指摘)→ conductor 反実測(team.md:283、1 hit)で却下 — cid:absence-claim-grep-verify の違反実例(subagent 側)
- **(b)** E-TCRRA1 の recorded 選挙への stale 再配布(leader 起因、照会→破棄済み・PM 台帳記帳済み)— 本 intent の観測としては記録のみ

parked open questions: 0 件。
