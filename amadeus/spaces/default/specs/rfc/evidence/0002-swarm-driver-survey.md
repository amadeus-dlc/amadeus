# RFC 0002 実装サーベイ(evidence)— swarm 発動とドライバ選択の現行実装

> RFC 0002 本文は契約仕様のみを記す。本ファイルはその根拠となる実装実測(file:line)の記録。測定 ref: origin/main 215855ea7(2026-08-16)。

## 発動判定(エンジン)

- 判定本体: `packages/framework/core/tools/amadeus-orchestrate.ts` `tryEmitSwarm`(:4140)。条件は (1) construction phase かつ swarm 対象の `for_each`/`mode`(:4155-4156) (2) walking-skeleton ゲートでない(:4161) (3) delivery plan から batch 選択可(`selectSwarmBatch` :4166) (4) Intent autonomy 付与済み(`autonomySwarmOutcome` :3943 — null なら declined、直列 per-unit run-stage へフォールバック :4211-4213) (5) `gated` は batch 境界の `ask` ゲート(`owedBatchGate` :3955)。全成立で `invoke-swarm`(:3974, :3992)
- `AMADEUS_USE_SWARM` は発動判定に出現しない(orchestrate.ts 内 grep 0 件)

## ドライバ解決

- `packages/framework/core/tools/amadeus-swarm.ts` `resolveDriver(raw, harness)`(:147-164)。`DriverName`(:120)、`HarnessName`(:127-128)
- raw は trim しない(:142-143)。旧 boolean 値 `"1"` の明示 reject(:160-162)
- 非ネイティブ認識値の degrade と `--degraded-from` → `SWARM_DEGRADED` の分担(:31-35)
- ランタイム degrade(`claude-ultra` selected だが Workflow ツール不在)は conductor 側判断(`SKILL.md:69`(2))
- conductor の読取手順: `SKILL.md:69`(1) — batch ごとに1回 `resolve --harness <h>`

## 検証・統合・予算

- referee コマンド面(`amadeus-swarm.ts` 冒頭 :15-70): `prepare`(worktree fork + `SWARM_STARTED`)/ `check`(check-cmd exit 0 が唯一の正+fork 時 HEAD とのアンチタンパー比較)/ `retry`(:772-780 — `AMADEUS_SWARM_RETRY_CAP`、既定2・hard cap 3、不正値は budget-policy-mismatch で exit 2)/ `finalize`(claimed 再検証+直列マージ+失敗 envelope)/ 固定プール系(:1419)
- `amadeus-swarm.ts` 自身は autonomy/grant を検査しない(grep 0 件)— ゲートはエンジンの `invoke-swarm` 発行にのみ存在

## 設定・可観測性

- `max-parallel-units`: project→space→intent 解決、hard cap 4(`SKILL.md:88`)
- 監査イベント: `packages/framework/core/otel/event-registry.ts:963-1012`(SWARM_STARTED / UNIT_CONVERGED / UNIT_FAILED / BATON_RETURNED / COMPLETED / DEGRADED)

## 履歴実測(Motivation の混乱事例)

- record 内の真の `SWARM_STARTED`(`attributes.Event` 厳密一致)は 86 件、最古 2026-08-01。7月の一致はプロンプト本文への言及(誤検出)
- kimi 関与 intent 260803-harness-live-e2e: `AUTONOMY_MODE_SET Mode=autonomous`(2026-08-03T15:40:59Z)→ 初回 `SWARM_STARTED`(16:46:44Z)。env 未設定でもフロアドライバで発動 = 仕様どおり、スイッチは autonomy 側にあった

## モード→スケジューリング投影の実測(§2 補足の根拠)

`packages/framework/core/tools/amadeus-orchestrate.ts` `readAutonomyMode`(:2042-2054): `none`・`semi` → `"gated"`(:2046、コメント「none and semi both fan out and stop at batch-end human gates」:2044-2045)、`full`+scheduling `autonomous` → `"autonomous"`(:2048-2049)、フィールド不在・未認識値 → null = swarm 不発動(:2040-2041)。

## モード既定値の実測(発動条件表の根拠)

- state 初期化テンプレートが intent 誕生時に `Intent Autonomy Mode: none` を seed する(`packages/framework/core/tools/amadeus-utility.ts:4979`)
- 型は sealed: `export type AutonomyMode = "none" | "semi" | "full"`(`amadeus-intent-autonomy.ts:11`)
- 全 intent state の実測(`grep -rh "Intent Autonomy Mode" amadeus/spaces/default/intents/*/amadeus-state.md | sort | uniq -c`): full 33 / semi 10 / none 9 — フィールド欠落の state は 0 件。`readAutonomyMode` の null 分岐(欠落・未認識値)は破損時の防御であり、実 record では未到達

## 対象ステージの外延の実測(§2 条件1の根拠)

swarm 対象条件は `for_each === "unit-of-work" && mode === "subagent"`(`amadeus-orchestrate.ts:3852-3853,:4232`)。全ステージ frontmatter の実測(`grep -l "for_each: unit-of-work" stages/*/*.md` × `mode:`): code-generation のみ `mode: subagent`。functional-design / infrastructure-design / nfr-design / nfr-requirements は `for_each: unit-of-work` だが `mode: inline` のため swarm 対象外(エンジン駆動の直列 per-unit ループ)。

## §5 から降格した内部プロトコル契約(グリリング裁定 Q6、2026-08-16)

読者の挙動予測に不要な内部プロトコルとして RFC 本文から evidence へ降格(情報は保持):

- 再試行の再 dispatch は新しい batch ではなく、既存の作業領域と発行済みの実行 permit に対して行う(準備をやり直さない)— prepared retry 指令(`prepared_batch` + `retry_unit` の不可分ペア、`SKILL.md:76`)
- worker の開始は permit の取得(claim)だけでは事実と認めず、実行基盤による受理の確認(`confirm-dispatch`)をもって開始と記録する(`SKILL.md:89`「a claim alone is not a start fact」)
