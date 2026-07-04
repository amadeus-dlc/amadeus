# Personas

## Upstream Context

この personas は、`requirements.md`、`team-practices.md`、`actors.md`、`user-stories-questions.md` を入力にして作成する。

`requirements.md` は、失敗証拠、doctor warning、OpenTelemetry core 計装、検証証拠、PR readiness の必要性を定義している。

`team-practices.md` は、最初の Bolt を #431 engine error audit、#432 hook drop doctor、OpenTelemetry no-op default 計装の縦断 slice にする方針を定義している。

`business-overview` と `component-inventory` は brownfield 時の optional context であり、この personas では既存の actor と tooling surface を補足する文脈として扱う。

回答では、Maintainer を primary persona とし、Agent と Reviewer を supporting personas とする方針が選ばれた。

## Persona Registry

| ID | Persona | Priority | Role | Goals | Pain points | Operating context |
|---|---|---|---|---|---|---|
| P001 | Maintainer | Primary | Amadeus 本体の方針、PR、merge 判断を行う。 | 失敗原因、検証結果、PR readiness を短時間で判断する。 | 会話ログだけに失敗が残ると、判断根拠を再構成する必要がある。 | approval gate、PR 作成前、CI failure 対応、review comment 対応で参照する。 |
| P002 | Agent | Supporting | AI-DLC workflow、validator、skill、docs、tooling 変更を提案または実行する。 | workflow 実行中に失敗を記録し、doctor と audit から次の行動を判断する。 | stdout JSON、audit、runtime graph、hook drop、telemetry の境界を混同しやすい。 | stage 実行中、doctor 実行時、実装前検証、PR 準備時に参照する。 |
| P003 | Reviewer | Supporting | PR の妥当性、検証、コメント対応を確認する。 | Issue、Requirement、verification、PR の対応関係を追跡する。 | 変更範囲と検証証拠が分かれていると、レビュー判断に時間がかかる。 | PR review、CI failure 確認、traceability 確認、scope boundary 確認で参照する。 |

## Persona Details

### P001 Maintainer

Maintainer は、この Intent の primary persona である。

Maintainer は、失敗可観測性の改善が core scope に入るか、PR が merge 可能か、次の Bolt に進めるかを判断する。

Maintainer の主な成功条件は、Issue #431、#432、#433、#435 と Requirement R001-R009 が、検証証拠と PR readiness に接続されていることである。

Maintainer の pain point は、workflow 失敗が会話ログだけに残り、audit や doctor から再現できないことである。

Maintainer は高い技術理解を持つが、判断時には実装詳細よりも、失敗証拠、検証結果、scope boundary、例外理由を必要とする。

### P002 Agent

Agent は、この Intent の supporting persona である。

Agent は、AI-DLC の stage 実行、doctor、validator、TypeScript CLI 実装、PR 準備を担当する。

Agent の主な成功条件は、error directive、top-level catch、hook drop、subagent outcome、runtime graph mismatch、OpenTelemetry no-op default を、stdout JSON 契約を壊さず扱えることである。

Agent の pain point は、配布物境界、parity lock、audit taxonomy、OpenTelemetry exporter 境界を同時に守る必要があることである。

Agent は高い技術理解を持つが、stage 実行中には、何を記録し、何を warning にし、何を out of scope にするかを即座に判断できる cue を必要とする。

### P003 Reviewer

Reviewer は、この Intent の supporting persona である。

Reviewer は、PR で示された変更が Issue と Requirement に対応し、検証証拠が十分で、scope creep がないことを確認する。

Reviewer の主な成功条件は、PR 説明または Intent artifact から、Issue、Requirement、story、verification、parity 状態、out-of-scope 項目を追えることである。

Reviewer の pain point は、CI failure、review comment、traceability gap が同時に存在すると、どれを先に扱うべきか判断しにくいことである。

Reviewer は高い技術理解を持つが、レビュー時には、story ごとの acceptance と検証証拠が整理されていることを必要とする。

## Persona Relationships

Maintainer は、Agent が作成した audit、doctor、telemetry、verification の証拠を使って PR readiness を判断する。

Agent は、Maintainer の判断に必要な証拠を workflow と tooling の実行時に残す。

Reviewer は、Maintainer の判断と Agent の実装結果が、Issue と Requirement に対して過不足ないことを確認する。

この関係では、Agent が証拠を生成し、Reviewer が証拠の接続性を検査し、Maintainer が採用または merge readiness を判断する。

## Experience Needs

Maintainer には、標準出力の noise ではなく、audit row、doctor warning、PR traceability の形で判断材料を提示する必要がある。

Agent には、失敗時に何を audit に残し、何を doctor warning として表面化し、何を telemetry に載せるかを迷わない設計が必要である。

Reviewer には、story、Requirement、Issue、verification が一対多で追える traceability が必要である。

全 persona に共通して、OpenTelemetry collector、dashboard、cloud infrastructure、always-on export、`skills/` direct edit、unauthorized `.coderabbit.yml` changes が今回の範囲外であることを明示する必要がある。

## Priority Ranking

| Rank | Persona | Reason |
|---|---|---|
| 1 | Maintainer | PR readiness と次の Bolt へ進む判断を担うため。 |
| 2 | Agent | 失敗証拠と検証証拠を実際に生成するため。 |
| 3 | Reviewer | Issue、Requirement、verification の接続性を確認するため。 |

## Traceability

| Persona | Related requirements | Related issues or sources | Main evidence needed |
|---|---|---|---|
| Maintainer | R001, R002, R003, R005, R006, R007, R009 | #431, #432, #435, user correction | audit row、doctor output、validator、test result、parity result、PR checklist |
| Agent | R001, R002, R003, R004, R005, R006, R007, R008 | #431, #432, #433, #435, user correction | deterministic tests、stdout JSON parse、no-op telemetry test、audit fixture |
| Reviewer | R006, R007, R008, R009 | #431, #432, #433, #435 | traceability matrix、taxonomy compatibility、scope boundary list |
