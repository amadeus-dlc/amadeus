# Business Logic Model — docs-rollout

> ステージ: functional-design (3.1) / Unit: docs-rollout / 作成: 2026-07-08
> 上流入力: `../../../inception/requirements-analysis/requirements.md`(FR-014)、`../../../inception/user-stories/stories.md`(US-C4)、`../../publish-readiness/functional-design/business-logic-model.md`(PR シーケンス)、`domain-entities.md`
> 適用外参照(upstream-coverage): `../../../inception/application-design/components.md`・`component-methods.md`・`services.md` は本 Unit ではコード変更がないため設計参照のみ(README が記述する CLI の挙動はこれらが定義済みの契約を転記するだけで、新たな設計判断を持ち込まない)

## ワークフロー: ユーザー可視 PR の構成(単一 PR・同一コミット群)

```
1. README 導入セクション刷新(FR-014 の受け入れ4要素をすべて含める):
   - Quickstart: bunx @amadeus-dlc/setup install(npx 併記)
   - **ハーネス選択の表現(FR-014/FR-003)**: 対話ウィザードで claude / codex / kiro / kiro-ide の4択を選ぶ旨と、
     非対話向けの --harness フラグ例(例: bunx @amadeus-dlc/setup install --harness claude --target . --yes)を併記。
     現行 README の "Pick your harness" 構成は「インストーラのハーネス選択」を軸に書き換える
   - upgrade の案内(差分レポート・カスタマイズ保持の一言)
   - 手動コピー手順は README から**削除**し、トラブルシュート用の記述として docs/guide 側へ移設する(単一の決定 — 降格残置はしない)
2. root package.json 是正(I1/I2 — U4 から移管)
3. AMADEUS_VERSION バンプ+CHANGELOG 見出し+README バッジ(同一コミット — project.md Mandated)
4. 検証: t68 グリーン+grep 確認2点(cp -r が README の主経路に残っていない/bunx・npx・ハーネス選択・install・upgrade への言及が存在する)
```

**バンプ根拠(CON-006 の「docs のみは除外」との関係)**: この PR は字面上 docs+メタデータだが、「docs のみ」の除外対象ではない。理由: (1) この PR は**インストーラという新しいユーザー可視機能のリリースマーカー**であり、単なる文言修正ではなく配布経路の公式切替を宣言する。(2) マージ後に発行する `vX.Y.Z` タグ(BR-D05)が**インストーラの取得対象となる最初の版**を定義する — バンプなしではタグが打てず(t68 の三者同期)、FR-006 の取得フローが成立しない(CON-007/ASM-006 の依存連鎖)。対照的に U4 の PR は framework 版の意味を変えないためバンプ対象外(非対称は意図的)。

- この PR は Bolt 5 の成果であり、マージ後に `vX.Y.Z` タグを発行(team.md 新規約)→ U4 手順書の publish フローへ接続する
