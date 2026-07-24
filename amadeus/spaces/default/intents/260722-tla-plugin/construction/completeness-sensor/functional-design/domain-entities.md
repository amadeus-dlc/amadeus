# Domain Entities — U5 completeness-sensor

上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services

## エンティティ

- `ModelMap` / `ModelMapEntry` / `Drift` — **すべて U1 定義を import(canonical 1定義 — Drift は ModelMap.diff の戻り値型として所有元 U1 の domain-entities.md に定義。iteration 1 Major 2 是正で U1 へ逆伝播済み)**。本 Unit は消費側であり再定義しない
- `CompletenessVerdict` — 判別ユニオン `{ pass: true } | { pass: false; findings: readonly string[]; reason: "drift" | "map-missing" | "map-malformed" }`。sensor の output_schema(pass/findings_count/reason)へ 1:1 写像
- `SensorManifest`(宣言的)— id `model-completeness` / kind deterministic / command `bun .claude/tools/amadeus-sensor-model-completeness.ts` / matches `{specs/tla/**,packages/framework/core/tools/amadeus-election*.ts}`(U1 の canonical 実装境界に整合し、impl ファイル編集も PostToolUse 自動発火の対象)/ default_severity advisory / timeout_seconds 10

## 不変条件

- CompletenessVerdict の pass:true は「map が parse でき、全 entry の再計算 sha256 が登録値と一致」の場合に限る(検証劇場禁止 — verdict は再計算の実行結果からのみ導出)
- Drift の列挙は entry 順で決定的(byte-reproducible)

## frontend-components.md について

本 Unit は UI を持たないため optional の frontend-components.md は生成しない(CONDITIONAL 非該当 — 生成後の全候補列挙 assert で不在確認)。
