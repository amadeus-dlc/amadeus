# U2 model-attribution — Business Rules

**上流入力(consumes 全数)**: `requirements`(FR-3・AC-4/AC-5・CON-1〜4)/ `components`(C-3/C-5/C-6)/ `component-methods`(シグネチャと fixture 契約)/ `unit-of-work`(U2 完了条件)/ `unit-of-work-story-map`(model ジャーニー)/ `services`(fail-open・parity)

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`

## BR-U2-1: 解決の優先順(ADR-3 の執行)

`resolveEffectiveModel` は harness → request → pin の順で最初の非空値を採り、対応する source を併記する。全欠落は `{ kind: "unresolved" }`。

## BR-U2-2: 属性の書込規則(ADR-5)

- `resolved` → `"Model"` と `"Model Source"` の**両方**を書く
- `unresolved` → **どちらも書かない**(空文字・"unknown" の捏造禁止 — FR-3b)
- 片方だけが書かれた audit 行は本設計では生成されない(集計側はその前提で読む — U3 との契約)

## BR-U2-3: personaPin の供給条件

pin の供給は U1 の verdict が `persona` のときのみ。persona の frontmatter 読取は U1 の `resolveAllowedAgentTypes` を拡張せず、**pin 読取を C-3 側の独立ヘルパ**(`resolvePersonaPin(agentType, agentsDir): PersonaPinResolution` — domain-entities 参照)として持つ — U1 の許可集合解決に model の関心を混ぜない(変更理由の分離)。

**引き当て規則(§12a iteration 2 BLOCKER の是正)**: `agentsDir` 走査 + frontmatter `name:` 完全一致で定義ファイルを特定する(basename 決め打ち禁止 — 正本は domain-entities の PersonaPinResolution 節)。AD 内の2表現のうち component-methods の単数 `personaPin` を採り、components の `personaPins` 写像は採らない(1 spawn につき必要なのは1名分のみ)。

**読取失敗時の契約(§12a iteration 1 BLOCKER の是正 — NFR-3 / services.md「無音で握りつぶさない」への準拠)**: `name:` 一致ファイル不在・読取失敗・frontmatter parse 不能はいずれも throw せず `{ pin: undefined, warnings: [理由1行] }` を返す。呼び手は warnings を **stderr へ流し**(C-1 の `warnings` チャネルと同じ受け渡し — component-methods.md の「呼び手が stderr へ流す」規約を踏襲)、`personaPin = undefined` として解決を続行する(fail-open)。「frontmatter に model 無し」だけは正当な状態として warnings を積まない(business-logic-model の既存記述どおり)。warnings の stderr 出力はイベント(hook 発火)ごとに高々 warnings 件数ぶん — hook プロセスは1発火で終了する短命実行のため run 単位ラッチは不要だが、**実装時に stderr 出力の呼び出し点数を grep で実測**して面(started/completed)ごとの重複がないことを確認する(`guard-announcement-callsite-count`)。

**読取回数(services の期待値との差分申告)**: 本設計では1回の hook 発火につき FS 走査が最大2回(C-1 の許可集合走査 + persona verdict 時の pin 引き当て走査)— services.md の「persona dir 読取1回 + 純関数」に対する意図的差分。agents dir は十数ファイル規模で、変更理由の分離(C-1 に model の関心を混ぜない)を優先する。

## BR-U2-4: started 面への差し込み(C-5 started + C-6 残り)

- `subagentStartFields`(`amadeus-lib.ts:4128-4139`)へ U1 と同じ照合(`Type Verdict`)+ 本 Unit の model 解決(`Model` / `Model Source`)を追加。入力: `harnessModel = payload.model`、`requestedModel = tool_input.model`、`personaPin` は BR-U2-3
- registry: STARTED optional へ `"Type Verdict"` / `"Model"` / `"Model Source"` の3属性、COMPLETED optional へ `"Model"` / `"Model Source"` の2属性を追加(U1 が COMPLETED へ `"Type Verdict"` を追加済み — の想定)。**実装着手時に `event-registry.ts` の U1 着地状態を実測してから差分を決める**(unit-of-work の C-6 割付は字面上 U1 が両イベント分を持つ読みも成り立つため、二重登録を防ぐ — 割付との差異はこの注記をもって申告とする)
- **注意(CON-2)**: この面は Claude Code では #2303/#2297 未修正のため発火しない — 実装・テストは payload 形状で行い、live 発火は kimi 経路(`amadeus-kimi-lib.ts:625-626` role-start)が担う

## BR-U2-5: completed 面の model 配線

`amadeus-log-subagent.ts` の U1 差し込み点に C-3 を追加。completed payload に `tool_input` は無い → `requestedModel = undefined` を明示(暗黙の undefined でなくコメントで契約を可視化)。`harnessModel = parsed.model`(Codex 供給 — fixture 実測)。

## BR-U2-6: fail-open(NFR-3)

U1 の BR-U1-3 と同一契約 — **pin 読取(BR-U2-3)を含む** model 解決経路のどの throw も catch し、`Model`/`Model Source` をスキップして emit 継続。`resolvePersonaPin` は契約上 throw しない(warnings で返す)が、防御の外周 catch は pin 読取層も覆う(二層 — 契約と防御を混同しない)。

## BR-U2-7: テスト契約(AC-4 / AC-5)

- unit 層: `resolveEffectiveModel` の4ケース(harness / request / pin / unresolved)+ 優先順の対照(harness と request が両方あるとき harness が勝ち source="harness")+ 空白 trim
- **integration 層(実 FS — `fs-tests-integration-first`)**: `resolvePersonaPin` の5ケース — pin あり persona(`name:` 一致)/ **basename ≠ `name:` のファイルでも `name:` 一致で引き当てる対照(引き当て規則のピン — basename 決め打ち実装なら赤になる)** / model 無し frontmatter(warnings 空・pin undefined)/ `name:` 一致ファイル不在(warnings 1件・pin undefined)/ dir 読取失敗(warnings 1件・pin undefined・throw しない)
- fixture 注入: `tests/fixtures/codex-hook-payloads/payloads.json` の `subagentStop`(逐語断片 `"model": "openai.gpt-5.5"` — RE re-scan 実測、fixture 世代 0.137.0)を completed hook 経由で流し、`Model: openai.gpt-5.5` / `Model Source: harness` の実出力を確認(AC-4 の harness 段)。実装時に fixture の現物を再読して断片一致を確認してから固定する
- AC-5: model 無し payload(Claude Code live 形状)で両属性が欠落し emit が継続することを確認。**payload の agent_type は非 persona 型に限る** — 定義済み persona は全てピンを持つ実測(requirements の「ピン無し 0」)により persona 型では pin が解決して `unresolved` に落ちないため(U3 の `unresolved` 区分の意味論も同じ: 非 persona かつ harness/request 供給なし)
- STARTED 面: `tool_input.model` 明示の payload 形状で `Model Source: request`、persona 型 + 非明示で `Model Source: pin` を固定

## BR-U2-8: TDD(NFR-2)

BR ごとに Red 実測 → 最小実装の vertical slice。fixture 契約(AS-1)の変更検知は fixture 読込の存在 assert で担保。
