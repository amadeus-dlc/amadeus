# 依存関係

## registry drift guard の依存関係（260802-registry-drift-guard、現在、observed `64b44a9f8`）

### 内部依存グラフ

```text
amadeus-state.ts source ──> verb extractors ──> pure comparator ──> unit guard
stage-schema arrays ─────> readonly accepted export ─┐
EN/JA docs registry ─────> docs extractor ──────────┼─> pure comparator ─> unit guard
stage spec table ─────────> spec extractor（裁定時）┘
source/docs changed paths ─> detect-ci-changes.sh ─────> guard execution
core source ─> package.ts ─> 7 dist ─> promote-self ─> 5 root faces
```

- CLI比較は1ファイル内の2投影を読むだけで、handler実装や状態機械へ依存しない。`t250` / `t258` は対象verbの挙動証拠だがregistry guardのoracleにはしない。
- stage比較は schema の既存 `REQUIRED_FIELDS` / `OPTIONAL_FIELDS` に依存する。新たな手書き25件配列をproduction正本として作ると同型driftを再生産するため避ける。
- docs guardは英日2ファイルへの変更で必ず起動する必要がある。現在の `detect-ci-changes.sh` は `docs/**` だけでは `full=true` にしないため、test本体を追加するだけでは閉包しない。
- authoritative specを比較対象へ含める場合、欠落9件とactive `when` の矛盾を先に是正しないとguard導入時点で意図どおり赤になる。これは欠陥の証明であり、waiveしてgreen化してはならない。
- 外部依存追加は不要。Bun/TypeScript/既存test helperとMarkdown抽出で完結する。

## scope-grid 面間同期の依存関係（260802-scope-grid-face-sync、履歴、observed `47574fbab`）

- 判断: 外部依存の追加なし。内部依存は 3 本 — センサー正本 → 5 面コピー（byte-identical、`bun scripts/package.ts` + `bun run promote:self` で機械同期）、センサー manifest ⇔ 出力スキーマ、stage frontmatter（`code-generation.md:39-44`）→ センサー id（`t93.test.ts:106` / `t89.test.ts:366` が pin）。データ側の grid 5 面は互いに複製関係にあるが同期する機構が現状存在しない — それ自体が本 intent の患部。dist 同期面: センサー正本を触る場合は dist 7 面 + self-install 5 面のツールコピー再生成が PR に同梱される（grid データ自体は dist に `self-*` 行を持たないため対象外）。変更面が他の進行中 intent と交差する兆候は区間にない（患部 9 パスとも 0 コミット）。

## 2026-08-03 差分更新 — Issue #2018 projection parity 修復

- 正しいDAGは `plugins/<name> authoring → neutral bundle → face-aware project projection → graph compile → face-aware runner → commit/drift check → startup verify/repair`。runtime composeをneutral bundle直後の唯一のmaterializerにしてはならない。
- `scripts/package.ts` はneutral／0-plugin baseline、`scripts/promote-self.ts` はroot projectionの同期と既存composition保全、`amadeus-plugin.ts` はrepair、各harness manifest／emitはpath policyを所有する。特にCodex runnerは `manifest/emit → .agents/skills` へ依存させる。
- root self-installはClaude／Codex／Cursor／OpenCode／Kimiの5面、Kiro CLI／IDEはpackage-only。Kiroの共有 `.kiro` とCodexのproject-root skillを「host相対 `skills/`」へ一般化しない。

## formal-model-check 複数モデル化の依存関係（260801-tla-multi-model、履歴、observed `33e196b8`）

- 判断: 外部依存の追加なし。内部依存は plugin 内で閉じる — loader → model-map 定数（`tla-model-loader-internal.ts:22` が `TLA_EXECUTION_MODEL_NAME` を import）、arm → loader、CI ポート → run-model-check、stage doc → CLI、canonical コピー ⇔ plugin コピー（byte-identical 二重管理、table test で parity 固定）。変更面が他の進行中 intent と交差する兆候は区間にない。dist 同期面: plugin 投影（`dist/plugins/formal-model-check/` + 各ハーネス）と core canonical コピーの再生成（`bun scripts/package.ts` + `bun run promote:self`）が PR に同梱される。一般化時は tests の FormalElection 参照 27 ファイルが機械的洗い出し対象。

## no-silent-drop の依存関係（260801-silent-drop-gate、履歴、observed `d72f60b5a`）

```text
fixed ast-grep tool
  -> rule/config validation
  -> authored-root scan (core + harness + scripts)
  -> census normalization
  -> baseline ratchet + exemption validation
  -> typed result
  -> CI lint step

runtime #1878: applyTransition StateResult -> persistBlocked outcome
runtime #1874: strict mutation result -> all setCheckbox/setStageSuffix callers
#1963: existing resync outcomes -> regression fixtures only
```

- 外部依存: ast-grep は新規。observed の依存集合には存在しないため、package manifest と Bun lockfile の固定が先行条件。
- 内部依存: scanner は3 authored roots のみに依存し、`dist/`、self-install 投影、fixture へ依存しない。baseline と exemption は scanner の正規化 identity を共有するが、互いの意味論へ依存しない。
- 実装順のトポロジー: typed domain／rule fixture → scanner 完全性 → baseline・exemption → CLI → CI adapter。CI adapter は tool と全 rule が利用可能になるまで有効化できない。
- #1878 は `applyTransition` の既存 `StateResult` を消費する局所修正。#1874 は caller が多く、`amadeus-jump.ts`、`amadeus-utility.ts`、`amadeus-state.ts` の mutation 境界を全数移行する必要がある。helper だけを throwing 化すると広い破壊になるため、結果型と caller 消費を同一単位で扱う。
- #1963 の [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) は observed の祖先に含まれ、再実装依存は無い。t407/t411 を回帰依存として維持する。

## kimi bootstrap デッドロック修正の依存関係（260801-kimi-bootstrap-deadlock、履歴、observed `861688c31`）

- 判断: 単一バグ修正で外部依存・内部依存の追加なし。修正面は core hook + 単体テスト（t10）のみで他の進行中 intent の作業面と非交差。dist 同期面: core hooks を触るため正本1 + dist 7 + self-install 1 の9コピー再生成（`bun scripts/package.ts` + `bun run promote:self`）が修正 PR に同梱される。

## CG 計画整合ガードの依存関係（260801-cg-plan-guard、履歴、observed `cb809c4de`）

- 判断: B1（runtime/lib）→ B2（orchestrate 発行側）→ B3（orchestrate approve 側）の直列依存。B2/B3 は同一ファイル（orchestrate）につき Bolt 内直列または非交差関数の実 diff 判定。dist 再生成はマージ順直列。詳細は `re-scans/260801-cg-plan-guard.md`。

## オープンバグ一括修正バッチ第5弾の依存関係（260801-open-bug-batch-5、履歴、observed `c49e385ac`）
## formal-verif 価値チェーンの依存関係（260731-formal-verif-value-chain、履歴、observed `da51af375`）

file:line はすべて HEAD `16486d3c` 断面の実測。移設・貫通・整合の3件が依存グラフのどこを切るかを固定する。

### 実行器の依存閉包（#1829 の移設可能性を決める）

`scripts/formal-verif/` 54 ファイルの相対 import 推移閉包を機械計算した結果:

```
run-model-check.ts ──▶ 群 A 16 ファイル ──▶ packages/framework/core/tools/amadeus-formal-verif-model-map.ts
                                              ▲
                                              └─ 唯一のリポジトリ横断依存（canonical.ts:1-5 の re-export）

ci.yml:584/:600 ──▶ 群 B 7 ファイル ──▶ 群 A
run-model-check-diagnostic.ts ──▶ 群 A（+ 自身）
群 D 30 ファイル ──▶ （どの CLI からも到達不能。tests/ からのみ参照）
```

**移設の含意**: 群 A を `plugins/formal-model-check/tools/` へ移しても、core への依存は `amadeus-formal-verif-model-map.ts` 1本だけが残る。この1本を (a) plugin 側へ複製する / (b) core への依存として許容する / (c) plugin へ移して core 側の消費者（`amadeus-sensor-model-completeness.ts`）を逆向きに依存させる — の三択が要件段の裁定対象。**(c) は core → plugin の逆依存を作るため、依存方向の観点からは (b) が最も安全。**

### 逆依存 — テストから群 D への参照（削除範囲の制約）

群 D は本番からは到達不能だが `tests/` からは広く参照される（`provenance.ts` 14 件、`execution-evidence.ts` 10 件）。`grep -rl formal-verif tests/` = **93 パス**（`.test.ts` 72 = unit 29 / integration 35 / e2e 8、残り 21 は fixtures / support / 台帳）。群 D 削除は同数のテスト削除を伴うため、**削除範囲は独立の裁定事項**。

### 台帳の依存（唯一の直列化点）

| 台帳 | 依存の形 | 移設時 |
| --- | --- | --- |
| `tests/.complexity-baseline.json` | `scripts/formal-verif/` を path で 22 件参照（`:210-341`、うち 20 件が群 D） | path 書換 + 匿名関数 ordinal 照合 |
| `tests/.coverage-patch-allowlist.json` | 群 A の `fs-tlc-toolchain.ts` × 2（`:327` / `:333`）、群 D の `fs-fixture-registry.ts` × 2（`:339` / `:345`）ほか、`tests/formal-verif/support/` 4 本（`:303-324`） | 行シフト確実 → `cid:code-generation:c1-allowlist-mechanical-remap` の機械 remap + reason 直読照合 |

**#1738 / #1829 / #1510 の3件は共有ソースファイルを持たない**（`architecture.md` の相互作用表）。唯一この2台帳だけが交差するため、移設を含む Bolt を最後に着地させるか、他 Bolt の台帳行に触れないことを実 diff で確認する（`cid:code-generation:c6`）。

### plugin 配布経路の依存方向

```
plugins/formal-model-check/（正本）
   │
   ├─ scripts/plugin-projection.ts:158 walkFs 全走査 ──▶ dist/plugins/formal-model-check/（8 変種 / 38 ファイル）
   │      ※ 宣言不要・ディスク駆動
   │
   └─ plugin.json の宣言 ──▶ amadeus-plugin-compose.ts:330-334 parser
                                 └─▶ :1021 composeWriteSet（stageCopies ∪ sharedWrites）
                                        └─▶ <host>/plugins/formal-model-check/stages/…（stage 1本のみ）
```

**宣言駆動（compose）とディスク駆動（projection）の依存様式の違い**が #1829 の改修点。

### host 従属の依存（#1738 の多ハーネス化ギャップ）

- `amadeus-plugin.ts:377-380` `resolveProjectRoot` — 1 compose = 1 ハーネスツリー
- 同 `:272-274` コメント「`projectRoot` here is the HOST root — the harness dir (.claude/.kiro/...) under the project」
- discovery も host 従属: `:381` `PLUGIN_SOURCE_DIR_NAME = ".amadeus-plugin-src"` / `:393-395` `pluginSourceRootOf(hostRoot)`
- 実測: `.amadeus-plugin-src` が存在するのは **`.claude/` のみ**

すなわち compose は 7 ハーネスに対して**7 回別々に呼ぶ**か、multi-host を新設するかの分岐になる。

### model-map をめぐる依存の環（#1510）

```
amadeus-election*.ts（impl 5 件）
   │ sha256
   ▼
specs/tla/model-map.json ──読取──▶ tla-model-loader-internal.ts:232（impl-hash 照合 → SOURCE_DRIFT）
   ▲
   │ 書込（updateModelMapInternal :691 / 公開 :729 / CLI :778-779,:790）
   │
amadeus-sensor-model-completeness.ts:650-659 ── MODEL_UNCHANGED で拒否（model/cfg のみ判定）
   ▲
   └─ .claude/sensors/amadeus-model-completeness.md:8 の matches が amadeus-election*.ts で発火
```

**発火（impl 変更）→ 更新（拒否）→ 実行（impl-hash で fail-closed）の閉路が塞がっている。** 読取側と書込側で判定対象が違うことが唯一の原因であり、依存の追加・削除ではなく**判定条件の対称化**で解ける（新規依存は不要）。

### mirror 題材の依存（#1738 の新モデル）

`amadeus-mirror*.ts` 25 ファイル / 12,174 行のうち、モデル化対象は `amadeus-mirror-types.ts`（608）+ `amadeus-mirror-state-reducer.ts`（823）に閉じる。reducer は `:27` で `amadeus-mirror-project-reconciliation-reducer.ts` から `ProjectSyncTransition` を型 import しており、**遷移集合はこの2本に跨る**（inline 18 + 入れ子 3 = 21）。model-map entries に追加するなら最小で types + reducer の2本、遷移の駆動まで含めるなら coordinator（1,004）と lifecycle（1,272）が加わる — 規模差が大きいため entries 集合の確定は要件段の裁定対象。

### 区間差分（`6e7a9d701..da51af375..HEAD`）の依存への影響

区間 12 コミット / `126 files changed, 4214 insertions(+), 102 deletions(-)`（`git diff --shortstat 6e7a9d701..HEAD`）。面別内訳（`--numstat` 機械集計）: record `89 files / +3221 / −9`、`dist/` `14 / +133 / −14`、self-install `10 / +95 / −10`、`metrics/` `4 / +215 / −2`、**ソース面 `9 files / +550 / −67`**（amadeus/ 除く合計は 37 files / +993 / −93）。

`git diff --name-only 6e7a9d701..HEAD | grep "formal-verif\|plugins/\|model-map\|ci.yml"` のヒット6件は**すべて本 intent 自身の record ファイル**（`260731-formal-verif-value-chain/` 配下）であり、**対象実装面への変更はゼロ**。したがって本 intent の依存前提は前回 RE から不変。

## オープンバグ4件の依存関係（260731-open-bug-batch-4、履歴、observed `6e7a9d701`）
## perf 分離の依存関係（260731-perf-ci-separation、履歴、observed `da51af375`）
## オープンバグ一括修正バッチ第5弾の依存関係（260801-open-bug-batch-5、履歴、observed `c49e385ac`）

- 判断: Bolt 内交差3件（Bolt 1 = mirror 4ファイル共有、Bolt 2 = `amadeus-utility.ts`、Bolt 3 = `otel/bootstrap.ts`）は各 Bolt 内直列で解消。Bolt 間はファイル単位非交差だが、core/tools を触る Bolt 1-4 の dist 再生成はマージ順に直列（`cid:code-generation:c6` の実 diff 再評価をマージ時に行う）。Bolt 5 は完全独立。詳細は `re-scans/260801-open-bug-batch-5.md`。

## OTel メタ情報スキーマ実装の依存関係（260801-otel-meta-schema、履歴、observed `9c8df859e`）

本節の file:line はすべて observed `9c8df859e` 時点（`cid:reverse-engineering:measurement-ref-in-artifacts`）。

### モジュール依存の向き

```
bootstrap.ts ──> logger-provider ──> audit-log-exporter ─┐
             ├──> tracer-provider ──> local-span-exporter ├──> redaction.ts ──> event-registry.ts
             ├──> context.ts                              │
             └──> fatal-latch.ts                          │
   meter-provider ──> local-metric-exporter ──────────────┘
   relay.ts ──> redaction.ts（Signal Store JSONL を読む片方向）
```

**`redaction.ts` は `event-registry.ts` に依存する**（`:24` `import { REGISTERED_EVENTS }`）が逆向きは無い。この一方向性が「registry に属性を足すと safe-key が自動追従する」構造（`:65-71`）の実体で、#1868 §4 の exception 属性追加が redaction 側の改修を要さない理由でもある。

### #1868 の6面の相互依存

| 面 | 依存する面 | 独立実装可否 |
|---|---|---|
| §1 resource | なし（最上流） | **独立** |
| §2 span attributes | §1 とは独立（span 側 bag は別レイヤ） | 独立 |
| §3 log attributes | — | 変更なし |
| §4 exception | なし（registry optional 追加のみ） | **独立** |
| §5 subagent started | §2（`amadeus.agent.type` / `.id` を span へ） | started イベント単体は独立、lifetime スパンは §2 に依存 |
| §6 metrics | **§1 に依存**（resource が全計器へ共通で付く前提）+ bootstrap の metrics arm 新設 | §1 の後 |

→ **§1 が §6 の前提**である以外は疎で、Unit 分割の自由度は高い。ただし §1 / §2 / §4 はいずれも `tracer-provider.ts` を触るため、ファイル単位では交差する（`cid:code-generation:c6` の非交差判定は静的目録ではなく実 diff で行う）。

### 78-pin ガードの依存グラフ（canonical イベント追加時）

`amadeus.subagent.started`（§5、canonical）を足すと **78→79** になり、以下が同時に赤くなる。1つの数値が複数箇所へ複製されている構造なので、部分更新は必ず不整合を生む:

1. `packages/framework/core/otel/event-registry.ts:77` — `EXPECTED_CANONICAL_COUNT = 78`（正本）
2. `tests/integration/event-registry-drift.test.ts:51-54` — 4-set drift（`EXPECTED_CANONICAL_COUNT` / `canonicalAuditEvents().length` / `registryCanonical.size` / `auditVocabulary.size` をすべて 78 に pin）。加えて同ファイル `:192` に `vocab.length` の 78 pin が独立して存在する（scan 報告は 4 箇所としていたが、実測では**同ファイル内 5 箇所**）
3. `tests/unit/t28-audit-event-sync.test.ts:72,175-176` — `CANONICAL_COUNT = 78`、`expect(TS_EVENTS.length).toBe(CANONICAL_COUNT)`
4. `packages/framework/core/tools/amadeus-audit.ts:56` — `VALID_EVENT_TYPES` 本体（v1 語彙の Set リテラル）
5. `tests/integration/t-otel-event-registry.test.ts` — 全数の FR-EVT-7 契約
6. `tests/integration/t381-registry-emitter-parity.test.ts` — emitter/registry 全数パリティ
7. `tests/integration/t385-emitter-registry-admission.test.ts` — call site の供給キー ⊆ required∪optional。**解析不能サイトは `UNRESOLVED_SITES` へ列挙必須**（新規の解析不能サイトは即 fail）
8. `tests/integration/t48-audit-event-emitters.test.ts` — emitter 網羅
9. `.claude/sensors/amadeus-event-registry-drift.md` + `packages/framework/core/tools/amadeus-sensor-event-registry-drift.ts` — ゲート時に同じ抽出を再実行
10. `event-registry.ts:883-897` `assertRegistryConsistent` — ランタイム自己検査（名前重複・auditEvent 重複・durability/category 整合・cardinality pin）

**telemetry 分類（`auditEvent: null`）を選べば 1-4 は動かない** — `assertRegistryConsistent` が canonical のみ数えるため。先例は `exception`（`:827-837`）と `amadeus.diagnostic.note`（`:817-826`）の2件（実測: `durability: "canonical"` 78 / `durability: "telemetry"` 2 / def 総数 80）。ただし #1868 §5 は started を**監査ジャーナルへ載せる canonical** として定義しているため、この回避は使えない。

**属性追加のみ（§4 exception / §1 の session.id を session イベントへ）なら cardinality は動かず**、影響は 7（t385 static admission）と `tests/unit/t-otel-redaction.test.ts:35,44-45`（safe-key∪optIn の集合 assert）に限られる。

### 外部依存

新規の外部パッケージ依存は不要。#1868 が要求する値の取得元はすべて Node 標準か既存の内部モジュールで賄える:

- `host.name` → `node:os` `hostname()`（`amadeus-lib.ts:5` で import 済み）
- `vcs.ref.head.*` → `node:child_process` `spawnSync("git", …)`（既存 8 箇所の様式）
- `service.version` → `tools/amadeus-version.ts`
- `amadeus.harness` → `tools/amadeus-harness.ts`
- `amadeus.clone_id` → `auditCloneId()`（`amadeus-lib.ts:4270`）

**唯一の外部依存は `gen_ai.request.model` と `gen_ai.client.token.usage`** で、これはハーネス（Claude Code のトランスクリプト JSONL 等）から供給される値であり、フレームワーク側からは取得経路が存在しない（`ClaudeCodeHookInput` にモデル名フィールドなし — `amadeus-lib.ts:4957` 以降）。#1868 の fail-open 原則（設計原則2）により、取得不能時は省略で成立する。

### ビルド・配布の依存

`otel/` は core 中立層にあり、7 ハーネス dist すべてへ投影される。**core を触ると必ず 7 ツリー全数の再生成が要る**（`cid:build-and-test:bt-dist-regen-seven-harnesses` — 5 ツリーで止めると `kiro` / `kiro-ide` が DIFFERS で `dist:check` が落ちる）。加えてテストの大半が dist を読む二重モジュールグラフのため、再生成漏れは偽グリーンを作る。

`scripts/package.ts` の `writeHarnessData()` を拡張する場合、生成物は `--check` の byte-diff 対象なので同一変更内での再生成が必須。

## perf 分離の依存関係（260731-perf-ci-separation、履歴、observed `da51af375`）

本節の file:line はすべて observed `da51af375` 時点（`cid:reverse-engineering:measurement-ref-in-artifacts`）。

### 分離手段ごとの波及チェーン

分離には性質の異なる3手段があり、**波及先が根本的に異なる**。

| 手段 | coverage registry | project gate | patch gate | residency guard |
| --- | --- | --- | --- | --- |
| A. 実行から除外（`excludes` 経由） | **不変**（宇宙はディスク列挙、`discoverClaims` `:771-774`） | **必ず低下** → baseline 再カット必須 | 該当ファイルが LCOV から消えると既存行ピンが stale hard-fail | 不変 |
| B. tier 外ディレクトリへ移動 | `covers:` claim が落ち units が `UNCOVERED` → `--check` が registry drift で失敗 | 低下 | 同上 | 新 scope は `scopeOf` `:34` が `"other"` を返す |
| C. 別 workflow へ（ファイルは据置、job だけ分離） | 不変 | 実行有無次第 | 実行有無次第 | 不変 |

### 依存関係の詳細

- **`tests/gen-coverage-registry.ts`** — テスト宇宙は実行ではなく**ディスク**から列挙される（`CLAIMS_TESTS_DIR` `:74` = `AMADEUS_COVERAGE_TESTS_DIR ?? TESTS_DIR`、`discoverClaims` `:771` が `join(CLAIMS_TESTS_DIR, tier)` を走査し `covers:` ヘッダ持ちのみ保持）。**帰結: 実行除外は registry に何も起こさない。ディレクトリ移動・削除だけが claim を落とす。**
- **`tests/coverage-project-gate.ts`** — `coverage/coverage-totals.json`（`:48`）を `tests/.coverage-project-baseline.json`（`:52`）と比較する行率ラチェット。perf テストを `coverage:ci` の実行から外せばその行ヒットが消え、プロジェクト % が下がってゲートが落ちる。**baseline 再カットが分離の最大の機械的帰結**であり、分離 PR と同一変更で行う必要がある。
- **`tests/coverage-patch-gate.ts`** — LCOV ∩ `git diff` 追加行。allowlist は `tests/.coverage-patch-allowlist.json`（`:56`）で、`:295` verbatim `coverage-patch-gate: STALE allowlist entries (range matches no measurable line — remove or update)` の stale 拒否がある。除外したファイルが LCOV から消えると、そこを指す既存行ピンが hard-fail する（`cid:code-generation:allowlist-line-pin-stale` および同 cid の機械 remap 追補 `cid:code-generation:c1-allowlist-mechanical-remap` の対象）。
- **`tests/integration/t257-ci-residency-marker-guard.integration.test.ts`** — `:32` verbatim: `const CI_SCOPES = new Set(["smoke", "unit", "integration"]);`。`CI-resident` マーカーを持つファイルはこの3 scope に居なければならない。**現時点でマーカーを持つのは2ファイルのみ**（当ガード自身と `t241-election-machine-executor.integration.test.ts`、`grep -rln 'CI-resident' tests/` 実測）で、perf テストはいずれも含まれない。したがって手段 B で `tests/e2e/` へ移してもこのガードは発火しない。ただし新ディレクトリを新設すると `scopeOf` `:34` が `"other"` を返すため、そこに将来 CI-resident を主張した瞬間に落ちる。
- **`tests/unit/t-test-size-drift.test.ts`** — ディスク上の全 `*.test.ts` を走査し、declared が measured より**小さい**場合と注記値不正で落ちる。size は scope から独立なのでディレクトリ移動では発火しない。`// size: large` の追加は安全、spawn するファイルへの `// size: small` は致命的。
- **drift 報告の縮退（見落としやすい副作用）** — `reportDynamicSizes` `:952` は**この invocation で実際に走ったファイル**のみを対象にする。perf テストを `--ci` から外すと drift 報告が静かに縮み、t258 の現在の `drift=wall-clock` エントリが CI 出力から**修正されずに消える**。アップロード artifact は `amadeus-test-size-report`。
- **`tests/smoke/t05-run-tests-parallel.test.ts`** — ランナー CLI 契約のピン（`PER_TEST_TIMEOUT` `:163`）。新フラグ・新 tier はこの挙動を byte 一致で保つこと。

### CI ジョブ依存

`distribution-benchmark`（`:224`、matrix 3）→ `distribution-benchmark-aggregate`（`:255`、`if:` なし・`needs` のみ）→ `distribution-release-gate`（`:279`）。この鎖は `ci-success` の `needs`（`:651-659`）に**入っていない**。`coverage-head` / `coverage-base` → `coverage`（`:418`）→ `ci-success` および `metrics-snapshot`（`:475`）。**`metrics-snapshot` は `coverage` の成功に依存する**ため、coverage 側の構成変更はメトリクス鎖にも波及する（`tests/run-tests.ts` が書く `coverage/tests-totals.json` のファイル数・アサーション数も可視に減る）。


## オープンバグ4件の依存関係（260731-open-bug-batch-4、履歴、observed `6e7a9d701`）

本節の file:line はすべて observed `6e7a9d701` 時点（`cid:reverse-engineering:measurement-ref-in-artifacts`）。

### Bolt 間の交差判定

**4件とも並行可**（`cid:code-generation:c6` — 交差判定は静的目録でなく実 diff で再評価する。本節は着手前の静的目録であり、着地順は実 diff で再評価する）。

| 組 | ファイル交差 | 生成面交差 | 判定 |
| --- | --- | --- | --- |
| #1811 × #1800 | なし（別テストファイル） | なし（両方テスト面） | **並行可** |
| #1811 × #1797 | なし | なし | **並行可** |
| #1811 × #1816 | なし | **条件付き** — #1811 が本番非改変なら交差なし | **並行可（条件1）** |
| #1800 × #1797 | なし | なし | **並行可** |
| #1800 × #1816 | なし | なし | **並行可** |
| #1797 × #1816 | **条件付き** — `tests/.coverage-patch-allowlist.json` は #1816 のみが触れる | なし | **並行可（条件2）** |

### 並行の条件（2点）

**条件1: #1811 の本番非改変を確定する。**

`packages/framework/core/tools/team-up-codex-safety-wait.ts` または `packages/framework/core/tools/team-up.sh` を触ると、`bun scripts/package.ts` → 7 dist → `bun run promote:self` → self-install の再生成チェーンを通る。#1816 は同チェーンを必ず通るため、**生成面で交差する**。

本番側は既に fail-closed 実装済み（`:643` の `runRecordIsActive` ループ、`:561-582` の `catch` → `false`）であり、患部はテスト fixture 側に限局する。本番非改変が成立する限り交差は生じない。

**条件2: `tests/.coverage-patch-allowlist.json` へ触れるのは #1816 のみとする。**

同ファイルは本区間（`3f73823b1..6e7a9d701`）で `+38/−38` の全面 remap を受けたばかりである。#1816 は `amadeus-mirror-presentation.ts` へ行を挿入するため presentation 行ピン5件（`193-194` / `230-234` / `237-239` / `245-247` / `266-271`）の機械 remap を要する（`cid:code-generation:c1-allowlist-mechanical-remap`）。

#1797 の対象である `t259` エントリ群は**別テスト由来**であり本件では触らない。この境界を守れば共有台帳の挿入衝突（`cid:code-generation:shared-ledger-insert-collision`）は発生しない。

### 順序依存（交差とは別軸）

**#1811 の着地は #1800 / #1797 の再現条件を変える。**

| Issue | 依存の内容 |
| --- | --- |
| #1800 | 第一容疑は負荷条件下の spawn `EAGAIN`。#1811 の残留プロセス（実測84本）が解消されるとホスト負荷が下がり、再現確率が変わる |
| #1797 | 比のずれは負荷変動由来。同様に再現条件が変わる |

**負荷スイープ実測を #1811 の着地前に取るか後に取るかを要件段で固定する。**

- **前**に取る → 残留込みの最悪条件を測る（保守的な閾値になる）
- **後**に取る → 本来あるべき条件を測る（実運用に即した閾値になる）

どちらを選ぶかで導出される数値が変わるため、実装段の裁量に委ねない。これは交差（同時実行の可否）ではなく**測定条件の依存**であり、並行実装自体は妨げない。

### 外部依存

本 intent の4件はいずれも**新規の外部依存を導入しない**。

| Issue | 依存する既存機構 |
| --- | --- |
| #1811 | `packages/framework/core/tools/team-up.sh:508` の PID 追跡（`safety-wait.pid`）。掃引は `afterEach`（`:39-41`）の `rmSync` より**前**に行う順序依存あり |
| #1800 | 同一ファイル内の既存診断ヘルパー `expectSuccessfulMigration`（`:218`）と3分類契約（`:311-313`）。新機構の導入ではなく既存様式への合流 |
| #1797 | `tests/helpers/guard-corpus-benchmark-child.ts`（子プロセス側）。交互計測を採る場合の主改修面 |
| #1816 | `snapshot.completionInstance`（型 `amadeus-mirror-types.ts:516` / `:527`、codec `amadeus-mirror-state-codec.ts:567` / `:763` / `:770` / `:775`、供給 `amadeus-mirror-lifecycle.ts:339`）。presentation では**未消費**のため参照を新設する |

### 再生成チェーンの依存

`packages/framework/core/` を触る変更（**#1816 のみ**）は以下を同一変更で同期する（project.md § Mandated）:

1. `bun scripts/package.ts` → `dist/` 7ハーネス（`claude` / `codex` / `cursor` / `opencode` / `kimi` / `kiro` / `kiro-ide`）
2. `bun run promote:self` → self-install ツリー
3. `bun run dist:check` / `bun run promote:self:check` で一致を検証

他3件はテスト面に閉じるためこのチェーンを通らない。

### 検証コマンドの依存

全 Bolt 共通（project.md § Testing Posture）:

- `bun run typecheck`
- `bun run lint`
- `bun run dist:check`（#1816 のみ実質的な差分を持つ）
- `bun run promote:self:check`（同上）
- `bash tests/run-tests.sh --ci`

**#1797 は追加で負荷スイープ実測を要する**（並列度を振った計測 — `cid:feasibility:parallelism-sweep-before-commit` の系譜）。**#1811 は追加でプロセス残留の実測**（launch → テスト終了 → `ps` でのゼロ確認）を要する。

### 本区間で変化した依存関係（本 intent の患部外）

| 変化 | 内容 |
| --- | --- |
| 選挙ストアの新規内部依存 | `amadeus-election-store.ts` が pending lane 6関数（`pendingDir` `:113` / `readPending` `:139` / `appendPending` `:161` / `ballotKey` `:187` / `pendingNotOnLedger` `:197` / `integratePending` `:205`）を持ち、tally 経路（`:535` / `:540` / `:601` / `:619` / `:663`）から消費する |
| orchestrate → mirror codec の新規依存 | `amadeus-orchestrate.ts:193` が `succeededMirrorCreateExists` を import し、`:4249` で消費（実装は `amadeus-mirror-state-codec.ts:1731`） |
| `.gitignore` 面の拡張 | ルート + 7ハーネス `dot-gitignore` へ `amadeus/spaces/*/elections/*/pending/` を追加（各 `+5`） |

**外部パッケージ依存の追加・削除は本区間で 0件**。core tools への新規モジュール追加も 0件（前区間の +9件と対照的）。

## オープンバグ3件の依存関係（260730-open-bug-batch-3、履歴、observed `3f73823b1`）

**判断: 外部依存の変化なし。ただし Bolt 間にファイル交差が1組ある。** 区間 `a38a1f4d3..3f73823b1` で `package.json` の依存追加・削除・更新はない（ルート依存は Bun types / TypeScript / Biome / fast-check / Agent SDK / release-it の既存集合のまま）。

### Bolt 間の交差判定

前 intent までと異なり、**3件すべてが非交差ではない**。

| 組 | 交差 | 判定 |
| --- | --- | --- |
| #1773 × #1772 | **交差する** — 両者とも `packages/framework/core/tools/amadeus-election-model.ts` を触る（#1773 は `OriginalBallot` の `:134-136`、#1772 は `Choice` `:48` と `DistributionView` `:306-310`） | 直列化するか、実 diff で行レンジの非交差を確認してから並行させる（`cid:code-generation:c6`。静的目録でなく実 diff で再評価する） |
| #1773 × #1752 | 非交差（`amadeus-election-*.ts` vs `amadeus-orchestrate.ts`） | 並行可 |
| #1772 × #1752 | 非交差 | 並行可 |

3件とも `packages/framework/core/` を正本とするため、`bun scripts/package.ts` → `dist/` 7ハーネス → `bun run promote:self` → self-install 5面という**同一の再生成チェーン**を通る。ファイル単位で非交差でも生成面が競合するため、着地順は実 diff で再評価する。

### 内部依存（#1773 / #1772 の修正が触る方向）

```
amadeus-election-model.ts   (型 — Choice :48 / DistributionView :306-310 / OriginalBallot :134-136)
        │  型定義を供給
        ▼
amadeus-election-store.ts   (格納 — appendBallot :464-465 / materialize :500 / timeline :468-472)
        │  ledger.json / timeline.json / ballots/<voter>.json
        ▼
選挙ディレクトリ（git tracked、非 ignore）
        │  voter subagent が直接読む運用（SKILL.md:51）
        ▼
配布ビュー（shuffleView :338 — 設計上は健全な唯一の配布面）
```

依存方向は model → store の一方向。#1772（model の型拡張）は store・tally（`choiceCounts` `:488-496`）・record render へ**下流伝播**する。#1773 の格納分離案は store 層に閉じるが、`.gitignore` という **core の外側**へ影響が出る唯一の経路を持つ。

### #1752 の依存

`amadeus-orchestrate.ts` 内で閉じる。修正候補 (b)（ask 時 binding の永続化）を採る場合、`amadeus-mirror-coordinator.ts` の `expectedPrompt` 照合様式（`:320` / `:560` / `:622` / `:742-746`）を参照するが、これは**既存様式の踏襲であり新規依存の追加ではない**。候補 (a)（create receipt の存在判定）は `classifyReceipt` 語彙の再利用で同様に閉じる。

### 区間で変化した依存方向（本 intent の患部外）

`gh` の呼出依存が**集約された**。従来 mirror 系3モジュールに分散していた GitHub 呼出が `amadeus-github-gateway.ts` へ、プロセス起動が `amadeus-process-runner.ts` へ移り、抽出元は `amadeus-mirror-config.ts` −689 / `amadeus-mirror-gateway.ts` −911 / `amadeus-mirror-runner.ts` −310 と縮小した。`hooks/amadeus-sensor-fire.ts` は新たに `tools/amadeus-sensor-invocation.ts` へ依存する（`:27` の import）— hook → tools 方向の依存であり既存の層順を保つ。

## オープンバグ5件の依存関係（260730-open-bug-batch-2、履歴、observed `c42ef4d77`）

**判断: 外部依存の変化なし。Bolt 間の順序制約もなし。** 区間 `8b8016f62..c42ef4d77` で `package.json` の依存追加・削除・更新はない。5件は所有機構が互いに独立で、実装上の依存関係を持たない。

ただし**投影チェーンの競合**が1点ある: #1735（`stage-protocol.md`）・#1742（`amadeus-sensor-fire.ts`）・#1750（`amadeus-mirror-lifecycle.ts` / `amadeus-orchestrate.ts`）はいずれも `packages/framework/core/` を正本とし、`bun scripts/package.ts` → `dist/` 7ハーネス → `bun run promote:self` → self-install 5面という同一の再生成チェーンを通る。ファイル単位では非交差だが生成面が競合するため、並行実装時は着地順を実 diff で再評価する（`cid:code-generation:c6`）。#1749（散文のみ、同じチェーンだが正本1行）と #1734（`scripts/` のみ、チェーン外）は独立。

なお #1742 の修正が `{unit-name}` 解決を要する場合、hook から `amadeus-orchestrate.ts` への依存が新設されうる（現状そのような依存は無い）。`amadeus-lib.ts` への seam 抽出であれば依存方向は既存のまま保てる（**仮説** — 修正方式は未裁定）。

## SKILL/reviewer 2件の依存関係（260730-skill-reviewer-fixes、履歴、observed `278d61d8e`）

測定 ref: observed `278d61d8e`。新規外部パッケージは追加しない（ルート依存は Bun types / TypeScript / Biome / fast-check / Agent SDK / release-it の既存集合のまま）。

### 内部依存（#1711 の修正が触る方向）

```
amadeus-orchestrate.ts  (directive 発行 — degrade 分岐 :3050-3057)
        │  produces: 解決済みパスの配列（degrade 時は {unit-name} 入り）
        ▼
amadeus-reviewer-runtime.ts  (:224-246 scopeForDirective → onDisk 判定付与)
        │  unit.produces: { path, present, optional }
        ▼
amadeus-reviewer.ts  (:71-75 実在検査 → :74 throw)
        │  throw
        ▼
amadeus-reviewer-runtime.ts  (:623-641 runReviewerCommand → stderr 1行 + exitCode 1)
```

依存方向は一方向で、reviewer 層は「produces は解決済み」という前提に立つ。この前提を破っているのは上流の degrade 分岐であり、修正候補 A（engine 側解決）はこの依存方向を保つ。候補 B（reviewer-runtime 側解決）は解決責務を下流へ移すため層の逆転になる。

`stage-protocol.md:898` の「unchanged directive JSON」規定は、conductor が中間で directive を書き換えないことを要求する。すなわちプロトコルもこの一方向依存を前提としている。

### 依存の非対称（#1711 の核心）

`amadeus-orchestrate.ts` 内部で、consumes と produces が同じ `resolveArtifactPath`（`:1645`、注入は `:1661-1663`）を通るにもかかわらず、実在検査の扱いが分かれる:

- consumes → `splitConsumesByPresence`（`:1762`）が `:1771-1774` でプレースホルダを exempt
- produces → exempt なし。そのまま下流の reviewer 実在検査に到達する

### #1736 の依存（投影チェーン）

```
packages/framework/harness/<name>/skills/amadeus/SKILL.md   (正本5面、互いに独立)
        │  manifest.ts:73 の harnessFiles エントリ
        ▼
scripts/package.ts:396  ({{HARNESS_DIR}} 置換のみ — :11-14)
        ▼
dist/<name>/<harnessDir>/skills/amadeus/SKILL.md   (5面)
        │  bun run promote:self
        ▼
.claude / .agents / .kimi-code の各 skills/amadeus/SKILL.md   (3面)
```

正本間に共有はないため、5面すべてを個別に編集しなければ全ハーネスへ波及しない。

### Bolt 間の順序制約

**なし**。2件はファイル単位で非交差（#1736 = `skills/amadeus/SKILL.md`、#1711 = `tools/` + `amadeus-common/protocols/`）であり、`cid:code-generation:c6` の非交差判定を満たすため並行実装可能。ただし両件とも 13コピー同期（#1736 は SKILL.md 13ファイル、#1711 は core tools の正本1 + dist 7 + self-install 5）を伴うため、`dist:check` / `promote:self:check` の緑は各 Bolt で個別に確認する。

### 外部依存

CLI・Shell・Git/GitHub の既存境界のみ。本 intent は HTTP・database・常駐 service に触れない。

## Open bug 6件の依存関係（260729-open-bug-batch、履歴、observed `22ee27dbe`）

### 外部依存

| 依存 | 消費境界 | 関連 Issue | 制約 |
| --- | --- | --- | --- |
| Bun | CLI/test execution、child spawn、coverage | 全件 | 1.3.13以上。Node runtime fallback は追加しない |
| git | worktree registration/checkout、three-dot diff | #1663 / #1662 | worktree add は直列、checkout は個別結果を集約。coverage は snapshot identity を固定 |
| Bash / POSIX process | book-pack verifier、Team Mode launcher | #1667 / #1336 / #1663 | `wait`・PID 生存だけを成功証拠にしない |
| herdr | Team Mode pane/session | #1336 | role-ready と supervisor-ready を分離 |
| GitHub / `gh` | Intent Mirror remote operation | #1607 | remote effect と local durable receipt を別結果として扱う |
| filesystem / LCOV | coverage measurement | #1662 | diff と coverage を同一 working-tree/commit 断面へ結ぶ |

### 内部依存グラフ

- `tests/run-tests.ts` → individual `bun test` child → `book-pack-verify.test.ts` → `book-pack/scripts/verify-dummy.sh`。#1667 は外側から内側へ timeout budget が単調増加する必要がある。
- `team-up.sh` → `team-up-codex-safety-wait.ts` → herdr pane。#1336 の readiness receipt は launcher が所有し、#1663 の worktree worker result ledger と混同しない。
- coverage runner → `coverage/lcov.info`、`coverage-patch-gate.ts` → `git diff <base>...HEAD`。#1662 はこの2入力へ共通 snapshot identity を導入する。
- orchestrate `report` → state `complete-workflow` → audit journal / intent registry → mirror completion boundary → mirror state store。#1607 は現状の依存順序を「mirror durable commit が audit seal より前」に組み替える。
- mirror coordinator → Project completion gate → executor → state store/outbox。区間で Project 同期スタックが増えたため、#1607 は単一 Issue の close だけでなく全 Project row の done 条件も保持する。

### Bolt 間・並行 Intent 間の依存

| 先行 | 後続 | 理由 |
| --- | --- | --- |
| #1336 | #1663 | `team-up.sh` の起動・並行 worker 制御を同時編集しない |
| #1607 | OTel [#1679](https://github.com/amadeus-dlc/amadeus/issues/1679) Construction | completion transaction と audit seal が Critical 共有境界 |
| #1664 | OTel [#1679](https://github.com/amadeus-dlc/amadeus/issues/1679) Journal v2 | t224 の journal/audit expectation を診断可能にしてから変更 |
| #1662 / #1667 | 横断 Build and Test | 実装は分離可能だが CI 負荷と coverage 生成を同じ最終条件で検証 |

各 Issue は独立 Bolt とし、個別の [GitHub Pull Request](https://github.com/amadeus-dlc/amadeus/pulls) に閉じる。共有ファイルの変更は stack せず、先行 Bolt 着地後の observed main へ rebase してから後続を作る。

## OTel/observability 面の依存グラフ（260729-otel-upstream、履歴、observed `22ee27dbe`）

内部依存は `grep -l 'from "./amadeus-<module>.ts"'` の import 実測値（`packages/framework/core/` 正本）。

- `amadeus-journal.ts`（JSONL codec）← **5 モジュール**: `amadeus-audit.ts` / `amadeus-state.ts` / `amadeus-lib.ts` / `amadeus-journal-convert.ts` / `amadeus-otel-projector.ts`。codec 自身の依存は `node:crypto` のみで FS に触れない。なお `amadeus-utility.ts` は doctor fix-hint の文字列中にファイル名を持つだけで import edge ではない。
- `amadeus-observability.ts`（telemetry seam）← **tools 17 + hooks 12 = 計 29 モジュール**（全 tools 中 `amadeus-audit.ts` / `amadeus-bolt.ts` / `amadeus-jump.ts` / `amadeus-learnings.ts` / `amadeus-log.ts` / `amadeus-migrate.ts` / `amadeus-mirror-lifecycle.ts` / `amadeus-mirror.ts` / `amadeus-orchestrate.ts` / `amadeus-otel-projector.ts` / `amadeus-plugin.ts` / `amadeus-runtime.ts` / `amadeus-sensor.ts` / `amadeus-state.ts` / `amadeus-swarm.ts` / `amadeus-utility.ts` / `amadeus-worktree.ts` と 12 hooks）。依存先は `amadeus-lib.ts`（`activeIntent` / `activeSpace` / `auditCloneId` / `detectHarnessType` / `recordDir`）と `amadeus-mirror-config.ts`（layered config 読取）。
- `amadeus-otel-projector.ts` ← `hooks/amadeus-session-end.ts`（session-end piggyback）+ CLI 直接実行のみ。依存先は journal codec + `amadeus-lib.ts` + observability（`resolveObservabilityConfig` / `telemetryDir`）。**Core → projector 方向の依存はゼロ**（設計裁定どおり）。
- `amadeus-journal-convert.ts` → `amadeus-audit.ts` の `formatAuditRecord`（lossless proof 用の Markdown renderer）+ journal codec。

外部依存: focus 5 モジュールが使うのは `node:crypto` / `node:fs` / `node:path` と global `fetch` のみで、`@opentelemetry` を含むサードパーティ依存はゼロ（`package.json` / `bun.lock` grep 実測 0）。区間では devDependencies から `@xterm/headless` / `node-pty`（連鎖して `node-addon-api`）が外れた。区間の新規内部依存（focus 外）: mirror-project 系は `amadeus-mirror-capability.ts`（mutation permit）と import-free な `amadeus-mirror-project-contract.ts`（field vocabulary）へ依存し、新設の `amadeus/config.json` の `mirror-projects` キーを入力とする。直後の `260728-slop-cleanup` 断面は履歴として保持する。

## Slop cleanup の依存断面（260728-slop-cleanup、履歴、observed `ca8ff0af4`）

外部依存・パッケージ依存・モジュール依存の追加や削除はない。Journal codec の現行依存をコメントへ正しく反映するだけで、実コード上の 5 import edge（audit / state / lib / journal-convert / otel-projector）は不変である。Observability の `registered` は依存されないフィールドで、削除後も `_processObservation !== null` が登録状態の唯一の判定となる。core 正本変更の生成依存として 7 `dist` 面と 5 self-install 面の同期が必要である。直後の `260727-plugin-verb-skills` 断面は履歴として保持する。

### 履歴: 260727-plugin-verb-skills

> **2026-07-28（intent `260727-plugin-verb-skills`、amadeus-feature / Brownfield）: 区間に新規外部依存なし。前区間が「欠落していた依存エッジ」として記録した 4 件は解消し、内部エッジが 2 本追加された（測定 ref: observed `afb93a825`、base `0c4709102`（祖先 exit 0）、距離 **16**）。** **(1) 新設エッジ: `scripts/promote-self.ts` → `scripts/plugin-projection.ts`** — `:37` verbatim `import { SELF_INSTALL_HARNESSES } from "./plugin-projection.ts";`、消費点 `:186`。同名 `PACKAGE_HARNESSES` の独立定義は撤去され、5 面集合の canonical は `plugin-projection.ts:56` 一箇所（#1575 の是正形）。**これは `scripts/` 内の消費者統合であり、配布面には現れない**（両ファイルとも repo-local）。 (2) **既存エッジの確認: `scripts/plugin-projection.ts` → `packages/framework/core/tools/amadeus-plugin.ts`** — `:64` verbatim `import { PLUGIN_SOURCE_DIR_NAME } from "../packages/framework/core/tools/amadeus-plugin.ts";` が INSTALL doc の案内先（`:598`）を discovery 定数から導出する。案内先と走査先のドリフトは構造的に不能（#1569 の封鎖）。**依存方向は packager → core の一方向で、core が `scripts/` を import する逆向きは無い**（dist に載るエンジンが `scripts/` へ依存しない境界の維持）。 (3) **新設エッジ: `spawnRecompile` → 2 ツール** — `amadeus-plugin.ts:253-263` が `amadeus-graph.ts` と `amadeus-runtime.ts` を**この順序で** spawn する（#1592）。順序自体が依存関係の表明（stage graph の再構築が runtime graph に先行しないと合成ステージが到達不能）。 (4) **解消した「欠落エッジ」**: standalone doctor → `doctorPluginRows`（`renderPluginCliResult:657` で結線、#1585）、`writeHost` の `mkdir(recursive)` ⇔ 除去側の対称化（判定を `pluginArtifactsAbsent:432` / `hasEmptyAncestorDir:443` の FS 実測へ寄せて封鎖、#1586）、テスト → 出荷面（`t341` が `dist/claude` を駆動、#1589）。 (5) **残る「欠落エッジ」= 本 intent の設計対象**: (a) `amadeus-utility.ts` → plugin CLI の**委譲エッジが無い**（`switch (subcommand)` `:5945` に `case "plugin"` 不在、`grep -n '"plugin"'` = 0 hit。先例は `handleMigrate:5900` の 1 件） (b) `amadeus-runner-gen.ts` → plugin 識別語彙の**依存が無い**（`isRunnableStage:88-90` が `phase` のみを見る一方、`amadeus-graph.ts:1675-1678` は `PluginStageFile` に `pluginName` を持たせない設計 — 両者の間に情報経路が存在しないのが #1598 の構造要因） (c) `core/skills/amadeus-mirror/SKILL.md:14-16` のハーネス面列挙が投影行列（`harness/projections.ts:300` ほか）から**導出されず手書き**（5 面記載 vs 7 面投影の陳腐化、ドリフトガード対象外）。 **修正時の同期対象**: `core/tools/` / `core/hooks/` / `core/skills/` を触るなら 7 ハーネス dist + 5 面 self-install の再生成（cid:build-and-test:bt-dist-regen-seven-harnesses）、統合 CLI の動詞を足すなら case・`die` usage 文字列（`:6033`）・`HELP_TEXT_TAIL`（`:216`、`t67` が pin）の 3 面、新スキルなら正本 + 対象面の投影列挙 3 系統のいずれか。新規パッケージ依存の追加なし。詳細は本 scan の `architecture.md` / `code-quality-assessment.md` 新節。

> **2026-07-27（intent `260727-e2e-plugin-conformance`、Issue #1575 / #1585 / #1586 / #1589、Brownfield）: 区間に新規外部依存なし。欠陥はいずれも「あるべき依存エッジの欠落」（測定 ref: observed `0c4709102`、base `1673c433`（祖先 exit 0）、距離 **60**）。** 4 Issue の依存観点での性格: **#1575** — `scripts/promote-self.ts:184` が `scripts/plugin-projection.ts:56` `SELF_INSTALL_HARNESSES`（5 値の canonical）へ **依存せず同名 `PACKAGE_HARNESSES` を独立定義**している（同一集合の 3 重管理: promote-self `:184` / plugin-projection `:56` / `t-plugin-projection-packaging.ts:48` のハードコード 7 値、加えて `promote-self.ts:47-54` の `managedDirs` が 4 つ目の同義列挙）。**#1585** — standalone doctor（`amadeus-plugin.ts:591-593`）が 0 件 degrade を持つ純関数 `doctorPluginRows`（`:534-536`）へ依存していない一方、統合 doctor（`amadeus-utility.ts:2890`）は依存する。**#1586** — `amadeus-plugin-compose.ts` の `writeHost:1150`（`mkdirSync recursive`）と `removeHost:1154`（`rmSync` ファイルのみ）が対称の逆操作として結び付いていない。**#1589** — テスト側が出荷面（`dist/<harness>/<dir>/tools/amadeus-plugin.ts`）へ依存を持たず、全て正本 `packages/framework/core/tools/` を import / spawn する（唯一の spawn `t299:206` も正本パス）。既存の正しい依存エッジ: hook `core/hooks/amadeus-plugin-compose.ts` → `handlePluginCli`（合成ロジック非再実装、BR-U2-1）、CLI → 合成エンジン、`amadeus-orchestrate.ts:913` → composition record、`amadeus-graph.ts:2011-2013` → `readPluginStageFiles`。いずれも一方向で循環なし。修正時の同期対象は #1575 の展開後リテラル 2 箇所（`t209-...:152` / `t-plugin-projection-packaging.ts:161`）と、#1585 / #1586 に伴う 7 ハーネス dist + 5 面 self-install の再生成。新規パッケージ依存の追加なし。詳細は本 scan の `architecture.md` / `code-quality-assessment.md` 新節。

> **2026-07-27（intent `260727-install-doc-mismatch`、[Issue #1569](https://github.com/amadeus-dlc/amadeus/issues/1569)、amadeus-bugfix / Brownfield）: 区間に新規外部依存なし。ただし内部の「非依存」が欠陥の温床（測定 ref: observed `46a75f2e7c53aaa475a19cc217d10c9172ad4129`、base `0d83aa48b`、距離 70）。** `git diff --name-only 0d83aa48b..HEAD -- package.json bun.lock` は本 intent の対象ではなく、#1569 の核は**依存エッジの欠落**である — install bundle を生成する `scripts/plugin-projection.ts`（`installDoc:593`）は、discovery の staging root 定数 `pluginSourceRootOf`（`packages/framework/core/tools/amadeus-plugin.ts:278`、`.amadeus-plugin-src`）に**依存していない**（`grep -c ".amadeus-plugin-src" scripts/plugin-projection.ts` = **0**、実測）。両モジュールが独立管理のため、案内先（`<harnessDir>/plugins/<name>/`）と走査先（`.amadeus-plugin-src/<name>/`）がドリフトした。加えて docs（`docs/guide/19-plugins.md:183` / `19-plugins.ja.md:175`）が installDoc の内容を手書き複製しており、これらも installDoc への「明示依存」を持たない（ドリフトガード非対象）。修正の同期対象は installDoc 正本 → dist 6 面 INSTALL.md（`package.ts:832` の機械ガードあり）+ docs EN/JA（手動同期）。plugin ホスト配信のコンポーネント間依存（`amadeus-plugin.ts` → `amadeus-plugin-compose.ts` → 3面 atomic transaction）は本区間で新規着地（前 intent `260726-plugin-host-delivery` の Construction）。詳細は本 scan の `architecture.md` / `code-structure.md` / `component-inventory.md` 新節。

> **2026-07-27（intent `260727-docs-impl-sync`、amadeus-document / Brownfield）: 外部依存の追加なし。区間内で内部依存エッジが 3 本追加・1 本反転した。** 測定 ref: observed `aabc0527d`、base `1673c4332`（祖先 exit 0 / 距離 **47**）。利用者側 Bun-only 前提は不変（project.md § Forbidden の runtime dependency 追加禁止に抵触なし）。内部エッジの変化: (1) **新設** `core/hooks/amadeus-plugin-compose.ts` → `core/tools/amadeus-plugin.ts`（`handlePluginCli`、`:9` import）および → `core/tools/amadeus-lib.ts`（`readHookStdin` / `resolveProjectDirFromHook`、`:8` import）。hook は CLI の薄いラッパで合成ロジックを再実装しない（BR-U2-1）ため、依存方向は hook → CLI → エンジンの一方向で循環なし。 (2) **新設** `core/tools/amadeus-plugin.ts` → `core/tools/amadeus-plugin-compose.ts`。 (3) **反転** `scripts/plugin-composition.ts` が `core/tools/amadeus-plugin-compose.ts` へ移設されたことで、従来「dist 同梱面 → `scripts/`」だった依存が消え、`scripts/plugin-projection.ts` が **core 側の単一定義を re-export する消費者**へ降格した（`:38-40` の設計コメントが「packager 自身の既定ターゲットは manifest-DISCOVERED のまま」と境界を明示）。 (4) `scripts/metrics-visualize.ts` → `scripts/metrics-timeseries.ts`（共有検証済みリーダ seam）+ `scripts/metrics-retention.ts` — private parser を持たず、writer/reader/pruner/renderer が「妥当なスナップショット」の定義で合意する構造。**docs 面の依存**: `README.{md,ja.md}` / `docs/guide/19-plugins.{md,ja.md}` / JA hook 記述 4 ファイルは、それぞれ `packages/framework/harness/*/`・`scripts/plugin-projection.ts:41-49`/`:55`・`packages/framework/core/hooks/*.ts` に**論理的に依存**するが、この依存は手書き複製であり機械的な導出・検査エッジを持たない（= 本 intent の乖離の構造要因）。詳細は `code-quality-assessment.md` / `architecture.md` / `code-structure.md` の同 intent 節、`re-scans/260727-docs-impl-sync.md`。

> **2026-07-27（intent `260726-answer-manual-binding`、[Issue #1548](https://github.com/amadeus-dlc/amadeus/issues/1548) bug、amadeus-bugfix / Brownfield）: 本 intent 断面は対象外（依存エッジに変化なし）。** 測定 ref: observed `ad1ff5de9`、base `09c669901`、距離 2。区間 2 コミットは record-only で mirror answer/guard スタックの source 変更ゼロ。#1548 は mirror lifecycle 内の欠陥（answer 転送 `amadeus-mirror-lifecycle.ts:969-985` + guard `:257-265`）で、外部依存・パッケージ依存・モジュール間依存エッジの新設はない（adapter→coordinator の既存呼び出し関係のみ）。修正は runtime dependency を追加しない。詳細は上流入力 `re3-dev-scan-result.md` と本 scan の `architecture.md` / `code-quality-assessment.md` 新節、`re-scans/260726-answer-manual-binding.md`。

> **2026-07-27（intent `260726-t258-p95-flake`、[Issue #1511](https://github.com/amadeus-dlc/amadeus/issues/1511) bug/P2/S3-MAJOR、amadeus-bugfix / Brownfield）: 本 intent 断面は対象外（依存グラフに変化なし）。** 測定 ref: observed `09c669901`、base `f9a0fb86a`、距離 2。区間 32 ファイルはすべて `amadeus/` record で `package.json` / `bun.lock` の変更なし。#1511 の患部はテスト（`tests/integration/t258` / `t257`、child helper）と CI 設定のみで、新規パッケージ依存も内部依存エッジの追加もない。詳細は上流入力 `re2-dev-scan-result.md` と本 scan の `code-quality-assessment.md` / `architecture.md` 新節、`re-scans/260726-t258-p95-flake.md`。

> **2026-07-26（intent `260726-mirror-state-split`、[Issue #1547](https://github.com/amadeus-dlc/amadeus/issues/1547) + [Issue #1534](https://github.com/amadeus-dlc/amadeus/issues/1534)、amadeus-bugfix / Brownfield）: 区間に新規パッケージ依存なし。内部依存エッジも無変化（測定 ref: observed `f9a0fb86a`、base `1673c4332`、距離 38）。** 区間で `package.json` / `bun.lock` の依存グラフに変化なし。本 intent が触る内部依存エッジはいずれも区間内で無変更（mirror スタック 8 モジュール各 `git log --oneline 1673c4332..HEAD -- <path>` = 0 行）— Write 経路 `amadeus-mirror.ts`（`runLegacyMutation:533`）→ `amadeus-mirror-lifecycle.ts:629` → `amadeus-mirror-executor.ts:71` → `amadeus-mirror-state-store.ts:158` → `amadeus-mirror-state-codec.ts`（sentinel）、Read 経路 status（`amadeus-mirror.ts:169`）と orchestrate 境界（`amadeus-orchestrate.ts:314` / `:3522`）が同じ `amadeus-state.md` を `getField` で読む、marker 経路 `amadeus-mirror-lifecycle.ts:30` → `amadeus-mirror-provenance.ts`（`renderMirrorMarker:47` / `verifyOwnership:149`）。**分裂の本体は「同一 record を read/write が別フィールドで参照する」データ依存の非対称**であり、モジュール import グラフの欠陥ではない。read を v1 codec（`parseMirrorStateDocument:1301`）へ寄せる修正は `amadeus-mirror.ts` / `amadeus-orchestrate.ts` から state-codec への新規エッジを 1 本足す方向（既存の write 側が既にこのエッジを持つため既習様式）。詳細は上流入力 `inception/reverse-engineering/scan-notes.md`。

> **2026-07-26（intent `260726-plugin-host-delivery`、amadeus-feature / Brownfield）260726-plugin-host-delivery 差分リフレッシュ: 区間に新規外部依存なし（測定 ref: observed `0d83aa48b886fe85cd977569c0e7b3015b84d3e5`、base `1673c4332`、距離 43）。** `git diff --name-only 1673c4332..HEAD -- package.json bun.lock` は**出力 0 件**。区間で追加された内部依存エッジは (1) `scripts/metrics-visualize.ts`（新規） → `./metrics-retention`（`METRICS_RETENTION_KEEP_LAST`）+ `./metrics-timeseries`（import `:15-19` 直読 — 前 intent 節が予告した「独自 parser を持たず既存 reader へ張る」既習様式どおり） (2) kimi ハーネス面 — `packages/framework/harness/kimi/`（8 ファイル）と `packages/setup/src/{domain,modules}/kimi-hooks.ts`、および `scripts/plugin-projection.ts:60` `SELF_INSTALL_HARNESSES` への `"kimi"` 追加（closed four → closed five） (3) `tests/lib/plugin-discovery-overhead-gate.ts`（新規、[PR #1535](https://github.com/amadeus-dlc/amadeus/pull/1535)）。opencode の `plugin/amadeus-opencode-vocab.ts` は `lib/` へ改名され（R089）、参照元 `manifest.ts` / `plugin/amadeus-opencode-plugin.ts` が同一変更で追従。CI 面は lizard `==1.23.0` の pin（外部ツール依存の固定化）と metrics render/drift-check ジョブの追加（`.github/workflows/ci.yml` diff 直読）。plugin-composition / formal-model-check / `dist/plugins` / トップレベル `plugins/` への依存エッジは区間内で無変化（該当パスの diff 0 件）。
> **2026-07-26（intent `260726-mirror-envelope-lf`、[Issue #1498](https://github.com/amadeus-dlc/amadeus/issues/1498) P1/S2、amadeus-bugfix / Brownfield）: 区間に新規パッケージ依存なし。ただし外部 CLI 依存 `gh` の実出力形式が本 intent の中心論点（測定 ref: observed `e39402224`、base `1673c4332`、距離 27）。** `gh` は optional dependency として `cid:practices-discovery:gh-scripts-boundary` で許容済みだが、本 scan は**その出力形式への依存が未実測仮定のまま焼き込まれている**ことを実測した — 実測環境は `gh version 2.96.0 (nixpkgs)`（`gh --version` 出力）で、`--include` のステータス行は LF 終端・ヘッダ行は CRLF。区間で `package.json` / `bun.lock` の依存グラフに変化はなく、区間の実装変更（前 intent の 6 修正 + CI ジョブ分割 + metrics ダッシュボード）も新規エッジを追加していない。内部依存エッジも無変化 — `amadeus-mirror-lifecycle.ts:29` → `amadeus-mirror-gateway.ts`、`packages/framework/harness/projections.ts:26` の投影宣言、`tests/unit/t272`（`:11`）/ `t270`（`:10`）の import はいずれも区間内で無変更。詳細は上流入力 `inception/reverse-engineering/scan-notes.md`。

> **2026-07-26（intent `260726-crossreviewed-bug-batch`、クロスレビュー済みバグ7件、amadeus-bugfix / Brownfield）: 区間に新規依存エッジなし（測定 ref: observed `1673c4332`、base `e12259ba7`、距離 2）。** 区間の正本変更は `amadeus-lib.ts` 1ファイル（35 insertions / 3 deletions）のみで、外部パッケージ依存の追加も無い。本 intent の7件が触る依存境界は既報のもの — election サブシステム内で **`amadeus-election.ts` が [#1457](https://github.com/amadeus-dlc/amadeus/issues/1457) と [#1458](https://github.com/amadeus-dlc/amadeus/issues/1458) の交差点**（`amadeus-election-record.ts` / `amadeus-election-transport.ts` へそれぞれ依存）であり、[#1459](https://github.com/amadeus-dlc/amadeus/issues/1459) の `amadeus-election-model.ts` は他2件と非交差。[#1377](https://github.com/amadeus-dlc/amadeus/issues/1377) は `amadeus-lib.ts` → `amadeus-audit.ts` → emitter（`amadeus-learnings.ts` ほか）の扇状依存に触れる。詳細は上流入力 `inception/reverse-engineering/scan-notes.md` と本 scan の `architecture.md` / `component-inventory.md` 新節。

> **2026-07-26（intent `260726-metrics-visualization`、amadeus-feature / Standard）: 変更なし、確認済み（測定 ref: observed `1c43438df`、base `11f1ad61f`、距離 5）。** 区間内で `package.json` / `bun.lock` の diff は空。**可視化の依存方針も追加ゼロ**（外部チャートライブラリの導入なし、inline SVG で完結 — 詳細は `technology-stack.md` の同 intent 節）。
>
> **既存 metrics サブシステムの依存グラフ（observed 実測）**: `metrics-snapshot.ts → ../tests/complexity-gate.ts（runLizard）/ ../tests/lib/test-size.ts`、`metrics-retention.ts → metrics-timeseries.ts（parseSnapshot、:17）`。後者は「pruner が reader の妥当性定義を import する」明文契約（`metrics-retention.ts:6-9`）であり、**可視化も独自 parser を持たず同じエッジを張るのが既習様式**。追加されるエッジは `metrics-visualize（新規） → metrics-timeseries` の1本のみで足りる見込み。
>
> **重要な独立性**: `scripts/metrics-*.ts` の3ファイルはいずれも `amadeus-lib` を import しない（`grep -c 'amadeus-lib' scripts/metrics-*.ts` = 各 **0**）。したがって区間の実装2系統（PR #1483 の grant/presence 新規2モジュール +1,388 行、PR #1493 の全11フック + `resolveProjectDirFromHook:269` シグネチャ変更）はいずれも可視化の依存前提に影響しない。**逆方向の注意**: 可視化が framework core（`packages/framework/core/`）へエッジを張ると、`dist/` 6ハーネス投影と self-install の同期対象になる。`scripts/` 直下に留める限りその負担は生じない（`scripts/*.ts` は dist・contrib いずれの投影対象でもない repo ローカル層。既存の `scripts/amadeus-election-migrate.ts` / `scripts/distribution-transaction.ts` / `scripts/formal-verif/*.ts` が同層の実例。**なお過去の codekb 節が「`scripts/amadeus-mirror.ts` 前例」と記す箇所があるが、本 scan の実測では `scripts/amadeus-mirror.ts` は存在せず、mirror 系は `packages/framework/core/tools/amadeus-mirror-*.ts`（配布 `.claude/tools/`）である — 履歴節の当該引用は失効している**）。
> **2026-07-26（intent `260726-grant-scope-gate`、[#1497](https://github.com/amadeus-dlc/amadeus/issues/1497)、amadeus-bugfix / Brownfield）: 最小追記（測定 ref: observed `e12259ba7`、base `11f1ad61f`、距離 4）。** 区間の [PR #1483](https://github.com/amadeus-dlc/amadeus/pull/1483) が **core 中立層に新規モジュール 2 本**（`amadeus-grant-authorization.ts` 876 行 / `amadeus-presence-reservation.ts` 512 行）を追加し、依存グラフに新規エッジが入った。外部パッケージ依存は追加されていない（`package.json` / `bun.lock` の区間 diff は空）。

> 新規エッジ（`grep -n` 実測、observed `e12259ba7`）: `amadeus-grant-authorization.ts:16` → `amadeus-lib.ts` の `standingGrantSatisfiesGate` ほか / `amadeus-orchestrate.ts:1597` `routeMainWorkflowDirective` → `amadeus-grant-authorization.ts:739` `routeSoloStandingGrantDirective` / `amadeus-state.ts:80` → `amadeus-lib.ts` の同述語。すなわち **`standingGrantSatisfiesGate` は solo 経路（`amadeus-grant-authorization.ts:336`）と team 経路（`amadeus-state.ts:2470` / `:3269`）の双方が扇状に依存する共有述語**であり、その解決方式を差し替える修正は両経路へ一様に波及する。

> 既存の非対称エッジ（本 intent の論点）: 同述語だけが `stage-graph.json` の `stage.scopes` へ依存し、engine の他の scope 解決（`nextInScopeStage` `amadeus-lib.ts:6828` / `firstInScopeStageOfPhase` `:6891` / `subgraphForScope` `amadeus-graph.ts:959`）は `scope-grid.json` + `.claude/scopes/*.md` へ依存する。**同一の問いに対する依存源が二系統に分かれている**。grid 側へ寄せる修正は `amadeus-graph.ts` → `amadeus-lib.ts` の既存 import と循環するため、lazy require の既習様式（`amadeus-lib.ts:6898-6902`）を要する。

> **2026-07-26（intent `260725-worktree-ref-fixes`、[#1482](https://github.com/amadeus-dlc/amadeus/issues/1482) / [#1481](https://github.com/amadeus-dlc/amadeus/issues/1481) / [#1455](https://github.com/amadeus-dlc/amadeus/issues/1455)、amadeus-bugfix / Minimal）: 変更なし、確認済み（測定 ref: observed `11f1ad61f`、base `ec624022f`、距離 10）。** 依存グラフに新規エッジなし。本 intent が扱う3欠陥はいずれも**既存エッジの性質**に起因する — #1482 は `core hooks → amadeus-lib.resolveProjectDirFromHook → process.env` のエッジが env の鮮度を検証せず無条件採用すること（実呼び出し12箇所が同一の解決関数に扇状依存するため、単一欠陥が一様に波及する）、#1481 / #1455 は `t257 / t258 / t259 → git 内部レイアウト（FS 直読）` という**3本の重複エッジ**が git worktree の ref 配置（loose ref が common dir 側にある）を織り込んでいないこと。**修正はいずれも依存を追加せず、#1482 は解決関数内の rung 順序、#1481 は FS 直読エッジを既存の git サブプロセス様式（`amadeus-lib.ts:4131` `resolveMainCheckout`）へ付け替えて3本を1本へ集約する方向に閉じる。** 区間内で `package.json` / `bun.lock` の diff は空。

> **2026-07-25（intent `260725-teamup-launch-hardening`、[#1476](https://github.com/amadeus-dlc/amadeus/issues/1476) / [#1478](https://github.com/amadeus-dlc/amadeus/issues/1478)、amadeus-feature / Standard）: 変更なし、確認済み（測定 ref: observed `4a0f91ad0`、base `ec624022f`、距離 9）。** 依存グラフに新規エッジなし。本 intent が扱う2欠陥はいずれも**既存エッジの性質**に起因する — U1（#1476）は `team-up.sh → agmsg ready sentinel` の書き手側（actas モードの `watch.sh`）が repo 外にあり repo 内テスト・センサーから到達不能であること、U2（#1478）は `team-up.sh → git worktree` が同一 `.git` の内部ロックを共有すること（実測で失敗はゼロだが並列度7でスループット劣化）。**PR #1477 は依存を1本も追加せず、既存エッジの利用可否を判定するガードのみを足した。**

> **2026-07-25（intent `260725-teamup-attach-latency`、[#1449](https://github.com/amadeus-dlc/amadeus/issues/1449)、amadeus-bugfix / Minimal）: 変更なし、確認済み（測定 ref: observed `ec624022f`、base `6d4df9056`、距離 125）。** 依存グラフに新規エッジなし。ただし本 intent の欠陥は既存エッジ `team-up.sh → agmsg ready sentinel` の**片側（書き手 = actas モードの watch.sh）が repo 外**にあることに起因する。この境界は repo 内のテスト・センサーから到達不能である。

## Issue #1466 solo standing grant（260725-solo-standing-grants、2026-07-25、履歴）

base `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`、observed `4491310cc0b432eb404524ef30a7d8a0a3f68f73`。[Issue #1466](https://github.com/amadeus-dlc/amadeus/issues/1466)。[PR #1468](https://github.com/amadeus-dlc/amadeus/pull/1468) は凍結試作で参考のみ、実装前提にしない。

現行鎖は `HUMAN_TURN → GRANT_ISSUED → 全 intent audit 探索（失効 / 取消 / provenance）→ standingGrantSatisfiesGate → DELEGATED_APPROVAL（Grant Id）→ lock 内 approve authorization → GATE_APPROVED（Grant Id）→ STAGE_COMPLETED → state advance`。phase boundary は include flag が必要で、walking skeleton 有効時は対象外である。solo はこの remote delegation dependency を必要としない。

## 欠落依存と候補

route の `RunStageDirective` と commit の `report → approve` の間に Grant Id の依存辺がない。候補は exact ID transport、opaque claim resolver、commit-only 再探索。gate existence は graph / scope / skeleton / per-unit artifacts、authorization は presence / provenance / expiry / revoke に依存し、混同しない。fallback は audit / state / advance より前で、既存 `error() → ERROR_LOGGED` に依存しない。

## Mirror レビュー修正の依存グラフ（260725-mirror-review-fixes、履歴）

観測 HEAD は `70336937529f5be31c011de5d368c0f03e534506`、差分 base は `6d4df90566dcf7aa00980e5f9e85c831ca9108ba`。

```text
amadeus-orchestrate.ts / amadeus-mirror-lifecycle.ts
  -> amadeus-mirror-coordinator.ts
     -> amadeus-mirror-policy.ts
     -> amadeus-mirror-executor.ts
        -> amadeus-mirror-gateway.ts -> gh / GitHub API
        -> amadeus-mirror-state-store.ts
           -> state-codec.ts -> state-reducer.ts -> provenance.ts

amadeus-mirror.ts legacy mutation
  -> gh direct + amadeus-state.md direct write  [正準鎖を迂回]

tests/run-tests.ts
  -> coverage-normalize.ts
     -> coverage-source-path.ts
        -> packages/framework/core/* canonical source
```

修正の依存方向は、legacy mutation を正準 lifecycle 鎖へ向け、coordinator から CLI 表現への逆依存を作らない。prompt binding の domain 判定は coordinator/policy に維持し、CLI は保存済み `bindingId` を含む回答の parse と exit/result 表現だけを所有する。現行の回答型には `bindingId` がなく、skip は policy 照合を迂回するため、表現層の追加だけでなく domain 境界の対称な照合が必要である。config reader と state codec は GitHub や workflow state に依存しない入力境界であり、独立 unit/integration test が可能である。

配布依存は `packages/framework/core/` 正本→root harness (`.claude/.codex/.cursor/.opencode`)→`dist/{claude,codex,kiro,kiro-ide,cursor,opencode}` の一方向。coverage 正規化はこの6 harness mapping と同じ集合を共有すべきで、現行の Claude/Codex/Kiro だけの手書き部分集合が drift 原因である。

> **2026-07-25（intent `260725-kimi-harness`、amadeus-feature）: 変更なし、確認済み。** 内部依存の交差は `amadeus-lib.ts` → 新規 `amadeus-harness.ts`（ハーネス検出の移管先、lib は compat facade）のみで、パッケージ依存に変化なし。plugin-composition の `node:crypto` は stdlib で依存追加ではない（base `6d4df9056` → observed `d31b8a5db`）。

> **2026-07-24（intent `260724-watcher-timeout-fix`、[#1449](https://github.com/amadeus-dlc/amadeus/issues/1449)、amadeus-bugfix / Minimal）: 変更なし、確認済み。** 内部依存の交差は `team-up.sh` → agmsg `actas-lock.sh`（`agmsg_ready_path` を subshell source）と herdr CLI で、いずれも既存の外部スキル依存。パッケージ依存に変化なし（base `a81c11dde` → observed `6d4df9056`）。

## 260723-t241-ci-residency の依存境界（履歴: 2026-07-23）

差分リフレッシュ（base `a81c11dde` → observed `78bce876`、距離 35、bugfix / Minimal、[#1294](https://github.com/amadeus-dlc/amadeus/issues/1294)）。パッケージ依存に変化なし。内部依存の交差は t241 → `scripts/amadeus-election.ts`（spawnSync 子プロセス）、テスト tier 判定 → `tests/lib/test-size.ts`（`classifyTestSize`）、CI → `package.json` test scripts。t241 の e2e→integration 移設候補は `tests/integration/` の election spawn 兄弟 6 本（t235/t236/t240/t242/t244 + t-formal-verif-arm-s-blind）と同一依存様式（測定 ref: scan-notes @ observed HEAD `78bce876`）。

## 260722-teamup-prompt-race の依存境界（2026-07-22、履歴）

bugfix / Minimal（observed `a81c11dde`）。本バグの依存境界:

```text
scripts/team-up.sh (claude_member_cmd)
  -> scripts/run-claude.sh (exec claude "$@")   # init_prompt を位置引数で委譲
  -> Herdr pane run/send-text/send-keys          # pane 起動・再注入経路
  -> agmsg spawn.sh handshake / ready センチネル   # 対照契約（repo 外、read-only）
     agmsg_ready_path (lib/actas-lock.sh) <- watch.sh (touch)
```

最重要の依存事実は、claude の watcher 起動が「team-up.sh の init_prompt 一発 → claude 初回ターン → watch.sh 起動 → センチネル生成」という**一方向の連鎖**に依存し、初期プロンプト消失時に連鎖全体が不成立になる点（SessionStart hook 経由の `emit_monitor_directive` `delivery.sh:302-311` も初回ターン未到達で未実行）。修正は `scripts/` に閉じ、core/harness 正本・dist/self-install への従属依存は想定薄（実装時に実 diff で再評価、cid:code-generation:c6）。

> 以下は過去 intent の履歴。

## upstream-sync-230 の依存境界（2026-07-20、履歴）

```text
stage-schema + unit-kind
  -> graph/parser/directive/sensor
  -> plugin discovery/package
  -> 6 harness projection
  -> compose/no-clobber/self-heal compile
  -> dist
  -> 4 harness self-install
  -> tests/docs
```

最重要の内部依存は、`stage-schema-extensions` と `unit-kind-pruning` が同じ schema/graph blast radius を共有する点である。両者を別々に先行着地させると中間状態で parser/directive/sensor の契約が割れるため、共有設計を先に確定する。plugin 依存順は `stage-schema-extensions` → `packager-plugin-projection` → `plugin-compose-hook` → `test-pro-reference-plugin` / `plugin-docs` である。

| 依存種別 | 境界 |
|---|---|
| Core → harness | upstream の4面前提を6ホストへ ADAPT |
| Source → dist | `scripts/package.ts` が唯一の投影経路。手修正禁止 |
| Dist → self-install | `promote-self.ts` の4ハーネス closed list。packager の6面 discovery と混同しない |
| Plugin source → host | source、`dist/plugins`、host projection の所有権を分離し no-clobber を検査 |
| Tests/docs → feature | D7/D8 は各採用項目と同じ着地単位に従属 |

外部 package の主要依存は SDK 0.3.158、xterm `^5.5.0`、node-pty 1.1.0、fast-check `^4.9.0`、TypeScript `^6.0.3`、Biome 2.4.16。plugin 機構はこの集合へ新しい runtime dependency を追加しない。

> 以下は過去 intent の履歴。

## Codex hooks／agmsg の依存境界（intent 260718-hooks-config-conflict、2026-07-18、履歴）

```mermaid
flowchart TD
  Wiring["HOOK_WIRING: 9 Amadeus commands"]
  Example["Tracked hooks.json.example"]
  Active[".codex/hooks.json: tracked active config"]
  Codex["Codex runtime and trust seed"]
  Run["run-codex.sh or team-up.sh"]
  Shim["agmsg codex-shim and monitor"]
  Delivery["delivery.sh set monitor"]
  Json1["SQLite JSON1 strip, add, compact write"]
  Bridge["Codex app-server bridge"]
  Dirty["Git dirty plus absolute local paths"]

  Wiring --> Example --> Active --> Codex
  Run --> Shim --> Delivery --> Json1 --> Active
  Shim --> Bridge
  Active --> Dirty
```

テキスト代替: Amadeus の `HOOK_WIRING` は tracked example を生成し、active `.codex/hooks.json` へコピーされた後に Codex runtime／trust seed が読む。別経路では `run-codex.sh` または `team-up.sh` が外部 agmsg shim／monitor を起動し、`delivery.sh set monitor` と SQLite JSON1 writer が同じ active file を書き換える。bridge delivery は成立する一方、tracked file には compact rewrite と絶対 skill／clone path が残る。

agmsg 1.1.7 は package dependency ではなく `~/.agents/skills/agmsg/` にある外部 runtime dependency である。mode reader と writer はともに active hooks を真実源とし、monitor 起動ごとに再設定する（`type.conf:18-22`、`delivery.sh:63-220`、`codex-monitor.sh:194`）。[PR #783](https://github.com/amadeus-dlc/amadeus/pull/783) が防御した `.codex/agmsg-delivery-mode` は現行 source の reader／writer双方で不在であり、残件の依存境界ではない。

恒久案は active file の untrack／ignore、または tracked static dispatcher + ignored sidecar の二案が `【裁定待ち】`。前者は外部 agmsg を変更せず現行 bridge 経路を維持できるが canonical migration が必要、後者は tracked canonical を維持できるが Amadeus／agmsg の協調変更と互換検証を要する。新規 package 依存の要否も裁定後に決める。

## swarm driver の現行依存グラフ（intent 260713-swarm-driver-migration、2026-07-13、履歴）

```mermaid
flowchart TD
  State["Workflow state and runtime graph"]
  Engine["amadeus-orchestrate eligibility"]
  Directive["driver-neutral invoke-swarm"]
  Conductor["Harness conductor prose"]
  Worker["Task, Workflow, codex exec, or subagent"]
  Referee["amadeus-swarm referee"]
  Worktree["Unit worktree"]
  Bolt["Bolt state and merge"]
  Audit["Swarm audit events"]
  Core["Canonical core source"]
  Harness["Canonical harness source"]
  Package["scripts/package.ts"]
  Dist["dist per harness"]
  Promote["Claude, Codex, Cursor, and OpenCode self-install"]

  State --> Engine --> Directive --> Conductor --> Worker
  Conductor --> Referee
  Referee --> Worktree --> Worker
  Worktree --> Bolt --> Referee --> Audit
  Core --> Package
  Harness --> Package --> Dist --> Promote
```

テキスト代替: workflow state と runtime graph を engine が読み、driver-neutral な `invoke-swarm` を harness conductor へ渡す。conductor はハーネス固有 worker surface を選び、referee が準備した Unit worktree 上で実行する。Bolt は worktree lifecycle と merge を担い、referee が収束を再検証して監査へ記録する。別の生成依存として core／harness 正本を `scripts/package.ts` が各 `dist` へ投影し、Claude／Codex／Cursor／OpenCode を self-install へ反映する。

新契約で追加される依存は、core の deterministic selector、harness の capability probe／driver adapter、referee が受け取る driver-aware audit metadata、native event／trace classifier である。外部 package 追加は現時点で不要で、既存ローカル CLI と live tool を利用する。依存方向は selector→adapter→worker、選択結果→referee audit とし、referee から AI provider へ依存させないことが現行境界を保つ条件である。

> 以下は過去 intent の依存記録。#735 の source-side unreferenced scan は現行 `scripts/package.ts:711-725` で解消済み。

## packaging の入力依存(intent 260710、#735)

```mermaid
flowchart TD
  ManifestTypes["scripts/manifest-types.ts (HarnessManifest 契約)"]
  Manifests["harness/&lt;name&gt;/manifest.ts (4 harness)"]
  CoreTree["core/ (coreDirs.src で walk)"]
  HarnessSrc["harness/&lt;name&gt;/ (harnessFiles.src で個別コピー)"]
  Package["scripts/package.ts (buildTree/checkHarness)"]
  Dist["dist/&lt;name&gt;/"]

  ManifestTypes --> Manifests
  Manifests --> Package
  CoreTree --> Package
  HarnessSrc --> Package
  Package --> Dist
```

<!-- text fallback: scripts/package.ts は scripts/manifest-types.ts の HarnessManifest 契約を各 harness/<name>/manifest.ts が実装したデータとして require() し、core/(coreDirs で全 walk)と harness/<name>/(harnessFiles の列挙分のみ)を入力として dist/<name>/ を生成する。#735 の観点では、harnessFiles に列挙されない harness ソースは入力依存グラフに現れず build 不可視になる — この「参照されないソース」を検出する source 側の依存整合チェックが現状存在しない。 -->

外部依存: source-unreferenced-check intent 区間(38コミット)で開発依存に **`fast-check ^4.9.0`**(PBT、#722)が追加された(`package.json` L32、`bun.lock`)。property-based test(setup の manifest roundtrip / semver / audit escape 等、#697 Phase B)と動的 test-size 計測(#732、`tests/lib/test-size.ts`)、codecov 導入(`codecov.yml`、`.github/workflows/ci.yml` 更新)が主な追加。packaging 自体の外部依存に変更はない。

## 複雑度ゲートの外部依存追加予定(intent 260710-complexity-gate、2026-07-10)

複雑度ゲート導入(feature スコープ)で加わる外部依存:

- **lizard 1.23.0(Python パッケージ、CI に pip 固定インストール予定)**: CCN 計測器。既存の CI(`.github/workflows/ci.yml` の `check` ジョブ、`oven-sh/setup-bun@v2` ベース)へ Python + pip 固定バージョンの lizard を新たな供給チェーンとして追加する(E-CX1 Q3=A、typecheck/lint 直後のステップ)。R3(CI の Python 供給変化)の一次緩和はバージョン固定、最悪時は純 Python 単一パッケージの vendoring。Biome `noExcessiveCognitiveComplexity` の有効化は既存 Biome 2.4系の範囲内で完結し新規パッケージ依存を要さない。CCN baseline(現存42関数)は `tests/` 配下の committed JSON として持つ想定(`.coverage-ratchet.json` と同型)で、開発依存の追加はない。

## 260709-gate-mechanics(前 intent、履歴)の内部依存(#685・#670)

```mermaid
flowchart TD
  Lib["amadeus-lib.ts (humanActedSinceGate/verifyDelegatedApproval/auditShardDir)"]
  State["amadeus-state.ts (handleApprove/handleDelegateApproval/handleReject)"]
  Audit["amadeus-audit.ts (VALID_EVENT_TYPES)"]
  Mint["amadeus-mint-presence.ts (HUMAN_TURN hook)"]
  Worktree["amadeus-worktree.ts (assertNotSiblingWorktree)"]
  Bolt["amadeus-bolt.ts (--worktree)"]

  Lib -->|humanActedSinceGate/verifyDelegatedApproval| State
  State -->|appendAuditEntry(DELEGATED_APPROVAL, ...)| Audit
  Mint -->|HUMAN_TURN written to own shard| Lib
  Bolt -->|--worktree 経路で create/release/merge を呼ぶ| Worktree
```

<!-- text fallback: amadeus-lib.ts's humanActedSinceGate and verifyDelegatedApproval are consumed by amadeus-state.ts's gate handlers (handleApprove, handleDelegateApproval, handleReject); handleDelegateApproval writes a DELEGATED_APPROVAL event whose validity as an event type is enforced by amadeus-audit.ts's VALID_EVENT_TYPES set. amadeus-mint-presence.ts (the UserPromptSubmit hook) is the sole writer of HUMAN_TURN events that humanActedSinceGate and verifyDelegatedApproval both read. amadeus-worktree.ts's assertNotSiblingWorktree is a separate, unrelated dependency chain reached both directly (amadeus-worktree.ts create) and via amadeus-bolt.ts's --worktree flag. #685 and #670 are independent defects in two unrelated subsystems that happen to be bundled in the same bugfix batch. -->

外部依存に変更はない(前回スキャンの確認内容を維持)。#685 の修理(新規 delegated-rejection 機構)・#670 の修理(worktree 判定基準の追加)はいずれも既存モジュール内の分岐追加で完結し、新規パッケージ依存を要求しない見込み。

## 内部依存グラフ(既存 framework 配布経路、変更なし)

```mermaid
flowchart TD
  FWCore["packages/framework/core/"]
  FWHarness["packages/framework/harness/<name>/"]
  PackageScript["scripts/package.ts"]
  Promote["scripts/promote-self.ts"]
  Dist["root dist/<name>/"]
  Runtime["root .claude/.codex/.agents/.cursor/.opencode"]
  Tests["tests/"]
  CI[".github/workflows/ci.yml"]

  FWCore --> PackageScript
  FWHarness --> PackageScript
  PackageScript --> Dist
  Dist --> Promote
  Promote --> Runtime
  Dist --> Tests
  PackageScript --> Tests
  CI --> PackageScript
  CI --> Promote
```

<!-- text fallback: packages/framework/{core,harness} が scripts/package.ts に取り込まれ root dist/<name>/ を生成し、promote-self 経由で Claude／Codex／Cursor／OpenCode の project-local tree に反映される。CI がこの一連を実行する。 -->

## #674/#675/#676/#668 の内部依存(`amadeus-lib.ts` 中心)

```mermaid
flowchart TD
  Lib["amadeus-lib.ts"]
  Swarm["amadeus-swarm.ts (handleFinalize)"]
  State["amadeus-state.ts (handleApprove/handleReject)"]
  Bolt["amadeus-bolt.ts (handleStart)"]
  Utility["amadeus-utility.ts (codekb-path)"]

  Lib -->|emitUnitConverged/emitUnitFailed/emitBoltFailed| Swarm
  Lib -->|isAutonomousMode/humanPresenceGuardDisabled/humanActedSinceGate| State
  Lib -->|auditFilePath/recordDir/spaceRecordRoot| Bolt
  Lib -->|codekbRepoName/intentRepos| Utility
```

<!-- text fallback: amadeus-lib.ts is the shared library consumed by amadeus-swarm.ts (audit emitters used by #674's finalize), amadeus-state.ts (the guard functions asymmetrically wired between approve and reject, #675), amadeus-bolt.ts (auditFilePath's bare fallback, #676), and amadeus-utility.ts (codekbRepoName's basename fallback, #668). All four bugs in this cluster trace back to logic living in this one shared file, though each bug is a distinct function within it. -->

## `@amadeus-dlc/setup` の内部依存(#677・#678 に関連)

```mermaid
flowchart TD
  HttpPort["ports/http.ts (createHttp)"]
  Fetcher["modules/fetcher.ts (推定消費側)"]
  Extractor["internal/tar-archive-extractor.ts (extractTarGz)"]
  TmpWrite["ports/fsops.ts (TmpWrite)"]
  Payload["domain/payload.ts (FetchError)"]

  HttpPort --> Fetcher
  HttpPort --> Payload
  Extractor --> TmpWrite
  Extractor --> Payload
  Fetcher --> Extractor
```

<!-- text fallback: ports/http.ts defines the Http port (getJson/downloadArchive) consumed by modules/fetcher.ts (not read in this scan; inferred from directory layout in component-inventory.md). downloadArchive's returned stream feeds into internal/tar-archive-extractor.ts's extractTarGz, which depends on the TmpWrite port (fsops.ts) for writes and shares the FetchError domain type (domain/payload.ts) with the Http port for uniform error classification. #677 and #678 sit at two different points along this same download→extract pipeline. -->

## 外部依存関係

Framework 本体・`packages/setup` に新規の外部依存追加はない。CI が依存する外部要素も変更なし(`oven-sh/setup-bun@v2` 等)。6件のバグ修理はいずれも既存モジュール内の分岐・try/catch 追加で完結し、新規パッケージ依存を要求しない見込み。

## Sibling intent 依存関係

前々回 intent `260708-installer-distribution` は完了済み。前回 intent `260709-framework-repair-batch` は requirements-analysis ゲートで park された状態(#656/#657/#641/#661 を対象)。intent `260709-bug-zero-batch` は対象コード領域が異なる独立バッチであり、前回バッチの完了を前提としない。#656(`LegacyLayout` の配線)は当時のスキャン時点で `upgrade.ts:192` から `Installation.detect` の evidence が消費されており解消済みと確認できたが、#657(`bunx tsc` の無条件使用)は `amadeus-sensor-type-check.ts:157,174` の時点でも未修理のまま残存している。#641・#661 は当時のスキャンの重点対象外のため状態未確認。bug-zero-batch のスコープはあくまで #674/#675/#676/#677/#678/#668 の6件。

## Issue #857 差分スキャン（2026-07-23）

doctor core の明示すべき依存は、個別 checks、env、cache、session cwd、filesystem、audit である。特に `worktreeBaseDir → resolveMainCheckout` は session cwd に依存し、stage graph/harness の検査は env と cache に結合している。これらを即座に純粋化するのではなく、doctor core から見える dependencies として境界化する。

## 依存方向の判断

依存方向は `runUtilityMain → 薄い CLI wrapper → doctor core → checks/dependencies` とする。CLI wrapper から checks を直接呼ばず、checks から stdout や `process.exit` を参照させない。新規外部パッケージは追加せず、既存の Bun/TypeScript/Node 標準機能と現在の audit・filesystem 実装を使う。

## 記録系 round-trip PBT の依存関係（260802-record-roundtrip-pbt、履歴、observed `9750f8aea`）

- 判断: 本 intent での実質変更なし — 外部依存の追加なし（`fast-check` は #697 で導入済み）。内部依存は 3 本 — (1) テスト → 被検コーデックの import 面が dist 出荷コピー（`t204` / `t352` / `t364`）と core 正本（`t274` / `t275`）の 2 流儀に割れており、新規分の統一方針を設計段で確定する必要がある、(2) 読み側 fail-closed 化 → 消費側呼出元（election は `Store.load` `amadeus-election-store.ts:503-510`、state は `transitionMirrorBoundaryReceipt` 等）のエラー分岐、(3) core/tools 改修 → dist 7 ハーネス + self-install 面の機械同期（`bun scripts/package.ts` + `bun run promote:self`、`dist:check` / `promote:self:check` / `t258-boundary-guard` が連動）。患部 10 パスのうち区間内コミットは `amadeus-lib.ts`（1、#2031 の +1 行）と `amadeus-audit.ts`（1、#2031 の +5 行）のみで、他 8 パスは 0 — 他の進行中 intent と交差する兆候は区間にない。

