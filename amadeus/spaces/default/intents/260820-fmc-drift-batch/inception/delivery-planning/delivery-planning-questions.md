# Delivery Planning — 質問と裁定

Intent: 260820-fmc-drift-batch / Depth: Standard(予算 最大8問、本ステージは1問)
回答モード: Intent Autonomy `full` — `amadeus-bolt decide-question` 梯子で裁定。
承認エビデンス: full autonomy grant は 2026-08-20T07:18:02Z にユーザー承認済み(grant_id intent-grant-79f28345c4f20469c2ec87c6a12aeffa)。以下の [Answer] は grant 下の AUTO_DECIDED 裁定。

導出元: `unit-of-work.md`(4 unit + 生成台帳の扱い)/ `unit-of-work-dependency.md`(辺2本、並列集合 {U1,U2,U3})/ `unit-of-work-story-map.md`(Issue 対応)/ `requirements.md` / `components.md`。シーケンシング方針は scope-definition Q2=A(dependency-first + 最大並列、Bolt 1 = walking-skeleton)で裁定済みのため、残る材料判断は Bolt 編成の具体形1点のみ。

## Q1: Bolt 編成はどれを採るか?

- A. 3 Bolt 構成: Bolt 1 = `advisory-retirement`(walking-skeleton ゲート対象 — 削除中心で薄く、宣言→コード→テスト→CI→PR の全統合点を通る最小 end-to-end スライス)/ Bolt 2 = `revise-model-commit` + `boundary-three-face`(並列バッチ、worktree 分離)/ Bolt 3 = `applicability-arms`(依存辺2本の合流末端)
- B. 4 Bolt 直列(U3 → U1 → U2 → U4)
- C. 2 Bolt: Bolt 1 = U3 + U1 + U2(3並列)/ Bolt 2 = U4
- X. Other (please specify)

[Answer]: A — 依存辺(U3→U4、U1→U4)と並列集合 {U1,U2,U3} に整合し、walking-skeleton ゲート(self-feature の Mandated — Bolt 1 単独・ゲート付き実行、org.md)を最小スライスで通せる。C は Bolt 1 に3 unit を載せ walking-skeleton の「thinnest slice」原則に反する。B は並列性を捨てる。U1 を Bolt 1 に置かないのは、leaf モジュール新設を含む U1 より削除中心の U3 の方が薄く、かつ U3 が直列鎖(U3→U4)の先頭で早期着地の価値が最大なため。(AUTO_DECIDED auto-decision-c29e806510cb9dc5b9e82ad6661bc14a, 2026-08-20T13:11:47Z)
