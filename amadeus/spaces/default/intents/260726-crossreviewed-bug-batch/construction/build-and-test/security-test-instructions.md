# Security Test Instructions

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(6 unit 分)

## 比例選定の方針

実在境界へ trace できる範囲のみ生成する。

## 対象と根拠

- **対象変更の security regression**: 本バッチは fail-closed 化(#1377 監査不変量、#1459 parse、#1462 スキーマ契約)と検証劇場解消(#1457)— いずれも整合性強化方向。regression テストは integration/unit instructions の該当項で被覆済み。認証情報・入力境界の新設なし。
- **依存監査は別判定**(cid:build-and-test:c1-doctor-seam): 本バッチは依存を追加・更新していない(全6 PR の diff で package.json 変更なし)。repo 全体の依存 audit は本 intent のスコープ外とし、既存 advisory があっても隠さない(検出時は conditional readiness に明記)。
