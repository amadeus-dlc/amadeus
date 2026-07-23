# 単体テスト手順

各 Unit の `code-generation-plan.md` と `code-summary.md` に基づき、境界判定、選挙モデル、team prerequisite、doctor helper を中心に検証する。

## 実行方法

```bash
bun test tests/unit/t258-boundary-guard.test.ts
bun test tests/unit/t265-team-prerequisites.test.ts
bun test tests/unit/t234-election-model.test.ts tests/unit/t235-election-record.test.ts
```

全体確認は `bash tests/run-tests.sh --ci` を使用する。テストは順序、host HOME、host PATH に依存させない。

## カバレッジ期待値

- U1: 2述語、allow rule、glob、result の正常・異常・境界条件
- U2: 選挙 model/record/store/transport の状態遷移と不正入力
- U3: OS → herdr → agmsg の固定順、override、missing guidance
- U4: unit ではなく隔離 E2E を主証拠とする
- U5: docs gate と構造検証を主証拠とする

行カバレッジ率だけを品質ゲートにせず、要件ごとの意味ある assertion と falling proof を優先する。

## テストデータ

固定 fixture とテスト内 temp directory を使用する。実ユーザーの HOME、credentials、agmsg/herdr 状態を単体テストへ持ち込まない。
