# re-scan 記録 — 260717-swarm-dispatch-enum

## 実行メタデータ

- Date: 2026-07-18(Asia/Tokyo)
- Observed at: HEAD `e9a001105d253e14affb77417423d9f0b0360f9e`(`git rev-parse HEAD` 実測)
- Intent: `260717-swarm-dispatch-enum`([Issue #1157](https://github.com/amadeus-dlc/amadeus/issues/1157) — `AMADEUS_USE_SWARM` の三値 enum 化 `unset`/`claude-ultra`/`codex-ultra` + Codex 通常経路のセッション内 native subagent 並列化。Mirror Issue #1182)
- Scope: `amadeus`
- Project type: Brownfield
- Repository: `amadeus`
- Stage: `reverse-engineering`(2.1)
- 手法: diff-refresh(cid:reverse-engineering:c1、E-L63 の base 選定則)。base=`6495e03a12d9e7149c2e80b59f171a90607a2d2c`(全 `re-scans/*.md` observed のうち HEAD 祖先かつ距離最小。`git merge-base --is-ancestor 6495e03a12d9e7149c2e80b59f171a90607a2d2c HEAD` exit 0 実測、`git rev-list --count 6495e03a..HEAD`=**128**。rescan-base-ancestry)。日付が新しい squash tip の非祖先 observed は E-L63 に従い base 候補から除外。
- 実施体制: Developer(スキャン)→ Architect(合成)の2サブエージェント直列(cid:reverse-engineering:c3、独立再照合で反証なし)
- 測定 ref: 件数・行番号はすべて observed HEAD `e9a001105` の実ファイル直読(measurement-ref-in-artifacts)。区間変更の有無は `git log 6495e03a..HEAD -- <path>` で実測。
- Per-intent 真実源: 本ファイルおよび `inception/reverse-engineering/scan-notes.md`
- Base の真実源: per-intent `re-scans/*.md` の到達可能な Observed commit。共有 `reverse-engineering-timestamp.md` は repo-level freshness pointer であり、次回差分 base の真実源にはしない。

## スキャン結論の要約

`AMADEUS_USE_SWARM` の三値 enum 化と Codex 通常経路の native subagent 並列化が触れる seam の現行実装。swarm 正本(`amadeus-swarm.ts`)・SKILL の invoke-swarm dispatch 指示・swarm テスト群は区間 `6495e03a..HEAD`(128コミット)で **区間変更ゼロ**(`git log 6495e03a..HEAD -- packages/framework/core/tools/amadeus-swarm.ts`=0件)。実行コード・構造・API・依存の関心 seam は実質無変更。区間の実変更はフォーカス外(CI ワークフロー リファクタ・coverage-patch-gate 新設・metrics-timeseries / opencode / cursor / norm-metrics / amadeus-mirror / settings-docs-sync の新テスト群)。パッケージ構成・依存の新規追加なし。

### 重点1 — `AMADEUS_USE_SWARM` 全数と読み取り実態(改修対象の中核)

- 総出現 **188**(core 6 / dist 44 / .claude 7 / docs 16 / tests 0)。
- **実コード読み取り(`process.env.AMADEUS_USE_SWARM`)は repo 全域ゼロ**。この env var はエンジンのコードパスに一切読まれない — すべて conductor 側の SKILL 指示テキスト(prose)で読まれる env である。
- 正本 6 箇所は全てコメント/文書: `amadeus-swarm.ts:5,26,28,282,400`、`docs/reference/audit-format.md:202`。
- **現行の判定は二値(`== "1"`)**: `unset` → subagent floor(N 並列 `Task`)、`"1"` → inline Dynamic Workflow(ultracode ドライバ)、`"1"` かつ Workflow tool 不在 → loud-degrade + `--degraded-from ultracode`。
- 主改修サイト(prose dispatch 指示):
  - `packages/framework/harness/claude/skills/amadeus/SKILL.md:61`(canonical 二値 dispatch)
  - `packages/framework/harness/codex/skills/amadeus/SKILL.md:57,171`(floor = codex exec per-unit workers、`=1` は常に loud-degrade)
  - `packages/framework/harness/codex/onboarding.fills.ts:55`
  - `kiro` / `kiro-ide` の `SKILL.md` と `onboarding.fills.ts` 各1
- **三値化時の欠落面**: `opencode` / `cursor` harness 源には `skills/amadeus/SKILL.md` が存在せず、dispatch 指示自体がない。三値 enum の指示追加は既存4 harness(claude/codex/kiro/kiro-ide)に限られ、opencode/cursor は別途判断が要る。
- docs 契約: `docs/reference/08-construction-and-swarm.md:201-213`(driver seam 二値表)、`docs/reference/17-skill-system.md:122`。

### 重点2 — referee 契約(`amadeus-swarm.ts`、789行、ステートレス3サブコマンド・状態ファイルなし :15)

- **`prepare`**(:16-30): `--batch --units [--base][--concurrency][--degraded-from subagent|ultracode][--repo]`。worktree fork + `SWARM_STARTED` を1回 emit。`--degraded-from` パースは :402-407 で `DRIVER_VALUES.includes` により不正値を fail。
- **`check`**(:31-37): `--check-cmd [--test-file]`。advisory であり audit emit なし。
- **`finalize`**(:38-51、実装 ~:560-): `--claimed` 必須で AUTHORITATIVE。
  - `--claimed` 意味論(:568-660): `claimedSet`(:574)、claimed unit を再検証(`verdictFor` :608)、claimed だが red/tampered は merge 拒否 + envelope(lying-conductor guard :634-640)、未 claim は `--reasons` の typed attribution(`unsatisfiable`/`budget-exhausted`/`cap-exhausted`、無指定は `cap-exhausted` :648-660)。
- **driver 型**: `type DriverName = "subagent" | "ultracode"`(:88)、`DRIVER_VALUES`(:89)。**`DriverName` は `swarm.ts` 内に閉じており他消費者ゼロ** — 三値 enum の導入は swarm 正本の driver 型か SKILL prose のどちらで表現するかが設計判断点。`FailureReason`(:84)。

### 重点3 — dispatch 経路(engine は driver を選ばない)

- engine は `{"kind":"invoke-swarm"}` directive を emit するのみ(driver 選択しない、`tests/integration/t135-invoke-swarm.test.ts:10`)。
- **Claude floor** = N 並列 `Task`、`"1"` = `Workflow({script,args})`。
- **Codex floor** = headless `codex exec` per-unit workers(`codex exec --skip-git-repo-check -C <worktree> "<task>" < /dev/null`、`codex/SKILL.md:57,171`)。
- Codex 別プロセス経路の現存: `codex/emit.ts:81`、`onboarding.fills.ts:42,55`、`tests/e2e/t-exec-codex-journey-workspace.serial.test.ts`。
- **feasibility 既決**(project.md `cid:feasibility:c1-2`): Codex native subagent の並列 spawn・結果回収は成立。`effort` 指定は API に受理されるが、honor された値を示す telemetry は観測不能(受理と実適用を分けて扱う)。

### 重点4 — 監査語彙(`amadeus-audit.ts:147-152`、表示名 :227-232、6イベント)

- `SWARM_STARTED`(swarm.ts:265)
- `SWARM_DEGRADED`(:285、Fallback `driver="subagent"` ハードコード :293)
- `SWARM_UNIT_CONVERGED`(:297)
- `SWARM_UNIT_FAILED`(:310)
- `SWARM_BATON_RETURNED`(:323)
- `SWARM_COMPLETED`(:336)
- **三値化時**: `Requested driver` 型と `Fallback` ハードコード(:293)の語彙拡張が必要。同期テスト `t28-audit-event-sync`。

### 重点5 — 旧 driver stack 残滓(不在確認済み)

- `git ls-tree` で source/dist/.claude に driver 命名ファイル**ゼロ**。`SwarmDriver` / `driverStack` / `adapterDriver` / `dispatchDriver` / `DriverAdapter` の出現**ゼロ**。ヒットは `260713` record tree と re-scans のみ。
- → 260713-swarm-driver-migration が構想した `AMADEUS_SWARM_DRIVER` の adapter/driver スタックは製品に着地しておらず(その re-scan の「不足5点」参照)、本 intent は現行の二値 `AMADEUS_USE_SWARM` prose 契約を出発点とする。

### 重点6 — テスト面

- `t134-swarm-referee`(e2e、6イベント全)
- `t135-invoke-swarm`(integration、区間 +5)
- `t207-swarm-guards`(unit)
- `t211-swarm-batch-progress`(unit)
- `t28-audit-event-sync`(unit)
- `t181-conductor-skill-parity`(unit、harness SKILL パリティ)
- `t186-foreach-per-unit-iteration`(unit)
- `t166-multi-repo-construction`(integration)
- `t-exec-codex-journey-workspace.serial`(e2e)
- coverage-registry :599-671 に t134/t135 登録。

### 重点7 — docs 面

- 正規契約 = `docs/reference/08-construction-and-swarm.md`(:201-213 driver seam 表、:230- code-change 面)+ `docs/reference/17-skill-system.md:108-122`。
- 他 16 ファイル(`.md`/`.ja.md` 対): reference 03/06/12/13/14、guide 10/12/glossary、`guide/harnesses/{codex-cli,cursor,opencode,kiro-cli,kiro-ide}`、guide 18、harness-engineering 00。

### 重点8 — 区間構造変化(すべてフォーカス外)

- CI ワークフロー リファクタ(`.github/workflows/ci.yml` 88+/117−)。
- coverage-patch-gate 新設(t229 + `tests/coverage-patch-gate.ts` 新規 + `tests/.coverage-patch-allowlist.json`) — **本 intent PR は patch gate 対象**。
- 新テスト群: metrics-timeseries(t230/t231)、opencode/cursor アダプタ(t149/t230-marker/t-cursor-adapter)、norm-metrics、amadeus-mirror(t232)、settings-docs-sync(t228)。
- 依存の新規追加なし。

## 再照合の結果(Architect 独立検証)

Developer scan の骨子を observed HEAD `e9a001105` に対する機械的裏取りで再照合。

| # | 主張 | 検証コマンド | 結果 |
|---|---|---|---|
| 1 | observed = HEAD | `git rev-parse HEAD` | `e9a001105…` 一致 |
| 2 | base 祖先性 | `git merge-base --is-ancestor 6495e03a HEAD` | exit 0(祖先) |
| 3 | base 距離 | `git rev-list --count 6495e03a..HEAD` | 128 一致 |
| 4 | swarm 正本 区間変更ゼロ | `git log 6495e03a..HEAD -- …/amadeus-swarm.ts` | 0件 一致 |

Developer scan の file:line 主張(swarm 正本の referee 契約・driver 型 :88-89・6監査イベント・SKILL dispatch サイト)は区間変更ゼロが確定しているため、base 時点で確立済みの構造として後続ステージが引用可能。requirements-analysis 以降は本記録の重点1〜8 を一次引用元とする。

## codekb 本文への反映判断

codekb 本文9ファイル(business-overview / architecture / code-structure / api-documentation / component-inventory / technology-stack / dependencies / code-quality-assessment / component-inventory)は、本 intent の関心 seam(`AMADEUS_USE_SWARM` prose 二値 dispatch / swarm referee 契約 / 6監査イベント / Codex exec 経路 / 旧 driver stack 不在)の canonical が区間 `6495e03a..HEAD` で **区間変更ゼロ**(swarm 正本の実測)であり、再照合でも本文との矛盾を検出しなかったため **全点温存(churn 回避、cid:reverse-engineering:c1)**。区間の実変更はいずれも本 intent のフォーカス面外(CI リファクタ・coverage gate・無関係な新テスト)。更新は本 re-scan エントリと `reverse-engineering-timestamp.md`(鮮度ポインタ + 旧「最新: 260717-codekb-diff3-cleanup」→履歴ラベル降格)のみ。
