# スコープ

## 対象境界

`対象` と `対象外` は、この Intent が扱う利用者価値、業務境界、外部境界を示す。
AI-DLC v2 の実行スコープではない。

### 対象

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-IN-001 | Internal Skills 一覧 | Issue #284 は `README*.md` の Internal Skills に内部 skill を追加することを求めている。 | 採用 |
| SC-IN-002 | 内部 skill 判定 | `.agents/skills/` と `skills/` には Issue #284 の候補以外にも内部 skill が存在するため、一覧と設定対象の基準が必要である。 | 採用 |
| SC-IN-003 | 暗黙起動ポリシー | Issue #284 はすべての内部 skill に `policy.allow_implicit_invocation = false` を設定することを求めている。 | 採用 |
| SC-IN-004 | Codex と Claude Code の設定確認 | Issue #284 は Codex だけでなく Claude Code も考慮することを求めている。 | 採用 |

### 対象外

| 識別子 | 境界 | 根拠 | 状態 |
|---|---|---|---|
| SC-OUT-001 | `skill-forge` による内容監査 | Discovery で別 Intent 候補として分離したため。 | 採用 |
| SC-OUT-002 | `SKILL.md` の英語化 | 現行ルールとの衝突があり、別 Intent 候補として判断する必要があるため。 | 採用 |
| SC-OUT-003 | skill 本文の大規模な責務変更 | 今回は対象範囲と設定の整合が目的であり、本文の内容監査は別候補に分けるため。 | 採用 |

## 実行制御

`実行スコープ` は AI-DLC v2 の Scope に対応し、実行する stage の範囲を制御する。
Intent の `対象` とは別に扱う。

| 項目 | 値 | 理由 |
|---|---|---|
| 実行スコープ | refactor | 既存 skill の責務を変えず、README と設定対象の整合を扱うため。 |
| 省略 stage | なし | 内部 skill 判定、設定配置、検証方法を Inception で具体化する必要があるため。 |

## 成果物深度

成果物深度は、作成する成果物の粒度と説明量を制御する。

| 項目 | 値 | 理由 |
|---|---|---|
| 深度 | standard | README、設定、検証観点を Requirements、Use Case、Unit、Bolt に分けて追跡する必要があるため。 |

## 検証戦略

検証戦略は、検証量と検証方法を成果物深度から独立して制御する。

| 項目 | 値 | 理由 |
|---|---|---|
| 戦略 | standard | validator、設定ファイル構造確認、README 差分確認、必要なテストを組み合わせるため。 |

## Inception への引き継ぎ

- `README*.md` の Internal Skills 一覧と、実際の内部 skill ディレクトリの差分を確認する。
- `policy.allow_implicit_invocation = false` の設定先を Codex と Claude Code の両方で確認する。
- `skill-forge` 監査と `SKILL.md` 英語化は、この Intent の対象外として traceability または decisions に残す。
- Discovery の Intent 候補に安定した候補 ID がない問題は、後続 Issue 候補として扱う。
