# Team Practices — 260727-plugin-verb-skills

上流入力(consumes 全数): code-structure.md, technology-stack.md, dependencies.md, code-quality-assessment.md, architecture.md, business-overview.md

## 判定: 変更なし

practices-discovery:c1 に従い、同日 RE codekb 6ファイル(observed afb93a825 — architecture.md の plugin CLI 動詞体系/ホストルート統一節、code-structure.md の 678/1488/25 行実測、dependencies.md の新設エッジ2本+設計対象の欠落エッジ3件、code-quality-assessment.md の残存リスク4件、technology-stack.md v0.1.6、business-overview.md)を証跡スキャンとして代用した。affirmed 済み team.md / project.md との差分ギャップは検出されず、team.md の部分ドラフトは不要(practices-discovery:c2 の無変更ケース)。

## 本 intent に適用される既存 practices の対応表

| 領域 | 既存 practice(出典) | 本 intent での適用 |
|---|---|---|
| 編集正本 | project.md Way of Working + Forbidden(dist 手編集禁止・正本/配布/self-install の同一変更同期) | handler/CLI は `packages/framework/core/tools/`、スキル正本は `packages/framework/core/skills/`+manifest 投影。dist×7 と self-install を同一変更で再生成 |
| utility handler 追加 | project.md Decided(11-contributing.md「Adding a Utility Handler」チェックリスト) | `/amadeus plugin` case 追加時に usage 三重定義(default die / HELP_TEXT_TAIL / t67 pin)を同期(RE codekb architecture.md 実測) |
| trust 境界 | tla-plugin 系 Corrections(c8 三層 trust)+ intent-capture 裁定(compose 承認ゲート不変) | install verb は既存 compose 経路へ委譲のみ、新しい trust 面を作らない |
| カバレッジ | bun-coverage-spawn-blindspot / local-lcov-pre-push | 新規 verb/handler は handlePluginCli in-process seam で被覆(coverage registry に amadeus-plugin unit 不在の実測) |
| 件数規律 | count-free 原則(cid:code-generation:count-comment-sync-on-catalog-change ほか) | t129 の硬い数値(29/3)への対処方針は application-design の ADR で確定(#1598) |
