# コード生成計画 — U5 doctor-observability

> 上流入力(consumes 全数): business-logic-model、business-rules、domain-entities、logical-components、reliability-design、security-design、performance-design、scalability-design、reliability-requirements、security-requirements、tech-stack-decisions、unit-of-work、requirements

## 実装対象と方針

`/amadeus --doctor` に plugin 節を追加する。business-logic-model の分岐表(8 行 — BR-U5-8 が定める正本)を唯一の分岐源とし、diagnosePlugins の実戻り値・composition record の revision・DropsRecord・U6 ActivationJudgment からの **機械写像のみ** で節を構成する(BR-U5-1 射影のみ)。doctor 側に新判定・新走査を作らない(security-design 判定非搬送)。

正本は `packages/framework/core/`。dist・self-install は生成物として `bun scripts/package.ts`(7 ハーネス)+ `bun run promote:self` で再生成する(project.md Mandated、tech-stack-decisions 配布同期)。

## 追加・変更モジュール(logical-components 実装モジュール構成に対応)

1. **節ビルダー純関数(core 層 — packages/framework/core/tools/amadeus-plugin.ts)**
   - `buildDoctorPluginSection(obs): DoctorPluginSection` — reliability-design 射影表の実装。ポート不保持(fs / process 参照なし)、frozen 入力を非破壊で読む純関数(performance-design 入力の閉包 / security-design 純関数層)。
   - `formatDoctorPluginLine(line): string` — DoctorLineState を exhaustive に分岐して分岐表の表示文字列(`[ok]` / `[drift: …]` / `[recovery-pending: …]` / `[degraded: …]` / `[advisory: …]` / `[unknown: …]`)へ写像。
   - `doctorPluginRows(section): DoctorPluginRow[]` — 0-plugin 縮退(BR-U5-4 = `Plugins: 0 installed` 1 行)と各行の pass/fail(exit 寄与)を決める純 render。
   - `readDoctorPluginObservation(hostRoot): DoctorPluginObservation` — composition / journal / drops の read-only 読取(全て existsSync ガード)。0-plugin かつ journal 不在なら host walk を省略(performance-design 軽微追加)。
2. **doctor ハンドラ編入(core 層 — packages/framework/core/tools/amadeus-utility.ts)**
   - `DoctorContext` に `pluginObservation` を追加し、`resolveDoctorContext` で一度だけ読んで deep-freeze(t257 の「context 解決後に再読込しない」決定性契約を維持)。
   - `handleDoctor` で `doctorPluginRows(buildDoctorPluginSection(pluginObservation))` を既存 `results` に push。[degraded]/[recovery-pending]/[unknown] 行の pass:false が既存 doctor 集約 exit(failed>0 → exit 1)へ合流(exitContribution の実現)。新 verb を作らない(tech-stack-decisions)。

## 型の扱い(BR-U5-5 / cross-unit-type-canonical-lift)

U2 正本 `DoctorLine = { plugin; state; detail }`(state union に ok/drift/degraded/advisory/recovery-pending/unknown を既に保持)を **逐語再利用**。U5 は新フィールドを追加せず、既存フィールドを再定義しない。

## 設計シグネチャの整合(申告)

functional-design は純関数を `buildDoctorPluginSection(diag, record, judgment)` と 3 引数で記す。しかし正本である分岐表(BR-U5-8)は degraded/advisory の唯一の源として **DropsRecord** を(domain-entities)、composed 行の `composed@<rev>` として **record の revision** を要求する。この 2 入力は `record` 単独からは実現できないため、観測オブジェクト `DoctorPluginObservation`(diagnostics + drops + revision + activation)へ束ねた。束ねても関数は引数外を読まない純射影のままで、performance-design の純関数性合否(構造検証)を満たす。domain-entities が DoctorPluginSection に挙げる `exitContribution` は、行ごとの pass:false を既存 doctor の failed 集約へ流す形で **同一の意味** を実現し、消費されない専用フィールドは置かない(construction.md「文書のふりをしたフィールド」禁止)。U6 ActivationJudgment は表示のみで、U6 未着地のうちハンドラは `activation: null` を渡す。

## テスト(logical-components テスト層配置 / fs-tests-integration-first、予約番号 t313–t318)

- `tests/unit/t313-doctor-plugin-section.test.ts` — buildDoctorPluginSection の 8 分岐 + DoctorLine 型正本(純関数、fixture オブジェクト)。
- `tests/unit/t314-doctor-plugin-rows.test.ts` — formatDoctorPluginLine の表示文字列 + doctorPluginRows の 0-plugin 縮退・activation・pass/fail(exit 寄与)。
- `tests/integration/t315-doctor-plugin-observability.integration.test.ts` — 実 read 経路(readDoctorPluginObservation + resolveDoctorContext + handleDoctor):0-plugin 縮退、DropsRecord 可視性 + 両 severity 対照 + exit、recovery-pending 行 + exit、未知 severity の fail-closed(on-disk JSON 注入)、読み取り専用 bytes 一致(BR-U5-3)。両側実測(corpus-sweep):degraded/recovery-pending/unknown で健全 exit 0 → 1 へ、composed 健全・advisory は green 維持。

## 検証(全て同期実行・exit code 個別記録)

`bun run typecheck` / `bun run lint` / `bun scripts/package.ts` + `bun run promote:self` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci` / coverage lcov 照合(fork 4ea02e41a との diff 追加行 DA:0 = 0)。
