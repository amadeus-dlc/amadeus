# Scope Document — installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../intent-capture/intent-statement.md`、`../feasibility/feasibility-assessment.md`(GO・5ファイル実測)、`../feasibility/constraint-register.md`(C-1〜C-6)、`../feasibility/raid-log.md`(R-1〜R-3)。

## In Scope

1. **installer 閉じ列挙の 4→6 値化**(5ファイル — harness.ts / engine-layout.ts / reporter.ts / setup-harness.test.ts / setup-harness-parse.test.ts。file:line は feasibility-assessment 実測)
2. **列挙全数性のテスト固定** — dist ツリー集合(open-set)⇔ installer 列挙(closed-enum)の一致を機械検出(R-3 の共変偽 green を避ける t149 同型設計 — 詳細は requirements/design)
3. **`install --harness opencode` / `--harness cursor` の正常系完走**(実 dist 配置の検証まで — AC-6b の手動配置手順を installer 経由に置換できること)
4. **公開物の実検証の維持**(npm pack --dry-run 実ツール — c4 既決の再固定)+ **将来条件チェックリスト**(c4: 規模増・クラッシュ耐性・別 OS・消費側棚卸し)
5. README「Pick your harness」表の install コマンド2行追記(導線非対称の解消 — docs 面の最小)

## Out of Scope

- promote:self の新ハーネス対応(dogfood 判断 — 前 intent RE の分類どおり別議論)
- opencode hooks(#1049)
- **付随4ファイル(runtime 2: amadeus-utility.ts/amadeus-lib.ts、migrate 1: amadeus-migrate.ts、self-install 1: promote-self.ts)の同時更新可否 — requirements-analysis の pre-declared 分岐で確定**(本ステージでは in/out を確定しない)
- CLI 文法の変更(install/upgrade の既存対称文法に値追加のみ — scope-definition:c1 の対称性は既存準拠で新判断なし)
- バージョン・リリース面(C-4 Mandated)

## スコープの検証可能性

In 1〜5 は requirements で各 AC に落ち、全て実測可能(exit code / grep / npm pack 出力 / install 完走ログ)。
