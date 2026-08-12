# Requirements: self-* PR Convergence Gate

## Intent Analysis

[Issue #2838](https://github.com/amadeus-dlc/amadeus/issues/2838) は、Amadeus 自己開発 workflow がローカル成果物だけで Completed にならず、linked Pull Request の作成、review/CI convergence、CLI 由来証跡の検証を必ず通ることを求める。観測コミット `854692fd7` では4つの self-* scope への stage binding は存在するが、report attestation と completion fail-closed 契約が不足している。

入力証拠は共有 CodeKB の `business-overview.md`、`architecture.md`、`code-structure.md` である。前者は利用者価値と未達条件、architecture は selection/delivery/evidence/completion の4境界、code structure は plugin/core/harness/test の変更面を特定している。stage frontmatter が任意入力として宣言する `intent-statement`、`scope-document`、`team-practices` は今回の run-stage directive には供給されていないため、Issue #2838、Intent audit、共有 memory を代替正本とし、個別成果物としては使用しない。判断根拠は同 stage の `requirements-analysis-questions.md` に記録する。

## Functional Requirements

### FR-1: self-* scope の mandatory stage binding

`self-document`、`self-feature`、`self-fix`、`self-refactor` は、plugin compose 後の全 harness stage graph と scope grid で `pr-convergence` を `EXECUTE` とする。self-* では stage の SKIP、scope/config override による除外、SKIP 状態での workflow completion を一切許可しない。FR-7 の human override は stage を実行した上で convergence 未達を裁定する例外であり、mandatory binding の回避手段ではない。非 self-* scope は現行の opt-in を維持する。

**Acceptance check:** 4 scope × 全 harness の compiled grid、compose、drop、resume を検査し、self scope は常に EXECUTE、SKIP/除外 override は拒否、drop 後は所有 bytes が復元される。

### FR-2: 単一 report の検証可能な lifecycle

plugin CLI だけが per-Unit `pr-convergence-report.md` を生成・更新する。PR create 後は `created`、収束後は `converged`、実 HUMAN_TURN に基づく例外は `override` として状態を明記する。Code Generation approval は linked PR の `created` 以上、最終 completion は `converged` または有効な `override` を要求し、`landed` を convergence とみなさない。

同一 PR head の正規遷移は `absent → created → converged` または `absent → created → override → converged` だけとする。同一状態への再実行は identity と bytes が一致する場合の idempotent no-op とし、`converged → override/created`、`override → created` は拒否する。PR head が変わった時点で旧 report/attestation/sensor verdict は失効し、新 head を別 lifecycle epoch として `created` から再開する。`landed` は状態集合に含めない。

Code Generation の PR create action が `created` の生成と直後の sensor fire を所有し、`pr-convergence` stage の status/report/override action が `converged` または `override` への更新と直後の sensor fire を所有する。resume と各 gate は report 更新を行わず、current bytes の attestation と最新 sensor verdict を再検査する。

**Acceptance check:** 上記遷移表、same-state idempotency、head 変更による失効と `created` 再生成、不正な後退・手書き状態・`landed` の自動承認拒否を integration test で確認する。

### FR-3: CLI report attestation

CLI は audit lock 内で canonical attestation event を発行し、Intent UUID/record、Bolt/Unit、repository/PR、local/remote/PR head SHA、report content digest、event identity を相互束縛する。report は検証に必要な非秘密の receipt identity を持つ。copy、tamper、別 Intent/Unit/PR/head への replay は fail-closed に拒否する。

**Acceptance check:** CLI 生成 report は PASS し、手書き、コピー、1 byte 改変、古い head、別 Unit/Intent の report はそれぞれ actionable reason 付きで FAIL する。

### FR-4: report sensor の blocking gate

plugin compose は `pr-convergence-report-format` を report 更新 action を持つ Code Generation と `pr-convergence` の両 stage へ自動 binding し、sensor manifest を blocking とする。CLI が Bash/process boundary から report を書く場合も、write → attestation event → sensor fire を単一 delivery transaction の順序契約とし、未実行・`SENSOR_FAILED`・stale PASS を承認材料にしない。resume は report/attestation の再検査後に最新 PASS を照合する。

**Acceptance check:** latest terminal verdict が `SENSOR_PASSED` の場合だけ gate が通り、never-fired、failed、report 更新後の stale PASS は engine と direct state API の双方で拒否される。

### FR-5: 全 completion chokepoint の required-all parity

orchestrator の per-Unit coverage と `approve`、`advance`、`finalize`、`complete-workflow` を含む direct state transition は、宣言された required artifacts の全件を要求する。同じ transition 群は blocking sensor と attestation precondition を同じ強度で評価し、最低1件の artifact 存在だけで通してはならない。

**Acceptance check:** required artifact を1件ずつ欠落させた table test と、各 direct transition の bypass test がすべて fail-closed になる。

### FR-6: PR create 前の local/remote prerequisite

linked self-* の `create` は、base と異なる明示 head branch、対象変更を含む local commit、clean tracked state、remote branch の実在、local HEAD = remote head SHA を検査してから GitHub write を行う。既存 PR を使う場合は PR head SHA も同じ SHA に一致させる。不成立時は mutation 前に不足条件と修復コマンドの種類を返す。

**Acceptance check:** dirty、uncommitted、unpublished、SHA mismatch、base=head の各 fixture で GitHub gateway が未呼出しのまま非0終了し、正常 fixture のみ create/status へ進む。

### FR-7: bypass と人間裁定の境界

linked self-* では `--unlinked true` を拒否する。human override は linked PR、valid attestation、実 HUMAN_TURN、理由を必須とし、convergence 未達を明示した report と audit event を生成する。非 self-* の明示 opt-in では既存 unlinked contract を変更しない。

**Acceptance check:** self scope の unlinked は拒否、HUMAN_TURN/PR/attestation のいずれかを欠く override は拒否、非 self scope の既存 unlinked tests は green を維持する。

### FR-8: cross-surface regression matrix

回帰テストは4 self scope、全生成 harness、plugin compose/drop、resume、Code Generation gate、pr-convergence gate、workflow completion を被覆する。正規経路だけでなく hand-written/copy/tamper/replay、sensor never-fired/failed、local prerequisite failure、direct state bypass の落ちる実証を含める。

**Acceptance check:** targeted unit/integration suite、`bun run lint`、`bun run typecheck`、`bun run build`、関連 distribution/source-only check が成功する。

## Non-Functional Requirements

- **NFR-1 Integrity:** report の受理判断は path/shape だけに依存せず、canonical audit receipt、content digest、Intent/Unit/PR/head identity の一致を必要とする。
- **NFR-2 Fail-closed reliability:** GitHub、git、audit、sensor の状態が不明・欠落・矛盾する場合は承認せず、typed/actionable reason を返す。
- **NFR-3 Maintainability:** core は plugin 固有 Markdown schema を import せず、generic artifact/sensor/audit contract を所有する。GitHub と report schema は plugin が所有する。
- **NFR-4 Reproducibility:** 全生成 harness は core/plugin source から byte-deterministic に再生成でき、generated surface を source-of-truth としない。

## Constraints

- Bun-only TypeScript monorepo と既存 process-boundary pattern を維持する。
- `packages/framework/core/` と `plugins/pr-convergence/` を正本とし、生成された `.claude/`、`.codex/`、`.agents/`、`.cursor/`、`.kimi-code/`、`.opencode/`、`dist/` は実装として commit しない。
- CLI は commit、push、merge を暗黙実行しない。merge は常に人間の独立判断とする。
- Issue #2838 と直接対応しない互換 layer、新 SCM provider、一般 scope の mandatory 化は導入しない。

## Assumptions

- canonical audit emitter と audit lock は workflow 内の tool-owned trust boundary として扱える。
- plugin seam は `produces` 以外の stage frontmatter list にも一般化でき、drop 時に所有 bytes を復元できる。
- self scope identity は active Intent state から deterministic に解決でき、CLI の caller-provided flag だけを信用しない。

## Out of Scope

- Pull Request の自動 merge
- review finding の自動修正戦略そのもの
- GitHub 以外の forge/provider 対応
- 非 self-* workflow への mandatory pr-convergence 適用
- 既存 plugin convergence predicate と review ledger の再設計

## Open Questions

material ambiguity は残っていない。実装中に plugin seam が `sensors` を扱えないことが判明した場合は、FR-4 の結果を保った最小の一般化を選び、plugin 固有 schema を core に持ち込まない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-11T14:56:39Z
- **Iteration:** 1
- **Scope decision:** none

FR数、質問数、主要な異常系の受入条件は Minimal depth の要求を満たしています。一方、上流成果物の参照漏れ、mandatory stage の回避条件、report lifecycle の状態遷移が未確定であり、実装・QAの判断が分岐するため READY ではありません。

### Findings

- BLOCKER | upstream-coverage 契約を満たす参照がない | requirements.md は consumes 3成果物の参照または未使用理由を明記する必要があります。
- BLOCKER | mandatory stage を回避できる条件が矛盾している | self-* で stage 自体の SKIP を許すかを一意に定める必要があります。
- BLOCKER | report lifecycle の正規状態遷移が定義されていない | 許可・拒否遷移と PR head 更新時の失効規則が必要です。
- FOLLOW-UP | report 更新と sensor 実行の stage ownership を明確化する | artifact path、更新主体、各 gate の verdict、resume 時の再検査順序を固定してください。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-11T14:58:25Z
- **Iteration:** 2
- **Scope decision:** none

iteration 1 の全 findings は解消されています。任意上流成果物の未供給理由が明記され、self-* stage の SKIP 禁止と human override の境界が一意になりました。report の許可・拒否遷移、PR head 更新時の失効、冪等性、更新主体、sensor fire、resume 時の再検査も明文化され、開発とQAが同じ契約を実装・検証できます。Minimal depth のFR数、質問数、受入条件、スコープ境界もステージ契約を満たしています。

### Findings

- None
