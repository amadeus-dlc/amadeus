# Security Design — U3 exception

上流入力(consumes 全数): security-requirements ほか performance-requirements / scalability-requirements / reliability-requirements / tech-stack-decisions は nfr-requirements SKIP により不在(expected)— セキュリティ要件は requirements.md FR-EXC-3(stacktrace redaction)+ project.md Mandated(export-boundary-redaction)から代替導出。business-logic-model.md(実在)の path マスク3分類と二層構成を設計正本として消費。tech-stack 前提は codekb technology-stack.md 260801 現在節に依拠。

## stacktrace の情報漏洩統制(FR-EXC-3)

- **path マスク3分類**: (a) repoRoot 配下 → repo 相対 (b) ホーム配下 → `<home>/…` (c) その他絶対パス → `<external>/…`。ユーザー名・マシン構成・repo 外のディレクトリ構造を store へ流さない
- **credential scrub**: 既存 scrubCredentials を全行へ適用(冪等)— stack メッセージ部へ混入した token/key 形値を遮断
- **二層構成**: write-time 層(recordException 内で bag 全体へ redactAttributes — 新設)+ export 境界層(local-span-exporter.ts:88-99 の既存 event attributes redaction、#1719 着地済み・無改変)。path マスクは両層に無い第3の統制として redactStacktrace が担う

## 適用範囲の統制(ADR-4)

- write-time 層は recordException 内限定 — addEvent 一般へは適用しない(ADR-4 の既決範囲。過剰適用による既存イベント語彙の破壊を避ける)
- exception.type は err.name のみ(メッセージ本文を type へ混入させない)。Error 以外は type/stacktrace とも省略 = 漏洩面そのものを作らない

## 検証(落ちる実証)

- 絶対ホームパス・repo 外パス・credential 形値を含む合成 stack を注入し、出力文字列で (a) 絶対ホームパス非出現 (b) `<home>`/`<external>` の出現数一致 (c) credential マスク済み、を assert(文字列内容 assert — 公開戻り値にカウンタを持たせない FD 契約どおり)
