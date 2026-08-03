# Performance Design — text-mutation-loud-failure

## 上流入力

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。validationとpostconditionを削らず、parse回数、document世代、physical writeを明示予算へ閉じる。

## Parseとwrite予算

| operation | validation parse | setter内reparse | caller次step用reparse | final reparse | physical write |
| --- | ---: | ---: | ---: | ---: | ---: |
| single changed／idempotent | 1 | 1 | 0 | 1 | changed bytesのみ最大1 |
| bulk T targets | 1 | T | T | 1 | 全成功・changed bytesのみ最大1 |
| invalid target／duplicate target | 0 | 0 | 0 | 0 | 0 |
| validation failure | 1以下 | 0 | 0 | 0 | 0 |
| step not-found／invariant | 1 | 到達stepまで | 完了stepまで | 0 | 0 |

bulk成功の総parse回数は厳密に `2T + 2` とする。setterが返す `changed(content)` にvalidated indexを追加して再parseを省略せず、callerは各step後に新しい `ValidatedStageState` を作る。

## メモリ所有と計算量

`MutationTransaction` はoriginal、current、candidateの最大3世代だけを保持し、完了済み中間documentを配列へ残さない。validated indexはslugからcanonical line rangeへのMapとし、lookupは `O(1)` average、parseは `O(D + S)`、bulk全体は上流契約どおり `O(T × (D + S))` を上限とする。

targetはmutation開始前に `slug + dimension` keyへ正規化し、Setで重複を `O(T)` 検出後、byte順sortを `O(T log T)` で一度だけ行う。target間総当たり、step単位write／audit、parallel mutation、cacheを導入しない。

## I/O ordering

state／audit before digestはtransaction開始時に各1回取得する。in-memory検証完了前にwriter、永続audit、success emitterを呼ばない。final bytesがoriginalと一致するidempotent successではwriter 0回とし、全final postconditionを満たした `verified-no-write` branchからcaller既存audit／successを実行する。差分がある成功だけ `writeStateFile` を1回呼び、`committed-write` 後にaudit／successを実行する。

pre-commit writer failureはwrite call 1回、canonical state change 0、audit／success 0である。rename後directory fsync failureはcandidate bytesの再読確認を1回行うが、retry、resync、audit、successは0回とする。

## Capacity測定

`tests/perf/t-no-silent-drop-text-mutation.test.ts` のseed固定L1／L4／L8 fixtureを使う。L8は256 stage、256 target、1 MiB以下とし、3回warmup後に各caseを10回測る。operation直前／直後の `performance.now()` 最大値を1秒以内、fixture読込後から測定終了までの `process.resourceUsage().maxRSS` 増分を128 MiB以下とする。

測定recordはrunner image、Bun version、revision、fixture digest、D／S／T、result、parse／setter／writer／audit／success／retry／resync count、before／after state／audit digestを含む。最大値だけで判定し、平均値で遅い試行を隠さない。

## 検証項目

- single、idempotent、bulk成功で上表のexact call countを検査する。
- not-foundを先頭／中央／末尾へ置き、全中間content破棄、write／audit／success 0を確認する。
- L8 bulk success／末尾not-found／duplicate targetが各1秒・128 MiB以内であることを確認する。
- 性能超過時もvalidation、各step reparse、非対象projection、final reparseを省略せずcapacity reviewへ送る。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T08:41:09Z
- **Iteration:** 1
- **Scope decision:** none

検証・transactionの基本構造は妥当だが、idempotent成功の権限条件、setter内reparseの依存、post-commit durability failureの公開境界に3件の実装不能な不整合が残る。

### Findings

- Major — security-design.md:29 はaudit／success capabilityをwriter成功後だけ到達可能とするが、performance-design.md:27、reliability-design.md:16、logical-components.md:48 はidempotent時にwriterを0回としてcaller既存success契約を継続する。writer成功を要求するとidempotent成功をemitできず、idempotent branchを許可するとsecurity boundaryに違反するため、final postcondition済みno-write successを独立した認可分岐として定義する必要がある。
- Major — logical-components.md:14 と performance-design.md:11-17 はStageTextMutator自身が各setter内reparseを必ず行うと定める一方、logical-components.md:56-63の依存図ではStageTextMutatorはMutationInvariantGuardだけへ依存し、StageStateValidatorはMutationTransactionからしか参照されない。raw string overloadを禁じたまま誰がcandidateを再parseしてValidatedStageStateを生成するか実装できないため、Mutator→Validator依存と循環しない返却契約を明示する必要がある。
- Major — reliability-design.md:20,32-38 はrename後directory fsync failureをcandidate再読後のtyped durability failureとしてaudit／successなしで返すが、logical-components.md:19のMutationFailurePresenterはpre-commit failureだけを所有し、logical-components.md:46-49のcandidate経路にもAtomicStateWriterPort失敗をpresenter／既存CLI error boundaryへ接続する遷移がない。post-commit時はstateが既にcandidateであるため、一般的なpre-commit failure処理へ流すこともできず、stderr／exit、再読不能時のinternal error、audit抑止のownerを確定する必要がある。

## Iteration 1 Resolution

- success side effectの認可をfinal postcondition済み `verified-no-write` とwriter完了済み `committed-write` の二variantへ閉じた。
- setter内reparseは `CandidateStateValidatorPort` を介して `StageStateValidator` へ一方向依存し、返却型は従来どおりcontentだけを持つ。
- writer exception後のcanonical再読で `pre-commit | post-commit-durability | internal` を分類し、前二者を専用presenter、再読不能／第三bytesを既存internal boundaryへ接続した。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T08:44:32Z
- **Iteration:** 2
- **Scope decision:** none

setter依存とwriter failure境界は解消したが、idempotent成功条件の矛盾が残り、新設success tokenも偽造・再利用を防ぐ実効的capabilityになっていない。

### Findings

- Major — 前回のidempotent成功findingは部分解消である。security-design.md:31、reliability-design.md:16,39、logical-components.md:56はverified-no-write tokenによるwriterなしsuccessを許可したが、performance-design.md:27は依然「writer成功後だけaudit／success」と定める。idempotent時はwriter 0回なので、同一設計内でsuccessを許可するか禁止するかが矛盾している。
- Critical — 修正で追加されたsuccess authorization tokenはcore safety boundaryとして成立していない。logical-components.md:51-53はpayloadを持たない `verified-no-write | committed-write` の構造的unionだけを受理し、opaque brand、constructor所有者、document／target／caller／transaction digestへの結合、single-use規則を定義していないため、別transactionでの偽造・再利用によりwrite／postcondition未完了でもaudit／successを認可できる。さらにlogical-components.md:19,85はMutationSuccessAuthorizerをI/O非所有のpure componentとする一方、依存図79は同componentからaudit／success emitterへ接続しており、認可判断と副作用実行のownerも矛盾する。
- Resolved — setter内reparseはlogical-components.md:15,63,72-75でCandidateStateValidatorPortを介した一方向依存となり、前回の隠れたValidator依存は解消した。
- Resolved — post-commit durability failureはreliability-design.md:20,36-37とlogical-components.md:45-60でcanonical再読、typed failure presenter、internal boundaryへ閉じられ、前回の公開境界欠落は解消した。

## Iteration 2 Resolution

- performance上のidempotent success条件を `verified-no-write` branchへ統一した。
- 公開success token／authorizerを削除し、audit／success capabilityを `CallerMutationAdapter.run` のprivate closureへ閉じた。外部componentはsuccess emitterを受け取れず、adapterのexhaustive内部branchだけが呼出可能である。
