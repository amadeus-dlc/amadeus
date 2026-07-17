# Requirements Analysis — 明確化質問(covci-flake)

intent: `260716-covci-flake`(Issue #1085、bugfix スコープ)
起草: 2026-07-16 / conductor e4(amadeus-product-agent ペルソナ)

## 上流入力の照合範囲

宣言 consumes のうち `code-structure.md`(「テストランナー失敗計上機構の観測」節 — RE 実測)を主参照とし、`business-overview.md` / `architecture.md` はランナー内部のみの bugfix と非交差につき起草時に非該当と照合済み。

## 選挙不要判定(E-OC1 3段順序)

起草時の既決照合の結果、**明確化質問は 0 問**(leader 承認 2026-07-16T13:03:54Z — 判定申告→承認→本記載の3段順序)。

## 根拠種別(1問1行相当)

- 修正の選定方式 = 既決(割当指示の pre-declared 分岐 — 既知クラス→修正 / 環境起因→後段選挙)
- 再現ハーネス設計 = 実測接地(RE 確定の捕捉要件: tee 全文・実数値・ブロック文脈での planted 除外・PIPESTATUS)
- 打ち切り予算 = 実装時判断(constants-from-code — 新規マジックナンバー非固定、資源制約から導出し確定値報告。非再現は FR-3 選挙が受け皿)
