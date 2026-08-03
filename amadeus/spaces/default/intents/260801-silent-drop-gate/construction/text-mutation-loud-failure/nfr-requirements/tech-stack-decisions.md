# Tech Stack Decisions — text-mutation-loud-failure

## 上流入力

本書は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` を入力とし、#1874修正を既存Bun-only TypeScript runtimeへ追加する技術判断を固定する。

## 決定一覧

| ID | 決定 | 理由 |
| --- | --- | --- |
| TS-TM-01 | RuntimeはBun 1.3.13、言語は既存strict TypeScript／ESM | 現行CLI、test、packagingとの互換を維持する |
| TS-TM-02 | `packages/framework/core/tools/amadeus-lib.ts` の `parseCheckboxes(content): CheckboxLine[]` とcheckbox grammarを拡張し、同fileから新規 `validateStageState(content): ValidatedStageState` をexportする | regex／bare `String.replace` のfirst-match成功を廃止し、canonical identityを一箇所で所有する |
| TS-TM-03 | `ValidatedStageState` をopaque type、`TextMutationResult` を `changed | not-found` のdiscriminated unionとする | raw stringの直接mutationとresult破棄を型境界で防ぐ |
| TS-TM-04 | postcondition破損は専用 `StateMutationInvariantError`、unknown exceptionは既存internal boundaryへ再throw | 正常なnot-foundと実装不変条件破損を混同しない |
| TS-TM-05 | persistenceは `amadeus-lib.ts` の `writeStateFile(projectDir, content, intent?, space?): void` → `writeFileAtomic(path, data, hooks?): void`、diagnosticはcaller-local `process.stderr.write(JSON.stringify({ error: message }) + "\\n")` を使う | `writeFileAtomic` のtemp fsync→rename commit point→directory fsyncを維持し、永続auditを伴う `emitError`／`amadeus-utility.ts` の `die` は本Unitのpre-commit failure経路で使わない |
| TS-TM-06 | 外部package、child process、networkを追加しない | 単一用途bugfixに新しいruntime／supply-chain面を持ち込まない |

## Module境界

| 境界 | 責務 |
| --- | --- |
| state parser | `amadeus-lib.ts` の `parseCheckboxes`／新規 `validateStageState`。raw bytesのgrammar、一意line、checkbox／suffix検証とvalidated index生成 |
| pure mutation | validated input、target lookup、range mutation、postcondition用candidate生成 |
| transaction | bulk target検証、canonical sort、step／final reparse、failure state、write前副作用禁止 |
| atomic writer | `amadeus-lib.ts` の `writeStateFile`／`writeFileAtomic`。bytes差分がある成功のcanonical state commitとpre／post-commit failure seam |
| caller adapters | `amadeus-jump.ts`、`amadeus-utility.ts`、`amadeus-state.ts`。`not-found`／invariant／write failureの既存CLI error mappingとsuccess ordering。pre-commit failureは永続auditを行う `emitError`／`die` を迂回する |
| tests | parser／renderer／writer seam、call-count、byte-digest、caller inventoryの検証 |

pure mutationはfilesystem、console、process exit、audit writerを直接扱わない。caller adapterはmutation resultを文字列messageで判別せず、union kindまたは専用error typeで分岐する。

target validatorも `amadeus-lib.ts` に置き、ASCII `^[a-z][a-z0-9-]{0,63}$` を正規化なしで適用する。文法違反はsetter外の `InvalidMutationTarget`、有効slug不在だけを `TextMutationResult.not-found` とする。

## 採用しない選択肢

- raw `String.replace` の戻り値比較: decoy／duplicate／malformedとidempotent successを安全に区別できないため不採用。
- regexだけのstage parser: 既存grammarと一意性を二重実装するため不採用。
- `not-found` をexceptionだけで表す設計: 上流の閉じた `TextMutationResult` とexhaustive caller検査を弱めるため不採用。
- automatic retry／implicit resync: FR-11の全callerで上限0回のため不採用。
- failure telemetryの永続audit追加: state／全永続audit byte不変に反するため不採用。
- 新しいtransaction framework／database／lock service: 単一用途を越え、#1906を無承認に取り込むため不採用。

## Build・Test・Distribution

- strict TDDで、not-found falling proofを最初に固定してからminimal implementationを行う。
- pure parser／mutation unit、bulk transaction unit、caller別CLI integration、failure injection、repository regressionを分離する。
- `bun run lint`、`bun run typecheck`、focused tests、`bun run test:ci`を検証する。
- canonical sourceだけを編集し、generated `dist/`やpromoted suffixを直接編集しない。
- 本Unitの成果を後続 `repository-adoption` へ渡し、そこでpackage／promotion regenerationと全harness parityを検証する。

## 再検討条件

- state grammarの正本が既存parserから変更される。
- canonical documentが256 stageまたは1 MiBを継続的に超える。
- multi-writer／lock競合がscopeへ追加される。
- new mutation dimensionまたは公開CLI result variantが承認される。
- 既存atomic writerが要求するcommit-before-successを満たせないことが実測で判明する。
