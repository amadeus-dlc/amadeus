# Scope Document — 260720-leader-store-sync(#1281)

上流入力(consumes 全数): intent-statement.md(問題定義・前提節)、feasibility-assessment.md(GO+方式実現可能性順)、constraint-register.md(C-1〜C-8)、raid-log.md(R-1〜R-3)

## スコープ種別

amadeus(自己ホスト框架開発・インフラ運用なし)。leader 所有物の main 同期の構造化 — 対象は scripts/ 面の tool とノルム面のみ(C-1/C-7)。

## Must(すべて必須 — Should/Could は置かない。scope-definition:c2 の厳格 Won't 方式)

方式(A 定期ノルム / C 生成機械化 / 併用)は requirements 段選挙で確定【裁定待ち — 該当 Must の効力は裁定に従属し、非採用分岐は Won't へ編入する】:

| # | 項目 | 由来 | 効力条件 |
| --- | --- | --- | --- |
| M-1 | leader 所有物の決定的抽出述語(elections/ 全量+clone-id→auditShardName 導出の自シャード) | R-1、feasibility seam 実測 1 | 方式 C(または併用)採用時 |
| M-2 | E-PM10A 除外規則の機械化+自己検査(自所有物外 M 全数の main 突き合わせ・memory 層 main 復元・snapshot 非同乗)— 除外を外すと赤になる落ちる実証込み | C-3/C-5、ディスパッチ (5) | 方式 C(または併用)採用時 |
| M-3 | sync PR 生成(origin/main 基点の単独ブランチ・PR 作成まで。マージは人間承認) | C-2/C-4 | 方式 C(または併用)採用時 |
| M-4 | 同期契機の運用ノルム persist(PM ラウンド毎/N 選挙毎等 — 契機定義は requirements で確定)+ #1280 級滞留の再発防止基準 | 方式 A 面、R-2 | 全方式共通 |
| M-5 | 検証 green 維持(typecheck/lint/tests --ci)+新設検査の corpus sweep(既存 elections 全量で赤くならない両側実証) | C-6、corpus-sweep-for-new-guards | 実装を伴う場合 |

## Won't(明示除外)

| # | 除外項目 | 根拠 |
| --- | --- | --- |
| W-1 | engine(amadeus-orchestrate/state 系)への変更 | C-7、e1 管轄面 |
| W-2 | election CLI(scripts/amadeus-election*.ts)への変更 — 方式 B(done 時 advisory)は採用時も別 Issue 委譲 | C-7/C-8、feasibility Q1 |
| W-3 | 配布フレームワーク(packages/framework/、dist/、self-install)への持ち込み | C-1、gh-scripts-boundary |
| W-4 | sync PR の auto-merge・マージ実行の機械化 | C-4、no-AI-merge |
| W-5 | メンバー intent record への干渉・代行 sync | C-5、E-PM10A |
| W-6 | 既存 elections store の遡及再編(様式変更・移動) | 監査 append-only、E-BRARA3=A と同族の遡及なし原則 |

## スコープ境界の判定規則

迷ったら1基準: 「leader 所有物(elections/ 全量・leader 自クローンシャード・persist 済み norm 差分)の main への運搬か?」— Yes なら本 intent、No(record の中身の様式・他所有者の運搬・エンジン挙動)なら他管轄。
