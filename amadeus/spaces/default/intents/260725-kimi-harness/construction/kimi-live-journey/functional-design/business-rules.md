上流入力(consumes 全数): unit-of-work, unit-of-work-story-map, requirements, components, component-methods, services

# Business Rules — kimi-live-journey

requirements.md の FR-9 と components.md C6 から導出する不変条件。

## live 検証の不変条件

- BR-1: ゲートは `AMADEUS_KIMI_PRINT_LIVE=1` + kimi バイナリ実在の skipReason 様式。決定的 tier では必ず skip し、live を暗黙実行しない(既存 e2e 様式)
- BR-2: journey は dist/kimi を tmp プロジェクトに配置して実行し、本リポジトリやユーザーの実環境を汚さない。`KIMI_CODE_HOME` を tmp に向けてユーザー config を隔離し(business-logic-model.md の hermeticity 機構)、hook 配線の有無も tmp 側で制御する
- BR-3: クレジット消費は CC-1 の範囲(journey 実走)に限定し、journey には消費を明記する(既存の「SPENDS credits」表記と同型)
- BR-4: 実走の結果は実行から導出して記録する(実走ログを残し、推測で green を宣言しない — P2)
- BR-5: driver は既存 driver と同じポート形状を守り、独自の検査機構を足さない

## 適用範囲

- U6 の完了定義(unit-of-work.md)と FR 対応(unit-of-work-story-map.md の FR-9 行)に適用する
- driver の契約(skipReason/runPrintSession)は component-methods.md の C6 インターフェースをそのまま実装する
- services.md の判定(driver は同期プリミティブ)により、非同期の状態管理は導入しない
