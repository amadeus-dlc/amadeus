<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->

- 2026-08-04T00:00Z — Bolt A の実装は別 worktree `.claude/worktrees/agent-a429e5a9ade2936e4`(ブランチ `worktree-agent-a429e5a9ade2936e4`、HEAD `a849ca62f`、base `1f4498fcc`)に committed で存在する。チェックボックスを信用せず file:line で監査した(`cid:code-generation:cg-handover-plan-audit`): `packages/framework/core/tools/amadeus-lib.ts` から `liveOwnerMayBeReaped` / `AuditLockReapPolicy` / `reapPolicy` が全消失、`finalizeAuditLockAcquire:6331-6350` が fail-closed 化、`tests/integration/t427-audit-lock-live-owner-no-steal.integration.test.ts` に FR-1/FR-2/FR-3a/FR-3b の4件が実在。計画 Step 1-9 は実施済みと確定した。

- 2026-08-04T01:00Z — no-silent-drop ゲートの `previousDigest` 契約は「現在の baseline.json の previousDigest が、trusted base のバイト列のダイジェストに一致すること」(`tests/no-silent-drop/bootstrap.ts:498-501`)。base が既に現行 baseline を含む状態(= baseline を触らない PR)では自己参照になり構造的に不成立になる。さらに `baseline-candidate` サブコマンド自体が同じ assert を先に通るため、台帳が乖離した状態では再生成コマンドも塞がれる(実測 exit 2 / `approval censusDigest does not match the validated snapshot`)。census 母集団を変える変更では `census-evidence` → approval 更新 → `baseline-candidate` の順で台帳を再バインドする必要がある。
- 2026-08-04T01:00Z — §12a reviewer runtime の `requestedReads` / `scopeTranscript` は**スコープ外の spot-check 用**フィールドで、最大1件(`amadeus-reviewer-runtime.ts:437-441`)。スコープが返した全パスをここに列挙すると `only one spot-check request is allowed per invocation` で complete-review が exit 1 になる。spot-check を行わないレビューでは両方とも空配列にする。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->

- 2026-08-04T00:00Z — 計画 Step 8 は no-silent-drop 台帳を「差分ゼロ、または削除のみ」としたが、FR-2 の fail-open catch 除去により census 母集団が 217→216 へ縮小し、`baseline.json` の `previousDigest` がベースのバイト列へ接地しなくなった(`bootstrap.ts:498-501` の assert)。加えて `t413-no-silent-drop-ci-adoption.test.ts:110-114` が 217 / removed 10 / `{#1874,#1878,#1979}` を逐語ピンしており、既存テスト契約の改訂が必要になった。requirements の FR-4 は台帳の増減に言及していないため、`cid:code-generation:deviation-stop-before-implement` に従い実装前に停止しユーザーへ裁定を求めた。裁定(2026-08-04 承認): 「台帳を再生成し t413 のピンを明示改訂して同一 PR に含める」。実装の後退は採らない。

- 2026-08-04T01:00Z — §12a iteration 1 が BLOCKER 2件で NOT-READY。(1) FR-1 受け入れ基準 第3項(`requirements.md:41`)と NFR-2(`:175`)が要求する20並列プロセスの損失ゼロ回帰が不在で、t427 の4件は単一 acquire の真偽 assert に縮小されていた — 計画 Step 1 の時点で基準を縮小しており、逸脱申告もなかった。(2) 受け入れ基準 第4項(`:42`)の「改訂前後の赤/緑記録」が成果物に不在。いずれも iteration 2 で是正(t428 新設 + 前後実測表)。**計画段階で受け入れ基準を単発 assert へ縮小したことが根因**であり、実装ではなく計画の欠落だった。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->

- 2026-08-04T00:00Z — 赤の帰属切り分けで、ベースコミット単体での再現(`--base-revision` = そのコミット自身)は自己比較の縮退条件であり帰属の証拠にならないと判明した。決定的な切り分けは同一3ファイルをベース worktree と Bolt ブランチで実行した失敗集合の差分で行い、ベース4件・HEAD6件の差 = t413 の2件が自変更由来と確定した(`cid:code-generation:local-ci-red-assertion-verbatim`)。

- 2026-08-04T01:00Z — commit 間の diff を判定材料にするゲート(t413 の evidence 鮮度 assertion)の「落ちる実証」は、作業ツリーへの注入では観測できない — 注入もコミットして初めて赤になる。注入コミット → 赤の実測 → `git reset --hard <fix SHA>` を不可分の1セットで行い、残渣ゼロ(`git diff --stat <前コミット>..HEAD -- <対象ディレクトリ>` が空)まで確認した。
- 2026-08-04T01:00Z — 既存テストの「明示改訂」は必ずしも「改訂前が赤」を意味しない。t163 / t-reap-mutex の改訂は閾値の**強化**(`AMADEUS_LOCK_STALE_MS` 600000 → 1)であり、旧版は無害な閾値だったため改訂前後とも緑だった。強化が実効であることは「改訂後テスト × 修正前実装」で示す必要があり、この対角の実測がないと改訂が空文かどうか判別できない。t-reap-mutex は強化後も修正前実装で赤にならず、それは同テストが固定する不変条件が本修正と独立だからである。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-08-04T00:00Z — Bolt B(#1875 `Completed` 正準定義、FR-5〜FR-8)は未着手。Bolt A 着地後に unit dir を作成し directive を捕捉してから開始する(`cid:code-generation:c1-degrade-batch-directive-capture`)。

- 2026-08-04T01:00Z — `t-codex-exec-live-helper` の間欠赤(4回中1回)は NFR-3 の受け入れ基準内にあり、未改変 base 上での同一失敗集合の再現(`cid:build-and-test:bt-20260730-2`)は未実施。静的非交差に基づく推定で「本 Bolt と無関係」としたが実測確定ではない。#2154 で追跡。

