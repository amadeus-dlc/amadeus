# RAID Log — 260724-harness-provenance

上流入力(consumes 全数): intent-statement.md, competitive-analysis.md, market-trends.md, build-vs-buy.md

## Risks

| ID | リスク | 深刻度 | 緩和策 |
|---|---|---|---|
| R-1 | cursor/opencode/kiro の自動検出手段が確立できず、これら3ハーネスで記録が「unknown」または手動記入に頼らざるを得ない | 中 | requirements で「検出不能時は unknown/manual を許容するフィールド設計」を要件として固定する。将来、各ハーネス側が識別子を公開すれば拡張可能な設計にする |
| R-2 | codex の `CODEX_THREAD_ID` が agmsg 経由セッション限定の可能性があり、素の codex CLI 単体利用時に効かない | 中 | requirements/design 段階で実機検証を明示的なタスクとして残す。効かない場合は codex も手動記入または他の代替検出手段(プロセス環境の別変数)を探索する |

## Assumptions

| ID | 前提 | 検証方法 |
|---|---|---|
| A-1 | `amadeus-state.md` 冒頭または stage `memory.md` への数フィールド追加は、既存の required-sections / upstream-coverage / answer-evidence センサーの検査対象を壊さない | requirements/design 段階でセンサーのフィールド解析ロジックを確認し、非破壊であることを実証する |
| A-2 | ハーネス種別フィールドの追加は既存の state/memory パーサ(amadeus-lib.ts の parse 系関数)に影響しない | design/code-generation 段階で該当パーサの grep 棚卸しと回帰テストで確認する |

## Issues

なし(feasibility 時点で未解決の技術的ブロッカーは確認されていない)。

## Dependencies

| ID | 依存 | 状態 |
|---|---|---|
| D-1 | 各 AI ハーネスが公開する env var(または同等の識別子)の実在確認 | Claude Code は確認済み(TC-1)。Codex は部分確認(TC-2)。Cursor/OpenCode/Kiro は未確認(TC-3) — requirements/design で継続調査 |
| D-2 | 既存 `amadeus-state.ts`/`amadeus-lib.ts` の state/memory 読み書きヘルパー | 既存実装として実在(project.md Decided 節に明記のパターンに従う) |
