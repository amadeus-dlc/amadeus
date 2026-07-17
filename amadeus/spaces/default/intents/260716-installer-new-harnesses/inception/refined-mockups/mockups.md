# Refined Mockups(最終出力契約)— installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../../ideation/rough-mockups/wireframes.md`(モック1〜3)、`../../ideation/rough-mockups/user-flow.md`、`../user-stories/stories.md`(US-1.1〜3.1)、`../requirements-analysis/requirements.md`(FR-1〜6)、`../practices-discovery/team-practices.md`(既存実践)。
> 方式: ui-less-mockups-as-output-contract の refined 段 — rough の3モックを requirements/US 確定後の**最終文字列**へ精緻化(実装 AC の verbatim 素材)。

## 最終モック1: usage(reporter.ts:24-25 の置換後文字列)

```
  amadeus-setup install [--harness <claude|codex|kiro|kiro-ide|opencode|cursor>] [--target <path>] [--version <semver|tag>] [--yes] [--force]
  amadeus-setup upgrade [--harness <claude|codex|kiro|kiro-ide|opencode|cursor>] [--target <path>] [--version <semver|tag>] [--yes] [--force]
```
差分 = `<...>` 内列挙のみ(kiro-ide の後に `|opencode|cursor`)。他は現行 byte 保存。

## 最終モック2: install 正常系(様式不変の確認)

出力段構成(plan 表示 → apply → verify)は既存 ACTION_LABELS 経路をそのまま流用 — **新規文言ゼロ**。ハーネス名・engine dir(.opencode / .cursor)は列挙・写像から自動流入(FR-1 AC-1e)。

## 最終モック3: invalid 文言(reporter.ts:137 の置換後文字列)

```
Invalid --harness value: "<raw>". Expected one of claude, codex, kiro, kiro-ide, opencode, cursor.
```
exit 2 不変。列挙順は HarnessName.all の宣言順と一致させる(テスト exact match の単一ソース)。

## AC への写像

モック1 → FR-1 AC-1c(usage 2本)/ モック3 → AC-1c(invalid)+US-1.3 / モック2 → FR-3 AC-3b+US-1.1/1.2。
