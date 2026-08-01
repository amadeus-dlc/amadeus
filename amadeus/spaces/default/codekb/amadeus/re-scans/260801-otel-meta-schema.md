# 260801-otel-meta-schema 差分スキャン記録

## 実行メタデータ

- Date: `2026-08-01T01:07:56Z`
- Repository: `amadeus-dlc/amadeus`
- Base commit: `6e7a9d701`
- Observed commit: `9c8df859ef0492b6fbc82f26d931a1558277faaa`
- Distance: `56 commits`
- Ancestry: `6e7a9d701` は observed の祖先（`git merge-base --is-ancestor 6e7a9d701 HEAD` exit 0）
- Scope: `amadeus-feature` / Brownfield / single repository
- Scan mode: Developer static live-code scan を上流入力にした differential refresh。Architect が主要主張を observed commit で独立再確認。テスト未実行
- Focus: [#1868](https://github.com/amadeus-dlc/amadeus/issues/1868) — OTel メタ情報スキーマ v1 の実装のための技術断面確定

本節の file:line・件数はすべて observed `9c8df859e` 時点（`cid:reverse-engineering:measurement-ref-in-artifacts`）。

## Base 選定根拠

前 intent（260731-open-bug-batch-4）の observed `6e7a9d701` は `origin/main` 系譜のコミット（`record: sync intent 260730-open-bug-batch-3 completion (3 bug fixes) (#1815)`）であり、現 HEAD の祖先性が保たれている。`cid:reverse-engineering:rescan-base-ancestry` に従い、日付の新しさではなく祖先性を先に実測してから採用した。

| 記録済み observed | 出自 intent | `git merge-base --is-ancestor <observed> HEAD` |
| --- | --- | --- |
| `6e7a9d701` | 260731-open-bug-batch-4 | **exit 0（祖先）**、距離 `56` |

## 区間の性質 — 実質は新設サブシステムの初回スキャン

base `6e7a9d701` の時点で `packages/framework/core/otel/` は**存在しない**:

```
$ git cat-file -e 6e7a9d701:packages/framework/core/otel/tracer-provider.ts
fatal: path '...' exists on disk, but not in '6e7a9d701'
```

本区間（56 commits）は OTel v1 実装プログラム（#1672 系）の全体を含む。したがって「差分リフレッシュ」の形式を取りつつ、内容は新設サブシステム 18 モジュール / 4,123 行の初回スキャンである。

区間規模（`git diff --shortstat 6e7a9d701 HEAD`）: `3436 files changed, 177199 insertions(+), 18066 deletions(-)`。面別内訳（`git diff --numstat` の機械集計）:

| 面 | files | insertions | deletions |
|---|---|---|---|
| `dist/` | 1484 | +77091 | −8274 |
| self-install | 1060 | +55067 | −5911 |
| `amadeus/` record | 459 | +17893 | −12 |
| `metrics/` | 5 | +288 | −2 |
| **ソース面** | **428** | **+26860** | **−3867** |

## 区間の主要変化

| コミット | 内容 |
|---|---|
| `42dc68988`（#1678） | Phase 1 walking skeleton — Providers / Local Exporters / vendored OTel API |
| `e37f81094`（#1703） | event registry 78語彙 + drift guard |
| `5ad0a1d04`（#1705） | W3C Trace Context の subprocess / hooks / sensors 伝播 |
| `fe2e0480c`（#1719） | Local Exporters の production 化 |
| `d60f73208`（#1731） | fail-open diagnostic log |
| `f8f87c797` | metrics API subset（U9） |
| `a169e5e9b` | Projector → 転送専用 OTLP Relay へ縮退（U11） |
| `fc94b38ba` | 共有 bootstrap seam（`otel/bootstrap.ts`）+ subprocess span ラッパ（Bolt M-P） |
| `559c84b01` | audit-emit 系 29 site の canonical 移行 + registry required/optional 全数再設計（Bolt G1） |
| `a59b41870` | targeting / アトミック系 call site の canonical 移行（Bolt G2） |
| `1a6dac8b7` | migrate / mirror-lifecycle / plugin の subprocess 境界を Trace API span へ（Bolt G3） |
| `5d912e0dd`（#1844） | 旧 audit writer 削除 — 削除ゲート6条件 GREEN。canonical emit 経路が唯一の書き手に |
| `67ca151b5` ほか | perf tier 分離（実時間ベンチを `--ci` から分離） |
| `37dbc18eb` | 統合 patch-coverage 54 行を in-process seam で解消 |

## 独立再確認の結果

Developer 報告の**所在・機序・結論は主要主張すべて一致**。以下は実測した確認内容と、相違・精密化した6点。

### 一致を確認した主要主張

| 主張 | 検証コマンド / 実測 |
|---|---|
| resource は 1 箇所の literal のみ | `grep -rn 'telemetry.sdk.language\|"service.name"' packages/framework/core --include='*.ts' \| grep -v vendor` → 1 hit（`tracer-provider.ts:137`） |
| `registerMeterProvider` は production 未呼出 | canonical grep の hit は `meter-provider.ts` 内の定義・throw のみ。呼出しはテスト3ファイル |
| PreToolUse hook が存在しない | `settings.json.example` の宣言イベントは `UserPromptSubmit`(:23) / `SessionStart`(:34) / `SessionEnd`(:49) / `PostToolUse`(:60) / `SubagentStop`(:113) / `Stop`(:124) |
| exception は message のみ | `tracer-provider.ts:156` の `addEvent(EXCEPTION_SPAN_EVENT_NAME, { "exception.message": message }, time)` |
| 78-pin ガード集合 | `durability: "canonical"` 78 / `"telemetry"` 2 / def 総数 80（`grep -o` の機械集計） |
| safe-key は registry から機械導出 | `redaction.ts:65-71` `REGISTRY_ATTRIBUTE_KEYS`（required∪optional から `Command` 除外） |
| 二重モジュールグラフ | dist 直 import 44 ファイル / canonical 直 import 6 ファイル |

### 相違・精密化した6点

1. **コミット数** = 56（報告 55）。`git log --oneline 6e7a9d701..HEAD | wc -l`
2. **`EXPECTED_CANONICAL_COUNT` の所在** = `event-registry.ts:77`（報告 `:79`）
3. **「redaction は span event 属性を通らない」は write-time に限れば正、export 境界では誤**。`local-span-exporter.ts:93` が `events[].attributes` を `redactAttributes` に通す。報告自身が後段で「safe-key に載せないと default-deny で丸ごと落ちる」と export 境界の存在を前提にした記述をしており、内部的にも不整合
4. **`resource` は export 境界の `redactRecord`（`local-span-exporter.ts:88-99`）の対象外**。`attributes` / `events[].attributes` / `links[].attributes` は通すが `resource` はスプレッドで素通りする。報告は Relay 側の扱いのみ言及していた。Relay（`relay.ts:298-312`）は値を `scrubCredentials` するが**キーの default-deny admission を意図的に迂回**する（`:294-297` のコメントが理由を明記）。→ resource は現在「ローカルストアで無処理・OTLP 送出時のみ値スクラブ」の一層構造であり、#1868 設計原則4 は未達
5. **78-pin は drift test 内で 5 箇所**（報告 4 箇所）。`event-registry-drift.test.ts:51-54` の 4-set に加え `:192` の `vocab.length` 78 pin が独立に存在
6. **ハーネス注入チャネルは 4 様式**（報告 3 様式）。追加は **packager 生成データファイル `tools/data/harness.json`** — `scripts/package.ts:206-214` `writeHarnessData()` が各 dist へ書き出す（canonical の `core/tools/data/` は `scaffold` / `templates` のみ、dist 7ツリーすべてに実在を確認）。コメント `:207-208`「the object shape leaves room for future per-harness runtime facts」が拡張余地を明記。読み手は `amadeus-harness.ts:121-133` `shippedRulesSubdir()`。同型の packager 生成物に `<harnessDir>/VERSION`（`writeVersionFile()`、`package.ts:200-202`）

### 独立検証で追加した所見

**セッション相関の片側欠落**: `amadeus.session.started` / `.resumed` の def（`event-registry.ts:245-262`）は `requiredAttributes: ["Source"]` / `optionalAttributes: []` で、セッション ID を属性として持たない。#1868 §1 は `session.id` を「SESSION_STARTED 監査行との突合キー」と位置づけるが、監査行側に突合対象のキーが存在しないため、resource への追加だけでは相関が片側にしか立たない。registry への optional 属性追加が対になる（属性追加のみなら cardinality pin は不動）。

## #1868 の6面と患部

| 面 | 主患部 | 難度 | 依存 |
|---|---|---|---|
| §1 resource | `tracer-provider.ts:137`、`bootstrap.ts:84-116` | 中 | なし（最上流） |
| §2 span attributes | `tracer-provider.ts:90-97`、様式は `subprocess-span.ts:80-87` | 低〜中 | なし |
| §3 log attributes | — | ゼロ | 変更なし |
| §4 exception | `tracer-provider.ts:145-157`、`event-registry.ts:827-837` | **低** | なし |
| §5 subagent | `settings.json.example`（PreToolUse 新設）、`core/hooks/`（実装新設）、`event-registry.ts:476-484` | **中〜高** | §2（lifetime スパン分） |
| §6 metrics | `bootstrap.ts`（arm 新設）、`meter-provider.ts:50-79` | 中〜高 | **§1** |

§1 が §6 の前提である以外は疎。ただし §1 / §2 / §4 はいずれも `tracer-provider.ts` を触るためファイル単位では交差する（`cid:code-generation:c6` の非交差判定は静的目録でなく実 diff で行う）。

## 属性・イベント追加で触るガード全数

canonical イベントを1件足すと 78→79 になり、以下が同時に赤くなる:

1. `packages/framework/core/otel/event-registry.ts:77` — `EXPECTED_CANONICAL_COUNT`（正本）
2. `tests/integration/event-registry-drift.test.ts:51-54`（4-set）+ `:192`（`vocab.length`）
3. `tests/unit/t28-audit-event-sync.test.ts:72,175-176`
4. `packages/framework/core/tools/amadeus-audit.ts:56` — `VALID_EVENT_TYPES` 本体
5. `tests/integration/t-otel-event-registry.test.ts` — 全数の FR-EVT-7 契約
6. `tests/integration/t381-registry-emitter-parity.test.ts` — emitter/registry 全数パリティ
7. `tests/integration/t385-emitter-registry-admission.test.ts` — static admission。解析不能サイトは `UNRESOLVED_SITES`（`:70`）へ列挙必須、`:398` の `toEqual` が完全一致を要求
8. `tests/integration/t48-audit-event-emitters.test.ts` — emitter 網羅
9. `.claude/sensors/amadeus-event-registry-drift.md` + `core/tools/amadeus-sensor-event-registry-drift.ts` — ゲート時の再抽出
10. `event-registry.ts:883-897` `assertRegistryConsistent` — ランタイム自己検査

**telemetry 分類（`auditEvent: null`）なら 1-4 は不動**（`assertRegistryConsistent` が canonical のみ数える）。先例は `exception`（`:827-837`）と `amadeus.diagnostic.note`（`:817-826`）。ただし #1868 §5 の `amadeus.subagent.started` は canonical 指定のためこの回避は使えない。

**属性追加のみ**（§4 exception、§1 の session.id を session イベントへ）なら cardinality は不動で、影響は 7 と `tests/unit/t-otel-redaction.test.ts:35,44-45`（safe-key∪optIn の集合 assert）に限られる。

## 実装時の注意

- core の `otel/` を触ったら `bun scripts/package.ts` + `bun run promote:self` を同一変更で回す。テスト 44 ファイルが dist を読むため、再生成漏れは偽グリーンを作る。dist 再生成は7ハーネス全数（`cid:build-and-test:bt-dist-regen-seven-harnesses`）
- 落ちる実証の注入は**テストが実際に読む面**へ（`cid:code-generation:injection-surface-verify`）。otel 系は大半が dist を読むため canonical への注入は不発
- 型注釈・型 union のみの変更はランタイム消去で赤くならない（`cid:code-generation:inject-runtime-consumed-lines`）。registry の `optionalAttributes` は実行時配列なので注入面として有効
- 実 FS を触るテストは integration 層へ（`cid:code-generation:fs-tests-integration-first`）
- リセットシームへの追加: resource をプロセス単位でキャッシュする実装を入れる場合、`tests/harness/otel-reset.ts` の `resetOtelPerProject()` 集合への追加がテスト分離の前提になる

## Updated artifacts

`architecture.md` / `code-structure.md` / `component-inventory.md` / `api-documentation.md` / `technology-stack.md` / `dependencies.md` / `code-quality-assessment.md` / `business-overview.md` の8件へ現在節を追加し、直前の現在節（`260731-open-bug-batch-4`、observed `6e7a9d701`）を履歴へ降格（`cid:reverse-engineering:c3-relabel`）。履歴節の file:line は当時の observed 時点を指すため変更していない（`cid:requirements-analysis:historical-section-cite-check-at-observed`）。加えて `reverse-engineering-timestamp.md` と本ファイル。
