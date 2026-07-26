上流入力(consumes 全数): unit-of-work, requirements

# Code Summary — core-harness-enums

unit-of-work.md の U4 と requirements.md の FR-4/FR-7d の実装記録(code-generation-plan.md の全4ステップ完了)。

## 変更ファイル(サンクション済み3箇所 + 派生)

| ファイル | 内容 |
|---|---|
| `packages/framework/core/tools/amadeus-harness.ts` | 同形追加: `HarnessType` + `"kimi"`、`HARNESS_DIR_TO_TYPE` + `.kimi-code → kimi`、`KNOWN_HARNESS_DIRS` 末尾に `.kimi-code`、`KNOWN_RULES_SUBDIR` + `.kimi-code → rules` |
| `packages/framework/core/tools/amadeus-swarm.ts` | `HarnessName` union + `"kimi"`、`HARNESS_VALUES` + `"kimi"`(resolveDriver/DRIVER_VALUES 不変更) |
| `packages/framework/core/tools/amadeus-utility.ts` | doctor arm(kimi): adapter 実在(roster)・managed block 検査(B3 の検出契約を最小再実装 — dist 自己完結のため)・`MIN_KIMI = [0,28,1]` フロア(既存 arm 流儀)・機能 probe(advisory)・otherTrees。B3 引き継ぎ(マーカー欠落→修復 hint・重複→loud・git 残留→advisory)。`DoctorContext.kimiHomeDir`(codexHomeDir 先例) |
| `tests/unit/t269-harness-provenance.test.ts` | exact-pin を6ディレクトリに更新(サンクション追加の必然的帰結。pin の精神は維持) |
| `tests/unit/t-kimi-swarm-resolve.test.ts` | resolve 分岐 10 件(floor・degrade・fail-closed・語彙 pin) |
| `tests/integration/t-kimi-doctor-arm.test.ts` | doctor arm 17 件(managed block 9分岐・git 残留5分岐・wiring 2実行) |
| `dist/*/` | 派生の再生成(3ツール × 6ツリー) |

## 検証(conductor が再実行して裏取り)

- 新規 27 件 → 0 fail(conductor 再実行でも 0 fail・58 expect)
- `bun run typecheck` → 0(conductor 再実行でも 0)/ `bun run lint` → 0 / `bun run dist:check` → 0(conductor 再実行でも 0)
- 関連既存スイート(swarm/doctor/harness/dist 系) → 全て exit 0(worker 実行: 53 + 137 + 110 + 6 pass)

## 逸脱

1. t269 の exact-pin 更新(検出クラスタ追加の必然的帰結)
2. `DoctorContext.kimiHomeDir` 追加(同一ファイル内・codexHomeDir 先例。テスト注入に必須)
3. dist 再生成(派生物。dist:check のため)

## 補足(運用判断の記録)

- git 残留・内容検出の行は advisory(pass:true)とした: kimi CLI が config を再シリアライズするため、ハード fail は doctor を恒久的に赤くする。loud fail は真の異常(重複・不対・逆転・未配線)に限定(never-auto-repair の契約どおり)
- kimi バイナリ不在時はフロア行が doctor 失敗になる(既存 arm 流儀の意図どおり)
