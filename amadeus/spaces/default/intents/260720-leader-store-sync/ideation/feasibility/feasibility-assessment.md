# Feasibility Assessment — 260720-leader-store-sync(#1281)

上流入力(consumes 全数): intent-statement.md(問題定義・前提節)、stakeholder-map.md(実行者 = leader の執行業務境界)

## 判定: GO

intent-statement.md の目標(leader 所有物の main 同期構造化)は既存 seam の内側で実装可能。外部依存の新規追加なし。測定 ref: worktree HEAD(team/20260719-231310-08a0/engineer-3、本ステージ実施時点)。

## 内部 seam の実測(feasibility:c1 — 実ツール検証、外部前提は本 intent に不在)

1. **抽出対象の決定性**: 選挙 store は `amadeus/spaces/default/elections/` 配下(main 実測 51 dir)。leader 自クローンシャードは `amadeus/.amadeus-clone-id`(`CLONE_ID_FILE`、amadeus-lib.ts:2194)→ `auditShardName`(:2838-2846、host+cloneId 合成)で**機械導出可能** — 「leader 所有物」の判定は heuristics でなく決定的関数で書ける。
2. **前例 tool**: `scripts/amadeus-mirror.ts` が「決定的状態読取・gh 経由・判別ユニオン Result・workspace lock 非接触」の repo ローカル CLI 前例(ヘッダコメント実読)。同スタイル踏襲で新規発明を回避(deterministic-function-direct-sweep 整合)。
3. **gh 可用性**: gh 2.96.0 実測(scripts/ 境界内の利用は gh-scripts-boundary で既決 — 不在時 loud exit 1)。
4. **PR 生成経路**: norm-pr-from-main-base(origin/main 起点の単独ブランチ)+E-PM10A(自所有物外の M 全数突き合わせ・memory 層 main 復元)は**既にノルム化済みの手順**であり、機械化はその決定的翻訳 — 新規判断を含まない。
5. **除外規則の検証可能性**: #1280 レビュー(e3)で実施した検査群(純追加性・JSON parse・マーカー3語彙・snapshot 非同乗)は全て機械化可能な述語で、生成 tool の自己検査(落ちる実証対象)にできる。

## 方式 A/B/C の実現可能性(選挙材料 — 確定は requirements 選挙)

- A(定期 sync ノルム): 実装ゼロ・即日運用可。恒久の取りこぼし防止は leader の記憶に依存(#1281 の機序そのもの)。
- B(CLI done 時 advisory): election CLI(e2/e4 管轄面)への変更を要し、スコープ境界(Q2)と交差 — 本 intent 単独では不成立、別 intent 委譲が必要。
- C(sync PR 生成の機械化): 上記 seam 実測により scripts/ 内で完結可能。E-PM10A 準拠(e2 前提条件)は除外規則の実装+自己検査で充足可能。
- 実現可能性順: C=GO / A=GO(暫定運用として)/ B=本 intent スコープ外(条件付き)。

## リスク(raid-log 参照)

主要リスクは「leader 所有物」境界の誤判定(R-1)と生成 PR の巨大化(R-2)— いずれも constraint-register の除外規則と分割条件で緩和。
