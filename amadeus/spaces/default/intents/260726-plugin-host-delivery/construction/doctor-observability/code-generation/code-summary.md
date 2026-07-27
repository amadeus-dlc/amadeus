# コード生成サマリ — U5 doctor-observability

> 上流入力(consumes 全数): business-logic-model、business-rules、domain-entities、logical-components、reliability-design、security-design、performance-design、reliability-requirements、security-requirements、tech-stack-decisions、unit-of-work、requirements

## 実装内容

`/amadeus --doctor` に plugin 節を追加した。分岐は business-logic-model の分岐表(8 行・正本)からの機械写像のみで、doctor 側の再判定・新走査はない。

### 追加した正本(packages/framework/core/tools/amadeus-plugin.ts、+153 行)

- `readDoctorPluginObservation(hostRoot): DoctorPluginObservation` — composition / journal / drops を read-only(existsSync ガード)で読む。`record.plugins.size > 0 || journalPending` のときだけ `buildHostSnapshot` + `diagnosePlugins` を走らせ、0-plugin 常例は 3 回の existsSync のみ(performance-design 軽微追加)。U6 activation は未着地のため null。
- `buildDoctorPluginSection(obs): DoctorPluginSection` — 純射影。diagnosePlugins 戻り値 → 行、DropsRecord entry → severity 別の行、revision は composed 行の `composed@<rev>` に埋める。diag.status / DropEntry.severity は **実行時のメンバシップ検査**(`KNOWN_DIAG_STATUSES` / `KNOWN_DROP_SEVERITIES`)にかけ、union 外の値は `state: "unknown"` の loud 行へ倒す(BR-U5-8 fail-closed。dropsFromJson が JSON を無検証キャストするため実在するクラス)。frozen 入力を非破壊で読む(drop plugin は新規配列へコピーしてソート)。
- `formatDoctorPluginLine(line): string` — DoctorLineState を exhaustive 分岐して分岐表の表示文字列へ。
- `doctorPluginRows(section): DoctorPluginRow[]` — `lines.length === 0` を 0-plugin 縮退(`Plugins: 0 installed` 1 行、pass)に写像。行は `state ∈ {degraded, recovery-pending, unknown}` で pass:false。activation は末尾に pass 行として付加。

### doctor ハンドラ編入(packages/framework/core/tools/amadeus-utility.ts、+25 行)

- `DoctorContext` に `readonly pluginObservation: DoctorPluginObservation` を追加。
- `resolveDoctorContext` で `readDoctorPluginObservation(projectDir)` を一度読み deep-freeze(t257 の決定性契約 — context 解決後に再読込しない — を維持)。
- `handleDoctor` で `doctorPluginRows(buildDoctorPluginSection(pluginObservation))` を既存 `results` へ push。pass:false 行は既存の `failed > 0 → exitCode 1` へ合流(exitContribution の実現)。

### 型

U2 正本 `DoctorLine`(state union に全 variant を既に保持)を逐語再利用。新フィールド追加・既存再定義なし(BR-U5-5)。

### 設計シグネチャの整合(申告)

FD の `buildDoctorPluginSection(diag, record, judgment)` に対し、正本の分岐表(BR-U5-8)が degraded/advisory の源として DropsRecord、composed 行の rev として record の revision を必須とするため、これらを `DoctorPluginObservation`(diagnostics + drops + revision + activation)へ束ねた。純射影性は不変(引数外を読まない)。domain-entities の `exitContribution` は行単位 pass:false → 既存 doctor 集約 exit で同一意味を実現し、未消費フィールドは置かない(construction.md)。詳細は code-generation-plan.md 該当節。

### 生成物再生成

`bun scripts/package.ts`(claude/codex/cursor/kimi/kiro/kiro-ide/opencode 7 面)+ `bun run promote:self` を実行。dist / self-install は手編集せず正本から再生成。

## テスト(予約 t313–t318 のうち使用)

- `tests/unit/t313-doctor-plugin-section.test.ts` — 8 分岐射影 + DoctorLine 型正本(純、fixture)。fail-closed は union 外 status / severity を cast 注入。
- `tests/unit/t314-doctor-plugin-rows.test.ts` — 表示文字列 + 0-plugin 縮退 + activation + pass/fail(exit 寄与)。
- `tests/integration/t315-doctor-plugin-observability.integration.test.ts` — 実 read 経路。0-plugin 縮退・exit 不変、degraded 可視 + exit 1、advisory 可視 + exit 0、両 severity 共存、composed [ok] 緑、recovery-pending + exit 1、未知 severity の on-disk JSON 注入 → [unknown] + exit 1、読み取り専用 bytes 一致(BR-U5-3)。両側実測(corpus-sweep):健全 exit 0 を基準に degraded/recovery-pending/unknown が 1 へ倒れ、composed 健全・advisory は緑維持。

## 検証コマンドと exit code(全て同期実行)

| コマンド | exit code | 備考 |
|---|---|---|
| `bun run typecheck` | 0 | tsc --noEmit(src + tests) |
| `bun run lint` | 0 | Biome。触ったファイルに新規警告なし(既存警告のみ) |
| `bun scripts/package.ts` | 0 | 7 ハーネス dist 再生成 |
| `bun run promote:self` | 0 | self-install 更新 |
| `bun run dist:check` | 0 | 全 harness tree 同期 |
| `bun run promote:self:check` | 0 | self install 同期 |
| `bash tests/run-tests.sh --ci` | 0 | 583 files / 8083 assertions / 0 failed |
| 新規テスト単体(t313/t314/t315) | 0 | 30 pass / 0 fail |
| coverage lcov 照合 | 0 | fork 4ea02e41a との diff 追加行(amadeus-plugin.ts +153 / amadeus-utility.ts +25)に **DA:0 = 0 件**。全 seam を in-process 駆動(spawn-blindspot 回避) |

## 逸脱

宣言済み逸脱なし。設計シグネチャの整合(DropsRecord/revision を観測オブジェクトへ束ねる、exitContribution を行単位 pass で実現)は、正本である分岐表(BR-U5-8)と domain-entities の要求を満たす忠実な実装であり、FD の記述内の整合を明示申告した(逸脱ではない)。
