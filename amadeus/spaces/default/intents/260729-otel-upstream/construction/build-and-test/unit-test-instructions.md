# ユニットテスト手順(unit-test-instructions)

上流入力(consumes 全数): code-generation-plan.md、code-summary.md — 各 unit の code-summary.md「Files created」節から本 intent が追加・改変したテスト面を棚卸しした。

## 実行

```
bash tests/run-tests.sh --unit          # unit 層のみ
bash tests/run-tests.sh --ci            # smoke+unit+integration+e2e(正規の PR 基準)
bun test ./tests/unit/<file>            # 単ファイル
```

## 本 intent の主要ユニットテスト面(code-summary 由来)

- **journal v2 / mixed reader**: `tests/unit/t365-journal-reader-swap.test.ts`(v1/v2/mixed の3変種同値、削除ゲート (a) の唯一スイート)
- **event registry**: `tests/unit/t371-deletion-gate.test.ts`(6条件 checker 単体)、registry drift guard
- **canonical emit**: t378/t379/t382/t383(hook/swarm/sensor/targeted の canonical 経路)
- **v1 fixture 生成**: `tests/harness/v1-audit-fixture.ts` の `plantV1AuditRow`(canonical emit では作れない疎/不正 v1 行の植え込み — writer 削除後の正規手段)

## 配置規律

実 FS/process を触るテストは integration 層へ(fs-tests-integration-first)。unit は純関数層に限る。

## カバレッジ目標

blocking gate 準拠: project 相対 ratchet+patch(新規行未カバー0)+ per-PR ローカル lcov 事前確認(local-lcov-pre-push)。
