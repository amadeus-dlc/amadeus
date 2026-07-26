# Domain Entities — U7 conformance-suite

> 上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services
> unit-of-work.md U7 行(C7)の追跡表とテスト層別のデータ形状。UI なし(services.md — frontend-components.md 非該当につき不生成)。component-methods.md に C7 専用節は無い(C1-C6 のみ — N/A 根拠)が、per-harness 層テストの期待値源として C1-C5 の契約表を消費する(business-logic-model の消費注記が正)。

## TraceabilityRow(追跡表 1 行 — 上流 t188 32 ケースと 1:1)

| フィールド | 型 | 制約 |
|---|---|---|
| upstreamId | 1..32(t188 のケース番号 — commit `29a31f78` 固定) | 32 行全数(requirements FR-8 合否: 32/32 被覆) |
| upstreamTitle | 上流 describe/test 名の verbatim | 転記のみ(要約による意味変化を防ぐ) |
| disposition | `"adopted"`(新規テスト)\| `"covered-existing"`(既存テストで充足 — テストのフルパス必須)\| `"n-a"`(根拠必須) | 3 値。n-a は根拠 1 文なしに不合格 |
| amadeusTest | テストのフルパス(+シンボル)\| null(n-a のみ) | tNNN 短形禁止(フルパス引用 — 実在と一意性の両検査) |
| layer | `"compose-semantics"`(ハーネス非依存 — 1 回実行)\| `"per-harness"`(投影・trigger 面別) | requirements FR-8 の層別。CI 時間増分の計測単位 |

## ConformanceReportSection(upstream sync レポート拡張 — FR-10)

| フィールド | 型 | 制約 |
|---|---|---|
| suiteResult | `"green" \| "red"` | テスト実行の exit code から導出(status ハードコード禁止 — 検証劇場 Forbidden) |
| traceCoverage | { adopted: n, coveredExisting: n, nA: n } | 追跡表からの機械集計(コマンド出力転記) |
| measuredAt | ISO 8601+コミット SHA | measurement-ref-in-artifacts |

## テスト命名・配置(既存 4 層ランナーへの編入)

- compose-semantics 層: `tests/unit/` / `tests/integration/`(既存 t252-254 の隣 — fs を触るものは integration 先置き: fs-tests-integration-first)
- per-harness 層: `tests/integration/`(native hook 実起動は e2e 相当でも、短縮可能なタイミングシームがあれば integration — 実起動不能面は手動 fallback E2E)
- テスト番号は実装時に既存採番の続きを予約(swarm-test-number-reservation — 並行ディスパッチ時は事前予約)

## 不変条件

- 追跡表の行数 = 32(欠落・重複なし — 機械 count で検証)
- disposition の集計値は表からの機械再計算のみ(ledger-count-mechanical-recalc)
- covered-existing の引用テストは実在+当該ケースの意味被覆をレビューで確認(実在確認だけの充足偽装を禁止)
