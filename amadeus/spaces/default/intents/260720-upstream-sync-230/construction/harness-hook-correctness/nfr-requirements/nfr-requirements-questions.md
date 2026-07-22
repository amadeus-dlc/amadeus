# NFR Requirements Questions — harness-hook-correctness

> 上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。
>
> 対象: U07 `harness-hook-correctness`。Functional Designで承認済みのruntime spawn、Kiro IDE context normalization、Claude 11 hook command quoting、6 harness projection契約をNFRへ機械導出する。
>
> E-OC1 判定: **質問0問**。leader承認 `2026-07-20T15:15:03Z`。

## 質問不要の根拠

U07固有の品質属性と検証境界は、Requirements AnalysisのNFR-1〜NFR-8、Functional DesignのBR-U07-01〜13、および現行技術スタックで閉じている。

- Performance: 新しいnetwork serviceや対話APIはなく、hook childのstdin/stdout/stderr/cwd/exitを保存し、Kiro IDEの固定2秒stdin raceを撤回する。根拠のない応答時間SLOは追加しない。
- Security/compliance: host payloadは未知入力としてfail-closed分類し、推測path、false success、credential/network面、新runtime dependencyを追加しない。規制要件はRequirements Analysisで「なし」と確定済みである。
- Scalability: runtime load scalingではなく、正本から既存6 harness projectionと承認済み11 Claude hook commandを全数決定的に検査する固定fan-outである。4 self-install面は拡張しない。
- Reliability/observability: audit-first、forward-only、visible hook-drop、debug opt-in、advisory fail-open、既定経路のbyte compatibilityがFunctional Designで確定している。
- Technology: Bun 1.3.13 / TypeScript ESM / `process.execPath` / 既存manifest-driven packaging / `bun:test`を維持し、新規依存・database・infrastructureを選定しない。

これらは新しい閾値、failure policy、ownership、公開APIを選ぶ作業ではなく、既決contractを検証可能な品質属性へ写像する作業である。新たな数値SLO、分類語彙、監査保持期間、またはdependency判断が必要になった場合は単独決定せず停止し、再付議する。

## [Answer]

[Answer]: 質問0問で可。E-OC1でleader承認済み（`2026-07-20T15:15:03Z`）。承認範囲は既決NFR-1〜8、BR-U07-01〜13、technology-stackの機械導出に限定する。process.execPath spawn契約保存、2秒stdin race撤回、unknown/failed payloadのfail-closed分類とvisible drop、audit-first/forward-only/advisory fail-open、6 harnessと承認済み11 Claude hook commandの全数決定的検査、statusline/permission bytes不変、Bun/TypeScript/既存packaging/test stack維持を要求する。新runtime dependency、network、credential、database、infrastructure、根拠のないSLO・保持期間・failure policy・ownership・public APIは追加しない。新たなNFR閾値、failure分類、scope差が必要なら停止し再付議する。
