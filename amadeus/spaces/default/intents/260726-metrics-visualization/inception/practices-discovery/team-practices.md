# Team Practices — metrics 可視化(B1 後続)

上流入力(consumes 全数): code-structure.md, technology-stack.md, dependencies.md, code-quality-assessment.md, architecture.md, business-overview.md

## 判定: 変更なし(既存 practices が本 intent を完全カバー)

practices-discovery:c1 に従い、同日の RE codekb(code-structure.md の metrics 配置節、technology-stack.md の可視化技術前提、dependencies.md の依存ゼロ方針、code-quality-assessment.md の Q-M1〜Q-M6、architecture.md の挿入点3案、business-overview.md の価値面)を証跡スキャンとして代用した。affirmed 済み team.md / project.md との差分ギャップは検出されなかった。

## 本 intent に適用される既存 practices の対応表

| 領域 | 既存 practice(出典) | 本 intent での適用 |
|---|---|---|
| 編集正本 | project.md Way of Working(core/harness を編集元、dist は生成) | 可視化スクリプトは `scripts/` 配下(repo ローカル層)— dist 投影対象外。codekb architecture.md の層区分どおり |
| テスト | project.md Testing Posture + fs-tests-integration-first | 純関数 = unit、fs/CLI = integration + AMADEUS_METRICS_ROOT env seam(t230/t231 の既習様式、codekb code-structure.md 実測) |
| 依存 | project.md Forbidden(runtime dependency 追加禁止) | inline SVG・依存追加ゼロ(technology-stack.md に前提記録済み) |
| パーサ共有 | metrics-retention.ts:8-9 の明文契約(writer/reader/pruner 同一妥当性) | 可視化も parseSnapshot を import(私設パーサ禁止 — constraint-register C4) |
| CI | ci-pipeline:c2(既存 workflow を唯一の正本として拡張) | metrics-snapshot job への同乗(新規 workflow を作らない) |
| 検証 | org.md Mandated(落ちる実証)+ error-path-reach-lcov | 生成ゲート・エラー経路は赤の実証と DA 実測を伴う |
| 言語 | CLAUDE.md 言語規約 | コード・コミット英語、record 日本語、docs 日英ペア(codekb business-overview.md の docs 0件所見 → 新規追加) |

## ギャップ検討の記録

- 「HTML 生成物の drift 検査」を新規 practice にするかを検討 — 既存の dist:check 系ドリフトガード practice(project.md Forbidden「決定的なドリフトガードが存在する検査を手動チェックリストで代替しない」)の適用例に過ぎず、新規ルール化は不要(requirements で検査方式として確定)
- 「SVG のアクセシビリティ・配色」慣行 — 単一閲覧者(ユーザー本人)のローカルツールであり、チーム practice 化する段階にない。design ステージの判断に委ねる
