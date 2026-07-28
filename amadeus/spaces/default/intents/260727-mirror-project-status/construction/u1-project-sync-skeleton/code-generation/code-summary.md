# Code Summary — u1-project-sync-skeleton(walking skeleton)

上流入力(consumes 全数): business-logic-model, business-rules, domain-entities, performance-design, security-design, unit-of-work, requirements

実装は Bolt ブランチ `bolt/u1-project-sync-skeleton`(base `3eba39a90` = origin/main)上の3コミット。builder subagent が実装、conductor が typecheck・新規テスト 172/172 pass を独立裏取り済み。

## コミット

| SHA | 内容 |
|---|---|
| `7084b078c` | C0 types / Project permit ブランド / C1 `mirror-projects` / C2 status 導出(plan Step 1–4) |
| `1e92f18f9` | C5 GraphQL gateway 族 / projectSync 台帳(codec+reducer)(Step 5–7) |
| `be404c29c` | C6 syncProjects 配線 / t342 / allowlist 再ピン / deslop(Step 8–10, 12) |

## 変更ファイル(正本 packages/framework/core/tools/)

types +147 / gateway +398 / policy +74 / codec +123 / executor +約250 / config +約200 / coordinator / capability / state-reducer +43。dist 7ハーネス+self-install は再生成のみ。

## テスト(unit-of-work のジャーニー1・FR 割付へ写像)

新規5本 172 テスト: t339 policy(22 — expectedProjectStatus 3分岐・上書き・未知フェーズ)、t340 gateway(67 — argv golden・negative assert: PR/release/deploy/削除/`user(` 0 hit・`@/etc/passwd` -f 強制)、t341 ledger(26 — round-trip)、t343 config(37 — closed schema)、t342 executor integration(20 — 二重実行冪等・既一致 no-op・全 skip・safety-blocked 診断 golden+秘匿 0 hit・照会1+mutation≤2 history assert)。既存更新: t279/t282/t284/t300(gateway 4実装へ追従)、t274/t257/t280。

## 実装時裁定と申告済み設計判断

- **E-U1CG 裁定(conductor 一次証拠裁定)**: 案 A(listProjectItems → {issueNodeId, items} / MirrorProjectStatusField.projectId / 手順3=resolve→4=add)+organization 固定。FD/component-methods へ申告済み。
- builder 申告7件(いずれもプラン委任範囲の具体化 or 実測根拠付き): (1) Project permit は MirrorOperation を広げず並行ブランド新設(C0 の union 不拡大契約の維持) (2) permit 照合は mutation 種別のみ(node id の自己参照比較 = 検証劇場の回避) (3) listProjectItems 引数を MirrorIssueRef へ narrow(構造的互換) (4) 未知フェーズ → keep(fail-closed — initialization 対応) (5) keep でも add は実行(FD 手順順序どおり — parked は Status のみ抑止) (6) gh argv の文字列は常に -f(-F の @file 解釈による file 読出し面を遮断) (7) MirrorProjectDiagnostic.reason から field-missing を除去(現契約で発火不能な語彙)— **U4 実装時に FR-9a (iii) の field-missing/option-missing 区別との整合を要再確認**。
- BR-U1-7(GraphQL errors 写像表): 保守的写像(未知 → api)+PROVISIONAL コメントで実装。**実測確定は実運用/Step 11 で行い BR へ追記するまで完成扱いにしない**(external-seam-vocab-measurement)。

## 検証(builder 実測+conductor 裏取り)

typecheck 0 / lint 0 / package 0 / promote:self 0 / dist:check 0 / promote:self:check 0 / patch gate 0(added 543, uncovered 0, allowlist 1 = 型注釈行のレンジ拡張) / run-tests --ci = 1 — **唯一の赤 t132 は base 3eba39a90 でも同一入力・同一赤**(入力3面のバイト一致を git diff で機械確認 — 自変更非起因。docs count ガード方針の Issue 化を推奨)。

## 残作業(U1 検収前)

- Step 11: 実 Project #5 での mutation 実証(A-4 により add 成功 → safety-blocked 正観測の見込み)— **外部 mutation のため walking-skeleton ゲートでユーザー判断**。
- t132 の既存赤の Issue 起票。
- PR 発行(conductor)。
