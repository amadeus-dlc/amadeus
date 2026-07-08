# Business Logic Model — docs-rollout

> ステージ: functional-design (3.1) / Unit: docs-rollout / 作成: 2026-07-08
> 上流入力: `../../../inception/requirements-analysis/requirements.md`(FR-014)、`../../../inception/user-stories/stories.md`(US-C4)、`../../publish-readiness/functional-design/business-logic-model.md`(PR シーケンス)、`domain-entities.md`

## ワークフロー: ユーザー可視 PR の構成(単一 PR・同一コミット群)

```
1. README 導入セクション刷新:
   - Quickstart: bunx @amadeus-dlc/setup install(npx 併記)
   - upgrade の案内(差分レポート・カスタマイズ保持の一言)
   - 手動コピー手順は削除(インストーラが正: 成功指標2)。トラブルシュートとしての言及は docs/guide 側に残置可
2. root package.json 是正(I1/I2 — U4 から移管)
3. AMADEUS_VERSION バンプ+CHANGELOG 見出し+README バッジ(同一コミット — project.md Mandated)
4. 検証: t68 グリーン+README に cp -r 主経路が残っていないことの grep 確認
```

- この PR は Bolt 5 の成果であり、マージ後に `vX.Y.Z` タグを発行(team.md 新規約)→ U4 手順書の publish フローへ接続する
