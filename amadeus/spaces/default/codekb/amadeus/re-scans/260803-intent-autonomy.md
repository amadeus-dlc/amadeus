# 260803-intent-autonomy 差分リフレッシュ

## 実行メタデータ

- Date: `2026-08-03T04:37:56Z`
- Base: `47574fbabf274e11cb8e0b37bf35a0309a7b3d42`
- Observed: `affe83afe9e60c48d608aef65b7035287a70aaad`
- Distance: `54 commits`
- Focus: [#2095](https://github.com/amadeus-dlc/amadeus/issues/2095) → [#2096](https://github.com/amadeus-dlc/amadeus/issues/2096) → [#2067](https://github.com/amadeus-dlc/amadeus/issues/2067)、GAP-01〜13、現行5harness、将来harness adapter境界
- Scan mode: Developer Code Scanを上流入力にしたArchitect differential synthesis。隔離worktree `/tmp/amadeus-re-scan.3qbico/repo` のobserved commitを独立再確認した静的scan。テスト・lint・typecheck・live smokeは未実行。
- 判定: 3 Issueは未実装。GAP-01〜13はすべて現行contractとの接続点を持つ。Developerが報告した追加8件をGAP-14〜21として独立再確認でき、結論差はない。未記載仕様は解決せず後続stageへ送る。

## BaseからObservedの差分

- `git rev-list --count base..observed`: `54`
- `git diff --shortstat`: `1,947 files changed, 193,980 insertions(+), 11,990 deletions(-)`
- 主な変更群: execution observability baseline（#2031）、scope-grid parity（#2041）、plugin opt-in永続化と全self-install面投影（#2049 / #2092）、durable convergence budget（#2048）、review / interaction contract（#2063）、fixed-width unit pool（#2071）、registry / election / state codec hardening（#2080 / #2085 / #2097 / #2099）、生成面とmetrics。
- 3 Issueの語彙・event・plugin・monitor実装は区間に含まれない。

## Packages・Modules・技術断面

| 項目 | observed実測 |
|---|---|
| workspace packages | `@amadeus-dlc/framework`、`@amadeus-dlc/setup` |
| Core tools | 103 TypeScript files |
| Core hooks | 13 TypeScript files |
| stage definitions | 32 Markdown files |
| packaged harness manifests | 7（claude / codex / cursor / opencode / kimi / kiro / kiro-ide） |
| authoring plugins | 1（`formal-model-check`） |
| runtime / language | Bun / TypeScript |
| quality stack | Biome、fast-check、TypeScript compiler |
| observability | OpenTelemetry API / Logs / async context |

責務は`packages/framework/core/`をharness-neutral正本、`packages/framework/harness/<name>/`をnative shell、`packages/setup/`をinstall domain、`plugins/`をfirst-party authoring sourceとする。Loop Monitor Core、Quality Repair Plugin、自動裁定review surfaceはまだ存在しない。

## 独立再確認した主要引用

| claim | observed file:line | 確認内容 |
|---|---|---|
| 現行autonomy語彙 | `packages/framework/core/tools/amadeus-orchestrate.ts:1545-1559` | fieldは`Construction Autonomy Mode`、値は`autonomous | gated | null` |
| Walking Skeleton常時gate | `amadeus-orchestrate.ts:1716-1761` | `on` / `off` / `scope-dependent`の全分岐が`true` |
| 一般stage gate | `amadeus-orchestrate.ts:2056-2070` | initialization以外は原則`true` |
| reviewer上限投影 | `amadeus-orchestrate.ts:2187-2191` | reviewerがあれば既定2 |
| standing grant domain | `amadeus-lib.ts:3840-3855` | 4h TTL、`stage-gates`、expiry、phase boundary |
| active grant判定 | `amadeus-lib.ts:3960-4008` | expired / revoked / provenanceで選別。suspend軸なし |
| grant発行 | `amadeus-state.ts:3911-3956` | scope固定、TTL入力、random 8 hex、`GRANT_ISSUED` |
| grant revoke | `amadeus-state.ts:3973-4008` | `GRANT_REVOKED`のみ |
| park | `amadeus-state.ts:1224-1269` | reason codeなし。現行autonomousではparkを拒否 |
| event vocabulary | `amadeus-audit.ts:123-137` | grant eventはISSUED / REVOKED、route receipt |
| completed audit seal | `amadeus-audit.ts:436-457` | status completeで一般appendを抑止 |
| lifecycle例外writer | `amadeus-audit.ts:475-485` | archive / unarchiveだけがpost-complete sealを迂回 |
| runtime graph schema | `amadeus-runtime.ts:124-137` | graph revision / monitor projectionなし |
| gate revision | `amadeus-state.ts:4040-4103` | `Revision Count`はhuman rejectionでincrement |
| reviewer canonical verdict | `amadeus-reviewer-runtime.ts:400-416` | `READY | NOT-READY`、BLOCKER整合を検証 |
| reviewer cap enforcement | `amadeus-reviewer-runtime.ts:580-590` | directive上限超過を拒否 |
| sensor script error | `amadeus-sensor.ts:682-720` | non-zero / signal / throwを`kind: passed`へ畳む |
| sensor terminal event | `amadeus-sensor.ts:817-852` | passed armは`SENSOR_PASSED`をemit |
| execution harness union | `amadeus-harness-capability.ts:8-15` | 7 harness closed union |
| capability record | `amadeus-harness-capability.ts:128-173` | union全件をclosed Recordへ列挙 |
| setup harness union | `packages/setup/src/domain/harness.ts:9-29` | 同じ7 harnessを別union / all配列で列挙 |
| package / self-install matrix | `scripts/plugin-projection.ts:41-59` | package 7 face、self-install 5 faceのclosed tuples |

Developer報告の主要所在・機序・結論と差はなかった。Architect側の精密化は、現行`park`がreason不足だけでなく`autonomous`時に明示拒否すること、およびcompleted audit sealにはarchive / unarchiveだけの限定例外が既にあることの2点である。

## GAP-01〜13の実装証拠

| GAP | 現行証拠 | 後続へ送る論点 |
|---|---|---|
| GAP-01 | active grantはexpiry / revokeで単一有効性判定。suspend軸なし | authorization lifecycleとexecution availabilityをどう分けるか |
| GAP-02 | park event / stateにreason codeなし。machine-readable envelope不在 | permission / irreversible / scope / waiver stopの閉包 |
| GAP-03 | grantはCore gate authorization、quality pluginは不在 | plugin resultとautonomy transitionのowner |
| GAP-04 | sensor script errorも`SENSOR_PASSED` | blocking obligationに採用するsensor / outcome集合 |
| GAP-05 | reviewer既定上限2、runtimeが超過拒否 | bounded reviewerとunbounded quality repairのhandoff |
| GAP-06 | replan / monitor implementation不在 | replan自身をどのcycle identityで監視するか |
| GAP-07 | directiveはstage既存producesだけを投影 | plugin mandatory outputのschema / owner / stage |
| GAP-08 | `decision_policies` / past-ruling index不在 | applicability / expiry / precedence / conflict |
| GAP-09 | terminal result envelope不在 | outcomeごとの`retryable`意味 |
| GAP-10 | quality plugin不在、none opt-in面なし | setting / audit contract |
| GAP-11 | live E2Eはharness別、部分完了contractなし | #1717の5harness部分の客観境界 |
| GAP-12 | current autonomyとstanding grantは別系統 | semiのauthorization provenance |
| GAP-13 | `autonomous/gated/unset`、Bolt1常時gate | migration / single source / legacy Intent compatibility |

## 追加で確認したGAP-14〜21

1. **GAP-14 — 完了済みIntentのreview audit保存先:** 一般auditはcompleteでsealed。`AUTO_DECISION_REVIEWED`をsame Intent auditへ書くには既存不変条件と衝突する。archive / unarchive専用例外はあるが、このeventを例外へ加えるべきかはIssue未記載。
2. **GAP-15 — 自動判断の安定ID:** grant IDとroute IDはあるが、`AUTO_DECIDED`と後日のaccept / flagを束縛するdecision ID、identity tuple、collision / replay規則がない。
3. **GAP-16 — graph revision導出規則:** runtime graphにrevision fieldがなく、state `Revision Count`はgate rejection count。#2095が履歴を束縛するgraph revisionの正本がない。
4. **GAP-17 — sensor擬似成功:** script errorが`SENSOR_PASSED`となるため、event名だけで品質成功と判定するとfalse greenになる。
5. **GAP-18 — reviewer `NOT-READY`表記:** Issueは`NOT READY`、runtime wireは`NOT-READY`。正規化しないとobligation fingerprintが表記で分裂する。
6. **GAP-19 — grant終了 / 置換event:** Event Registryの現行grant lifecycleはISSUED / REVOKEDのみ。Intent完了、新modeによる置換、suspend / resumeを区別するeventがない。
7. **GAP-20 — fixed retry上限の適用範囲:** reviewer cap、Stop/swarm durable convergence budget、Quality Repairの「通常経路上限なし」が並存するが、どのloopへどれを適用するか未定。
8. **GAP-21 — future harness closed union拡張点:** Core capability、Core detection、setup domain、package projection、self-install projectionにharness集合が分散。現状はadapterディレクトリ追加だけでは済まない。

## 不在claimと検索範囲

検索範囲は`packages/framework/core/`、`packages/framework/harness/`、`plugins/`、`tests/`。完全一致・識別子近似として`AUTO_DECIDED`、`AUTO_DECISION_REVIEWED`、`GRANT_EXERCISED`、`REPAIR_STALLED`、`NORM_CONFLICT`、`loop_monitors`、`quality-repair`、`decision_policies`を検索し0件。近似語`standing grant`、`Construction Autonomy Mode`、`reviewer_max_iterations`、`SENSOR_PASSED`、`WORKFLOW_PARKED`、`Revision Count`、`event_set_digest`は存在し、上記接続点を確認した。

`loop monitor`の一般語、`fixed point`、`churn`はknowledge / norm metrics / test commentsに別文脈で存在するため、識別子・plugin・runtime routeの実装証拠としては数えていない。

## API・依存・テスト所見

- API: 現行directive、grant CLI、review result、sensor audit、runtime graph、harness capabilityを拡張する必要がある。新しい公開HTTP APIはない。
- 依存順: #2095 → #2096 → #2067。Core Monitorへgrant意味論を逆流させない。
- 外部dependency: 新規追加の根拠なし。taktは参考実装でありruntime dependencyではない。
- テスト景観: unit 347、integration 400、e2e 89、smoke 15。現行autonomy / grant / reviewer関連43ファイル、3 Issueのtarget event / monitor語彙は0ファイル。
- live挙動: 全て未確認。5harness contract tests、opt-in live smoke、solo election / loud degradation、crash / resume、別clone、same fingerprint short-circuitは実行していない。

## 更新した成果物

1. `business-overview.md`
2. `architecture.md`
3. `code-structure.md`
4. `api-documentation.md`
5. `component-inventory.md`
6. `technology-stack.md`
7. `dependencies.md`
8. `code-quality-assessment.md`
9. `reverse-engineering-timestamp.md`
10. 本ファイル

直前の現在断面`260802-scope-grid-face-sync`は削除せず履歴へ降格した。履歴節のfile:lineは当時のobserved commitを指す。

## 未確認事項

- 5harnessの実行時behavior、live model / tool capability、headless modeは未確認。
- Issue本文にない8件の解決案は未確認・未決定。
- GAP-01〜13のcontract裁定はRequirements / Design待ち。
- base..observedの全1,947ファイルを逐語精査してはいない。diff統計、commit分類、対象moduleと近似語検索、主要引用の独立再確認で差分refreshした。
