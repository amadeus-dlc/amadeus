# Build and Test Results

上流入力(consumes 全数): code-generation-plan.md, code-summary.md

## 実行日時・測定 ref

- 実行: 2026-07-22(conductor セッション、ブランチ `resume-formal-verif-e6-takeover` HEAD = code-generation 承認後コミット)
- 全数値は集計コマンド出力からの転記(numbers-from-command-output-only)

## ビルド結果

| コマンド | exit | 判定 |
| --- | ---: | --- |
| `bun x tsc --noEmit -p tsconfig.json` | 0 | ✅ |
| `bun x tsc --noEmit -p tsconfig.tests.json` | 2 | ⚠ 既存 baseline red 9 error(下記帰属) |
| `bun run lint` | 0 | ✅(warning 244 / info 17 は既存水準・error 0) |
| `bun run dist:check` | 0 | ✅ drift なし |
| `bun run promote:self:check` | 0 | ✅ drift なし |

tsconfig.tests.json の 9 error は `grep -ciE "arm-s|full-matrix|eligibility|final-cli"` = **0 件** — 本 intent の B2〜B4 新規ユニット由来ではなく、全件 B1 skeleton(tla-skeleton-harness ほか)の既存 baseline。

## テスト結果

| スイート | コマンド | 結果 | exit |
| --- | --- | --- | ---: |
| unit(formal-verif 全数) | `bun test tests/unit/t-formal-verif-*.test.ts` | **435 pass / 0 fail**(7,369 expect、Ran 435 tests across 29 files = 期待 29 ファイル一致) | 0 |
| integration(formal-verif 全数) | `bun test tests/integration/t-formal-verif-*.test.ts` | 159 pass / **22 fail**(Ran 181 tests across 12 files = 期待 12 ファイル一致) | 1 |
| e2e(formal-verif 全数) | `bun test tests/e2e/t-formal-verif-*.test.ts` | 37 pass / **1 fail**(Ran 38 tests across 5 files = 期待 5 ファイル一致) | 1 |

## 失敗の帰属(assertion 実文+ベースライン対照で確定)

pre-B2 ベースライン commit `6b9470a47` の scratch worktree で同一スイートを実行した対照実測:

| 失敗クラスタ | 件数 | 現 HEAD | ベースライン | 帰属 |
| --- | ---: | --- | --- | --- |
| TLA invalid-timestamp walking skeleton(integration) | 21 | fail | fail(同一) | **B1 既存 red**(B1 in-flight、E-FVEU3FD1 未 READY) |
| TLA skeleton spawned integration(e2e) | 1 | fail | fail(同一) | **B1 既存 red** |
| fixture-store export 面(`denies promotion permission minting...` — 期待 export 集合に MaterializationReceipt / isVerifiedMaterializationReceipt が不在) | 1 | fail | fail(同一) | **B1 既存 red**(B1 内の export 追加にテストの exact 集合が未追随) |

**B2〜B4(U6/U7/U8)による新規失敗: 0 件。** 上記 23 件はすべて本 intent の B1(walking skeleton)在庫であり、B1 成果の READY 化作業(別途)で解消すべきもの。

## セキュリティ検証結果

| 検証 | 結果 |
| --- | --- |
| blind 境界 integration(実 FS 走査) | ✅ pass(unit スイート内で green) |
| 制御バイト混入 `grep -rP '[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]' scripts/formal-verif/` | 0 件 ✅ |
| 秘密情報 grep(api key / secret / token / password) | 47 hit は全て正当なドメイン識別子(permission/receipt/token 語彙)・実クレデンシャル 0 件 ✅ |
| 新規 runtime dependency | 0(fast-check 4.9.0 は既存 lockfile)✅ |

## カバレッジ

- 本 intent の CI 面は既存 gate(typecheck / lint / dist drift / tests)構成のまま。formal-verif unit 群は in-process 駆動(spawn 盲点なし)
