# Constraint Register — election-ts-foundation

> 上流入力(consumes 全数): intent-statement.md

## 確定制約(Confirmed)

| ID | 制約 | 由来 | 影響 |
|---|---|---|---|
| C-01 | 人間裁定の保存 — タイ・GoA 8 ブロック再審・エスカレーションはツールが代替しない | P1/P4(第一原理)+intent-statement 前提 | 開票結果は「成立/保留(要人間)」の二値を返す設計になる |
| C-02 | blind 性 — 開票前に票が他投票者へ可視化されない | election-protocol(アンカリング防止) | 票の輸送は leader 宛 agmsg 私秘(Q3=A)。開票前の票ファイル共有禁止 |
| C-03 | 留保転記の完全性 — GoA 2/3/6 票の留保は裁定・persist 文へ全数転記 | citation-reservation-preservation ほか | 構造化票形式に留保欄を必須フィールド化(Q6=A) |
| C-04 | 記録は実行結果由来のみ — 集計・度数・タイムラインの手書き転記禁止 | P2/検証劇場 Forbidden | persist 文・GoA 行はツール生成のみ。手編集は検出対象 |
| C-05 | 【D-12 で改定 2026-07-19】輸送抽象 — team=agmsg メンバー投票 / solo=spawn サブエージェント投票。票に voter 種別(member/subagent)を必須属性として明記 | 当初「チームモード限定」→ ユーザー裁定 D-12(decision-log)で改定。ソロ規定「利用可能な独立レビュー手段を使う」の選挙への形式化 | 票構造・開票・記録は両モード共通。サブエージェントの構造的隔離が blind 性を無償保証 |
| C-06 | 配布外(チーム内ツール) — framework dist へ含めない | Q1=A 裁定 | gh 依存可(scripts/ 境界)、Bun-only 制約は当面非適用。製品化時は再設計判断 |
| C-07 | ファイル正本 — 選挙定義・開票記録は git 管理ファイルが唯一の正本、agmsg は短通知のみ | Q2=A 裁定 | agmsg-git-evidence-split の構造的解消。truncate クラス排除 |
| C-08 | 既存様式との互換 — persist 文の GoA 行・PM-cid 行は `parseGoaLine`/`parsePmCidLine` の既存スキーマに適合 | norm-metrics 実装(PR #1112 テスト固定) | 蒸留ラウンドの下流消費を壊さない |

## 方針制約(Policy — 本 intent では記録のみ)

| ID | 制約 | 備考 |
|---|---|---|
| P-01 | 基盤着地後、選挙系 prose ノルムは蒸留ラウンドの「機械化」行き先として縮約(Q4=A) | 実行は着地後の蒸留選挙+ノルム PR。二重管理は採らない |
| P-02 | 将来拡張(E-OC1・クロスレビュー2名成立・PM ラウンド)はデータモデルの拡張点として設計時に考慮、実装は本スコープ外 | scope-definition の Out of scope に転記 |

## 未決(下流委任)

| ID | 論点 | 委任先 |
|---|---|---|
| U-01 | ツールの正確な置き場所(scripts/ 直下か専用ディレクトリか)と CLI 分割 | 将来 intent の設計フェーズ(本 intent は ideation のみ) |
| U-02 | 構造化票形式の具体様式(フィールド・記法) | 同上 — requirements でテスト可能に固定する事項として申し送り |
| U-03 | 選挙記録ファイルの配置(record 配下 or 専用台帳ディレクトリ) | 同上 |
