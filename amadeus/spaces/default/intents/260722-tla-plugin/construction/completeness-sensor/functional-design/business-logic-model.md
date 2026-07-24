# Business Logic Model — U5 completeness-sensor

上流入力(consumes 全数): unit-of-work(U5 定義・完了条件)、unit-of-work-story-map(体験ステップ1)、requirements(FR-4.1〜4.4)、components(C-6)、component-methods(C-6 メソッド群)、services(sensor 実行単位)

## 中核フロー: モデル⇔実装対応のドリフト検出

1. **入力解決**: sensor dispatcher(既存 amadeus-sensor.ts)が manifest `matches` 適合の出力パスで `amadeus-sensor-model-completeness.ts` を起動
2. **登録簿読込**: `ModelMap.parse(specs/tla/model-map.json)` — 不在・parse 不能は **FAILED**(fail-closed — BR-U5-2)。様式定義は U1 の ModelMap 型(canonical 1定義)を import して共有(独立再定義しない — cross-unit-note-canonical-reference)
3. **再計算照合**: 各 `ModelMapEntry.implPath` の現行ファイル bytes の sha256 を再計算し、登録値と比較。`ModelMap.diff(current)` が `Drift[]`(implPath・登録値・現行値)を返す
4. **verdict**: Drift 0件 → pass(SENSOR_PASSED)/ 1件以上 → fail(SENSOR_FAILED、findings に implPath 列挙)。implPath の対象ファイル不在も Drift(削除もモデル未更新の一形態)
5. **更新経路**: モデル更新した開発者が `updateModelMap`(同ファイル subcommand)で登録簿を再記録(起動者明記 — guard-activator)。sensor 本体は読取専用で登録簿を書かない(write⇔check の分離対称)

## エラー経路

- map 不在 / JSON parse 失敗 / 様式不適合(implPath 重複・非POSIX)→ FAILED(findings に理由)。advisory severity のため人間がゲートで裁定
- 対象実装ファイル読取不能 → 当該 entry を Drift として報告(無言スキップしない)

## 語彙衝突・空文化ガード

検査述語は specs/tla/model-map.json の JSON 構造のみを対象とし、markdown 定型句に依存しない(vocabulary-collision-vacuity-guard の適用対象外であることを設計時に確認 — 述語入力は構造化 JSON で定型ヘッダを持たない)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-22T13:36:54Z
- **Iteration:** 2
- **Scope decision:** none

Major1(matches複合glob復元)・Major2(Drift型のU1 canonical化と逆伝播)の両閉包を実測確認。新規指摘なし。

### Findings

- None
