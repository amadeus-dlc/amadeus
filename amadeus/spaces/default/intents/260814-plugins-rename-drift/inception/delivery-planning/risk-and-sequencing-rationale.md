# Risk and Sequencing Rationale — 260814-plugins-rename-drift

上流入力: `bolt-plan.md`、`units-generation/unit-of-work-dependency.md`(DAG)、`requirements-analysis/requirements.md`(主要リスク)、`delivery-planning-questions.md` Q1/Q2 裁定。

## 採用ヒューリスティック

**dependency-first + ユーザー指示順**(WSJF 不採用 — Q2=A: Bolt 3 本・順序が依存とユーザー指示で一意に確定するためスコアリングは意思決定に寄与しない)。トポロジカル順序(U1∥U2 → U3)からの逸脱はない — B1(U1)を B2(U2)に先行させる選択は、DAG が許す複数の有効順序のうちユーザー指示(#2996 → #2997)と共有ファイル直列化で一意化したもの。

## 順序根拠

1. **B1 先頭**: ユーザー指示(命名規約を最初の1対から一貫させる)+ walking-skeleton ゲート維持 Mandate(self-feature)。改名はプラグイン機構全層を貫通する最小スライスであり、skeleton として B2/B3 が使う同じ配送経路(compose → 投影 → conformance)の健全性を先に証明する。
2. **B2 が B3 に先行**: U3 → U2 依存(settings の実消費者)。逆順は先行着地禁止ガードレールに反する。
3. **直列化**: `amadeus/config.json` を B1(activation.names 要素改名 + scope-bindings キー)と B3(activation.names へ git-drift 追加)が編集する。B1 マージ後に B3 が最新 main 起点で作業することで編集競合を構造的に回避(units-generation レビュー FOLLOW-UP の解消)。加えて coverage single-owner ノルムにより並行フルスイートは不可。

## 主要リスクと早期化

| リスク | 対処 Bolt | 早期化の理由 |
|---|---|---|
| scope-bindings キー同期漏れの silent 退行(改名 PR の主要リスク) | B1(落ちる実証付き検証テストを実装の前に Red で確立 — TDD) | 最初の Bolt で機構の失敗様式を固定し、下流 workspace への移行パターンも同時に提供 |
| stages:[]+sensors+seams 合成形状の前例 0 件 | B3(ただし spike で構造的処理可能は設計段に確認済み) | 残リスクは conformance 被覆のみ — B3 冒頭の骨格 slice(plugin.json + conformance ケース)で最初に潰す |
| 宣言綴り誤りの無音デフォルト化 | B2(落ちる実証を DoD に含む) | 設定機構の信頼性は B3 の前提 |
| fetch のレイテンシ実害 | B3(スロットル実測を NFR-1 検証として記録) | ADR-5 で設計確定済み、実測は 1 回 |

## 逸脱

トポロジカル順序からの逸脱なし。2.7 の DAG が許す順序の中での経済選択のみ。
