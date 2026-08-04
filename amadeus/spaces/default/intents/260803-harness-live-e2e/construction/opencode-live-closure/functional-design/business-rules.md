# Business Rules — opencode-live-closure

入力参照: `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。

## Gate and Phase

- BR-G01: `GITHUB_ACTIONS=true`を最優先し、次に`AMADEUS_OPENCODE_LIVE === "1"`を判定する。
- BR-G02: deny時はPhase guard/probe/model callを0回にする。
- BR-G03: U11 guardがgate後にPhase 2 closureを検証し、C4 APIを変更しない。
- BR-G04: static helpだけでsupportedにせず、safe commandの実live anchorsで確定する。

## Isolation, Model, and Command

- BR-I01: `AMADEUS_OPENCODE_MODEL`はclosed `provider/model` grammarで検証し、未指定・不正・未登録providerをspawn前に拒否する。
- BR-I02: child envはscratch HOME/XDG群、locale、nonce、typed declarationの単一credential keyだけ。ambient envをspreadしない。
- BR-I03: source auth file、user/global/remote config値、user plugin、source HOME/XDGをcopy・symlink・mount・child公開しない。
- BR-I04: project configはglobal deny、exact status用bash 2本だけallow、share disabled、autoupdate falseをstructured生成する。
- BR-I05: commandは`run`/custom `amadeus`/JSON/model/dir/fixed title/literal `--status`に固定し、auto/share/resume/attach/file/pureを禁止する。
- BR-I06: credentialはU11 C5所有`OpenCodeCredentialPort`のin-memory/env leaseだけ。fixed tableはOpenAI/Anthropic/OpenCodeの3 providerと各API keyに閉じ、value/source pathを永続化せず、planned/created/destroyをregistrarが追跡する。
- BR-I07: preflightは`BINARY_MISSING → VERSION_UNSUPPORTED → DIST_MISSING → AUTH_UNAVAILABLE`のcanonical skip precedenceだけを返す。stage closure未完了は`LiveOutcome`へ新codeを追加せず別に判定する。

## Plugin Evidence and Journey

- BR-P01: scratch probe pluginはcanonical plugin存在/hashを検査し、同一sessionの`chat.message`と`tool.execute.after`を結合する。
- BR-P02: engine next statusとutility statusのexact commandをこの順で観測した場合だけnonce-bound atomic receiptを書く。
- BR-P03: receiptはraw session/call ID、prompt、args、output、path、credentialを含めず、hashとclosed command IDだけを持つ。
- BR-J01: anchorsはexit 0、JSON lines、全eventのsession hash一致、ordered call/tool receipt、両tool後のsame-session terminal exactly one、intents不存在、leakなし。early/duplicate/foreign-session terminalと自然言語substringを拒否する。
- BR-J02: deadline 120秒、teardown 15秒、outer 150秒、retry 0、serial実行。
- BR-J03: process groupはowner-bound identity再検証後だけsignalし、group残存0を確認する。
- BR-J04: model callとassertion後のoutcomeはcleanup barrier成功後だけC8へ記録する。`descendants-zero/reap → scan-before-delete → scratch delete → post-delete不存在 → credential destroy → matcher zeroize`のいずれかが失敗した場合はC8 receipt absentの`LiveRunError.cleanup-barrier-failed`とし、PASS、supported更新、materializationを禁止する。
- BR-J05: credentialを持たないrun-owned supervisorをgroup leaderとしてOpenCode leaderより長く維持し、supervisor reap、group `ESRCH`、credential-bearing descendant残存0をsuccess/cleanup完了の必須条件にする。
- BR-J06: supervisor capabilityはcredential lease前に検証する。OpenCode leader先行終了、control loss、PID reuse、owner mismatchで残存0を証明できない実装はliveを開始できない。

## Closure

- BR-C01: cleanup barrier成功後のC8 appendまたはalready-presentを経た`closure-committed`時だけC5/C6をsupportedとしてmaterializeし、unsupported adapter stubを禁止する。
- BR-C02: unsupported時もprobe/test/C7 entry/Issue/C9 matrixを必須とし、TBD/要調査/silent skipを禁止する。
- BR-C03: binary/dist/auth不足とtransient failureはU11未完了で、Issue closureに変換しない。unsupportedは取得済みversion/helpとspecific reproducible capability evidenceを必須とする。
- BR-C04: `OPENCODE_SAFE_FLAGS_ONLY`,`OPENCODE_ENV_ALLOWLIST_EXACT`,`OPENCODE_PROJECT_ONLY`,`OPENCODE_MODEL_ID_VALID`,`OPENCODE_CREDENTIAL_LEASE`,`OPENCODE_ORDERED_TOOL_RECEIPT`,`OPENCODE_JSON_SESSION_MATCH`,`OPENCODE_UNSUPPORTED_EVIDENCE_COMPLETE`,`PROCESS_GROUP_OWNER_MATCH`,`SUPERVISOR_REMAINS_GROUP_LEADER`,`CREDENTIAL_DESCENDANT_ZERO`,`NON_GREEN_RECEIPT_REQUIRED`,`PHASE_PREREQUISITE_REQUIRED`のbaseline green/mutant redを要する。
- BR-C05: C4がleak scanを担当する場合、secret値やsource locatorを受け取らず、C5所有のopaque matcherを呼び出す`scanBeforeDelete(targets, matcherHandle)`だけを使う。`descendants-zero/reap → scan-before-delete → delete → post-delete不存在 → credential destroy → matcher zeroize`のreceipt列をcleanup barrierの必須入力にする。barrierの`closed`はC8 appendだけを許可し、PASS、supported更新、materialization、projectionは`closure-committed`まで禁止する。
