<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-10T23:15Z diff-refresh(c1): base=58f3453ad(batch4 RE observed)→ observed=d8de2362b(現 main、batch3/4 全着地)。介在16コミット中フォーカス接触は4件、候補6件すべて偶発修正なし(未修正確認)。体制は Developer(スキャン)→ Architect(合成)の直列(c3)。
- 2026-07-10T23:15Z 起票の訂正所見2件: (i) #811 の分類器パスは core/tools でなく core/hooks/amadeus-mint-presence.ts:65 が正(分類器定義は amadeus-lib.ts:347) (ii) #831 の起票仮説(ロックパス PID 依存)は反証 — auditLockDir は決定的(tmpdir+md5(projectDir\x00space\x00intent))。真の機序候補は merge の active-intent cursor 解決 divergence と timeOrigin 依存 staleness マージン。U6 requirements は機序切り分けを前提に E-B3b Q1=A 分岐形式で固定すべき。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-10T23:15Z codekb 更新は code-quality-assessment.md+timestamp の2ファイルに限定(6件が挙動欠陥で構造変化なし → 他成果物は churn 回避で温存、batch4 前例踏襲)。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-07-10T23:15Z #819 は #741 手法(タイムスタンプ定数化)では閉包しない見込み(実 eslint の実プロセス spawn 由来の非ヘルメティック)— hermetic 化の設計判断が U5 requirements の分岐点。
