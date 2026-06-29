# AI-DLC v2 Scope 契約改善計画

## 目的

この文書は、Amadeus DLC の `scope.md` を AI-DLC v2 guide の考え方に合わせて改善するための計画である。

この文書は計画であり、skill、template、validator、example の変更内容そのものは定義しない。

## 背景

AI-DLC v2 guide では、Scope、Depth、Test Strategy が別々の制御軸として扱われる。

Scope は、実行する stage 集合を決める。

Depth は、各 stage が作る成果物の詳しさを決める。

Test Strategy は、生成または要求するテスト量と種類を決める。

一方で、現在の Amadeus DLC の `scope.md` は、`対象`、`対象外`、`詳細度`、`検証深度`、`Inception への引き継ぎ` を同じ成果物内で扱っている。

この構造では、AI-DLC guide の Scope と Amadeus の対象境界が混ざりやすい。

その結果、後続 skill が `scope.md` を読んでも、stage 実行制御、成果物深度、検証戦略、対象境界のどれを判断入力にすべきかが曖昧になる。

## 改善方針

`scope.md` は、Intent の対象境界と実行制御を分けて扱う。

`対象` と `対象外` は、AI-DLC guide の Scope ではなく、Intent が扱う対象境界として整理する。

AI-DLC guide の Scope は、Amadeus では `実行スコープ` として扱う。

Depth は、Amadeus では `成果物深度` として扱う。

Test Strategy は、Amadeus では `検証戦略` として扱う。

この分離により、後続 skill は次の判断を分けて実行できる。

- `実行スコープ` から、どの成果物や内部プロセスを実行候補にするかを判断する。
- `成果物深度` から、成果物の詳しさを判断する。
- `検証戦略` から、検証量と証拠の粒度を判断する。
- `対象` と `対象外` から、要求、ユースケース、Unit、Bolt の境界を判断する。

## 参照元

- AI-DLC v2 guide: [Scopes, Depth, and Test Strategy](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/guide/05-scopes-and-depth.md)
- AI-DLC v2 guide: [Phases and Stages](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/guide/04-phases-and-stages.md)
- AI-DLC v2 guide: [Artifacts Reference](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/guide/14-artifacts-reference.md)
- AI-DLC v2 guide: [State Tracking and Audit Trail](https://github.com/awslabs/aidlc-workflows/blob/v2/docs/guide/10-state-and-audit.md)
- Amadeus DLC: [AI-DLC v2](../ai-dlc/aidlc-v2-ai-coding-lifecycle-ja.md)
- Amadeus DLC: [AI-DLC Concept Model](concept-model.md)
- Amadeus DLC: [ADR 0001 Lifecycle Binding / Profile](../adr/0001-lifecycle-binding-profile.md)

## 用語整理

**対象境界**：Intent が扱う対象と対象外を表す境界である。
この語は計画上の仮称であり、確定する場合は `CONTEXT.md` への反映を検討する。

**実行スコープ**：AI-DLC guide の Scope に対応する制御値である。
`feature`、`mvp`、`poc`、`bugfix`、`refactor`、`infra`、`security-patch`、`enterprise`、`workshop` のような値を扱う。

**成果物深度**：AI-DLC guide の Depth に対応する制御値である。
`minimal`、`standard`、`comprehensive` を扱う。

**検証戦略**：AI-DLC guide の Test Strategy に対応する制御値である。
`minimal`、`standard`、`comprehensive` を扱う。

## 新しい `scope.md` の構造案

`scope.md` は、少なくとも次の見出しを持つ。

```md
# スコープ

## 対象境界

### 対象

- SC-IN-001: 未確認

### 対象外

- SC-OUT-001: 未確認

## 実行制御

### 実行スコープ

- feature

### 実行対象 stage

| Phase | Stage | 理由 |
|---|---|---|
| Ideation | Scope Definition | 常に必要な対象境界と実行制御を定義するため |

### 省略 stage

| Phase | Stage | 理由 |
|---|---|---|
| 未確認 | 未確認 | 未確認 |

## 成果物深度

- standard

## 検証戦略

- standard

## Inception への引き継ぎ

- 未確認
```

`SC-IN-*` は対象境界のうち、後続成果物が満たすべき対象を表す。

`SC-OUT-*` は対象境界のうち、後続成果物が含めてはならない対象を表す。

`実行対象 stage` と `省略 stage` は、AI-DLC guide の stage 集合と Amadeus の内部 skill の差を埋めるために使う。

## 後続 skill への反映計画

### `amadeus-ideation-scope-framing`

この skill は、新しい `scope.md` 構造の作成と補修を担当する。

ユーザー入力、Intent の目的、steering layer から、対象境界、実行スコープ、成果物深度、検証戦略を分けて記録する。

判断できない項目は `未確認` として残す。

### `amadeus-ideation-feasibility-shaping`

この skill は、`実行スコープ`、`成果物深度`、`検証戦略` を読み、`ideation.md` の詳しさと未確認事項の粒度を調整する。

`対象境界` は、実現可能性、制約、依存関係の判断範囲として使う。

### `amadeus-ideation-mock-framing`

この skill は、`実行スコープ` と `対象境界` を読み、初期モックを作るべきかを判断する。

`bugfix`、`refactor`、`infra`、`security-patch` では、UI 確認が必要な場合だけ初期モックを作る。

省略する場合は、`省略 stage` または後続の追跡に理由を残す設計にする。

### `amadeus-ideation-traceability-finalization`

この skill は、Scope、Depth、Test Strategy に相当する制御値と対象境界を `traceability.md` に反映する。

Ideation gate を通す場合は、`未確認` が残る項目と後続への影響を明示する。

### `amadeus-inception-requirements-definition`

この skill は、要求ごとに関連する `SC-IN-*` を参照する。

`SC-OUT-*` に反する要求候補は採用せず、必要なら未確認事項として戻す。

要求の詳しさは `成果物深度` に合わせる。

### `amadeus-inception-interaction-modeling`

この skill は、Story と Use Case が `SC-IN-*` の範囲内にあることを確認する。

`SC-OUT-*` に触れる相互作用が必要に見える場合は、対象境界の refine に戻す。

### `amadeus-inception-execution-design`

この skill は、Unit と Bolt が `SC-IN-*` を満たし、`SC-OUT-*` を含まないことを確認する。

Unit と Bolt の粒度は、`成果物深度` と `実行スコープ` に合わせる。

### `amadeus-inception-traceability-finalization`

この skill は、Requirement、Story、Use Case、Unit、Bolt と `SC-IN-*` の対応を追跡する。

対象外混入を検出した場合は、Inception gate を `passed` にしない。

## state、decision、traceability の扱い

`state.json` は、少なくとも現在の phase と gate を保持する。

`実行スコープ`、`成果物深度`、`検証戦略` を `state.json` に持たせるかどうかは、validator 実装前に設計判断として決める。

`decisions.md` は、Scope 変更、Depth 変更、Test Strategy 変更の理由を扱う。

`traceability.md` は、対象境界と後続成果物の対応を扱う。

Inception 以降に `scope.md` を変更する場合は、影響を受ける Requirement、Story、Use Case、Unit、Bolt を確認する。

## validator 計画

validator は、最初に構造検査だけを追加する。

構造検査では、次を確認する。

- `scope.md` が新しい必須見出しを持つ。
- `実行スコープ` が許可値である。
- `成果物深度` が許可値である。
- `検証戦略` が許可値である。
- `SC-IN-*` と `SC-OUT-*` の ID が重複していない。
- `省略 stage` には理由がある。

次に、内容整合検査を追加する。

内容整合検査では、次を確認する。

- Ideation gate が `passed` の場合、制御値に `未確認` が残っていない。
- Inception 成果物が `SC-IN-*` を参照している。
- Inception 成果物に `SC-OUT-*` に反する項目がない。
- `traceability.md` に対象境界から後続成果物への追跡がある。

内容整合検査は false positive が起きやすいため、最初は警告として導入する。

gate に使う失敗条件へ昇格するかは、eval と example で確認してから判断する。

## eval 計画

eval は、skill 文言の期待動作と validator の観測可能な挙動を分けて作る。

skill eval では、次を確認する。

- `scope.md` 作成時に、対象境界、実行スコープ、成果物深度、検証戦略を分ける。
- `requirements.md` 作成時に、`SC-IN-*` と `SC-OUT-*` を参照する。
- `mock` 省略時に、省略理由を残す。

validator eval では、次を確認する。

- 許可されない `実行スコープ` を検出する。
- 許可されない `成果物深度` を検出する。
- 許可されない `検証戦略` を検出する。
- 重複する Scope ID を検出する。
- 省略理由のない stage を検出する。
- 対象外に反する Inception 成果物を検出する。

## 実施単位

### PR 1: 契約と文書の整理

対象は、`scope.md` テンプレート、`amadeus-ideation-scope-framing`、後続 skill の手順文言、設計文書である。

validator と example は変更しない。

この PR は、AI-DLC guide の Scope と Amadeus の対象境界を分けることを目的にする。

### PR 2: validator と eval の構造検査

対象は、validator、validator references、eval である。

新しい `scope.md` 構造の必須見出し、許可値、ID 重複、省略理由を検査する。

### PR 3: 内容整合検査と example 追従

対象は、validator、eval、examples である。

Inception 成果物と `SC-IN-*`、`SC-OUT-*` の整合を検査する。

example は skill で再生成できる範囲だけ更新する。

### PR 4: state と decision の扱いを確定

対象は、`state.json`、`decisions.md`、`traceability.md` の契約である。

`実行スコープ`、`成果物深度`、`検証戦略` を state に持たせるかを決める。

必要なら ADR を追加する。

## 検証計画

PR 1 では、Markdown 構造と skill 昇格後の検証を実行する。

PR 2 以降では、追加した validator eval と関連する既存検証を実行する。

examples を更新する場合は、real provider による再生成または `staleReason` の扱いを成果物ルールに合わせる。

## 未決定事項

- `実行スコープ`、`成果物深度`、`検証戦略` を `state.json` に保存するか。
- `実行対象 stage` を AI-DLC guide の stage 名で持つか、Amadeus の内部 skill 名で持つか。
- `SC-IN-*` と `SC-OUT-*` を全成果物で必須参照にするか、Requirement 以降に限定するか。
- `対象境界` を `CONTEXT.md` に正式語彙として追加するか。
- 対象外混入の検出を warning にするか、gate failure にするか。

## 次の選択肢

1. 推奨: PR 1 の範囲で契約と skill 文言だけを整理する。
2. validator 計画を先に詳細化してから PR 1 に進む。
3. state と decision の扱いを ADR として先に確定する。
