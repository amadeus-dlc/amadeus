# Inception フェーズ境界検証

## 判定

**PASS（Requirements Analysis の承認を条件に Construction へ移行可能）**

- 対象 intent: `260810-test-time-factor`
- scope / depth: `self-fix` / `Minimal`
- 対象境界: Inception → Construction
- 検証時刻: `2026-08-10T14:48:28Z`
- 次 stage: `code-generation`

この intent では Inception の `reverse-engineering` と `requirements-analysis` だけを実行する。`user-stories`、`application-design`、`units-generation`、`delivery-planning` は scope grid で明示的に SKIP されているため、存在しない成果物を欠落とはせず、次の短縮トレーサビリティを検証した。

```text
User intent
  -> Reverse Engineering CodeKB / re-scan
  -> Requirements FR-1 through FR-8 / NFR-1 through NFR-4
  -> Code Generation
  -> Build and Test
```

## トレーサビリティ

| 上流 | 下流 | Coverage | 証拠 |
|---|---|---:|---|
| ユーザー指示 | FR-1〜FR-6 | 5/5（100%） | 未指定時 `1`、CI `2`、環境別 override `3`、timeout 基準値の乗算、対応する sleep/wait の乗算を要件化 |
| Reverse Engineering CodeKB 9成果物と re-scan | FR-1〜FR-8 | 8/8（100%） | runner、test timeout、TUI/IDE driver、workflow、既存 override、除外対象、回帰防止境界を特定 |
| FR-1〜FR-8 | 受け入れ確認 | 8/8（100%） | 各 FR に正常系、境界値、除外または失敗条件を記載 |
| NFR-1〜NFR-4 | 検証方針 | 4/4（100%） | 後方互換性、決定性、診断可能性、共通 helper への集約を記載 |
| Requirements | Construction 入力 | 8/8（100%） | helper、runner、代表 timeout/wait、CI workflow、静的 guard の実装境界を特定 |

## 整合性確認

- `TEST_TIME_FACTOR` 未指定時とローカルは `1` であり、既存の時間契約を保持する。
- CI の既定値はユーザーが推奨案として確定した `2` とし、より低速な環境は `3` を指定できる。
- `--test-timeout-ms` は係数化する基準値、`AMADEUS_TEST_TIMEOUT` は再乗算しない最終 override として区別されている。
- timeout を構成・検証する sleep、poll、settle は同じ係数を使い、timeout との大小関係を維持する。
- 性能閾値、slow/hang fixture、ISO 時刻境界、本番 CLI timeout は除外され、テスト完了待ちの timeout と混同されていない。
- 共通 helper 未適用の timing sink は機械検査で失敗し、除外はパス・sink・理由を持つ allowlist に限定される。
- Product Lead の第2レビューは `READY`。唯一の NIT だった誤記は修正済みで、未解決 BLOCKER はない。
- `required-sections`、`upstream-coverage`、`answer-evidence`、`question-budget`、`depth-budget` の最新実行はすべて PASS である。

## Orphan と Gap

- orphan requirement: 0件
- 受け入れ確認を持たない FR: 0件
- 未解決 BLOCKER: 0件
- 未解決の重要な曖昧さ: 0件
- scope により期待どおり存在しない成果物: `user-stories`、`application-design`、`units-generation`、`delivery-planning`

## Construction 移行条件

- Requirements Analysis の人間承認を記録すること。
- Code Generation は FR-1〜FR-8 と NFR-1〜NFR-4 を変更境界として扱うこと。
- 実装中に timing sink の分類が要件の除外契約では判断できない場合、無断で範囲を広げず承認ゲートへ戻すこと。

`PHASE_VERIFIED` の監査イベントと state 更新は、phase-check 成果物の存在を検証する engine の phase-boundary approval 遷移に委ねる。
