# Requirements Analysis 質問記録

上流入力(consumes 全数): intent-statement、scope-document、business-overview、architecture、code-structure

## 対話モード

- 選択: 自律モード full(intent-grant-fd0ed2b79c48204d342920ce3b4b67f0)— 質問は grant の decide-question(auto-decision 記録、後日レビュー可能)で確定
- 質問予算: 最大8問(Standard depth)/ 起草4問(Issue・RE が明示残置した真の未決のみ)

## 質問と裁定

### Q1. install 後の適用範囲

scope-document の Requirements 送付事項(1)。Issue #1971 は「code-generation を EXECUTE する scope の全 Bolt(さらに scope 名指しで絞るかは requirements で確定)」と既定を名指しして残置。

- A. code-generation を EXECUTE する全 scope の全 Bolt(Issue 既定の維持)
- B. 名指し scope のみ(縮小)
- X. Other

[Answer]: A — auto-decision-28cf30a55acfa5f2d95e0b839243873b(basis: agent-recommendation、grant intent-grant-fd0ed2b79c48204d342920ce3b4b67f0、reviewState: unreviewed)。根拠: Issue 既定の維持。絞り込みを支持する証拠が RE(codekb re-scans/260805-pr-convergence-plugin.md)に存在しない。

### Q2. GitHub 不達時の挙動

scope-document の Requirements 送付事項(2)。fail-closed の裏面(Issue 残リスク節)と cid:practices-discovery:gh-scripts-boundary「恒久停止させない」「人間承認境界維持」の調停。

- A. park 既定+人間承認記録付き override の両建て
- B. park のみ
- C. override のみ
- X. Other

[Answer]: A — auto-decision-55760c28f6c89a1ead33a2d5ad3966a6(basis: agent-recommendation、reviewState: unreviewed)。根拠: park は不定長人間待ちの正規手段(cid:requirements-analysis:park-for-human-turn-wait)、override は人間の明示承認+台帳記録を要件化することで検証劇場 Forbidden(無音バイパス)と区別される。gh-scripts-boundary の両要請を同時充足する唯一の選択肢。

### Q3. approve 時ガード(#1902 R3)との発動点所有権

scope-document の Requirements 送付事項(3)。RE が approve 側 fail-open 3経路(unitCovered :3465 / kindAwareArtifactsExist :1678・:1676 / ANY :1691-1694)を確定済み。

- A. 本 intent は per-unit 前進判定(unitCovered)のみを所有。approve 側は #1902 の責務として Out of scope に明示し、RE 実測(3経路)を #1902 へ申し送る
- B. approve 側も本 intent で塞ぐ(スコープ拡大)
- X. Other

[Answer]: A — auto-decision-5fcc82b161a49d05df340d30113386af(basis: agent-recommendation、reviewState: unreviewed)。根拠: Issue 責務分担節が #1902 を前段(発行の保証)として分離済み。B はグラントの prohibitedEffects(scope-out)に抵触する拡大であり、無言のスコープ拡張・縮小のどちらも避ける唯一の整合形。

### Q4. 収束ループ Guardrail 本文の正本所在

RE 裁定候補10。Issue は「既存スキル Guardrail はポインタ参照で継承」と書くが、RE 実測でスキル正本はリポジトリ外($HOME/.agents/skills/)にあり、ポインタ参照は未 install 環境・別ハーネスで空文化する(Issue 本文と実測の矛盾 = 真の未決)。

- A. plugin 出荷の工程本文へ要点を self-contained に正本化(出典クレジットとしてスキル名を記載)
- B. 外部ポインタ参照を維持
- X. Other

[Answer]: A — auto-decision-74bc4838aa905efdcb0b2dabf298924c(basis: agent-recommendation、reviewState: unreviewed)。根拠: plugin の opt-in 自己完結原則(install しない環境・ハーネスに依存を残さない)から一意導出。B は全ハーネス同一の実行を保証できない。

## RE 裁定候補の処理(執行分 — 質問化しない)

RE の裁定候補10件のうち Q1-Q4 で扱った3件(候補3は Q1 と同根、候補8=Q3、候補10=Q4)を除く7件は、一次証拠から一意に導出される執行として requirements.md へ直接固定した: 候補1(seam 実装方式は capability 要件として固定し機構選択は application-design へ委譲)、候補2(sensor manifest は core 側配置の既習形へ訂正)、候補4(produces_kinds fail-open 封鎖を AC 化 — §13 persist 済みノルムと整合)、候補5(収束述語の canonical 1定義)、候補6(gh gateway 相乗りの要件化)、候補7(import-closure 通過を AC 化)、候補9(tNNN t444 以降予約)。

## 完全性確認

- 空の回答タグ: なし(4問すべて auto-decision 記録付きで確定)
- 未解決の Requirements 判断: なし
- 後続 stage へ委ねる判断: seam 実装機構の選択(application-design)
- ユーザー承認: 2026-08-05T05:33:39Z(自律モード full グラント発行の実 HUMAN_TURN、audit シャード実測 — グラント ID intent-grant-fd0ed2b79c48204d342920ce3b4b67f0。各 auto-decision は list-auto-decisions / review-auto-decision で後日人間レビュー可能)
