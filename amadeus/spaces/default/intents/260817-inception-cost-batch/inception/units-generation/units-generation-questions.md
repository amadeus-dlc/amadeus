# Units Generation 質問ファイル — 260817-inception-cost-batch

## 質問ゼロの根拠と分解プラン承認

本ステージに新規の人間向け質問はない(0 questions 形式、blank タグなし)。Step 3 が挙げるトピックは全て既決事項から機械的に導出される:

- **Unit 境界戦略**: 1 Issue = 1 Unit 原則(project.md `cid:units-generation:c1`)の適用 — U1 = #3181、U2 = #2415。バッチ編成はユーザー裁定済み(2026-08-18)
- **粒度**: Issue 境界で固定(source と test の ownership を同一境界へ)
- **依存順序**: トポロジは `unit-of-work-dependency.md` の YAML block が正(U2 → U1 の内容依存)。実装順の経済判定は delivery-planning へ
- **統合点**: issue-evidence artifact(U1 産出・U2 契約文が参照)と共有契約ファイル `reverse-engineering.md`(U1 面/U2 面 — 直列化は delivery-planning)
- **デプロイモデル**: フレームワーク内 embedded(デプロイ基盤なし — project.md § Deployment)

分解プラン承認は Intent Autonomy full の梯子で確定済み: AUTO_DECIDED `auto-decision-8ea0e53ca5508ffee2b9904556c24798`(2026-08-17、grant `intent-grant-edcb102bc13cb317c58295042495ae77`)。

## 決定トレース

- 2 Unit 構成・kind(U1: library / U2: spec)・複雑度(M / S)・LOC 枠(700 / 350)は application-design の components.md 規模見積+較正注記からの転記
