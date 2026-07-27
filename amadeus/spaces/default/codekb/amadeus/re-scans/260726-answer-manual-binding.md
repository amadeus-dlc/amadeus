# re-scan: 260726-answer-manual-binding

上流入力（consumes 全数）: Developer コードスキャン結果 `re3-dev-scan-result.md`（read-only scan、全文読了）。本 intent record には `scan-notes.md` が生成されず scratchpad に出力されたため、確定事実は本記録と `reverse-engineering-timestamp.md` に永続化する。

## スキャン諸元

| 項目 | 値 |
| --- | --- |
| intent | `260726-answer-manual-binding`（[Issue #1548](https://github.com/amadeus-dlc/amadeus/issues/1548) bug、mirror-lifecycle answer/manual-boundary 不成立） |
| Scope | `amadeus-bugfix`、Brownfield、単一 repo `amadeus` |
| Base commit | `09c669901385ad44e9a5b378b8d8903eebbc184c`（前 intent `260726-t258-p95-flake` の observed。`ls -t` 最新 re-scan の宣言 observed） |
| 祖先性 | `git merge-base --is-ancestor 09c669901 HEAD` **exit 0**、`git rev-list --count 09c669901..HEAD` = **2**（cid:reverse-engineering:rescan-base-ancestry。候補中で祖先かつ距離最小: `f9a0fb86a`=距離4 / `e39402224`=非祖先 / `1673c4332`=距離42） |
| Observed commit | `ad1ff5de9785af38f3c845b64372b65e8b73bb4e`（= 現 HEAD、`git rev-parse HEAD` 実測） |
| 区間規模 | `git diff --numstat 09c669901..HEAD \| grep -v 'amadeus/spaces/' \| wc -l` = **0**（コード/dist/self-install 面は区間内 0 変更）。区間 2 コミット `f8c068975`（前 intent RE+RA record）/ `ad1ff5de9`（前 intent CG+B&T record）はいずれも record-only の snapshot |
| 対象面の交差 | `git diff --name-only 09c669901..HEAD \| grep -iE "mirror-lifecycle\|mirror-coordinator\|t282\|coordinator"` = **0 hit**（answer/guard スタックは区間内で完全に不変） |
| 方式 | 差分リフレッシュ（フルスキャン不実施、cid:reverse-engineering:c1） |

## 欠陥の要旨（manual-boundary ask への answer が構造的に不成立）

manual create（非終端 receipt を残す）＋後続 prompt モード boundary の reconciliation で `expectedPrompt.event.boundary.kind === "manual"` な ask が永続化されるが、その ask を answer で貫通できず常に error 終了する。

- **根本原因（1-a）**: `packages/framework/core/tools/amadeus-mirror-lifecycle.ts:969-985` `runMirrorLifecycleAnswer` が answer 転送時に `boundary: expected.event.boundary` は渡すが `manualOperation` / `invocationId` を渡さない。
- **guard（1-b）**: `amadeus-mirror-lifecycle.ts:257-265`（`runMirrorLifecycleBoundary` 冒頭）は `boundary.kind === "manual"` かつ `!manualOperation || !invocationId` で `Manual Mirror lifecycle requires an operation and invocation ID.` を返す。→ manual ask への answer は常にここで error 終了し、正規経路 `driveMirrorBoundary`→`handlePromptAnswer` に到達不能。
- **欠陥の由来**: guard 導入コミット `2bb63f6b8`（automatic mirror modes 完成、2026-07-25。`git log -S 'Manual Mirror lifecycle requires an operation'` 実測）から現存。区間の退行ではない。#1553（v1 読取統一）着地後のモジュール分割形で全 file:line を現 HEAD で再解決した（ブリーフィングの `:340-346` / `:1052-1067` は分割前の stale 値）。

## 修正案 2 択の事実根拠（RE は事実提示のみ、裁定は設計/選挙）

### 案 (a): guard に `&& !request.answer` を追加（最小変更・guard 以外不変）

`driveMirrorBoundary`（coordinator `:713-714`）は `if (input.answer) return handlePromptAnswer(...)` で **answer 有り → 常に `handlePromptAnswer` へ分岐**。`handlePromptAnswer`（`:509-558`）とその先の `executionAuthorization` の `prompt-approved` 分岐（`:292-303` `kind:"prompt-approved"`）は `input.invocationId` / `input.manualOperation` を**一切参照しない**。invocationId 消費（`:304-308`）は promptAnswer 未指定時のみ到達し、manualOperation 参照（`:573-577`）は `driveBoundaryDecisions` 専用。→ **guard の answer 免除は防御目的を毀損しない**。answer なし manual decision 実行経路には guard がそのまま残り、両フィールドの必須性は維持される。

### 案 (b): answer 側で永続値から両フィールドを補填（guard 不変）

manual 経路の元値（`parseManualArgs` `:445-447`）は `manualOperation = operation` / `invocationId = common.instance` / `boundary.instance = common.instance` — すなわち **`invocationId === boundary.instance`** かつ **`manualOperation === operation`**。したがって answer 側で `manualOperation = expected.operation`、`invocationId = expected.event.boundary.instance` を補填すれば元値と一致し guard を字義どおり充足できる。永続情報だけで再構成に必要な全フィールドが揃う:
- `MirrorLifecycleRequest`（`:56-65`）: `manualOperation?` / `invocationId?` / `answer?` はいずれも optional。
- `MirrorExpectedPrompt`（`amadeus-mirror-types.ts:118-124`）= `{ bindingId; event; operation; issuedAt; retryOf? }`、`MirrorEventIdentity`（`:30-34`）= `{ intentUuid; boundary; operation }`、manual boundary（`:28`）= `{ kind:"manual"; instance:string }`。

**要約**: 両案とも到達可能で機能上等価。guard を越えれば `handlePromptAnswer` が `input.context.boundary`（= manual）から triggerEvent を再構成（`:543`）して正常に consume する。

## stale expectedPrompt の遡及ゼロ（運用回復手順の要否）

`grep -rl 'expectedPrompt' amadeus/spaces/*/intents/*/amadeus-state.md` = **5 ファイル**、全て `"expectedPrompt":null`。`grep -rEn '"expectedPrompt":\s*\{[^}]*bindingId'` = **0 hit**（bindingId 付き非 null は 0 件）。→ committed record に stale expectedPrompt 残存は無く、**修正後の遡及回復手順は不要**。バグは再現可能だが現時点でコミット済み state を汚染していない。

**stale が全 sync を封鎖する連鎖（P/S 裏取り）**: consume は answer 経由のみ（reducer `consumeExpectedPrompt`、prompt-approved/skip transition からのみ発火）。repair verbs（status/relink/abandon）は expectedPrompt 非対象でツール内回復不能。未 consume のまま次 boundary が prompt 化すると `reduceSetExpectedPrompt` が `set-expected-prompt: a different unconsumed prompt is pending` を返し、coordinator が `safety-blocked`「expected prompt could not be persisted」で **以後の create/sync/close prompt を全滅**させる。

## テスト gap（確定）

`tests/integration/t282-amadeus-mirror-lifecycle.integration.test.ts`（998 行）:
- answer 往復テスト（`:579` "answer approve binds to the persisted prompt"）は全て `intent-capture-approved` boundary の ask。skip/invalid（`:640`）・replay 不可（`:745`）も同 boundary。
- manual テスト（`:832` "manual create and sync use durable invocation identities" / provenance mismatch）は `runMirrorLifecycleBoundary({…, boundary:{kind:"manual"}, manualOperation, invocationId})` を**直接**呼び、ask→answer 往復を経ない。
- guard の既存 negative テスト（`:435` "rejects incomplete manual lifecycle requests before target resolution"）は manual + 欠落で error を確認 = **バグの guard が正しく発火する側だけを固定**。

→ **manual boundary が ask を生成 → その ask を answer で貫通する往復テストが不在**。regression-first の落ちる実証はこの往復を新設する必要がある。

**manual ask の再現シード（実測トレース）**: `decideMirrorAction` は `input.kind==="manual"` で常に `execute`（prompt を返さない）ため manual 単独では ask にならない。ask 化は reconciliation 経由 — 先行の manual create が非終端 receipt（`prepared`/`attempted`/`pending`）を残すと、後続の prompt モード boundary が `selectBoundaryDecision` で `event = reconciliation.originalEvent`（= manual event）を採り、`set-expected-prompt` を manual event で永続 → `expectedPrompt.event.boundary.kind === "manual"`。

## Architect 段の独立再検証（observed `ad1ff5de9`）

上流 scan の核心 file:line を observed で spot-check 直読照合した（cid:reverse-engineering:cite-shift-vs-nonshift-separation）。

| 照合対象 | 結果 |
| --- | --- |
| guard: `amadeus-mirror-lifecycle.ts:253-265`（`boundary.kind==="manual" && (!manualOperation \|\| !invocationId)` → error） | 一致 |
| answer forward: `:969-985`（`boundary: expected.event.boundary` を渡すが 2 フィールド欠落） | 一致 |
| request type: `:56-65`（`manualOperation?` / `invocationId?` / `answer?` optional） | 一致 |
| manual 元値: `parseManualArgs:445-447`（`invocationId = common.instance` / `manualOperation = operation`） | 一致 |
| coordinator executionAuth manual: `amadeus-mirror-coordinator.ts:304-308`（`invocationId` 必須 throw） | 一致 |
| manualOperation 消費: `:573-577`（`driveBoundaryDecisions` 経路のみ） | 一致 |
| answer 分岐: `driveMirrorBoundary:713-714`（`if (input.answer) return handlePromptAnswer`） | 一致 |
| prompt-approved 分岐: `:292-303`（`invocationId`/`manualOperation` 不参照） | 一致 |
| handlePromptAnswer: `:509-558`、`expected = state.expectedPrompt`（`:514`）、triggerEvent 再構成（`:543`） | 一致 |
| types: `MirrorExpectedPrompt:118-124` / manual boundary `:28` / `MirrorEventIdentity:30-34` | 一致 |
| 配布: `git ls-files '*amadeus-mirror-lifecycle.ts' \| wc -l` = 13 | 一致 |
| stale: `grep -rl expectedPrompt` = 5 全 null / bindingId 非 null = 0 | 一致 |
| guard provenance: `git log -S 'Manual Mirror lifecycle requires an operation'` = `2bb63f6b8` | 一致 |

**訂正: 0 件。** 全 file:line が現 HEAD `ad1ff5de9` で直読一致。ブリーフィングの `:340-346` / `:1052-1067` は #1553 分割前の stale 値のため採らず、現 HEAD 再解決値を採用した。

## 配布面（対象ファイルのコピー数）

`amadeus-mirror-lifecycle.ts` = **13 コピー**（worktree 除く）: canonical 1（`packages/framework/core/tools/`）+ self-install 5（`.claude/` `.codex/` `.cursor/` `.kimi-code/` `.opencode/` tools/）+ dist 7（`dist/{claude,codex,cursor,kimi,kiro-ide,kiro,opencode}/…/tools/`）。修正時は正本編集 → `bun scripts/package.ts`（dist）+ `bun run promote:self`（self-install）で同期、`dist:check`/`promote:self:check` で drift 検証（project.md Mandated）。coordinator/types を触る案なら同様に各 13 コピー同期対象。

## 合成上の主要な確定事項（修正設計はしない）

1. **根本原因** = `runMirrorLifecycleAnswer:969-985` の answer 転送が `manualOperation`/`invocationId` を落とし、guard `:257-265` が manual ask への answer を常に弾く write⇔check 非対称（cid:requirements-analysis:symmetric-pair-review）。
2. **両修正案とも到達可能・機能等価** — (a) guard に `&& !request.answer`（answer が両フィールド不使用の事実に依拠）、(b) answer 側で永続値から補填（`invocationId = boundary.instance` / `manualOperation = operation`）。
3. **stale 遡及ゼロ** — committed record 5 件は全 `expectedPrompt:null`、修復手順不要。
4. **テスト gap** — manual ask→answer 往復テストが不在。regression-first はこの往復を reconciliation シードで新設する。
5. **修正方式は未裁定** — (a)/(b) の選択、往復 regression の設計、配布 13 コピー同期は requirements-analysis 以降で確定する。

## センサー不適用と代替検証

RE ステージが宣言する 3 センサー（`required-sections` / `upstream-coverage` / `answer-evidence`）は、codekb 出力パス `amadeus/spaces/default/codekb/amadeus/**` が各 manifest の filter（`**/{amadeus-docs,intents}/**` および `**/*-questions.md`）に**構造的に不適合**であり発火不能（cid:reverse-engineering:re-sensors-codekb-filter-mismatch、cid:reverse-engineering:c3-codekb-sensor）。**センサー成功として扱わない。** 代替として以下を実施。

**(a) H2 見出し数の機械確認（`grep -c '^## '`、H2 ≥ 2）** — 更新した body 成果物（`architecture.md` / `code-quality-assessment.md`）+ 本ファイルすべてで H2 ≥ 2 を確認。

**(b) 上流入力への実参照の確認** — 更新した全成果物および本ファイルの本文に上流入力 `re3-dev-scan-result` への参照が実在することを `grep -c 're3-dev-scan-result'` で機械確認（全件 1 以上）。

**(c) 旧「現在」マーカーの降格確認** — `grep -rn '^## .*現在' amadeus/spaces/default/codekb/amadeus/*.md` の intent 現在マーカーが本 intent `260726-answer-manual-binding` の節のみであることを機械確認（`architecture.md:1178` `## 現在の全体構造` は構造見出しで対象外）。前 intent `260726-t258-p95-flake` の H2 は「履歴」へ降格済み（cid:reverse-engineering:c3-relabel）。

## Delivery boundary

本 scan の成果物は codekb 9 成果物の差分更新と本 per-intent 記録のみ。患部コード（mirror スタック）・t282 テスト・coverage allowlist・GitHub Issue の操作・intent record / state / audit・生成配布物への書込は一切行っていない。修正方式は後続の requirements-analysis 以降で裁定する。
