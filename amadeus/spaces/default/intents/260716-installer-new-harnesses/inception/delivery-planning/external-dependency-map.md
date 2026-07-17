# External Dependency Map — installer-new-harnesses(Issue #1048)

上流入力(consumes 全数): `../requirements-analysis/requirements.md`、`../user-stories/stories.md`、`../refined-mockups/mockups.md`、`../application-design/components.md`、`../units-generation/unit-of-work.md`、`../units-generation/unit-of-work-dependency.md`、`../units-generation/unit-of-work-story-map.md`、`../practices-discovery/team-practices.md`。

## ゲート項目

なし — 完全 AI 内包(反証可能な根拠、environment-provisioning:c3 様式):

| 依存候補 | 判定 | 根拠 |
|---|---|---|
| ネットワーク / GitHub codeload | 非依存 | FR-3 は fakeHttp+buildCodeloadFixture の in-process 検証(requirements.md AC-3a)— 実タグ・実 HTTP 不要 |
| npm レジストリ | 非依存 | FR-4 は `npm pack --dry-run`(ローカル実行)— publish は release.yml の別ライフサイクルで本 intent 非接触 |
| 外部チームハンドオフ | 非依存 | 全変更面が本リポジトリ内(installer+core 2ツール+README) |
| 人間承認 | あり(内部ゲート) | walking-skeleton Bolt 1 の単独ゲート+PR マージのユーザー承認 — 外部依存ではなくワークフロー既定 |

## Bolt への写像

Bolt 1(唯一)をブロックする外部ゲート項目は 0 件 — リードタイム・オーナー・緩和策の追跡対象なし。上記の内部ゲート(skeleton 承認・マージ承認)はワークフロー既定として bolt-plan.md の DoD に収載済み。
