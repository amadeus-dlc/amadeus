# Unit ↔ Requirements Map — 260820-fmc-drift-batch

上流入力: `inception/requirements-analysis/requirements.md`(FR 全27本)、`unit-of-work.md`、および `inception/application-design/` の5成果物(unit 対応は `components.md`、変更面は `component-methods.md`、新設サービス不在は `services.md`、依存は `component-dependency.md`、裁定は `decisions.md`)。user-stories ステージは self-feature スコープで SKIP のため、本 map は FR ↔ Unit の trace を担う(story 単位の写像は存在しない — 設計どおり)。`inception/application-design/` の C1〜C4 対応も併記。

## 写像表(全 FR の被覆確認)

| FR | Unit | AD component |
|---|---|---|
| FR-ARM-1〜7 | U4 applicability-arms | C1 |
| FR-REG-1〜4 | U1 revise-model-commit | C2 |
| FR-REG-5 | U1(leaf 新設 + registration 側)/ U4(applicability 側) | C2 / C1 |
| FR-REG-6 | conductor(FD ステージ作業 — unit 外) | — |
| FR-BND-1〜6 | U2 boundary-three-face | C3 |
| FR-RET-1〜4 | U3 advisory-retirement | C4 |
| FR-X-1〜3 | 全 unit 横断(CI・台帳 resync・配送・正本編集規律) | — |
| FR-X-4 | conductor(起票 — unit 外) | — |
| NFR-1〜3 | 全 unit 横断(検証劇場禁止 / fail-closed / 性能検査は生成しない) | — |

Orphan FR: なし(27本全てに担当あり)。Orphan unit: なし(4 unit 全てが FR を持つ)。

## Issue ↔ Unit(1 Issue = 1 Unit)

| Issue | Unit | クローズ条件 |
|---|---|---|
| #2289 | U1 | PR MERGED + 着地面実読(3面テスト + fail-open 閉鎖)+ FR-REG-6 の record 反映 |
| #2929 | U2 | PR MERGED + SOURCE_DRIFT 実測 + 両境界の落ちる実証 |
| #3187 | U3 | PR MERGED + census 残存ゼロ実証(裁定コメントは記録済み) |
| #3186 | U4 | PR MERGED + 落ちる実証(landed 不在で赤→緑)+ 閾値の観測レンジ記録 |
