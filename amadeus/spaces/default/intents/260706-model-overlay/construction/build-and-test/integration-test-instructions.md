# integration-test instructions（260706-model-overlay）

上流入力: [code-generation-plan.md](../model-overlay/code-generation/code-generation-plan.md)、[code-summary.md](../model-overlay/code-generation/code-summary.md)

## 適用判断

適用する。overlay 機構が既存ハーネスと統合されて動くことは、実 repo に対する次の実行で検証する。

## 手順

1. `npm run models:check` — 実 repo の宣言 2 agent（amadeus-architect-agent、amadeus-design-agent）が overlay 宣言と一致
2. `npm run parity:check` — 逆変換正規化込みで 199 engine files の baseline 一致
3. `npm run test:it:promote-skill` — promote 全 skill ループがフック発火なしで完走し、実 repo の agent ファイル・overlay JSON に差分を生じない
4. `npm run test:all` — 標準検証全体（typecheck 〜 diff:check）

## 期待結果

すべて exit 0。3 の実行後に `git status` で `.agents/amadeus/agents/*.md` と `dev-scripts/data/model-overrides.json` に差分がないこと。
