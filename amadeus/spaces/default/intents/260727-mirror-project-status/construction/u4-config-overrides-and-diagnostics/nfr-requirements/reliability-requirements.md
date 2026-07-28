# Reliability Requirements — u4-config-overrides-and-diagnostics

上流入力(consumes 全数): business-logic-model, business-rules, requirements, technology-stack

## 診断の障害時挙動

- gh 不在・未認証・API 障害: 当該呼び出しを loud fail し、診断はエラーとして報告する — 診断の失敗が workflow を恒久停止させない(business-logic-model のエラー・エッジケース節 — requirements FR-7e 準拠)。
- 権限不足・フィールド/選択肢未解決は診断分類(business-logic-model 手順3の resolution 4値)として**正常な診断結果**に含める — 例外・クラッシュ経路にしない(診断は劣化環境でこそ価値を出す)。

## 診断の無害性(read-only の信頼性面)

- 診断は remote mutation 0(business-rules BR-U4-4)かつ台帳 write 0(business-rules BR-U4-8)— 診断の実行・失敗・中断が同期状態を壊す経路が構造的に存在しない。再実行は常に安全(冪等以前に副作用ゼロ)。
- 既存 repair status 出力は不変(business-rules BR-U4-9 — additive 拡張)。既存挙動の回帰テストを維持する。

## 設定の障害時挙動(requirements FR-5 の fail-closed)

- parse 失敗した層は無効として扱い、有効値を持つ最後の層のみを入力にする(business-logic-model の層解決)— 壊れた設定が部分的に適用される中間状態を作らない(requirements NFR-2 の fail-closed)。
- 設定 0 件+所属 0 件では診断列は空で既存出力不変(business-logic-model のエッジケース)。

## 非目標

- SLA/SLO・バックアップ目標: N/A(根拠: requirements FR-1b — オンデマンド単発照会のみで常駐サービスなし。永続状態は git 管理の record/state — technology-stack 断面: 独自データストアなし。cid:observability-setup:c3 の N/A 規律)。
