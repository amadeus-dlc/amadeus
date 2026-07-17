# Code Summary — U2 opencode-surface(Bolt 2)

intent: `260715-opencode-cursor-harness` / PR: [#1044](https://github.com/amadeus-dlc/amadeus/pull/1044) / branch: bolt/opencode-surface
上流: code-generation-plan.md、上流参照(consumes 全数): requirements.md、unit-of-work.md(U2)、functional-design 一式、nfr-design 一式。

## 変更ファイル

- authored 1(変更): `packages/framework/harness/opencode/emit.ts` — emission table エントリ追加のみ(AGENTS.md / opencode.json.example / session skills ×4 合成。write⇔check 対称・fail-fast 不変 = R-U2-1)
- test 1(変更): tests/integration/t-opencode-emit.test.ts — 全 emission 集合・トークン/rules 書換・config JSON 形状・MISSING/DIFFERS 両分岐のケース追加
- generated: dist/opencode/**(AGENTS.md / opencode.json.example / .opencode/skills/ 4本ほか)

## 検証記録(全実測)

| 検証 | 結果 |
| --- | --- |
| package.ts / dist:check ×2(冪等・再接地後も)/ typecheck / lint / promote:self:check | exit 0 |
| R-U2-2: opencode.json.example | JSON.parse OK + permission キー実在(公開 $schema を WebFetch 実測) |
| R-U2-3: 未置換トークン | dist AGENTS.md に `{{` grep 0件 |
| AC-2a | version exit 0(退行なし) |
| AC-2b 完全実測 | repo 外 scratch + project-root override で intent birth → intent-capture run-stage directive 受領(engine ループ貫通、R-U2-5 準拠) |
| AC-2c | doctor 劣化3点を実測記録(.claude 前提 else の誤発火・otherTrees 非列挙 — 正しさ非影響。U4 docs 入力) |
| AC-4d | core/scripts/installer 変更ゼロ |
| lcov | 未カバー 0 行 |
| deslop | 除去対象なし |

## レビュー

- e4(実装者以外): **READY(条件付き GoA 3、条件 = Coverage green のみ)**(PR コメント)
- 条件充足を conductor 実測(2026-07-16T00:31Z): `gh pr checks 1044` → CI Success pass / Codecov Status pass / codecov/patch pass / Coverage Report pass — マージ承認伺い対象として leader へ報告済み

## 再接地

#1040 着地後の rebase で #1039 drift を解消し、dist:check green を再実測(base-advance-regrounding 準拠)。
