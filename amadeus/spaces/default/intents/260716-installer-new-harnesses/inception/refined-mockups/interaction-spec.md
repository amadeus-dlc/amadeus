# Interaction Spec — installer-new-harnesses(Issue #1048)

> 上流入力(consumes 全数): `../../ideation/rough-mockups/wireframes.md`(モック1〜3)、`../../ideation/rough-mockups/user-flow.md`、`../user-stories/stories.md`(US-1.1〜3.1)、`../requirements-analysis/requirements.md`(FR-1〜6)、`../practices-discovery/team-practices.md`(既存実践)。

## 対話フロー(挙動保存 — 変更なしの明文化)

1. `install --harness <name>`(非対話。--yes 省略時の確認プロンプトは既存 wizard 挙動のまま — wizard.ts:17 は HarnessName.all 駆動で選択肢だけ6値に増える)
2. 確認 → plan 表示 → apply → verify(既存 install フローの段構成不変)
3. エラーパス: 未知名 = exit 2+モック3 / 既インストール = 既存 renderAlreadyInstalled(非接触)

## 変更点の全数

対話に関わる変更は「wizard 選択肢が6値になる」ことのみ(列挙駆動の自動流入)— 新規プロンプト・分岐なし。

## Responsive 指定(ステージ契約項目の N/A 判定)

responsive behavior は **CLI に UI サーフェスが存在しないため非該当**(N/A)— 出力は行指向 plain text で端末幅への適応要件なし(既存 reporter の折り返し方針を変更しない)。
