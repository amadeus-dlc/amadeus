# Constraint Register — 260720-leader-store-sync

上流入力(consumes 全数): intent-statement.md(前提節)、stakeholder-map.md(非ステークホルダー境界)

## 制約一覧

| # | 制約 | 出典 | 帰結 |
| --- | --- | --- | --- |
| C-1 | scripts/ 配下の repo ローカル tool に限定(配布フレームワーク・dist・self-install へ持ち込まない) | gh-scripts-boundary(project.md) | 実装は scripts/amadeus-*.ts、Bun-only Forbidden 非接触 |
| C-2 | sync PR は origin/main 起点の単独ブランチから | norm-pr-from-main-base | 生成 tool はブランチ作成から main 基点を強制 |
| C-3 | 自所有物外の M ファイル全数を origin/main と突き合わせ、memory 層は main 版へ復元 | E-PM10A(2026-07-20 着地) | 除外規則を tool の決定的述語として実装+自己検査 |
| C-4 | マージは人間承認(leader 執行) | no-AI-merge / leader-executes-merge | tool は PR 作成まで。auto-merge 禁止 |
| C-5 | メンバー record(intent snapshot)へ干渉しない | E-PM10A+#1264/#1275 レビュー実例 | 抽出対象 = elections/ 全量+leader 自クローンシャード+PM persist 済み norm 差分のみ |
| C-6 | 検証 green 維持(typecheck / lint / tests --ci)+新設ガードの落ちる実証 | project.md Testing Posture+Mandated | 新規 tool のテストは tests/ へ、除外規則の赤テスト必須 |
| C-7 | engine 面(e1)・election CLI 面(e2/e4)へ触れない | leader ディスパッチ (4) | B 方式は本 intent 非採用または別 Issue 委譲 |
| C-8 | 選挙 store の追記は leader 実行文脈のみ(tool は読取+ git 操作) | 選挙 store の所有権(election CLI 設計) | tool は elections/ を read-only 消費 |

## 運用注記

- C-3/C-5(E-PM10A 系)は生成 tool の落ちる実証対象(除外規則を外すと赤になるテスト)として code-generation へ引き継ぐ。
- C-7 により方式 B は本 intent 単独で不成立 — requirements 選挙の選択肢注記に反映する。
