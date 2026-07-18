# Scope Definition — 明確化質問(260717-test-pyramid-rebuild、#684)

<!-- E-OC1 判定証跡(eoc1-evidence-in-questions-header):
判定: 全2問 選挙不要(既決導出 — feasibility Q2 の In/Out+units 分割方針の転記)。
申告: e2 → leader(agmsg 送信 2026-07-17T10:33Z 頃 — agmsg 一次記録)
leader 承認: 2026-07-17T10:34:25Z(agmsg 一次記録 — agmsg-git-evidence-split に基づく出典明示)
[Answer] 記入は leader 承認受領後にのみ行う。 -->

上流入力(consumes 全数): `../intent-capture/intent-statement.md`、`../feasibility/feasibility-assessment.md`、`../feasibility/constraint-register.md`

## 選挙不要判定(1問1行)

- Q1: 既決導出 — In/Out は feasibility Q2 裁定(分類台帳+層設計+再編計画 In、実移設 Out)の転記
- Q2: 既決導出 — units 分割方針は leader ディスパッチ(実測棚卸し/層設計/再編計画の独立 Unit 化)の転記、units-generation で具体化

## Q1: In/Out スコープは?

- A. In: (i) 全テストのサイズ分類台帳(計測導出) (ii) 層責務+比率目標+実行時間予算の設計 (iii) サイズ違反の移設是正を Issue 分割で計画 (iv) #683 層別カバレッジ整合の計画。Out: 実移設(テスト書き換え)・ランナー実装変更・比率のハードコード・新分類器
- B. In に実移設を含める
- C. 分類のみ
- X. その他

[Answer]: A — In: 分類台帳+層設計+再編計画+#683 整合 / Out: 実移設・ランナー実装変更・ハードコード・新分類器(E-OC1 承認 10:34:25Z)

## Q2: units 分割方針は?

- A. 大型につき units-generation で複数 Unit へ分割(候補: U1 分類台帳・実測、U2 層設計・比率・予算、U3 再編計画・Issue 分割)— 相互依存が真に必要な箇所のみ直列。単一 Bolt 非押込み(leader 明示)
- B. 単一 Bolt
- X. その他

[Answer]: A — units-generation で U1 分類台帳/U2 層設計/U3 再編計画へ分割(単一 Bolt 非押込み、E-OC1 承認 10:34:25Z)
