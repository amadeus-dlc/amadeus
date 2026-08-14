# Unit Story Map — Election CLI 多問対応

## 入力とstoryの扱い

本mapは [components](../application-design/components.md)、[component-methods](../application-design/component-methods.md)、[services](../application-design/services.md)、[component-dependency](../application-design/component-dependency.md)、[decisions](../application-design/decisions.md)、[requirements](../requirements-analysis/requirements.md) を根拠とする。この Intent では user-stories stage の成果物がないため、requirements の acceptance criteria を検証可能な capability story に束ねる。下記番号は unit 内の prerequisite 関係であり、Bolt の経済的順序ではない。

## Capability stories

### S1: 多問definitionを安全に読む

定義者として、stable ID と question-owned choices を持つ複数問definitionを登録し、不正なID/choiceをcommit前に拒否したい。

- Maps to: U1
- Requirements: FR-DEF-1〜3、FR-COMP-1/2、NFR-3

### S2: voterがblind viewへ問ごとに回答する

voterとして、全questionとchoiceをblind viewで読み、questionごとのchoice/GoA/留保/rationaleを一票で提出したい。

- Maps to: U1、U3、U4
- Requirements: FR-DEF-4、FR-BAL-1/2/5

### S3: amendとlateをquestion単位で扱う

conductorとして、voter × questionの最新responseを解決し、established問を変えずにamend/lateを分類したい。

- Maps to: U1、U2、U3
- Requirements: FR-BAL-3/4、FR-RER-2

### S4: mixed resultを決定的に集計する

conductorとして、各questionを独立集計し、establishedとholdが混ざる結果、GoA、留保、countsを損失なく得たい。

- Maps to: U2、U3
- Requirements: FR-TAL-1〜6、NFR-1/4

### S5: hold問だけを再実行する

conductorとして、directiveだけを見てhold question IDsを再実行し、既存established digestが不変であることを確認したい。

- Maps to: U2、U3、U5
- Requirements: FR-RER-1〜4、FR-COMP-3

### S6: mixed resultを監査可能に記録する

reviewerとして、recordとhistoryから各questionの裁定、GoA、留保、hold reason、run lineageを独立に検証したい。

- Maps to: U3、U4、U5
- Requirements: FR-OBS-1、FR-COMP-3、NFR-4

### S7: legacyデータを意味的に維持する

maintainerとして、旧単問definition/ballot/tally/registry/recordを`legacy-question`へ正規化し、移行前後のcanonical meaningを一致させたい。

- Maps to: U1、U3、U6
- Requirements: FR-COMP-1〜4

### S8: 形式モデルで不変条件を反証探索する

maintainerとして、question identity、mixed result、established preservation、held-only rerunの違反がないことをTLCで探索したい。

- Maps to: U2、U5、U7
- Requirements: FR-FML-1、NFR-5

### S9: 配布・回帰・normを完了証拠にする

maintainerとして、skill/build/test/performance/model-map/normを同期し、単問退行と旧workaround再出現がないことを証明したい。

- Maps to: U4、U5、U6、U7、U8
- Requirements: FR-OBS-2、FR-NORM-1/2、NFR-2/5

## Unit-to-story coverage

| Unit | Capability stories | Unit内 prerequisite |
|---|---|---|
| U1 election-canonical-schema | S1, S2, S3, S7 | definition decode → ballot decode → legacy equivalence |
| U2 election-question-tally | S3, S4, S5, S8 | response resolution → per-question tally → preservation/late checks |
| U3 election-v2-store | S2, S3, S4, S5, S6, S7 | dual-read → pending/ledger → immutable run/current snapshot → repair |
| U4 election-record-transport | S2, S6, S9 | multi-question view → render → independent verify → delivery evidence |
| U5 election-mixed-lifecycle-cli | S5, S6, S8, S9 | typed status → directive → tally/report → render/verify loop |
| U6 election-legacy-migration | S7, S9 | dry-run plan → canonical fidelity → approved move verification |
| U7 formal-election-multiq | S8, S9 | state abstraction → invariants → TLC → model-map identity |
| U8 election-distribution-and-verification | S9 | canonical skill → build projection → full tests/performance → norm/distillation evidence |

## Cross-cutting stories

- S2 は model/store/transport を跨ぐが、view content はU1、blind persistenceはU3、配送はU4と所有を分離する。
- S5 は tally/store/CLI を跨ぐが、preservation rule はU2、証拠はU3、orchestrationはU5が所有する。
- S9 は統合証拠のstoryであり、production ruleをU8へ移さない。U8は各unitの公開契約を検証・投影する。

## Coverage verification

- S1〜S9 はすべて1件以上のunitへ割り当て済み。
- U1〜U8 はすべて1件以上のcapability storyを持つ。
- requirements の FR-DEF、FR-BAL、FR-TAL、FR-RER、FR-COMP、FR-OBS、FR-FML、FR-NORM と NFR-1〜5 はすべて上記storyで被覆される。
- 経済的なBolt sequenceは未決定であり、Delivery PlanningがDAGから選択する。
