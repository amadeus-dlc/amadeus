# Intent Statement — 260820-fmc-drift-batch

## Problem Statement

Amadeus の形式検証(TLA+)基盤は、モデルが実装から無音で乖離していく構造的欠落を4面で抱えている。(1) tla-authoring の適用性判定に語彙 drift 検出と欠陥再発トリガの腕がなく、実装プロトコルが変わってもモデル改訂へルートされない(#3186 — PrConvergenceGate に `landed` verdict が不在のまま緑、の実証付き)。(2) 判定が revise-model を命じても、registration committer は同名エントリの置換(replace-by-name)を持たず、改訂 draft は構造的に commit 不能(#2289 — 出荷ステージ契約が必須と定める経路が完走できない)。(3) model-map の実装境界が core/tools にほぼ限定され、PR 系2モデル(PrConvergenceGate / BoltPrAttestationGate)が実際に写像する plugin 実装を governed entry にできず、その drift が検知面に構造的に不在(#2929 — validator / loader / sensor の3面が独立の手書き境界を持つことをクロスレビューが実証)。(4) 一度も発火できない advisory authoring-hold 経路(authoring-subjects.json の書き手不在)が宣言と実態の乖離として残存(#3187 — ユーザー裁定 2026-08-20 で退役確定)。

帰結として、tla-authoring ステージ導入後も登録モデルは4本から増えず、既存モデルは実装の前進に対して無音で stale 化する。本 intent はこの「検出 → 改訂 commit → governed 被覆 → 死経路の退役」の閉ループを一括で成立させる。

## Target Customer

- **一次**: 本リポジトリの conductor(AI)と監督ユーザー — tla-authoring / formal-model-check の判定・登録・drift 検知が実効化し、形式検証の防御力が維持される
- **二次**: Amadeus フレームワークの fork / 利用チーム — plugin 実装まで governed にできる model-map 境界と、宣言どおりに動く advisory 面を受け取る

## Success Metrics

クロスレビュー成立済みの各 Issue 期待結果(refinement 反映後)を骨子とする:

1. **#3186**: 適用性判定に語彙 drift 検出と欠陥再発トリガの2本の腕が入り、落ちる実証(実 corpus で赤 → 是正 → 緑)を伴う
2. **#2289**: route=revise-model の draft が同名置換で commit 可能(置換成功 / 置換対象不在 / author-new 同名衝突の3面テスト)。t448 の同名拒否 pin は author-new アームへ再スコープ。revise-model + 不在名の fail-open(cross-check 不在)も閉じる
3. **#2929**: 実装境界の3面同時是正 — `IMPLEMENTATION_PATHS`(validator)・`implementationRoot`(loader containment)・sensor `matches` glob。PrConvergenceGate / BoltPrAttestationGate が plugin 実装(`plugins/github-pr-convergence/tools/`)を governed entry として pin し、SOURCE_DRIFT 検知を実測。落ちる実証は validator / loader の両境界に対して行う
4. **#3187**: advisory authoring-hold 経路の完全撤去 — plugin.json の advisories 宣言・`tla-authoring.ts` の advisory 経路コード・t528 テストを同一変更で。後方互換レイヤー・フォールバック分岐は残さない(ユーザー直接指示 2026-08-20)
5. **配送**: 全ブロッキング CI green、Bolt PR ごとのスカッシュマージ着地、Issue クローズは着地面の実読確認後

## Initiative Trigger

ユーザーの直接指摘(2026-08-20 実 HUMAN_TURN)「tla-authoring が入ったのに .tla ファイルが全然増えない」。既存 open Issue 3件(#3186/#3187/#3246)の棚卸しから、#3246(モデル新規作成)を除く構造要因3件+前提部品2件を1バッチと裁定(選択肢1、full grant、並列実装重視)。

## Initial Scope Signal

`self-feature`(Amadeus 自体の契約追加・意図的変更)。multi-unit(units-generation / delivery-planning EXECUTE)、1 Issue = 1 Unit の4 unit 構成を基本とし、所有権交差(#3186/#3187 が `tla-authoring.ts` を共有)は units-generation で依存設計する。スコープ外: #3246(別 intent 裁定済み)、t448 自己参照比較 bug(起票のみ)。validator/loader 述語不整合の是正は #2929 unit に内包(Q3=C 裁定)。

## 決定事項の provenance

- バッチ構成・full grant・並列重視・専用ブランチ(`feat/fmc-drift-batch`、origin/main `e86fbe125` 起点): ユーザー実 HUMAN_TURN(2026-08-20)
- 後方互換レイヤー・フォールバック禁止: ユーザー実 HUMAN_TURN(2026-08-20)— org.md Forbidden の再確認として requirements へ明文化する
- #3187 退役: ユーザー裁定コメント https://github.com/amadeus-dlc/amadeus/issues/3187#issuecomment-5352456209
- クロスレビュー: #2289 / #2929 = ESTABLISHED_WITH_REFINEMENTS(run XR-260820-2289 / XR-260820-2929、対象 SHA `e86fbe125c85ddcbe7264f3a9a9a2377a06136da`)、#3186 = 改訂済み(2026-08-18 REFRAME 反映)
- 本ステージの質問裁定: full grant 梯子 AUTO_DECIDED ×4(Q1=A / Q2=A,B,C,D,E / Q3=C / Q4=A、`intent-capture-questions.md` に decision ID 併記)
