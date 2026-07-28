# Code Summary — fix-1612-gated-swarm

上流入力(consumes 全数): requirements.md — 本書の実装対応表(FR-1〜FR-9 / NFR-1〜2)の照合元。code-generation-plan.md の設計決定 D-1〜D-4 に準拠。

実装ブランチ: `bolt/1612-gated-swarm-gate`(base `a372165e8` = origin/main)。コミット3本(builder 実装、push は未実施):

- `7eab990fd` fix(engine): fan out parallel batches under a gated autonomy grant (Refs #1612)
- `0d0b190d6` docs(swarm): document the gated batch-end gate and the enforced ladder (Refs #1612)
- `7ed6bd818` fix(coverage): keep the gated batch-gate question on one measurable line (Refs #1612)

変更規模(測定 ref: bolt head `7ed6bd818`、`git diff --stat a372165e8..HEAD` 転記): 全体 67 files / +3562 −697(生成物込み)、正本+docs+tests のみ 23 files / +606 −105。生成物は dist 7ハーネス+self-install 5ツリーの再生成(直接編集なし、`dist:check` / `promote:self:check` exit 0)。

## 実装対応(D-1〜D-4、file:line は bolt head 実測)

- **D-1(FR-7)3値化**: `amadeus-orchestrate.ts:1160` に `AutonomyMode = "autonomous" | "gated"` 型、`:1171` の `readAutonomyMode` が `"autonomous" | "gated" | null` を返す。未知値は null(unset 意味論 — skeleton 完了後は ladder 再提示で人間へ戻る自己回復分岐)。消費3箇所を実装時再列挙: `:2642`(トリガ)/ `:2837`(ladder 判定)/ `:3938`(approve ガード)。
- **D-2(FR-1/FR-2)gated swarm+バッチ末尾ゲート**: トリガ `:2642-2643`(null のみ拒否)。`firstUncoveredBatch`(`:2561`)と `owedBatchGate`(`:2590`)へ関数抽出(complexity gate CCN 21→閾値内の是正を兼ねる)。gated で先行バッチ未承認なら既存 `ask` kind でバッチ末尾ゲートを emit(`:2649-2653`)— 新 directive kind なし、stop hook 変更不要。最終バッチはステージ本ゲートが兼ねる(FR-2d、二重ゲートなし — t211 h で固定)。承認台帳は state フィールド `Swarm Gated Batch Approvals`(`:2525`、数値 parse・不正トークン drop = fail-closed)。
- **承認 CLI**: `amadeus-bolt.ts:863` `handleApproveBatch`(dispatch `:947`)— `amadeus-bolt approve-batch --batch <n>`。冪等(再承認は no-op、GATE_APPROVED の二重 emit なし)、監査は既存タクソノミの `GATE_APPROVED` のみ(FR-2e 充足、新イベント名なし)。
- **D-3(FR-3)unset ladder の engine 強制**: `:2837-2840`(skeleton-unresolved 分岐直後、in-flight/advance 両経路が通る単一箇所)。判定述語 `skeletonGateCompleted`(`:1290`)は skeleton-gate ステージ checkbox の completed から導出(弱い述語不使用・slug 非ハードコード)。skeleton 未完了 unset は従来挙動維持。
- **D-4(FR-6)approve ガード対称更新**: `:3937-3939` `isAutonomousSwarm`→`isSwarmDriven`(`mode===SWARM_MODE && readAutonomyMode(...)!==null`)、コメントも新契約へ改訂。デッドロック回帰は t211 l で固定。

## テスト(FR-9 落ちる実証込み)

- 新規/改訂: t135(test 2 を gated→invoke-swarm の新契約へ書換え+test 2b: unset ladder ask)、t211(+175行: gated fan-out d / バッチ末尾ゲート e / 承認後前進 f / 台帳 fail-closed g / 本ゲート単一 h / ladder 再発火 j / デッドロック回帰 l 等)、t33(+66行: approve-batch の GATE_APPROVED / state 記録 / 追記 / 冪等)。
- 落ちる実証(注入面はテストが読む面を実測確認、stash 不使用の checkout 限定切替): t135 test 2/2b 赤(`Expected: "invoke-swarm" / Received: "run-stage"` 等)→ green、t211 6件赤(pre-fix core 面切替)→ green、t33 4件赤(pre-fix bolt+dist 再生成)→ green。
- 回帰不変(FR-4/FR-5): t135 1/1b/7、t186 6/6b/13、t211 a/b/c、t251 guard 1/2/2b — 全て無改変 green。
- 契約再ベース3件(FR-3 の意図した帰結、要件の不変リスト外): t251 d(fixture の skeleton を [-] へ — 新契約では skeleton 完了+unset は ask になるため)、t116/t120(ローカル seed へ `Construction Autonomy Mode: gated` 追加。共有 fixture 自体は未変更)。

## 文書同期(FR-8)

stage-protocol.md(:409 系の直列前提記述の最小改訂、仕様本文 :123-125 不変)、SKILL.md 5ハーネス(invoke-swarm 表行: autonomous-only 記述→新契約+gated 分岐)、docs EN/JA 対: harness-engineering/08-construction-and-swarm、guide/glossary、reference/17-skill-system。

## 検証(全て bolt worktree 実測、exit code)

builder 実測: typecheck 0 / lint 0 / dist:check 0 / promote:self:check 0 / complexity-gate 0(新規違反0)/ `tests/run-tests.sh --ci` 0(631 files, Failed 0)/ patch gate 0(追加66行 covered 66・allowlist 0・uncovered 0、`AMADEUS_PATCH_BASE_REF=a372165e8`)。
conductor 裏取り(evidence-discipline): typecheck 0 / dist:check 0 / t135+t211+t33 = 58 pass 0 fail を独立再実行で確認。

付随是正: coverage-patch-allowlist の行ピン11件を base→head 行マップで機械 remap(うち8件は stale 検査に映らない無音転位 — cid:code-generation:allowlist-line-pin-stale 追補の実例。全エントリの対象行不変を確認)。

## 申告事項(conductor 経由でゲートへ)

1. ask 文言のツールパスは plan の `.claude/tools/` 表記をハーネス中立の `amadeus-bolt approve-batch --batch <n>` へ適応(core 中立層の既存表記 :1153 と同形)。
2. `approve-batch` に human-presence guard は未実装(姉妹 verb `set-autonomy` と同形)。「gated のバッチ承認は人間の承認」という趣旨に対し AI 自己承認の余地が残る — presence 強制の要否は仕様判断としてゲートでユーザーへ諮る。
3. CI 中間1回の t-team-by-up-codex-resume flake は assertion 実文確認で負荷起因と帰属(本 diff は team-up.sh 非接触、単独 54/54 green・最終 full CI 0 fail)。
