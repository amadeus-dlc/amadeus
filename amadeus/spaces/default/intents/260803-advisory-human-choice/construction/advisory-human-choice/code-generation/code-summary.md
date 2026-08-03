# Code Generation Summary — advisory-human-choice

## 結果

Formal Model Check advisoryを、stage body開始前に人間の明示選択を要求するfail-closed checkpointへ変更した。未解決時は`run-stage`または`dispatch-subagent`を返さず、全advisoryの元message、正準2択、instance identity、必要なlocal Formal Model Check実行routeを含む`await-advisory-choice` directiveを返す。

人間が「リスクを承知して延期する」を選んだ場合は当該checkpointだけを継続する。「今すぐ実行する」を選んだ場合は、現在のtarget/spec/advisory instanceに相関し、source provenanceと成果物digestを検証できるcomplete・non-partialな`NOT_DETECTED`だけでholdを解除する。`DETECTED`、`HARNESS_ERROR`、partial/incomplete、欠落・破損・相関不一致はholdを維持する。

## 変更した正本

- `packages/framework/core/tools/amadeus-advisory-choice.ts`
  - pending instance、human choice receipt、物理`HUMAN_TURN` event identity、検査結果verification、決定的なadvisory出力先、report guardを実装した。
  - receipt storeは`<record>/.amadeus-advisory-choice.json`で、audit lock下のatomic writeを行う。
- `packages/framework/core/tools/amadeus-directive.ts`
  - `await-advisory-choice` directive、runtime validation、および全messageを逐語・配列順で結合する唯一のuser-visible rendering owner `renderAdvisoryChoiceQuestion`を追加した。
- `packages/framework/core/tools/amadeus-orchestrate.ts`
  - main、`--single`、per-unitを共通guardへ通し、receiptなしの`next`とdirect `report`を拒否するよう変更した。
  - successful report後にinstanceをcloseし、同じ発火条件が再成立した場合は新instanceを発番する。
  - `applyPendingAdvisoryGuard`は正準rendererだけを使ってdirectiveの`question`を生成する。
- `packages/framework/core/hooks/amadeus-mint-presence.ts`
  - 実promptから物理`HUMAN_TURN`をmintした直後に、そのaudit block digestとexact choiceを同じ保護境界で検証してreceipt化するよう変更した。raw prompt本文は保存しない。
- `packages/framework/core/tools/amadeus-plugin-activation.ts`
  - advisoryへtarget/spec identityを付与し、旧`(plugin, code)` latchをchoice receiptの代替にしないよう責務を分離した。
- `plugins/formal-model-check/tools/run-model-check-{domain,execution,artifacts}.ts`
  - 承認済み最小スコープ例外として、local実行にadvisory target/spec/instance相関引数、source byte digest、registered identityを追加した。
  - TLA+ model、invariant、TLC探索処理、CI runtime receiptは変更していない。
- `packages/framework/core/amadeus-common/protocols/stage-protocol.md`
  - 「nudge, not a gate」を、人間choice必須のfail-closed契約へ更新した。
- `packages/framework/core/knowledge/amadeus-shared/audit-format.md`
  - authoritative advisory side-ledgerと物理`HUMAN_TURN`相関を記載した。

上記正本から`bun scripts/package.ts`と`bun run promote:self`で各harnessおよび`dist/`を再生成した。生成物は直接編集していない。

## ユーザー可視rendering境界

| 責務 | owner / source | 検証 |
|---|---|---|
| 全advisory messageの逐語・配列順rendering | `packages/framework/core/tools/amadeus-directive.ts#renderAdvisoryChoiceQuestion` | unit `t113` |
| engineがrender済み文字列を`question`へ載せる境界 | `packages/framework/core/tools/amadeus-orchestrate.ts#applyPendingAdvisoryGuard` | integration `t378` |
| conductorが`question`を改変せず提示する契約 | `packages/framework/core/amadeus-common/protocols/stage-protocol.md` §11a | protocol projection test `t378` |
| 各配布harnessで実行されるrendering | `dist/{claude,codex,cursor,kimi,kiro,kiro-ide,opencode}/**/amadeus-directive.ts` | E2E `t-advisory-human-choice-rendering.e2e`（別Bun process） |

## 主要判断

1. choiceは次の2択だけを正準値として受理する。
   - `今すぐ実行する`
   - `リスクを承知して延期する`
2. timestampだけでは同一秒内の複数turnを区別できないため、実際に追記された`HUMAN_TURN` JSONL blockのSHA-256 digestを`eventIdentity`としてreceiptへ保存する。同じturnの二重消費をdigest単位で拒否する。
3. stage完了自体をFormal Model Check verdictとして扱わない。既存のsingle-stage reportからSpecHashStateを書き込む経路を外し、検証済みmanifestだけをactivation verdictの根拠にした。
4. `run-now`再実行は`<instance>-retry-N`の決定的な別出力先へrouteし、以前の`DETECTED`または失敗成果物を上書きしない。
5. 新しいaudit eventをregistryへ増やさず、既存の物理`HUMAN_TURN`とatomic side-ledgerを組み合わせた。FR-6の「auditまたは同等の永続証跡」を満たし、event/state二重書きの不整合面を増やさない。

## Red → Green証拠

- domain slice: 新moduleが存在しない状態で`tests/unit/t-advisory-human-choice-domain.test.ts`がimport errorになり、instance、receipt、複数advisory、verdict verifierの実装後にGreenになった。
- directive slice: `await-advisory-choice` kind未定義で`tests/unit/t113.test.ts`がRedになり、schemaと明示Formal Model Check routeのvalidation追加後にGreenになった。
- engine slice: advisory発火時に従来の`run-stage`を返して`tests/integration/t378-advisories-directive-field.integration.test.ts`がRedになり、共通guard導入後にGreenになった。
- protected choice slice: presence hook投影前はrisk deferがholdを解除できず`tests/unit/t203-mint-presence-classify.test.ts`がRedになり、物理`HUMAN_TURN` digestとの一回限り相関後にGreenになった。
- evidence contract slice: local runnerがadvisory相関引数を拒否しmanifestにidentity/provenanceがないためRedになり、承認済みスコープ例外の追加後にGreenになった。
- report bypass slice: receiptなしのmain/`--single` direct reportを拒否する回帰testを追加し、stage開始だけでなくreport境界もfail-closedに固定した。
- rendering review slice: 正準renderer exportが存在しない状態で`t113`がmodule import errorのRedになり、rendererをengineの唯一のquestion生成seamにした後、unitとintegrationがGreenになった。生成前の各projectionにはexportがないためE2E境界も同じRedを検出できる。
- retry lifecycle review slice: HARNESS_ERROR manifestが汎用partial判定へ先に落ち、`HARNESS_ERROR`を人間へ再提示できないRedを`t203`で再現した。outcomeとpartial flagの整合判定へ修正後、DETECTEDからfresh retry成功、およびHARNESS_ERRORからfresh deferがGreenになった。

## 検証

- focused unit/integration/E2E: 成功
  - `t-advisory-human-choice-domain`
  - `t113`
  - `t203-mint-presence-classify`
  - `t322-activation-lifecycle-behaviour`
  - `t378-advisories-directive-field`
  - `t381-advisory-checkpoints-latch`
  - local Formal Model Check domain/artifact tests
  - `t-advisory-human-choice-rendering.e2e`（7 harness projection）
- `bun run typecheck`: 成功
- `bun scripts/package.ts --check`: 成功、全harness drift 0件
- `bun run promote:self:check`: 成功、drift 0件
- `bun run lint`: 失敗。唯一のerrorは今回未変更の`packages/framework/core/tools/amadeus-audit.ts`にある既存unused symbol `VALID_EVENT_TYPES`で、対象fileがbaseとbyte-identicalであることを`git diff --quiet`で確認した。cognitive-complexityは既知のwarning扱いである。
- `bun run test:ci`: 769ファイル・10,458 assertionを実行し、30秒制限下で4ファイル・4 assertionが失敗した。全suite開始の重複によるCPU競合を除去後、timeout候補の重い4統合ファイルと関連smokeを120秒・直列で再実行し、5ファイル・236 assertionが全件成功した。実装変更に相関する失敗はない。
- Review Iteration 1修正後の最終focused再実行: unit＋integration＋E2Eの9ファイル・127 test・355 assertionが全件成功した。

## 受け入れ基準トレーサビリティ

| AC | 実装・検証 |
|---|---|
| 1 | `t378`の`await-advisory-choice replaces run-stage`、`t381`のreceiptなしdirect report拒否 |
| 2 | `t113`の複数message逐語renderer、`t378`のengine question完全一致、E2Eの7 harness projection実行、domainの複数advisory全件解決 |
| 3 | domainの完全human-turn provenance parser、`t203`の物理turn相関 |
| 4 | audit block digestの一回限り消費と曖昧・機械注入prompt拒否 |
| 5 | domain verifier、`t203`の`run-nowは検証済みNOT_DETECTED後だけholdを解除する` |
| 6 | `t203`の`DETECTED → 再提示 → fresh run-now receipt → retry-2 NOT_DETECTED → allow`。同一instanceと異なるHUMAN_TURN digestを検証 |
| 7 | `t203`の`HARNESS_ERROR → 再提示 → fresh defer receipt → allow`、manifest verifierのpartial/incomplete/provenance fail-closedケース |
| 8 | `t203`の正準defer choiceと永続receipt |
| 9 | pending storeによる同一instance再利用とreceipt再利用 |
| 10 | domainのidentity mismatch、`t203`のstage完了後新instance、retry出力先 |
| 11 | `t381`の3 checkpoint main経路 |
| 12 | `t381`の`--single`、既存per-unit directive共通guard |
| 13 | checkpointを含むinstance identityと解決後close/re-fire test |
| 14 | `t203`のmachine-injected turn拒否、`t381`の一般report bypass拒否 |
| 15 | side-ledgerのadvisory/choice/HUMAN_TURN event identity/結果trace |
| 16 | `t378`の`current`、`not-composed`、non-checkpoint silence回帰 |
| 17 | activation advisoryをlatchと後段予定から独立再評価するengine test |

## 計画差分と既知事項

- Step 5は当初の非スコープだけでは真正な`NOT_DETECTED`を現在identityへ結び付けられなかった。`2026-08-03T12:18:04Z`のユーザー承認に基づき、local manifestの相関・source provenanceとadvisory専用出力先だけを追加した。
- Step 6の「最小event集合」は、新eventではなくauthoritative side-ledgerへ具体化した。要件の保存形式が後続設計へ委ねた範囲内であり、audit vocabularyへ契約を明記した。
- 新規integration test fileを増やす代わりに、既存のcheckpoint責務を所有する`t381`を拡張した。関連証拠が分散しない最小変更とした。
- 専用patch coverage閾値は追加していない。変更した分岐はfocused unit/integrationと全suiteで検証する。
- Comprehensive戦略のユーザー可視層として、配布済み7 harnessの正準rendererを別processで実行するE2E testを追加した。unitは純粋renderer・receipt contract、integrationはengine/presence hook、E2Eは配布projection実行を所有し、各層の責務を重複させていない。
- plan Step 8に記載していた`.codex/.../stage-protocol.md`は生成投影であり、実編集正本は`packages/framework/core/amadeus-common/protocols/stage-protocol.md`であることを明記した。
