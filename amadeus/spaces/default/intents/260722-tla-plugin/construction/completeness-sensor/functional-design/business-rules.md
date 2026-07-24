# Business Rules — U5 completeness-sensor

上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements(FR-4.1〜4.4)、components、component-methods、services

## ルール一覧

- BR-U5-1(検査対象): モデル⇔実装対応の完備性のみを検査する。TLC 実行完全性は run-model-check.ts の fail-closed 責務であり sensor は関与しない(intent-capture Q4 裁定)
- BR-U5-2(fail-closed): model-map.json の不在・parse 不能・様式不適合は FAILED。登録簿なしで green にしない
- BR-U5-3(canonical 共有): ModelMap / ModelMapEntry の型・parse は U1 の定義を import で共有し、独立再定義しない
- BR-U5-4(read-only): sensor は登録簿・モデル・実装ファイルを一切書き換えない。書込は updateModelMap subcommand のみ(起動者 = モデルを更新した開発者)
- BR-U5-5(両側実証): 完成条件は (a) ドリフト注入(実装ファイル変更 or entry 改変)で FAILED になる落ちる実証 (b) 同期状態で PASSED になる正当系 の両側実測(FR-4.3)。加えて manifest の matches 適合・fire 経路の audit 行(SENSOR_PASSED/FAILED)到達まで確認
- BR-U5-6(advisory): default_severity は advisory。verdict は audit 行で判定(exit code では読まない — 既決)
- BR-U5-7(コア供給): manifest は `.claude/sensors/amadeus-model-completeness.md`、実装は `packages/framework/core/tools/amadeus-sensor-model-completeness.ts` に配置する(通常3手順)。graph compile の sensor id 検証(unknown id loud reject)に登録される — U2 の compile 前提

## テスト観点(Comprehensive)

- unit: diff 照合の純関数(0件/1件/複数/entry対象不在)、parse の様式拒否系
- integration(実FS): map 不在 FAILED、正当 corpus で PASSED、ドリフト注入 FAILED、dangling 状態の検出。sensor dispatcher 経由の fire 実測1回
