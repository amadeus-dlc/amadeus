# Initiative Brief — plugin-host-delivery(1 ページ)

> 上流入力(consumes 全数): intent-statement、scope-document、intent-backlog、feasibility-assessment、constraint-register

## Intent と問題(intent-statement より)

Amadeus はプラグインの安全な合成エンジンを持つが、上流 AI-DLC v2.3.0 の主要価値「インストールするだけで通常ワークフローが拡張される」導入経路が欠けている(neutral-only packaging、compose のテスト限定到達、`--single` 必須 UX、docs 不一致、適合テスト不在)。本 initiative はこれを 7 ハーネス全面で解消する。

## 市場検証

N/A — market-research ステージは本スコープで SKIP(内部開発フレームワークの自己整備)。代替の内部証拠: 上流 v2.3.0 の一次資料(機構 doc / test-pro / t188 = 32 ケース、commit `29a31f78` 直読)が想定 UX と適合基準を具体化しており、投資判断は上流追従の既定方針(upstream-sync 運用)に従う。後続 decision point: なし。

## 実現可能性とリスク(feasibility-assessment より)

**Conditional GO**。compose engine(atomic / recovery / drop / diagnose)は実装・テスト済みで、エンジン側に composition record 読取配線が既在。全 7 ハーネスにフック面実在。最大リスクはハーネスネイティブ導入機構という未実測の外部 seam(R-1)で、能力マトリクスを最初の成果物として潰す。手動 fallback(folder-drop+明示 compose)が全ハーネスの degrade 床として成立するため hard blocker なし。constraint-register の T1-T9 / O1-O6(Bun-only、0-plugin byte-identical、弱い合成の重複実装禁止、TLC コスト、walking-skeleton gate 等)を制約とする。

## スコープ境界(scope-document より)

IN = 成功指標 10 項目全数(能力マトリクス、ハーネス別投影、compose 到達経路(手動床+自動 hook)、再コンパイル統合、doctor、drop/baseline 復元、activation policy ADR、適合テスト+追跡表、docs 同期、sync レポート拡張)。OUT = 上流未実装群(plugin scope / adds.* / when: / agents 等投影 / lockfile)+ #1380。

## コンセプト可視化

N/A — rough-mockups は SKIP(UI なし)。代替: scope-document の Value Stream(install → 自動 compose → 通常 scope 実行 → doctor → drop → baseline 復元)が利用者到達価値の正準記述。

## チーム計画

N/A — team-formation は SKIP(ソロモード)。実行形態: ソロ conductor + Task サブエージェント(隔離 worktree)。Construction は intent-backlog の依存順(B1→B2→…)で Bolt 化し、staffing/schedule の確約は delivery-planning で行う(cid:approval-handoff:c3 — 未確定 mob を捏造しない)。

## Go / No-Go 推奨

**Go**(Conditional GO の条件は運用内で吸収可能): (1) B1 能力マトリクスを最初に実行し、未実測 seam の確約を実測後に限定 (2) walking skeleton は Claude Code の利用者 E2E で単独ゲート (3) activation policy は application-design の ADR ゲートで裁定。
