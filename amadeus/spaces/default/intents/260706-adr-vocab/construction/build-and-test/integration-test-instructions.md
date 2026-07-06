# integration-test instructions（260706-adr-vocab）

上流入力: [code-generation-plan.md](../adr-vocab/code-generation/code-generation-plan.md)、[code-summary.md](../adr-vocab/code-generation/code-summary.md)

## 適用判断

適用する。受け入れ条件の決定論的検証は次で行う。

## 手順（横断検証 4 項目 = FR-3.4、BR-6）

1. `grep -rn "docs/adr" --include="*.md" --include="*.ts" .` — 除外 3 カテゴリ（record 内の歴史的言及 / 意図的な git 履歴参照 / adr-template.md の一般例示）以外 0 件
2. `grep -n -i "aidlc" CONTEXT.md amadeus/spaces/default/knowledge/glossary.md` — 0 件
3. `grep -nE "モジュールファイル|モジュールディレクトリ|intents\.md" CONTEXT.md` — 全ヒットが許容 3 種（一般概念定義 / Event Storming 用法 / GD009 廃止明示の歴史的言及）のみ
4. `npm run test:all`（rename-leftovers lint、test:it:promote-skill を含む全チェーン）

## 期待結果

1〜3 は分類どおり、4 は exit 0。
