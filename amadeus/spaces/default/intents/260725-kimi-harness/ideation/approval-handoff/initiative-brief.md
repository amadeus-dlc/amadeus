上流入力(consumes 全数): intent-statement, scope-document, intent-backlog, feasibility-assessment, constraint-register

# Initiative Brief — 260725-kimi-harness

## Intent(一文)

amadeus を Kimi Code CLI に対応させる — 新ハーネス `kimi`(harnessDir `.kimi-code`)を追加し、Kimi ユーザーが AI-DLC ワークフローを hooks 連携込みでフル機能実行できるようにする(intent-statement より)。

## 問題と顧客

- 問題: amadeus は6ハーネス対応だが Kimi Code CLI 未対応。Kimi ユーザーがワークフローを実行できず、本チームも Kimi 上で dogfood できない
- 顧客: Kimi Code CLI を使う amadeus 利用者(外部) + 本チーム(dogfood の最初のユーザー)

## Feasibility 要約

**GO(条件なし)**(feasibility-assessment)。根拠: 移植手順(09-porting)確立・Kimi hooks が Claude 互換・`.kimi-code/{skills,agents}/` ネイティブ検出・実機 0.28.1 環境あり。最大リスクは payload 実機差異(R1)で、live capture 駆動(Q1 許可済み)で早期解消する。constraint-register の TC-1(プロジェクト config なし)が唯一の構造的不連続点で、インストーラの managed block 冪等マージで越える。

## Scope 境界(scope-document より)

- **Must**: M1 ハーネス定義 / M2 hook adapter / M3 配線マージ機構 / M4 コア編集3箇所 / M5 配布・CI 列挙 / M6 dist+dogfood / M7 決定的テスト / M8 ドキュメント / M9 live driver+journey / M10 セッションスキル全量
- **Won't**: plugin 配布 / kimi-ultra / PostCompact 再注入 / mcp.json 連携 / 外部 npm E2E / statusline

## 実行シーケンス(intent-backlog より)

dependency-first + risk-first: M1 → M2a(live capture) → M2b(adapter 完成) → M3 → M4 → M5 → M6(dogfood) → M7 → M9 → M8。テストは各項目に随伴。

## リスクと緩和(抜粋)

| リスク | 緩和(代替策併記) |
|---|---|
| R1 payload 実機差異 | live capture 駆動。乖離時は adapter を実機優先で修正(docs 非依存の契約テスト) |
| R2 Kimi 仕様変更 | fail-open adapter + doctor 機能 probe + 実測フロア(0.28.1)。検出版本未満は「未検証」警告 |
| R3 config 破壊 | managed block マーカー + バックアップ + dry-run + 除去手順。自動マージが危険な環境では手動手順 fallback |

## Team plan

ソロ実行(team-formation SKIP)。mob なし。 Construction の swarm は kimi ネイティブ subagent fan-out を使用可能(scope-definition Q1=A)。

## Go/No-Go 推奨

**GO**。全依存が充足し(raid-log D1-D4)、成功指標は測定可能、リスクには全て緩和策がある。
