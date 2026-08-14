# Code Generation Plan — unit-failure-autoelectio (Issue #2976)

> スコープ: self-fix(units-generation SKIP の degrade スコープ)。要件は `<record>/inception/requirements-analysis/requirements.md` の FR-1〜FR-9 から直接スコープした。User stories は SKIP のため、各ステップは FR へ遡る。functional-design も SKIP のため、未解決事項(directive kind / config 呼出形)を本 plan で固定する。

## 本 plan で固定する設計

- **directive kind**: `execute-failure-election`(既存 `execute-advisory-handoff` と同型の「質問ではなく作業」指令。`ask` ではない)。
- **carry**: `unit` / `stage` / `attempt` / `batch` / `siblings` / `choices: [Retry, Skip, Abort]`。conductor が definition JSON を書いて `amadeus-election.ts open --trigger auto --file` を実行する。
- **config 解決**: election CLI と同じ `resolveAmadeusConfig` の active-cursor 1引数経路(3層は cursor 経由で解決)。invalid は既存 `errorDirective` 作法で fail-closed。
- **fallback 判別子**: CLI envelope `{"opened":null,"reason":"solo-election-manual-trigger-required"}` のみ。team/solo の機械判定は置かない。
- **ruling commit**: 既存 `report --user-input retry|skip|abort` → `handleFailureRuling`。新遷移を足さない。
- **非収束**: 割れ / hold / 中断 / CLI エラーは従来の人間向け ask へフォールバック。

## Steps

- [x] Step 1: 失敗テスト(→ FR-7a) — auto seed 下で `emitConstructionFailureIfPresent` が `kind !== "ask"` の新 directive を返すことを、現行コードで赤になるテストとして追加する。
- [x] Step 2: 回帰固定(→ FR-7b / NFR-1) — config 未 seed と `manual` seed で `kind === "ask"` が不変であることを同じスイートで固定する。既存 `t211-swarm-batch-progress.test.ts` の manual 側期待は維持する。
- [x] Step 3: engine 分岐(→ FR-2 / FR-3 / NFR-2) — `await-unit-ruling` で config を解決し、`auto` なら `execute-failure-election` を emit、`manual`/不在は現行 ask、invalid は errorDirective。
- [x] Step 4: 配送面(→ FR-8) — `stage-protocol.md` の halt-and-ask 節と各ハーネス SKILL の「failure always halts and asks」を新 directive 契約に合わせ、`bun run build` で投影を再生成する。
- [x] Step 5: ruling / 非収束(→ FR-1 / FR-4 / FR-5 / FR-6 / FR-9) — t211 で Retry/Skip/Abort と監査遷移、t369 で全 conductor 面の decline / hold / split / interrupt / CLI error フォールバック、t237 E2E で split vote の hold と人間裁定への復帰を固定する。
- [x] Step 6: 検証(→ NFR-1) — 対象 unit / integration / E2E、`bun run typecheck`、`bun run lint`、`bun run build`、`git diff --check` を通し、GitHub Actions run 31789338681 でテスト、coverage、隔離2回ビルド再現性、source-only 境界、グラフ不変量、plugin-conformance を含む全必須 check の成功を確認する。

## Traceability (step → FR)

Step 1 → FR-7a / Step 2 → FR-7b, NFR-1 / Step 3 → FR-2, FR-3, NFR-2 / Step 4 → FR-8 / Step 5 → FR-1, FR-4, FR-5, FR-6, FR-9 / Step 6 → NFR-1

## Plan approval

[Answer]: Approve Plan — AUTO_DECIDED `auto-decision-767397186aed9adf87e6e6a231debb8d`（decider=agent-recommendation、loud degradation `native-solo-election-result-unavailable`）。承認: 2026-08-14T08:07:00Z

## Test configuration

既存の `tests/run-tests.sh` / bun test 構成は変更しない。Comprehensive strategy に従い、unit は engine 分岐・ruling・監査遷移、integration は全 conductor 面の非収束フォールバック、E2E は実 election CLI の split vote・hold・timeline・人間裁定への復帰を検証する。性能・セキュリティの追加検査は、今回の NFR が回帰・再現性・fail-closed に限定されるため対象外とする。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T10:00:02Z
- **Iteration:** 1
- **Scope decision:** none

PR収束証跡と必須3成果物は存在するが、FR-6・FR-9・Comprehensive test strategyの実証不足、およびFR-2とNFR-2の矛盾により要件適合を確定できない。

### Findings

- BLOCKER | FR-6は非収束時の人間フォールバックをテストで固定することを受け入れ条件とするが、code-summary.mdは非収束経路をconductor面の文書化だけと明記しており、planの完了表明と要件を満たさない。
- BLOCKER | FR-2はinvalid configで従来のaskを返すと規定する一方、NFR-2はinvalidをerrorDirectiveでfail-closedにしてaskへ落とさないと規定する。planとsummaryは後者を選んでいるがrequirementsが未訂正で、どちらを正準契約とするか成果物だけでは確定できない。
- BLOCKER | active Test StrategyはComprehensiveでstage contractはunit・integration・E2Eを要求するが、planはintegration層への追加を掲げつつsummaryでは新規テストをunitスイートへ変更し、E2Eも作成していない。逸脱理由だけではstage contract適合の実証にならない。
- BLOCKER | FR-9はelection open・ruling・failure transitionのaudit追跡性を要求するが、code-summary.mdには既存語彙を使うという設計説明しかなく、対応する監査テストまたは実測証跡がない。PR attestationはPR headの同一性を示すだけでFR-9のイベント連鎖を証明しない。
- FOLLOW-UP | NFR-1が列挙する隔離2回ビルド再現性、source-only境界、グラフ不変量、CI、coverage、plugin-conformanceの結果は本スコープに含まれず、code-summary.mdもBuild and Testへ先送りしているため、次段で全ゲートの実測結果を残す必要がある。

## Review repair — Iteration 1

- FR-2 の invalid config 契約を NFR-2 と整合させ、`errorDirective` による fail-closed を正準化した。
- t369 integration で8つの conductor 面すべてについて decline と非収束時の人間フォールバック契約を固定した。
- t237 E2E で実 election CLI による split vote が `hold` となり、timeline を残して人間裁定へ復帰することを固定した。
- t211 unit で failure・Retry・Skip・Abort の既存 audit event 連鎖を固定した。
- GitHub Actions run 31789338681 の全必須 check 成功を NFR-1 の実測証跡として記録した。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-14T10:21:46Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の4 BLOCKERは解消済み。FR-2とNFR-2はinvalid configのerrorDirective fail-closedで整合し、FR-6はintegration/E2E、FR-9はaudit event連鎖、Comprehensive strategyはunit/integration/E2Eで実証された。最新HEADの必須check成功およびPR CLEAN・未解決0の収束証跡とも整合する。

### Findings

- None
