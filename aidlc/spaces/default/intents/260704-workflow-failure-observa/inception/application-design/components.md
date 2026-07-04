# Components

## 上流文脈

この component design は、`requirements`、`stories`、`team-practices` を入力として作成する。

`requirements` は、error audit、hook drop doctor、OpenTelemetry core 計装、subagent status、conductor-independent warning、parity boundary、verification evidence、audit taxonomy、PR readiness traceability を定義している。

`stories` は、Maintainer を主利用者、Agent と Reviewer を補助利用者として扱い、B001 を #431、#432、OpenTelemetry no-op default 計装の最初の delivery slice として定義している。

`team-practices` は、stdout JSON 契約、deterministic test、TypeScript strict、parity lock、`skills/` 配布境界、collector と dashboard の任意境界を定義している。

`architecture` と `component-inventory` は brownfield 時の任意入力である。

この設計では、既存の `.agents/aidlc/tools` を前提に、既存 component の詳細 inventory がある場合は差し替え可能な補助文脈として扱う。

## 設計方針

今回の設計は、独立 service ではなく `.agents/aidlc/tools` 内の modular CLI/tooling architecture として扱う。

component は source file 名ではなく能力境界で分ける。

component 間は明示的な型付き interface による同期的な in-process call で連携する。

audit、file I/O、OpenTelemetry は adapter の背後に置き、command 本体へ直接散らさない。

OpenTelemetry collector、dashboard、cloud infrastructure、always-on network export はこの設計の component にしない。

## Component 一覧

| ID | Component | 目的 | 主な要件 | 所有する境界 |
|---|---|---|---|---|
| C001 | Shared Contracts | component 間の型、status、error、evidence ref を統一する。 | R007, R008 | 型定義、JSON stdout 契約、status enum |
| C002 | Error Audit | error directive と top-level catch を `ERROR_LOGGED` として記録する。 | R001, R008 | error audit emission |
| C003 | Hook Drop Doctor | `.aidlc-hooks-health/*.drops` を読み、doctor warning に変換する。 | R002 | hook drop parsing と summary |
| C004 | Telemetry Core | command span、error span、directive/report span、doctor metrics を扱う。 | R003 | no-op default、test exporter seam |
| C005 | Subagent Status | `SUBAGENT_COMPLETED` の success、failure、unknown を分類する。 | R004, R008 | hook payload classification |
| C006 | Conductor Warning | conductor 自己申告に依存しない warning 候補を検出する。 | R005 | runtime graph、state、audit の照合 |
| C007 | Verification Traceability | Requirement、Issue、verification、PR readiness を接続する。 | R006, R007, R009 | verification evidence と PR checklist |
| C008 | Doctor Composition | doctor output の section order と表示 contract を組み立てる。 | R002, R003, R005, R009, NFR006 | `doctor` 標準表示と verbose detail |

## Component 詳細

### C001 Shared Contracts

Shared Contracts は、component 間の共通語彙を所有する。

この component は、`Status`、`EvidenceRef`、`DiagnosticFinding`、`TelemetryContext`、`JsonStdoutContract` のような型を提供する。

この component は、実装詳細や file I/O を持たない。

public API は型と pure helper に限定する。

### C002 Error Audit

Error Audit は、error directive と `aidlc-orchestrate.ts` top-level catch の記録を所有する。

この component は、audit taxonomy と emitter の対応を保ち、`ERROR_LOGGED` の required field を構築する。

stdout JSON 契約を持つ command では、human-readable diagnostics を stdout に出さない。

Audit write failure が起きても再帰しない。

### C003 Hook Drop Doctor

Hook Drop Doctor は、`.aidlc-hooks-health/*.drops` の読み取りと集計を所有する。

この component は、hook name、drop count、latest timestamp、latest reason を標準 summary として返す。

malformed file は throw ではなく warning finding として返す。

full history は verbose detail に回す。

### C004 Telemetry Core

Telemetry Core は、OpenTelemetry core 計装を所有する。

この component は、command span、error span、directive/report span、doctor metrics を扱う。

default は no-op であり、exporter が明示設定されない限り network export をしない。

test exporter seam は deterministic test のために提供する。

collector、dashboard、cloud infrastructure は所有しない。

### C005 Subagent Status

Subagent Status は、hook input の信頼できる status field を分類する。

success、failure、unknown を明示的に扱う。

free text から success または failure を推測しない。

既存 audit row に status がなくても読める互換性を保つ。

### C006 Conductor Warning

Conductor Warning は、doctor warning として表面化する不整合候補を所有する。

対象は、run-stage と report の mismatch、in-flight stage abandonment、runtime graph と audit の contradiction である。

この component は state を変更しない。

warning は hard error ではなく、Maintainer または Agent の確認対象として返す。

### C007 Verification Traceability

Verification Traceability は、Requirement、Issue、verification、PR readiness の対応を所有する。

この component は、R001-R009 に対する evidence item を集約し、PR checklist と Intent artifact へつなげる。

この component は evidence の read-only consumer であり、Error Audit や Subagent Status から呼ばれない。

parity failure がある場合は、failure reason と resolution path を trace に含める。

`engineFileExceptions` の変更は、この component の責務ではなく、人間承認の証拠を参照するだけにする。

### C008 Doctor Composition

Doctor Composition は、doctor output の section order と表示 contract を所有する。

標準表示は summary、critical warnings、hook drops、engine errors、subagent status、OpenTelemetry core、links の順にする。

verbose detail は標準表示から分離する。

directive/report の JSON stdout contract と doctor の human-readable output を混同しない。

## Component 所有境界

| Component | Owns | Does not own |
|---|---|---|
| Shared Contracts | 共通型、status enum、evidence ref | audit 書き込み、file read |
| Error Audit | `ERROR_LOGGED` 構築、audit adapter 呼び出し | telemetry exporter、doctor 表示 |
| Hook Drop Doctor | drops file の集計、malformed warning | hook 実行そのもの |
| Telemetry Core | span/metric facade、no-op default、test seam | collector、dashboard、cloud export |
| Subagent Status | status 分類、unknown fallback | subagent 実行制御 |
| Conductor Warning | warning 候補検出 | state mutation |
| Verification Traceability | evidence map、PR checklist | CI 実行そのもの、merge 判断 |
| Doctor Composition | doctor 表示順、section assembly | 個別 check の内部判定 |

## Public Interface 境界

全 component の public interface は TypeScript の型付き関数として定義する。

component 間で shared mutable state を共有しない。

file-backed data は adapter 経由で読み書きする。

OpenTelemetry は facade 経由で呼び出し、各 command が直接 exporter を扱わない。

## Out of Scope

OpenTelemetry collector deployment は設計しない。

dashboard hosting は設計しない。

cloud telemetry export infrastructure は設計しない。

production AWS topology は設計しない。

`skills/` direct edits は設計しない。

`.coderabbit.yml` または `.coderabbit.yaml` の変更は設計しない。

## Traceability

| Component | Requirements | Stories | Verification focus |
|---|---|---|---|
| C002 Error Audit | R001, R008 | US001 | error audit fixture、stdout JSON parse |
| C003 Hook Drop Doctor | R002 | US002 | drops fixture、doctor output assertion |
| C004 Telemetry Core | R003, NFR002, NFR003 | US003 | no-op default no-send、test exporter |
| C005 Subagent Status | R004, R008 | US004 | hook status fixture matrix |
| C006 Conductor Warning | R005, NFR006 | US005 | state/audit contradiction fixture |
| C007 Verification Traceability | R006, R007, R009 | US006, US007, US009 | validator、test result、parity、PR checklist |
| C008 Doctor Composition | R002, R003, R005, R009 | US002, US003, US005, US009 | section order、copyable evidence path |

## Review

Verdict: READY
Reviewer: aidlc-architecture-reviewer-agent
Date: 2026-07-04T05:56:09Z
Iteration: 2

| Severity | Finding | Evidence | Required action |
|---|---|---|---|
| None | 前回の循環依存指摘は解消されている。 | `component-dependency.md` の Dependency Matrix では `Error Audit -> Verification Traceability` と `Subagent Status -> Verification Traceability` が `no` である。`Verification Traceability` から `Error Audit` と `Subagent Status` への依存だけが残り、Acyclic Dependency Rule でも evidence source 側への片方向依存として説明されている。 | None |
| None | `Verification Traceability` は evidence の read-only consumer として表現されている。 | `components.md` は `Verification Traceability` を evidence の read-only consumer と明記している。`component-dependency.md` の Data Flow も `Error Audit read adapter as read-only evidence` と `Subagent Status evidence as read-only evidence` を使っている。 | None |
| None | component、method group、logical service、ADR の対応は実装者向けに閉じている。 | `component-methods.md` の `Implementation Mapping` は `Cnnn -> method group -> Snnn -> ADR-nnn` を持つ。`services.md` の `Component and Method Mapping` は logical service ごとの component、method group、ADR を示す。`decisions.md` の Decision Summary は ADR ごとに component、logical service、method group を対応付けている。 | None |
| None | OpenTelemetry の core 境界は維持されている。 | `components.md`、`services.md`、`decisions.md` は OpenTelemetry core 計装を `Telemetry Core` / `Telemetry Core Service` / `ADR-002` として扱い、collector、dashboard、cloud export、always-on export を範囲外にしている。 | None |
| Minor | `C008 Doctor Composition` の trace は実装を止める矛盾ではない。 | `components.md` の Component 一覧は `C008` に `R009` と `NFR006` を含めている。Traceability 表は `R009` を含み、前回指摘の R009 欠落は解消しているが、`NFR006` は同じ行には併記されていない。`C006` と `services.md` 側で `NFR006` は保持されているため、建築判断の追加は不要である。 | None |
| None | `skills/` 配布物境界と `.coderabbit.yml` / `.coderabbit.yaml` の非変更境界は守られている。 | `components.md` と `component-dependency.md` は `skills/` direct edits と `.coderabbit.yml` / `.coderabbit.yaml` の変更を out of scope または依存関係外として明記している。 | None |

Summary:
- Amadeus validator は `260704-workflow-failure-observa` に対して pass した。
- 前回の blocker だった循環依存は解消され、`Verification Traceability` は read-only consumer として設計されている。
- component ID、service ID、ADR、method group の相互参照は、developer が実装に入れる粒度まで具体化されている。
- 残る `C008` の `NFR006` 表記差分は軽微であり、READY 判定を妨げない。
