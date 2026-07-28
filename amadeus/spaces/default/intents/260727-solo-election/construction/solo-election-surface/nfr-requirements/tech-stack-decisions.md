# Tech Stack Decisions — solo-election-surface (U2)

上流入力(consumes 全数): business-logic-model.md(ソロ手順・降格・ノルム改定の論理)、business-rules.md(BR-U2-1〜8 の検証列)、requirements.md(FR-02/04/08〜13・NFR-01〜03 の正本)、technology-stack.md(SKILL/dist 投影の実行環境)。

## 決定

| 項目 | 決定 | 根拠 |
|---|---|---|
| 変更面 | prose(canonical SKILL.md・team.md)+integration テストのみ。TS 型・データ構造の変更ゼロ | business-logic-model.md、requirements.md FR-11/12 |
| テスト層 | テンプレ検査・文言 grep・同文照合はすべて integration 層(t242 と同型 — SKILL 実文を読む実 FS テスト) | business-rules.md 検証の層配置、cid:code-generation:fs-tests-integration-first |
| 配布 | SKILL 面 = canonical+self-install 3面+dist 3面の既存 packaging 経路 | requirements.md FR-13 |

## ゲート trace の明示(レビュー Minor 対応)

- BR-U2-1(t242 green)・BR-U2-8(dist/self-install 同期)は requirements.md FR-11/FR-13 の AC と既存 dist:check / promote:self:check ゲートが機械検証する(本 NFR 群での重複基準は設けない — 一元化)。
- 新規 integration テスト自体は NFR-03(カバレッジ・複雑度ゲート)の適用対象(requirements.md NFR-03 への明示 trace)。

## 不採用の選択肢

SKILL の新節追加(t242 契約改訂)・発動条件のエンジン機械化・独自テンプレエンジン導入は不採用(Q3=A 裁定・FR-09 の conductor 知識作業判定・既存 packaging 経路の再利用 — 上表の根拠列参照)。
