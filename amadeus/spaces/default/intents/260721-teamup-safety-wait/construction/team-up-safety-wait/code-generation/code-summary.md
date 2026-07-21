# Code Generation Summary — team-up Codex safety-wait

## 結論

team-upのCodex paneに出る既知の`Additional safety checks`停止を、安全に解除するためのproduction wiringとstate machineをTDDで実装した。leaderが2026-07-21T10:01:45Zに自然modalをHerdr 0.7.1／Codex 0.144.6／120x34でexact captureし、選択済み`Keep waiting`へEnterを1回だけ送りmodal消失を確認したため、そのsanitized positiveをproduction内部allowlistへ固定した。`production-enabled`はexit 0である一方、production confirmed-absence集合は空であり、post-sendが非一致text、ANSI、wrap、partialなら`unknown`としてlatchを維持する。

本実装・検証によるcurrent runへの入力は0件である。自然modalへのEnter 1件はleaderがprovenance取得時に行った既報の人間操作であり、実装testのEnter送信はunit adapterとintegration fake helperに限定した。外部Codex source/test、危険prompt、filter回避、旧一時checkout/processは使用していない。

## Degraded input境界

bugfix scopeではUser Stories、Application Design、Units Generation、Functional/NFR DesignがSKIPで、runtime graphにUnit集合がない。このため`requirements.md`のFR-1〜6・AC-1〜10とReverse Engineering成果物を入力に、暗黙の単一Unit `team-up-safety-wait`として実装した。stage memoryはengine-resolved直下へ維持し、plan/summaryだけを`for_each: unit-of-work`の正規成果物境界`construction/team-up-safety-wait/code-generation/`へ配置する。

旧activation gateだった実表示provenanceは、leaderのagmsg一次証拠で解消した。test-only fixtureは同じsanitized modal contractをtest側で再現するが、production sourceはfixture path、fixture id、CLI flag、environment、runtime filesystemを参照せず、独立したprivate constantだけを所有する。post-sendのconfirmed-absenceは自然captureから捏造せず、production集合を空のまま維持する。

## 変更内容

| Path | 変更 | 所有境界 |
| --- | --- | --- |
| `scripts/team-up-codex-safety-wait.ts` | 新規576行 | closed-schema fingerprint、CRLF以外を正規化しないexact matcher、`agent:"codex"` current runtime照合、120x34 identity、visible/text二重読取、送信直前version再照合、pre/post TTL、one-shot latch、閉三値post-send分類、run lifecycle自己終了、Enter 1回、秘匿診断、production private positive／empty absence allowlist |
| `scripts/team-up.sh` | 187行追加 | Codex current run roleごとの正準lock owner三態、fresh/resume再利用、dead-owner role再検証、kill/launch failureの局所rollback、foreign PID非kill。helper pathは固定でenv overrideなし |
| `tests/unit/t-team-up-codex-safety-wait.test.ts` | 新規599行 | schema、production positive、role mapping、Herdr command seam、current runtime除外、run lifecycle、exact matcher、positive transaction、version drift、post-confirm TTL、ANSI／wrap／partial unknown、明示absenceだけのlatch/rearm |
| `tests/integration/t-team-up-codex-resume.test.ts` | 259行追加・1行削除 | production fixture非到達とactivation、fresh/resume/killの7 role owner、launch rollback、正規owner停止とforeign PID保全、pid/owner不一致、dead-owner再検証 |
| `tests/fixtures/team-up-codex-safety-wait/test-only-positive.json` | 新規10行 | sanitized natural positiveのtest-only closed-schema fixture。productionから参照なし |
| `tests/unit/gen-coverage-registry.test.ts` | 1行追加 | 新たなdeterministic CLI spawn分類をmanual ratchetへ追加 |

`team-msg.sh`、`run-codex.sh`、agmsg、`packages/framework/`、`packages/setup/`、`dist/`、lockfile、test configurationは変更していない。他Intentと既存dirty差分は非接触である。

production差分は新helper 576行と`team-up.sh`追加187行で合計763行となり、planの250〜400行目安を363行超過した。closed-schema parser、Herdr adapter、state machineを`team-up.sh`から分離したうえで、Iteration 1/2のfindingsを閉じるcurrent runtime exact照合、閉三値post-send分類、120x34 identity、正準owner三態、dead-owner再検証、run lifecycle自己終了を実装した結果である。後続の人間指示「formal reviewまで停止せず」を優先して継続し、超過はMinor非ブロッキングとしてFormal Review Iteration 3へ明示する。

## RED → GREEN

1. 新module不在のproduction非到達tracerをREDにし、空production allowlistとtest-only matcherで最初のGREEN sliceを作った。
2. CRLF exact比較、stable positive transaction、modal残存、role mapping、Herdr adapter、latch/rearmを各REDから最小実装でGREENへ反転した。
3. fresh/resume/kill owner testをREDにし、`team-up.sh`へ1 role 1 supervisorのlifecycleを配線してGREENにした。
4. launch failureが偽成功するfalling testをREDにし、50ms startup health checkと全owner rollbackでGREENにした。
5. foreign runの同helper PIDがkillされるfalling testをREDにし、session/run/role/run-recordを含むexact command ownership照合でGREENにした。
6. full CIで露呈したcomplexity、coverage registry、test-size driftの3件を、parser helper化、manual ratchet追加、filesystem/process assertionのintegration移動でGREENにした。baseline/allowlist追加による回避はしていない。
7. 送信直前version driftと送信後確認1,000ms超過の2件を追加REDにし、version再照合と`sent-unconfirmed` latchでGREENにした。
8. Iteration 1のcurrent runtime未検証とANSI/wrap再送をREDにし、Herdr `agent list`の`agent:"codex"` exact照合と、送信後に確認した不在textだけをrearmへ数える三態判定でGREENにした。
9. 正規owner孤児化、pid/owner不一致の破壊的再取得、dead-ownerのpane未検証再取得をREDにし、lock ownerを正準にした`owned-live`/`owner-dead`/`ambiguous`判定、全role preflight、局所rollback、`role-ready`再検証でGREENにした。
10. run/session/runtime/status exact lifecycle predicateとhelper自己終了を追加し、CLI分岐追加で発生したCCN 23をbaseline変更なしのprivate helper抽出で閾値以下へ戻した。
11. Iteration 2 CriticalをANSI／wrap／partialの3 RED（旧結果はいずれも誤って`sent`）で再現し、post-sendを`modal-present`／`confirmed-absent`／`unknown`へ閉じ、任意textのabsence学習を削除した。最小GREENは17 tests／71 assertions、その後120x34 positive追加後は17 tests／73 assertionsで、exact modal再出現までのEnter総数1を確認した。

## Fail-closed不変条件

- production fingerprintは2026-07-21T10:01:45Zのsanitized自然capture 1件だけをprivate定数として所有し、CLI flag、environment variable、runtime path、test fixture loaderを持たない。production confirmed-absence集合は空である。
- runtimeがCodexであり、Herdr `agent list`がcurrent runtimeを`agent:"codex"`と返すcurrent runの`leader`または`e1`〜`e6`をexactly one paneへ解決できる場合だけ監視候補になる。Claude、shellへ戻ったpane、別session/run、0件、複数件、unknown roleは入力0件である。
- Herdr/Codex version、pane 120 columns／34 rows、modal block全体、二重読取、送信直前pane identity、1,000ms TTLが一致した場合だけEnterを1回送る。
- 同じmodal/paneはlatchする。post-sendと後続pollを`modal-present`／`confirmed-absent`／`unknown`へ分類し、test seamで明示したexact absenceが連続2回の場合だけrearmする。production absence集合は空なので、ANSI、wrap、partialを含む任意の非一致textはunknownのままlatchを維持し、追加入力しない。
- 診断はroleとtyped resultだけをstderrへ出し、pane本文、prompt、secret、個人データを保存しない。
- PID cleanupはlock ownerを正準とし、live processのexact command ownershipが一致する場合だけTERM/KILLする。pid fileがforeignへ差し替わっても正規ownerを停止し、foreign processはsignalしない。pid/owner不一致やlive unknown ownerはmetadataもprocessも変更せずfail-closedにする。
- helperは`run-record`のbasename、session、runtime=`codex`、status=`launching|running`をpollごとに再検証し、invalid lifecycle、role非一意、adapter failureで自己終了する。

## 検証結果

| 検証 | 結果 |
| --- | --- |
| Focused 5-file suite | 114 pass / 0 fail / 753 assertions |
| team-up lifecycle単体 | 52 pass / 0 fail / 520 assertions |
| 最終unfiltered全CI coverage | 389 files / 2 failed / 5,538 assertions / 2 failed assertions、RESULT FAIL。team-up lifecycleは52/52 GREEN |
| I3前の参考filtered coverage | 既知の他Intent `t199-generated-prefix-contract`だけを除外し、388 files / 0 failed / 5,533 assertions、RESULT PASS。最終gateの代替には用いない |
| 最終LCOV | 全体17,730/24,685 lines、helper 300/379 lines、37/45 functions |
| `bun run typecheck` | PASS |
| 対象Biome / `bun run check` | PASS。repository既存のcomplexity warningのみでexit 0 |
| Complexity gate | PASS。CLI分岐追加時のmain CCN 23をbaseline変更なしで解消し、新規違反0、regression 0。parser CCN 12 |
| `bun run dist:check` | PASS |
| `git diff --check` / `bash -n scripts/team-up.sh` | PASS |
| linter sensor / type-check sensor | SENSOR_PASSED。最終fire idは`3dadbc89` / `0aa4811a` |
| answer-evidence sensor | Code Generation出力に`*-questions.md`がないため非適用 |

最終unfiltered coverageの失敗2件のうち、`tests/integration/t199-generated-prefix-contract.test.ts`は他Intentが所有するelection record内の別framework prefixを検出する既知失敗である。該当tracked fileは`leader/amadeus/spaces/default/elections/E-USSU01FD3/ballots/e1.json`、`ledger.json`、`tally.json`であり、このIntentでは編集していない。もう1件の`tests/integration/t163-reaper-steal-race.test.ts`はcoverage走行中に期待winner 1に対して2となったが、全runner自然終了後の単独再実行は2件PASSだったため、team-up差分外の並行性flakyとして分離した。最終coverageの`RESULT: FAIL`はgreenへ読み替えていない。`bun run promote:self:check`もteam-up差分外の`.codex/.tmp-*` orphan 91件だけで失敗し、既存dirty差分として非接触にした。

## Iteration 2 Critical是正

- 一次再現: post-send最初のreadをANSI／wrap／partialにした3 testは、旧実装でいずれも期待`sent-unconfirmed`に対して実値`sent`となり、14 pass／3 failだった。
- 是正: `classifyPostSendVisible`を唯一の分類器とし、完全一致positiveだけを`modal-present`、明示test seamの完全一致だけを`confirmed-absent`、その他を`unknown`にした。旧`confirmedAbsentText`学習は削除した。
- 安全性: unknownとmodal-presentではabsence counterを0へ戻してlatchを維持する。production absence集合は空なので、任意textからrearmへ到達しない。
- GREEN: 同一unit suiteは17 pass／0 fail／71 assertions、120x34 positive追加後は17 pass／0 fail／73 assertions。各ANSI／wrap／partial sequenceでexact modal再出現後もEnter総数1である。
- activation: 10:01:45Z natural captureをproduction private positiveへ固定し、`production-enabled` exit 0を確認した。production sourceは`tests/fixtures`、`test-only-positive`、`process.env`、`Bun.env`、fixture/fingerprint CLI flagを含まない。
- dirty: workspace全体224 entries。origin/mainとの交差14 pathsを含むためmerge／stash／reset／checkout／rebaseを禁止したまま、同一Intent対象だけを編集している。

## Handoff

production activationはpositive exact-match時だけenabledで、post-send unknownは追加入力なしのまま維持する。最終full coverage／sensor、e4独立確認、例外Formal Review Iteration 3のREADYを確認済みであり、Build and Testへhandoffできる。新Critical/Majorは0件で、既知LOC超過MinorとI3時点のcoverage ledger鮮度Minorだけを非ブロッキングとして記録した。後者は本summary同期で解消した。

commit、push、PR作成はIntent完了後まで行わず、mergeは行わない。

## Review

### Iteration 3 — Final

**Verdict:** READY

**Reviewer:** e4が起動した別identity formal reviewer

**Date:** 2026-07-21T10:41:09Z

**Iteration:** 3（人間承認済み例外、exactly once）
**Findings:** Critical 0 / Major 0 / Minor 2

- C1はCLOSED。`team-up.sh`からproduction helperへのcaller接続、2026-07-21T10:01:45Zのprivate natural positive、production absence集合空、閉三値分類、unknown latch、明示test-only absence連続2回だけのrearm、Enter唯一呼出を一次sourceで確認した。
- unit 17/0/73、production activation／fixture非到達static test 1/0/8、focused 114/0/753、team-up lifecycle 52/0/520、runner 0、6対象SHA一致を確認した。
- 既知Minorはproduction差分763行の保守コスト。新規MinorはReview時点で本summaryが旧filtered coverage値を示していた鮮度差であり、最終unfiltered 389 files / 2 failed / 5,538 assertions、17,730/24,685 lines、helper 300/379 lines・37/45 functions、本節の`t163`／`t199`分類へ同期して解消した。
- 最終coverageの外部失敗を全PASSへ読み替えず、team-upの機能・安全境界をblockする新Critical/MajorはないためREADYとした。Formal I3中のsource/test/process操作、実Herdr/current run入力は0件である。

### Iteration 2 — Historical

**Verdict:** NOT-READY
**Reviewer:** amadeus-architecture-reviewer-agent
**Date:** 2026-07-21T09:47:28Z
**Iteration:** 2

### Iteration 1 Resolution Status

| Iteration 1 finding | Status | Evidence |
|---|---|---|
| #1 — unknown driftによるlatch rearm | PARTIALLY RESOLVED | 送信後に通常textを確認した後のANSI/wrap driftはlatch/absenceを変更しない。一方、送信直後の事後確認read自体がANSI/wrap/partialの場合は、そのunknown textを`confirmedAbsentText`へ昇格でき、同一modalへ再送できるため未解消。 |
| #2 — foreign PID時の正規owner孤児化 | RESOLVED | cleanupは`lock/owner`を正準にし、更新されたintegration testでforeign PIDを生存させながら正規owner PIDの終了を確認した。helperもrun/session/runtime/statusをpollごとに照合し、無効化時に終了する制御へ変更された。 |
| #3 — owner ambiguity・dead owner・lock競合 | RESOLVED | `owned-live` / `owner-dead` / `ambiguous`の三態、全role preflight、dead-ownerの`role-ready`再検証、今回取得分だけのrollbackを確認した。pid/owner不一致とdead-owner role未準備のintegration testもgreen。 |
| #4 — current runtime未検証 | RESOLVED | Herdr `agent list`の`agent === "codex"`、exact name、pane IDを解決条件とし、同名`agent:"shell"`を0件へ落とすunit testがgreen。送信直前の再解決でも同じadapter条件が再評価される。 |

### Findings

| # | Severity | Location | Finding | Recommendation |
|---|---|---|---|---|
| 1 | Critical | `scripts/team-up-codex-safety-wait.ts:163`, `scripts/team-up-codex-safety-wait.ts:406` | 事後確認の`postSendResult`は、既知titleのexact lineがない任意textを`sent`とし、そのtextを`confirmedAbsentText`へ保存する。送信直後のreadをANSI付き同一modalにすると、そのANSI textを続けて2回読むだけでlatchが解除され、exact modalへ戻った時に同じpaneへ2回目のEnterを送ることをfake adapterで再現した（results=`sent,no-input,no-input,sent`、Enter 2件）。更新testは最初の事後確認を`normal output`に固定しており、この経路を覆わない。FR-3/4、AC-3/4/10のone-shotとunknown fail-closedを満たさない。 | 事後確認も`confirmed-absent` / `modal-present` / `unknown`のtyped判定にし、任意の非一致textをabsence oracleへ昇格しない。信頼できるclosed-schema negative fingerprintまたはHerdrのauthoritative modal stateだけをabsence確認に使い、送信直後がANSI/wrap/partialの各caseで`sent-unconfirmed`、latch維持、Enter 1件を固定する。 |
| 2 | Minor | `scripts/team-up-codex-safety-wait.ts`, `scripts/team-up.sh:212` | Iteration 1是正でproduction差分は519行から710行へ増え、`team-up.sh`は既存1,075行へ187行を足して1,262行になった。ownership blockは局所化されcomplexity gateもgreenだが、start/stopで近似したowner state decodingと、shell・filesystem・process argv・TypeScript CLIにまたがる安全性契約は今後の変更コストが高い。 | Finding #1の安全修正を優先した後、owner状態判定を単一の正準parserへ集約し、可能ならtyped helper側へ移して`team-up.sh`を薄いlifecycle呼出しへ戻す。lock競合時の局所rollbackも直接の競合testで固定する。 |

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| Focused 5-file suite | PASS — 112 tests / 736 assertions | 更新後のunit・team-up lifecycle・team-msg・run-codex回帰は全green。 |
| post-send unknown fake adapter reproduction | FAIL — results=`sent,no-input,no-input,sent`、Enter 2件 | Finding #1を実行時に再現した。fake adapterのみを使用し、実Herdr/current runへの入力は0件。 |
| full coverage artifacts | PASS evidence — 388 files / 0 failed / 5,533 assertions、17,692/24,646 lines | `coverage/tests-totals.json`と`coverage/coverage-totals.json`（2026-07-21 18:39:44 +0900）を照合。filterを追加した再実行はしていない。 |
| `bun run typecheck` | PASS | production/test TypeScript型検査は成功。 |
| `bun run check` | PASS — exit 0 | Biomeは既存208 warnings / 16 infosを報告したがerrorなし。対象helperに新規errorはない。 |
| `bun tests/complexity-gate.ts --check` | PASS — new violations 0 / regressions 0 | helperは違反・warn bandともになく、parser CCN 12。baseline変更なし。 |
| `bash -n scripts/team-up.sh` / `git diff --check` | PASS | shell構文とtracked差分whitespaceを確認。 |
| `bun run dist:check` | PASS | 全harness treeがframework sourceと同期。 |
| linter / type-check sensors | PASS — fire ids `155f716f` / `cbd8ac0f` | current Intent auditで各`SENSOR_FIRED`と同一fire idの`SENSOR_PASSED`を確認。 |
| production activation境界 | PASS — helper 523行 + shell 187行 = 710行、allowlist空、`production-enabled` exit 3、fixture参照なし | production supervisorは起動せず、test-only fixtureはproduction entrypoint/CLI/env/runtime pathから非到達。current run入力は0件。 |

### Summary

Iteration 1のowner cleanup、排他三態、run lifecycle、current Codex runtimeの3 findingsは解消した。しかし送信直後のunknown driftをabsenceへ誤昇格するCriticalが残り、同一modalへのEnter 2件を再現できるため、安全なproduction activationへ進めない。
