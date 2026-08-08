# External Dependency Map — 260807-stage-perf-report

上流入力(consumes 全数): unit-of-work-dependency(外部統合点の閉集合 — `amadeus-journal.ts` / 監査シャード / record — を外部依存判定の正本として消費)、requirements(FR-7a read-only 制約・Out of scope を外部依存不在の根拠として消費)、unit-of-work(embedded デプロイモデルを配布依存の判定に消費)、components(依存の閉集合宣言を照合に消費)、unit-of-work-story-map(スライス横断の外部依存不在確認に消費)

## ゲート付き外部依存

**なし** — 本 intent は完全 AI 内包(fully AI-contained)である:

- 外部 API・外部サービス・データ可用性ウィンドウ・外部チームハンドオフ・承認リードタイムのいずれも存在しない
- 消費するのはリポジトリ内の既存資産のみ(`amadeus-journal.ts` の exported API、監査シャード、record 成果物 — いずれも read-only・同一リポジトリ内でゲート不要)
- 配布は既存の `bun run build` 投影経路に乗る(新規配布チャネルなし)

## 判定の位置づけ

ステージ定義の「Lightweight or empty when fully AI-contained」に該当する軽量形として本書を成立させる。外部依存が後続で発見された場合は、本書へゲート項目(owner / リードタイム / ブロック対象 Bolt / 緩和策)を追記してから当該 Bolt に着手する。
