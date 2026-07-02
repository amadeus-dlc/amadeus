# D002: Task Generation 承認

## 背景

B001（再生成スクリプトと検証）の Task Generation Gate が `ready_for_approval` に到達した。

## 判断

B001 の Task 分解（T001 検証の先行追加と RED 確認、T002 `IndexGenerate.ts` の実装と GREEN 確認）を Maintainer が承認した。
実装はこのセッションで進める。

## 理由

Task 分解が Script Rules の検証先行と Functional Design の設計判断（D001）に沿っており、各 Task に具体的な作業、要求、ユースケース、依存、設計根拠がある。

## 影響

`state.json.construction.bolts[]` の B001 の `taskGeneration.status` を `passed` にし、この判断を approval evidence として追加する。
