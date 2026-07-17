# Performance Requirements — U1 opencode-skeleton

intent: `260715-opencode-cursor-harness` / Unit: U1
上流入力: functional-design(business-logic-model.md / business-rules.md)、requirements.md、codekb の technology-stack.md(Bun/TS スタック実測)、application-design の components.md(C1 規模)。

## 要件(実測可能形)

- PR-U1-1: `bun scripts/package.ts` の全ハーネスビルド時間は既存4ハーネス時から**線形増分**(discoverHarnessNames の readdirSync 走査+ツリーコピー — requirements NFR チェックリストの実測済み特性)。専用の性能目標値は設けない(数値は強制メカニズムから導出する — nfr-requirements:c3。ビルドに強制タイムアウト機構は存在しないため、目標値の発明はマジックナンバーになる)
- PR-U1-2: CI 上の検証(dist:check 等)は既存ジョブの宇宙に自動編入され、専用ジョブを追加しない(reuse inventory — C4)

## N/A(反証可能根拠付き)

- 実行時性能 SLO: **N/A** — U1 の成果物は静的配布物(dist ツリー)であり runtime service/SLI が存在しない(observability-setup:c3 の SLO 昇格禁止に整合)。engine ツール群の性能特性は本 intent の変更対象外(core 変更ゼロ — AC-4d)
