# User Flow

## Upstream Context

この User Flow は、`intent-statement`、`scope-document`、`intent-backlog` を上流成果物として読む。

対象ユーザーは、Amadeus maintainer、AI-DLC workflow を実行する agent runner、PR reviewer、CI 監視担当者である。
この flow は、失敗発生後に会話ログだけへ閉じず、audit、doctor、OpenTelemetry 計装 evidence、Intent artifact、PR 説明へ接続する導線を扱う。

## System Interaction Diagram

```text
+-------------+      +-------------+      +-------------+
| AI-DLC CLI  |----->| Audit       |----->| Intent      |
| next report |      | evidence    |      | artifacts   |
+-------------+      +-------------+      +-------------+
       |                    |                    |
       v                    v                    v
+-------------+      +-------------+      +-------------+
| Hooks       |----->| Doctor      |----->| PR Summary  |
| drops       |      | surface     |      | evidence    |
+-------------+      +-------------+      +-------------+
       |                    ^
       v                    |
+-------------+             |
| OTel Core   |-------------+
| no-op span  |
+-------------+
```

<!-- Text fallback: AI-DLC CLI の失敗は audit evidence と hooks drops に残り、doctor が表面化し、OpenTelemetry core 計装が分析境界を提供し、Intent artifacts と PR Summary へ接続する。 -->

## Primary Flow

Flow: failure evidence inspection

Persona: AI-DLC workflow を実行する agent runner。

Trigger: workflow 実行中に error directive、hook drop、subagent status ambiguity、conductor-independent warning のいずれかが発生する。

Steps:

1. `AI-DLC CLI` で失敗または warning が発生する。
2. system は audit evidence、hook drop、OpenTelemetry no-op default 計装境界のいずれかに証拠を残す。
3. user は `doctor` を実行する。
4. `doctor` は summary を最初に表示する。
5. `doctor` は warning と evidence path を表示する。
6. user は audit shard または Intent artifact の path を辿る。
7. user は PR 説明に検証結果と evidence path を記録する。

Success outcome: user は失敗の種類、根拠、次の確認先、PR に書くべき evidence を terminal と markdown artifact から把握できる。

## Failure-Specific Flows

### Engine Error Flow

```text
+-------------+      +-------------+      +-------------+
| Error       |----->| ERROR_LOGGED|----->| Doctor      |
| directive   |      | audit row   |      | engine err  |
+-------------+      +-------------+      +-------------+
       |                                        |
       v                                        v
+-------------+                         +-------------+
| OTel error  |                         | PR evidence |
| span        |                         | summary     |
+-------------+                         +-------------+
```

<!-- Text fallback: engine error は audit の `ERROR_LOGGED` と OpenTelemetry error span に残り、doctor の engine error section と PR evidence summary に接続する。 -->

Error paths:

| Condition | User-facing handling | Recovery |
|---|---|---|
| audit write fails | stdout JSON 契約を優先し、doctor で audit write failure を warning として表示する。 | audit write path と permission を確認する。 |
| OpenTelemetry exporter unset | no-op default と表示する。 | exporter が必要な後続 Intent で設定する。 |

### Hook Drop Flow

```text
+-------------+      +-------------+      +-------------+
| Hook fails  |----->| drops file  |----->| Doctor      |
| fail open   |      | health dir  |      | hook drops  |
+-------------+      +-------------+      +-------------+
                                             |
                                             v
                                      +-------------+
                                      | OTel metric |
                                      | hook drops  |
                                      +-------------+
```

<!-- Text fallback: hook drop は `.aidlc-hooks-health/*.drops` に残り、doctor が件数と最新理由を表示し、OpenTelemetry metric の境界にも接続する。 -->

Error paths:

| Condition | User-facing handling | Recovery |
|---|---|---|
| drops file is malformed | malformed file として warning 表示する。 | file path と latest parse error を確認する。 |
| many drops exist | summary に件数を出し、詳細は hook section に畳む。 | retention は後続 Intent で扱う。 |

### Subagent Status Flow

```text
+-------------+      +-------------+      +-------------+
| Subagent    |----->| Hook input  |----->| Audit event |
| completes   |      | status      |      | completed   |
+-------------+      +-------------+      +-------------+
       |                    |                    |
       v                    v                    v
+-------------+      +-------------+      +-------------+
| Status ok   |      | Status none |      | Doctor      |
| use field   |      | unknown     |      | subagent    |
+-------------+      +-------------+      +-------------+
```

<!-- Text fallback: subagent の hook input に信頼できる status があれば audit event に `Status` を追加し、なければ unknown として doctor に表示する。 -->

Error paths:

| Condition | User-facing handling | Recovery |
|---|---|---|
| status is unavailable | `unknown` と表示する。 | `Message` から推測しない。 |
| status conflicts with payload | warning として表示する。 | hook payload fixture を確認する。 |

### Conductor Warning Flow

```text
+-------------+      +-------------+      +-------------+
| Runtime     |----->| Mismatch    |----->| Doctor      |
| graph       |      | signal      |      | warning     |
+-------------+      +-------------+      +-------------+
       ^                                        |
       |                                        v
+-------------+                         +-------------+
| Audit       |                         | Intent path |
| outcomes    |                         | next check  |
+-------------+                         +-------------+
```

<!-- Text fallback: runtime graph と audit outcome の不整合を warning として doctor に表示し、Intent path と次の確認先を示す。 -->

Error paths:

| Condition | User-facing handling | Recovery |
|---|---|---|
| false positive suspected | hard error ではなく warning として扱う。 | audit と state を確認する。 |
| repeated warning | PR または後続 Issue で hard error 化を判断する。 | false positive 率を観察する。 |

## PR Evidence Flow

PR 説明に書く evidence は、doctor の `LINKS` と Intent artifact から取得する。

```text
+-------------+      +-------------+      +-------------+
| Doctor      |----->| Intent      |----->| PR          |
| links       |      | artifacts   |      | description |
+-------------+      +-------------+      +-------------+
```

<!-- Text fallback: doctor の links から Intent artifacts へ辿り、PR description に対象 Issue、Intent path、検証結果、OpenTelemetry 計装 evidence を記録する。 -->

## Out of Scope Flow

次の flow は、この stage では作らない。

| Flow | Reason |
|---|---|
| Web dashboard | `scope-document` で collector と dashboard は scope out と決めたため。 |
| collector UI | OpenTelemetry exporter の運用は後続 Intent に分けるため。 |
| 常時ネットワーク送信画面 | no-op default を MVP 境界にするため。 |
| `skills/` 直接編集導線 | `skills/` は配布物境界であるため。 |
| `.coderabbit.yml` 変更導線 | 人間の明示許可がないため。 |
