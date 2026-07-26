上流入力(consumes 全数): business-logic-model, business-rules, domain-entities, performance-design, security-design, unit-of-work, requirements

# Code Summary — kimi-live-journey

unit-of-work.md の U6 と requirements.md の FR-9 の実装記録(code-generation-plan.md の全4ステップ完了)。

## 作成ファイル

| ファイル | 内容 |
|---|---|
| `tests/harness/kimi-print-drive.ts` | `runPrintSession`(`kimi -p` spawn + 回収)・`skipReason`(env+バイナリ+dist 実在)。環境準備ヘルパ `prepareKimiHome`(認証供給)・`writeKimiConfig`(最小 config 生成)。「SPENDS Kimi credits」明記 |
| `tests/e2e/t-print-kimi-status.serial.test.ts` | journey 1: tmp 配置 + `KIMI_CODE_HOME=<tmp>` で `/skill:amadeus --status` を断言 |
| `tests/e2e/t-print-kimi-doctor.serial.test.ts` | journey 2: (a) 未配線 → hint 行、(b) merge で seeded → 各チェック pass(probe は除外) |
| `tests/unit/t-kimi-print-drive.test.ts` | 決定的 13 件(gate 分岐・spawn 失敗・認証供給・config 形状) |

## 実機で確定した事実

- **認証の所在**: kimi の OAuth は `$KIMI_CODE_HOME` 配下(`credentials/` + `oauth/`)。tmp KIMI_CODE_HOME は未認証になる → **symlink 供給**を採用(OAuth バイトはコピーしない。security-requirements の方針どおり)
- **起動に必須の config**: `default_model` + managed provider + models テーブルが無いと kimi はセッションを開始しない(2種の起動エラーを再現)。`writeKimiConfig()` が非秘密の最小 config を生成(空 api_key・公開 base_url・oauth ポインタ。`AMADEUS_KIMI_MODEL` でモデル上書き可)
- **symlink 供給の write-through 帰結(受容済み)**: `credentials/`・`oauth/` の symlink により、live 実走中のトークン refresh はユーザーの実 credential store に書き戻される。実認証を使う以上は良性で、copy は設計上禁止のため代替はない(U7 docs の注意事項候補)

## 検証(conductor が確認した証跡)

- **live 実走**: `AMADEUS_KIMI_PRINT_LIVE=1 bun test tests/e2e/t-print-kimi-*.serial.test.ts` → **3 pass / 0 fail / 79.88s / EXIT=0**(ログ: `tests/logs/2026-07-26T06-55-53Z-kimi-print-live/live-run.log`。conductor が内容を確認)
- **決定的 tier**: ゲートなしで **3 skip・0 fail**(conductor 再実行で確認)
- 単体 13 件 → 0 fail(conductor 再実行でも 0 fail)
- `bun run typecheck` → 0 / `bun run lint` → 0(worker 実行)、関連 8 スイート → 118 pass(worker 実行)

## 逸脱

1. doctor 状態(a)は「config.toml 不在」でなく「managed block 不在の config 存在」として実現(config なしでは kimi が起動できないため。両行とも同じ hint を持ち、2状態設計は維持)
2. driver に環境準備ヘルパ2件を追加(security design の認証供給の具体化。検査機構ではない)

## 申し送り(U7 docs へ)

- live journey のノブ: `AMADEUS_KIMI_PRINT_LIVE=1`・`AMADEUS_KIMI_BIN`・`AMADEUS_KIMI_MODEL`、実機の `kimi login` が前提(認証は symlink 経由。CI は skip)
- 最小 tmp-config 形状(default_model + managed provider + models テーブル)の記載価値
- 2バイナリ観察(PATH 0.28.1 / doctor 検出 0.29.0)は docs 記載候補
- フル CI ベースラインは build-and-test で実施(B5 と同じ範囲決定)
