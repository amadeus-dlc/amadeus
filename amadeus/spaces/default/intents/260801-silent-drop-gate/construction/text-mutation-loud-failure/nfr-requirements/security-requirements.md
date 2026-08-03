# Security Requirements — text-mutation-loud-failure

## 上流入力と資産

本書は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` を入力とする。保護対象はcanonical state bytes、全永続workflow audit bytes、mutation target、既存CLIの成功／失敗境界である。資格情報、remote API、規制対象データは扱わない。

## 脅威境界

| ID | 脅威 | 必須制御 |
| --- | --- | --- |
| SEC-TM-01 | malformed stateを部分的に書き換える | raw bytesを既存grammarで完全parseし、opaque `ValidatedStageState` だけをsetterへ渡す |
| SEC-TM-02 | duplicate／decoy lineへ誤mutationする | canonical slug identityがちょうど1件であることをmutation前後に検証する |
| SEC-TM-03 | target不存在を成功へ偽装する | `not-found(target)` を全callerがexhaustiveにtyped failureへ昇格し、write／audit／successを0回にする |
| SEC-TM-04 | target文字列による診断注入 | targetはASCII `^[a-z][a-z0-9-]{0,63}$`、長さ1〜64 code units、正規化なしとし、stderr JSONは `JSON.stringify({ error: message })` でescapeする。文字列連結でJSONを組み立てない |
| SEC-TM-05 | 非対象stageの改変 | before／afterの非対象identityとbytes projectionを比較し、不一致は `StateMutationInvariantError` とする |
| SEC-TM-06 | failure診断による永続状態汚染 | validation／not-found／duplicate-target／invariantの診断先をstderrだけに限定し、workflow audit writerを呼ばない |

## 入力・権限・実行制御

- target validationはsetterの前に行う。文法外targetはtyped input validation failure `InvalidMutationTarget`、文法内だがdocumentに0件のtargetだけを `not-found(target)` とし、両者を混同しない。どちらもcaller既存のstderr `{"error": message}`／exit 1／stdoutなしへ写像する。
- setterはfilesystem path、environment、shell commandを受け取らず、既存callerが取得したvalidated documentと閉じたoperationだけを受け取る。
- `setCheckbox` の値と `setStageSuffix` の値はTypeScriptの閉じたunionとし、任意marker／suffixを受理しない。
- Unit内でshell、child process、network、dynamic code evaluation、runtime dependency downloadを追加しない。
- state pathの認可、single-writer境界、atomic writerは既存caller契約を維持する。本Unitはout-of-scopeの #1906 lock競合を独自に一般化しない。
- 新しい公開CLI command、権限、永続telemetry sinkを追加しない。

## 情報露出と供給網

- error JSONには既存の `error` fieldと必要最小限のtarget／messageだけを含め、state document全文、audit bytes、absolute path、environmentを含めない。
- `StateMutationInvariantError` のreasonは `reparse-failed | postcondition-failed | non-target-changed` の閉集合とし、raw documentをmessageへ埋め込まない。
- runtimeはBun 1.3.13と既存TypeScript／標準APIだけを使用し、本Unitのための外部packageを追加しない。
- generated harnessを直接編集せず、canonical sourceから後続 `repository-adoption` で再生成する。

## セキュリティ検証

- malformed section／checkbox／suffix、duplicate slug、decoy line、unknown suffixをmutation前に拒否する。
- targetへ改行、引用符、backslash、Unicode separator、先頭digit、uppercase、65文字値を与えて `InvalidMutationTarget`、有効だが不在のslugを与えて `not-found` となることを分離して検証する。いずれもstderrが有効JSONでstdout／state／auditが不変であることを確認する。
- parser／renderer seamで非対象変更とpostcondition failureを注入し、型付きinvariant failureへ閉じることを検証する。
- 全caller inventoryでvalidation／not-found／duplicate-target／invariant時のwrite、永続audit、success、retry、resyncが0回であることを検査する。
- dependency diffとlockfile diffを確認し、新規runtime dependencyが0件であることを証跡化する。

## 非適用

OWASPのHTTP session、TLS、CORS、database injection、cloud IAM、secret rotation、DASTは本Unitに実行面がないため非適用である。将来network／credential／multi-writer serviceを導入する場合はscope changeと新しいsecurity reviewを要求する。
