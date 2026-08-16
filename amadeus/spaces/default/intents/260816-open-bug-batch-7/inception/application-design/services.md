# Services — 260816-open-bug-batch-7

## 対象なしの宣言

本 intent はサービス層(常駐プロセス・API サービス・オーケストレーション)を新設・変更しない。3 Unit の対象はいずれも (1) ビルド/配布スクリプト (2) テスト内ゲートエンジン (3) docs + テスト であり、サービス定義・通信契約・スケーリング特性の設計対象が存在しない。体裁のための空設計は作らない(検証劇場の禁止 — org.md Forbidden)。

## 既存実行契約(参考、変更なし)

変更が触れる実行面の既存契約のみ記す:

- `promote-self`: ローカル CLI(`bun scripts/promote-self.ts`)。冪等で、失敗は loud fail(exit 非 0)
- no-silent-drop gate: CI 内で `bun run no-silent-drop -- --base-revision <sha>` として同期実行(`.github/workflows/ci.yml:164`)。exit code 契約(0 = pass / 非 0 = fail-closed)は D1 退役後も不変
- t3028: 既存テストランナー(`tests/run-tests.sh` の integration 層)内で実行。新規ジョブなし
