# Initiative Brief — 260724-harness-provenance

上流入力(consumes 全数): intent-statement.md, scope-document.md, intent-backlog.md, competitive-analysis.md, feasibility-assessment.md, constraint-register.md, team-assessment.md, wireframes.md

## Problem & Trigger

intent-statement.md のとおり、AI ハーネス種別(claude-code / codex / cursor / opencode / kiro)がどのステージ・どのコミットを実行したかを示す記録が Amadeus に存在せず、2026-07-24 の障害調査(#1449、#1450)で実害が顕在化した(GitHub Issue #1452)。

## Scope

scope-document.md のとおり。In Scope: state/memory スキーマ拡張、Claude Code の確実な自動検出実装、Codex の実機検証、Cursor/OpenCode/Kiro 向け手動記入フォールバック、監査シャード付記の比較検討。Out of Scope: 過去 intent への遡及復元、git commit author の書き換え。

## Market / Build-vs-Buy

competitive-analysis.md のとおり、本機能は内部ツールであり外部市場競合は N/A。build-vs-buy.md の結論は Build(自社実装)一択。

## Feasibility

feasibility-assessment.md のとおり、Feasible(実現可能)、ただし自動検出の網羅性に制約あり。実測(TC-1〜TC-3): Claude Code は `CLAUDECODE=1` 等で確実に検出可能、Codex は `CODEX_THREAD_ID` を用いる実装例が存在するが素の CLI 単体起動での有効性は未確認、Cursor/OpenCode/Kiro は自動検出用 env var が本リポジトリ内に実装例がない。

## Team

team-assessment.md のとおり、solo developer(e5)によるディスパッチ実行。

## Design Approach(非UI)

wireframes.md のとおり、UI を持たない CLI/データスキーマ機能であるため、システムコンテキスト図と verdict 別の出力契約表で仕様を表現した。

## Recommendation

Feasible かつ Build 判断が確定しているため、Inception フェーズ(reverse-engineering 以降)への進行を推奨する。主要な残課題は feasibility-assessment.md の R-1/R-2(Cursor/OpenCode/Kiro の自動検出手段未確立、Codex の実機検証未了)であり、これらは requirements-analysis 以降で継続調査する。
