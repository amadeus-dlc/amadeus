# Architecture Decisions — Election CLI 多問対応

## Context

[Requirements](../requirements-analysis/requirements.md)、CodeKB の [Architecture](../../../../codekb/amadeus/architecture.md)、[Component Inventory](../../../../codekb/amadeus/component-inventory.md) を根拠に、Issue #2813 の主要な可変点を3件の ADR として固定する。

## ADR-1: Election が stable ID 付き questions を直接所有する

Status: Accepted

### Context

複数 question を一つの Election として投票・監査し、成立済み問を固定したまま保留問だけを再実行する必要がある。現行 transport/store は voter ごとの view/ballot と Election directory を境界にしている。

### Options

- Option A — direct aggregate: 一つの Election が `questions[]` を所有。既存 directory/voter/transport 境界を維持できる。aggregate 型の横断変更は必要。可逆性は中。
- Option B — child Election bundle: 単問実装を再利用しやすいが、親子の atomicity、mixed result、cross-child preservation、配送重複が新たに必要。可逆性は低。

Recommendation: Option A。要件の「一つの Election」と既存の単一 writer 境界へ自然に適合し、分散整合を追加しないため。

### Decision

Option A を採用する。`ElectionV2.questions[]` は definition 順を canonical ordering とし、`questionId` は Election 内一意かつ全境界で不変とする。choice `internalNo` の一意性は question 内に限定する。

### Consequences

- model、ballot、tally、record、formal model の cardinality を一貫して変更する必要がある。
- transport invocation 数は voter 数のままで増えない。
- child Election lifecycle と親子 transaction は不要。

### Alternatives Rejected

Option B は mixed state と established preservation を directory 間で再実装するため棄却した。CLI 表示だけの多問化は domain/persistence 要件を満たさない。

### Reversibility

中。canonical v2 が保存された後の bundle 方式への移行は migration を要するが、question ID と result を保持すれば変換可能。

## ADR-2: Versioned dual-read と canonical v2-only write

Status: Accepted

### Context

legacy single-question data を意味的に読み続ける一方、新しい内部演算を legacy/new union で汚染せず、read-only 操作で既存ファイルを書き換えてはならない。

### Options

- Option A — boundary normalization: model/store decoder が legacy/new を判別し canonical v2 へ正規化。新規 write は v2 のみ。変更は decoder に集中。可逆性は高。
- Option B — eager migration: 起動時または open 時に全既存データを書き換える。内部は単純だが append-only、rollback、read-only 契約を破る。可逆性は低。
- Option C — dual internal model: 各 command が legacy/new を分岐。短期変更は小さく見えるが分岐が全層へ拡散。可逆性は低。

Recommendation: Option A。FR-COMP-1/2、NFR-3、既存 store の信頼境界を最小の分岐面で満たすため。

### Decision

schema v2 は明示的 `schemaVersion: 2` と `questions[]` / `responses[]` / `results[]` を持つ。legacy scalar は decoder 内だけで予約 ID `legacy-question` へ持ち上げる。disk read と external input は同じ canonical validators を使う。migration fidelity は移動前後の canonical digest を比較する。

### Consequences

- decoder の round-trip と reject property を独立して検証する必要がある。
- raw `JSON.parse as T` を load/status/tally/verify から除去する。
- 新規 write の byte shape は旧形式と一致しないが、意味互換は保たれる。

### Alternatives Rejected

Option B は破壊的 bulk migration と read-only 不変条件に反する。Option C は invalid state の構築経路とテスト組合せを増やす。

### Reversibility

高。decoder と encoder は境界に閉じ、canonical schema の次 version も同じ pattern で追加できる。

## ADR-3: Question-granular result、immutable run history、CLI orchestration

Status: Accepted

### Context

一部 established・一部 hold を保存し、rerun では hold question だけを対象にしなければならない。既存の単一 `TallyResult` と global `hold`、上書き `tally.json` だけでは結果不変性を監査できない。

### Options

- Option A — current snapshot + immutable runs: model は question results、store は `tallies/<runId>.json` と `tally.json`、CLI は target IDs/digest directive を所有。監査性が高く既存 current read path を維持。可逆性は中。
- Option B — current snapshot overwrite only: 実装量は小さいが、過去 result と established 不変性を disk から証明できない。可逆性は高だが要件不足。
- Option C — event sourcing 全面化: 完全な履歴を得るが、既存 store/CLI 全体を再設計し、この Intent に過剰。可逆性は低。

Recommendation: Option A。必要な append-only 証拠だけを追加し、全面 event sourcing を避けるため。

### Decision

`QuestionResult[]` を definition 順で保存する。各 tally run は target IDs、全 current results、preserved established digest、talliedAt を持つ immutable file とする。`tally.json` は最新 canonical snapshot。hold が残る lifecycle を `partial` とし、`next` directive は `held[]`、`targetQuestionIds`、`preservedResultDigest` を返す。再投票と amend は target question だけを許可する。

### Consequences

- store に runId idempotency と snapshot repair が必要。
- record/verify は current snapshot だけでなく history fold を照合する。
- CLI state machine は global terminal と question-level result を分離する。
- established result の canonical digest を before/after で機械比較できる。

### Alternatives Rejected

Option B は FR-COMP-3 と FR-RER-2 の永続証拠がない。Option C は既存 append lanes を全面置換し、要求範囲を超える。

### Reversibility

中。immutable run は追加データであり無視可能だが、一度監査証拠として発行した run を削除する変更は互換性判断を要する。

## 決定の追跡

| Decision | 主な要件 |
|---|---|
| ADR-1 | FR-DEF-1〜4、FR-BAL-1/2、FR-TAL-1〜4 |
| ADR-2 | FR-COMP-1/2/4、NFR-3/4 |
| ADR-3 | FR-RER-1〜4、FR-COMP-3、FR-OBS-1、NFR-4 |

ADR を要しないが実装で必須の constraint として、FR-NORM-1/2 は verification suite が所有する。検証済み挙動を根拠に `cid:requirements-analysis:always-elect` を更新し、active memory の source scan で旧 workaround 語彙の非再出現を確認する。

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-13T11:44:22Z
- **Iteration:** 1
- **Scope decision:** none

### Findings

- None. コンポーネント依存は一方向で循環がなく、canonical decode、mixed lifecycle、immutable run、hold-only rerun、late response、norm 更新まで要求上の所有先が解決されている。

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| required-sections | PASS: 5成果物すべて H2 2件以上 | 成果物の最低構造を満たす |
| upstream-coverage | PASS: 5成果物すべて requirements / architecture / component-inventory を参照 | 上流追跡に欠落なし |
| answer-evidence | PASS: evidence-present | full autonomy の E-OC1 根拠を確認 |
| question-budget | PASS: 6 / Standard ceiling 8 | 質問予算内 |
| relative-link check | PASS: 7 Markdown files | 壊れたローカル参照なし |

### Summary

既存の layered modular CLI 境界を維持しながら、stable question ID を全永続・実行面へ通す設計になっている。開発者が domain、store、CLI、record、formal verification の責務を推測せず実装できるため READY とする。
