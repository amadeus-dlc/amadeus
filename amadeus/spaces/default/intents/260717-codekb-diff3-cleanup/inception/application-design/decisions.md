# Architecture Decisions — codekb diff3 cleanup(Issue #1129)

上流入力(consumes全数): `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`。

## ADR-001: 既存topologyを温存しrecord-only verification / handoffを採用する

### Status

Accepted。record-only verification / handoffと既存topology温存は、leaderが2026-07-17T19:57:37Zの質問不要裁定で承認した。stage完了自体はApplication Design gateの承認前である。

### Context

Issue #1129は、共有CodeKB 2ファイルに孤立したdiff3 base fragmentが残るbranch hygieneの問題である。`requirements.md` は現branchのcontent clean、fix commitの祖先性、lifecycle done、main着地後の再計測を独立した証拠として要求する。同時にapplication / framework source、API、schema、dependency、AWS infrastructure、UIを変更せず、AIによるPR操作・main merge・Issue closeを禁止する。

`architecture.md` のone-core-many-harnessesと `component-inventory.md` の既存コンポーネントは本問題の原因ではない。`team-practices.md` はbranch検証からhuman landingへの所有権境界を既に定めている。

### Decision

既存runtime / repository topologyを変更せず、intent recordだけに検証とhandoffの証拠を追加する。証拠DAGは測定ref→marker / H2 / ancestryの独立計測→lifecycle gate→human landing→landed main再計測→Issue close eligibilityとする。

fix commit `5e92d1516ba44856f1ec039e7b1eadebbfb4c8c0` が測定refの祖先でなくても、content条件がgreenなら盲目的に再適用しない。逆に祖先であることだけでcontent cleanを宣言しない。

### Why only one option is viable

新規component / service / validatorを作る案はFR-3bとOut of Scopeに反し、本来のP3 Markdown hygieneにruntimeとmaintenance costを追加する。fixを無条件に再適用する案はFR-2bに反し、既にcleanな文書の現行本文を破壊しうる。従って、既存topologyを温存するrecord-only案だけが要件を同時に満たす。

### Consequences

#### Positive

- 対象変更をCodeKB hygieneとrecordに局所化し、application / AWS / UIの回帰リスクを追加しない。
- content、lineage、lifecycle、landingを独立に再検証できる。
- no-AI-mergeとclose-after-landing-verificationを維持する。

#### Negative

- Intent doneの時点でIssue closeまで自動完了しない。human landingとpost-landing再計測が別作業として残る。
- 新しい常時validatorを作らないため、再計測は決定的コマンドと証拠順序に依存する。

#### Neutral

- runtimeのperformance、availability、cost、security topologyは不変である。
- Decisionの可逆性は高い。将来、別Issueが常時validatorを要求する場合は、本記録と分離して設計できる。

### Alternatives Rejected

| Alternative | Benefit | Reason rejected | Reversibility |
|---|---|---|---|
| fix commitを常にcherry-pick / 再適用 | lineageを単純化できるように見える | content cleanとlineageを混同し、既存本文を再削除しうる | 中。conflict / 二重削除の復元が必要 |
| runtime validator / CI serviceを追加 | 将来のmarker再流入を常時検査できる | source / CI policy変更はIssue #1129の範囲外で、重複sensorを作る | 中。別Intentで再評価可能 |
| engine doneをIssue closeと同一視 | 手順が短く見える | main未着地・未再計測でcloseし、FR-5とhuman ownershipに反する | 低。外部状態の誤更新は不可逆性が高い |

### References

- `requirements.md` FR-1〜FR-5、NFR-1〜NFR-4
- `architecture.md` 現行one-core-many-harnessesとCodeKB境界
- `component-inventory.md` 既存コンポーネント棚卸し
- `team-practices.md` Way of Working / Testing Posture

## Decision Summary

| ADR | Decision status | Runtime topology | New service / API / AWS / UI | External operation |
|---|---|---|---|---|
| ADR-001 | Accepted (question ruling) | unchanged | none | human-owned landing and close only |
