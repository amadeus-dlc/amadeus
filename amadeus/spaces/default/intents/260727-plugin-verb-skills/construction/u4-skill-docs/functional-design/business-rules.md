# Business Rules — U4 u4-skill-docs

上流入力(consumes 全数): requirements.md(FR-3/FR-5)、components.md(C3/C5)、component-methods.md(C3/C5)、services.md、unit-of-work.md(U4)、unit-of-work-story-map.md(GWT)

## BR-U4-1: mirror 様式の踏襲

SKILL.md は frontmatter(name/description/argument-hint/user-invocable)+節構成(Purpose and boundary → status first → Canonical command contract → 固定 verb 実行)。任意コマンド組立てを持たず、Canonical contract の text fence に列挙された固定形のみ実行する。

## BR-U4-2: runner drift guard 非干渉(FR-3d)

SKILL.md 本文に `--stage` と `--single` の**両マーカーを同時に含めない**(isRunnerSkill:309-313 の判定条件)。これにより pruneOrphanRunners の対象外となり、手書きスキルとして保護される。実装後に `bun .claude/tools/amadeus-runner-gen.ts check` green を確認する。

## BR-U4-3: ハーネス列挙の count-free 化(FR-3c)

スキル本文・docs のハーネス列挙は個別名の羅列を避け導出形(「`tools/amadeus-plugin.ts` を含むインストール済みハーネスディレクトリ」)にする。列挙が不可避な箇所は隣接列挙原則に従う(mirror :14-17 の5面陳腐化の再発防止)。

## BR-U4-4: 投影の完全性(FR-3b、ADR-3 = Q1 裁定 A)

7ハーネス全 manifest へ entry を追加する。対象集合は「amadeus-mirror が投影されている manifest の集合」を実装時に grep で再列挙して確定(記憶・本書の転記からの複製をしない — inventory-from-grep-each-time)。dist:check / promote:self:check が drift を固定。

## BR-U4-5: docs の面区別(R4 の手当)

19-plugins に「スキル(`/amadeus-plugin`)と stage-runner(`/amadeus-<slug>`)はスキル面、`/amadeus plugin <verb>` ハンドラは全ハーネス共通の engine 面」の区別を明記し、全ハーネス共通と誤読させない。EN/JA 同一変更同期(docs-language-ownership)。

## BR-U4-6: テスト契約(UG 予算への申告済み改訂)

- スキル: 実行系テストは不要(固定 verb の組立てのみで分岐ロジックなし)。存在+マーカー不含(BR-U4-2)+7面投影を検査する専用テストを追加する — 既習前例 = `tests/unit/t258-amadeus-mirror-skill.test.ts`(per-skill 検査ファイル)。**本テスト追加は UG 初版の「U4 テスト増なし」からの申告済み逸脱であり、unit-of-work.md 精密化節・components.md C6 を +40〜80 行込み(合計 +340〜540)へ改訂済み**(implementation-deviation-election の申告面 — 無申告で実装へ持ち込まない)
- docs: 既存 docs ガード(t174 系)green 維持。件数語の隣接列挙原則準拠
