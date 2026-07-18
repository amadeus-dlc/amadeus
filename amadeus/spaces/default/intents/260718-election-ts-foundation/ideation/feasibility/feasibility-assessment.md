# Feasibility Assessment — election-ts-foundation

> 上流入力(consumes 全数): intent-statement.md

## 判定

**GO**(条件なし)。技術的な未検証要素はなく、全ての基礎部品が本 repo 内に実在・稼働実績を持つ。

## 実現可能性の根拠(実測ベース)

| 要素 | 実現手段 | 実在証拠(実測) |
|---|---|---|
| GoA 票の構造 parse | 既存パーサの拡張 | `amadeus-norm-metrics.ts:688 parseGoaLine` / `:704 parsePmCidLine`(PR #1112 でテスト固定済み) |
| 配信・通知輸送 | agmsg send.sh(点対点) | 本チームで日常稼働中。leader 宛て票の私秘性は輸送特性として成立 |
| 選挙定義・記録の正本 | git 管理ファイル(ワークスペース内) | 質問票ファイル正本パターン(ワークフロー既定)と同型 |
| 開票・集計 | 決定的 TS 関数(Bun) | GoA 集計規則は team.md に完全定義済み(賛成側 1-3/6・反対側 7-8・棄権4除外・8 ブロック) |
| persist 文・タイムライン生成 | 構造データからのテンプレート出力 | 現行の persist 様式(票タイムライン1行・GoA 度数行)は正規表現で機械可読(norm-metrics が既に parse) |
| mirror Issue 同期 | `scripts/amadeus-mirror.ts` | create/sync/close 実在(:2-:9)、record→Issue 一方向。260717-mirror-issue-tool intent で実証済み |
| SKILL 薄ラップ | `.claude/skills/` 追加 | 既存 session skills(amadeus-grilling 等)と同型のパッケージング |

## 主要な実現方式の裁定(feasibility-questions 由来)

1. **位置づけ = チーム内ツール(配布外)** — scripts/ 系の repo ローカル開始。framework 配布(Bun-only・harness 投影・docs 同期の製品制約)は掛けない。製品化は実証後の将来判断として mirror Issue へ申し送り
2. **ファイル正本+ポインタ配信** — 選挙定義・開票記録は git 管理ファイルが正本。agmsg は「選挙 ID+パス」の短通知のみ。verbatim 崩れ・truncate の欠陥クラスを構造的に排除
3. **blind 性はハイブリッド** — 投票は leader 宛 agmsg(構造化票形式)で開票まで私秘、開票時にツールが全票を一括ファイル化して監査可能性を回復

## 仮説・前提(ラベル明示)

- 【前提】チームモード(agmsg 登録済みメンバー)での運用。ソロモードは選挙不適用(既決)
- 【仮説】構造化票形式は投票者の負担を増やさない(現行も事実上の定型で書いている — 様式が明文化されるだけ)。検証は導入後の PM ラウンドで行う
- 【前提】人間裁定(タイ・GoA 8 再審・エスカレーション)は基盤の外に残す — ツールは判断せず、判断材料と記録を供給する

## 概算規模(ideation レベルの見立て — 確定は将来の設計フェーズ)

中核はデータモデル+開票純関数+記録生成+CLI 面+SKILL ラップの5要素。既存 parse 資産の再利用により、mirror-issue-tool(単一 CLI+テスト)と同規模帯の見込み。数値の確定見積りは本 intent のスコープ外(ideation のみ)で、Inception 以降を実施する将来 intent に委ねる。
