# Phase boundary verificationの規約順序とapproval guardが両立しない

## 概要

phase最後のstageをCodex harnessで承認するとき、文書化された操作順とstate guardの前提が両立しない。

- governance protocolはphase verificationを「最後のstage承認後、次phase開始前」に実施すると定める。
- Codex question annexはapproval回答後に`report --result approved`を直接呼ぶよう定める。
- `amadeus-state.ts approve`は、phase-check artifactが存在しない限り、その最後のstage承認自体を拒否する。

そのため、文書どおりにapproval回答を直接`report`へ渡すと、正当な人間承認がerror directiveになりworkflowが`awaiting-approval`へ残る。

## 対象

- 対象SHA: `498c3034a78bd432dc426f9f807b79c8ae980762`
- harness: Codex
- 観測境界: Inception最後のin-scope stage `requirements-analysis` → Construction最初のin-scope stage `code-generation`

## 再現

前提:

1. Inceptionの最後のin-scope stageがapproval待ちである。
2. `<record>/verification/phase-check-inception.md`は、governance protocolの時系列どおり、まだ存在しない。
3. 人間がapproval gateで`Approve`を選ぶ。

Codex annexどおり次を直接実行する。

```console
$ bun .codex/tools/amadeus-orchestrate.ts report \
    --stage requirements-analysis \
    --result approved \
    --user-input "Approve (Recommended)"
```

観測結果:

```text
Transition rejected by amadeus-state.ts approve for "requirements-analysis":
Refusing to complete the "inception" phase boundary:
verification/phase-check-inception.md does not exist ...
```

process自体はtyped error directiveを返すが、`GATE_APPROVED`、`STAGE_COMPLETED`、phase transitionは成立せず、stageは`[?] awaiting approval`へ残る。

## 競合する契約

### 1. governance protocol

`packages/framework/core/amadeus-common/protocols/stage-protocol-governance.md:14-27`

- verificationは「After the last stage of each phase is approved」
- その後phase-check artifactを書き、`PHASE_VERIFIED`を記録する

### 2. Codex approval annex

`packages/framework/harness/codex/skills/amadeus/question-rendering.md:57-65`

- approval responseはordinary answerとして扱わない
- approval後は`amadeus-orchestrate.ts report --result approved`を直接呼ぶ
- reportがhuman turnを一度だけ消費する

### 3. state guard

`packages/framework/core/tools/amadeus-state.ts:371-395`

- phase boundary completionより前に`phase-check-<phase>.md`の存在を要求する
- 不在ならstate write前にfail-closedで拒否する

どの契約も単独では合理的だが、同じtransitionに適用すると順序循環になる。

## 影響

- 文書どおりに進めるconductorは、Ideation、Inception、Constructionのphase最後のstage承認で停止し得る。
- 人間の有効なapproval turnがerror応答になる。ただしauthorization自体は未消費であり、phase-check作成後に新しい人間入力を求めずreport commandを再試行できる。
- canonical phase終端stageがSKIPされ、より前のstageがphase最後のin-scope stageになるscopeでも同じguardが発火する。
- work-aroundはapproval gate前にphase-check artifactを先行生成することだが、governance protocolの時系列とCodex annexのdirect-report契約から導出できない。

## 期待する挙動

engine、state guard、governance protocol、各harness annexが、phase verificationの単一の順序契約を共有する。

例えばengineがphase最後のstage completion前にverification moveを明示的にrouteする、またはstage approvalとphase verificationを別transitionへ分離する。具体方式は後続設計に委ねるが、次を満たす必要がある。

- conductorがproseから隠れた先行artifact要件を推測しなくてもよい。
- validなapproval responseを一度typed errorへ落として再入力させない。
- phase-check不在をfail-closedで拒否する安全性は、正しいtransition境界で維持する。
- scopeのSKIP構成にかかわらず、実際のphase最後のin-scope stageで成立する。

## 受け入れ条件候補

- [ ] phase最後のin-scope stageについて、phase-check不在から開始するproduction-path testがある。
- [ ] engine directive、governance protocol、state guard、Codex approval annexが同じverification順序を定める。
- [ ] 人間の最初のvalid approvalをerror directiveへ変換せず、`HUMAN_TURN`を重複要求しない。現状のworkaroundでも新しい人間入力は不要である。
- [ ] phase-check未作成のまま`PHASE_VERIFIED`または次phase開始へ進む経路は引き続きfail-closedである。
- [ ] Ideation→Inception、Inception→Construction、Construction→Operationの3境界を同じ契約で検証する。
- [ ] canonical phase終端stageがSKIPされるscopeでも、最後のin-scope stageを正しく扱う。
- [ ] Codex以外のharness投影と正本が同じ順序へ同期される。

## 初期分類

- `bug`
- `P1`: 通常のphase transitionが文書どおりの操作で停止する。構造的なproducer gapは現在のtarget gridで14 scope中11に存在する。
- `S3-MAJOR`: workflowは停止するが、phase-check artifactを先行生成する手動回避策がある。
- `origin:bootstrap`候補: governanceとcanonical終端stageの相反順序はbootstrap由来で、後続のguardとdirect-reportが不整合を顕在化させた。

## 非スコープ

- phase traceability methodologyやphase-check内容自体の再設計。
- active intentであるIssue #2129のadvisory human-choice修正。
- 本Issueの起票・クロスレビューによる修正着手、優先順位変更、クローズの承認。
