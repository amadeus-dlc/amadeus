# RFC 0002 実装サーベイ(evidence)— Unit 実行モデルの現行実装

> RFC 0002 本文は契約仕様のみを記す。本ファイルはその根拠となる実装実測(file:line)の記録。測定 ref: PR ブランチ `rfc/0002-swarm-driver-concept` HEAD(base `origin/main` = `56af74d10`)。独立レビュー(2026-08-16)の再実測で旧版の引用誤りを全面訂正した。

## 発動判定

- 判定本体: `packages/framework/core/tools/amadeus-orchestrate.ts` `tryEmitSwarm`(:4216)。条件は (1) swarm 対象の `for_each`/`mode`(:4232、定数 `SWARM_FOR_EACH`/`SWARM_MODE` :3852-3853) (2) walking-skeleton ゲートでない(:4237、`isSkeletonGateStage` :2224) (3) batch 選択(`selectSwarmBatch` 呼出 :4242) (4) autonomy 判定(`autonomySwarmOutcome` 呼出 :4244) (5) gated の batch ゲート(`owedBatchGate` :3928)。`invoke-swarm` 指令の鋳造は :4050 / :4068
- モード読取: `readAutonomyMode`(:2042-2054)— `none`・`semi` → `"gated"`(:2046)、`full`+scheduling `autonomous` → `"autonomous"`(:2048-2049)、フィールド欠落・未認識値 → null
- **モード未記録時の2分岐**(本文 §2 決定表の根拠): `planIntegrityVerdict`(`amadeus-lib.ts:8412-8433`)が decline 種別で分岐 — `autonomy-unset-pre-skeleton`(skeleton 未出荷)は幅≥2でも `{kind:"ok"}` → `emitSwarmOrPerUnit`(:4271)が通常 run-stage へ = **黙認して直列**。`autonomy-unset`(skeleton 出荷後)は `redirectVerdict` → `askDirective` = **停止してモード選択を要求**。分岐条件は `skeletonGateCompleted`(:2236-2241)。両挙動はテストで AC 固定済み: `tests/unit/t403-plan-integrity-guard.test.ts:106-114`(AC-1c)/ :116-123(AC-1b)
- `AMADEUS_USE_SWARM` は発動判定に出現しない(orchestrate.ts 内 grep 0 件)

## ドライバ解決

- `packages/framework/core/tools/amadeus-swarm.ts` `resolveDriver`(:146-162)。`DriverName`(:120)、`HarnessName` は claude|codex|kiro|kiro-ide|kimi|pi の6種(:127-128)
- raw は trim しない。旧 boolean 値 `"1"` に専用分岐はなく、コメント(:159)で名指しした上で catch-all の未知値拒否(:161)に落ちる
- 非ネイティブ認識値の degrade と `--degraded-from` → `SWARM_DEGRADED` の分担(:31-35)
- ランタイム degrade(`claude-ultra` selected だが Workflow ツール不在)は **claude ハーネスの SKILL.md にのみ**記述がある(`packages/framework/harness/claude/skills/amadeus/SKILL.md:71`)
- conductor の読取手順: SKILL.md は core 単一ファイルではなく**ハーネス別6面**(`packages/framework/harness/{claude,codex,kimi,kiro,kiro-ide,pi}/skills/amadeus/SKILL.md`)。invoke-swarm 節の行番号は面ごとに異なる(claude :71/:78/:90/:91、codex :69/:76/:88/:89 等)
- `amadeus-swarm.ts` 自身は autonomy/grant を検査しない — grep は 4 hits(:3,:13,:232,:233)だが**全てコメント**で、`handlePrepare` に検査コードはない。ゲートはエンジンの `invoke-swarm` 発行にのみ存在
- **ドライバ決定表の面間 drift**(本文 §7 項9 の根拠): 出荷 docs `docs/harness-engineering/08-construction-and-swarm.md:241-252` は claude|codex|kiro|kiro-ide の4列で「three-value enum — unset, claude-ultra, codex-ultra」と記し `pi` 非対応を明記するが、`resolveDriver:150` は `pi` を受理する。コード / 出荷 docs / SKILL.md 各面 / RFC 旧稿が四者四様だった

## 検証・統合・予算

- referee コマンド面(`amadeus-swarm.ts` 冒頭 :15-70): `prepare` / `check` / `retry` / `finalize` / 固定プール系
- 再試行予算の正本: `amadeus-convergence-policy.ts`(effectiveCap 2 / hardCap 3 の既定 :169-175、`CANONICAL_HARD_CAPS` :117-120)。`amadeus-swarm.ts:772-780` は `AMADEUS_SWARM_RETRY_CAP` による上書き入口
- 並列幅: canonical キーは `swarm.unit.concurrency.limit`(`amadeus-config.ts:624-630`、`max-parallel-units` は legacy 名)。既定4・範囲1..4(:486-492)、狭める方向のみ(`amadeus-swarm.ts:542-546`)、解決順 project→space→intent(`amadeus-config.ts:48`)

## 設定・可観測性

- 監査イベント: `packages/framework/core/otel/event-registry.ts:988-1045`(SWARM_STARTED / UNIT_CONVERGED / UNIT_FAILED / BATON_RETURNED / COMPLETED / DEGRADED)

## モード既定値と欠落の実測(§2 の根拠)

- 型は sealed: `export type AutonomyMode = "none" | "semi" | "full"`(`amadeus-intent-autonomy.ts:20`)
- 現行 init は intent 誕生時に `Intent Autonomy Mode: none` を seed(`amadeus-utility.ts:4979`)
- **census(2述語で両側を実測)**: state ファイル総数 174(`ls amadeus/spaces/default/intents/*/amadeus-state.md | wc -l`)。フィールド**保持** 52 件 = full 33 / semi 10 / none 9(`grep -rh "Intent Autonomy Mode" ... | sort | uniq -c`)。フィールド**欠落** 122 件(`grep -rL "Intent Autonomy Mode" ... | wc -l` — 保持側の grep は不在を観測できないため、欠落は -L で別途実測する)。境界は 260804 前後(以降の intent は保持)。**旧版 evidence の「欠落 0 件」は不在を観測できない述語からの誤った主張であり撤回**

## 対象ステージの外延(§2 条件1の根拠)

swarm 対象条件は `for_each === "unit-of-work" && mode === "subagent"`(orchestrate.ts :3852-3853, :4232)。出荷ステージグラフの実測(`grep -l "for_each: unit-of-work" packages/framework/core/amadeus-common/stages/*/*.md` × `mode:`): code-generation のみ `mode: subagent`。functional-design / infrastructure-design / nfr-design / nfr-requirements は `mode: inline`。**opt-in のローカルパックは同条件を満たすステージを追加しうる**(実測: `book-pack/stages/construction/chapter-drafting.md:8` が `mode: subagent` + `for_each: unit-of-work`)

## 履歴実測(Motivation の混乱事例)

- record 内の真の `SWARM_STARTED`(`attributes.Event` 厳密一致)は 86 件、最古 2026-08-01T01:35:35Z
- kimi 関与 intent 260803-harness-live-e2e: `AUTONOMY_MODE_SET Mode=autonomous`(2026-08-03T15:40:59Z)→ 初回 `SWARM_STARTED`(16:46:44Z)。なお同 intent の state は現在フィールド欠落 122 件の1つ(当時の autonomy はイベントとして監査に残る)

## §5 から降格した内部プロトコル契約(グリリング裁定 Q6、2026-08-16)

読者の挙動予測に不要な内部プロトコルとして RFC 本文から evidence へ降格(情報は保持):

- 再試行の再 dispatch は新しい batch ではなく、既存の作業領域と発行済みの実行 permit に対して行う(準備をやり直さない)— prepared retry 指令(`prepared_batch` + `retry_unit` の不可分ペア、claude 面 SKILL.md:78)
- worker の開始は permit の取得(claim)だけでは事実と認めず、実行基盤による受理の確認(`confirm-dispatch`)をもって開始と記録する(claude 面 SKILL.md:91「a claim alone is not a start fact」— pi 面には同記述なし)
