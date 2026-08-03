# Constraint Register — no-silent-drop

**Upstream:** `ideation/intent-capture/intent-statement.md`

## 制約一覧

本表は `ideation/intent-capture/intent-statement.md` の成功指標を、実装・検証可能な制約へ変換したものである。

| ID | 区分 | 制約 | 根拠 | 検証方法 | 状態 |
|---|---|---|---|---|---|
| C-01 | スコープ | #1963 は PR #1970 の統合後回帰検証とし、重複実装しない | Q1 | 最新 `main` 統合後の該当テスト | Confirmed |
| C-02 | 走査 | `core`、`harness`、`scripts` の手書き正本だけを走査する | Q2 | 走査対象・除外対象の fixture | Confirmed |
| C-03 | 生成物 | `dist/` とルートのハーネス投影は直接走査・直接編集しない | 正本・投影契約 | package / promote drift guard | Binding |
| C-04 | テスト | 意図的な違反 fixture を本番走査から除外する | Q2 | fixture が CI 本番 census に混入しないこと | Confirmed |
| C-05 | 免除 | `intentional-drop` は非空理由を必須とし、直近1ノードだけへ適用する | Q3 | marker の positive / negative fixture | Confirmed |
| C-06 | 免除増加 | 免除件数も shrink-only とし、新規追加を通常の更新で許可しない | Q3 | 新規 marker 追加で CI fail | Confirmed |
| C-07 | 性能 | no-silent-drop 単独の CI 実行時間は15秒以内 | Q4 | CI とローカルの計測結果 | Confirmed |
| C-08 | 精度 | 実リポジトリの初期偽陽性率は5%以下 | Q5 | 全初期検出の人手分類表 | Confirmed |
| C-09 | fixture | 3形態の positive / negative fixture は100%分類する | Q5 | 自動テスト | Confirmed |
| C-10 | 障害 | ツール不在、ルール不正、ベースライン欠落・不正、0件走査、部分走査を fail-closed にする | Q6 | 障害注入テスト | Confirmed |
| C-11 | 診断 | 内部障害は分類可能なエラーコードと修復可能な詳細を出す | Q6 | stderr / exit code の契約テスト | Confirmed |
| C-12 | 残債 | #1878 / #1874 の修正でベースライン件数を単調減少させる | Intent 成功指標 | 修正前後 census 比較 | Binding |
| C-13 | ランタイム | state / audit 永続化が成立しない場合、偽成功や部分更新を返さない | Intent 目的 | 失敗注入とバイト不変検証 | Binding |
| C-14 | ツールチェーン | ast-grep は再現可能な固定バージョンで導入し、frozen install を壊さない | Bun-only CI | lockfile と clean install | Binding |
| C-15 | 配布 | コア変更は packager から全ハーネスへ反映し、生成物を手編集しない | リポジトリ規約 | `package.ts --check` / promote check | Binding |
| C-16 | 規制 | 新規規制対象データや AWS 資源を導入しない | AWS / Compliance 評価 | diff と成果物レビュー | N/A guard |

## 優先順位

1. **正しさ・fail-closed**: C-05、C-06、C-08〜C-13
2. **再現性・配布整合**: C-01〜C-04、C-14、C-15
3. **開発速度**: C-07
4. **非適用境界の維持**: C-16

性能目標 C-07 は重要だが、正しさを弱める理由にはしない。15秒を超過した場合は advisory 化せず、走査やルール構成を改善する。

## 変更管理

- C-01、C-02、C-05〜C-11 は Feasibility のユーザー裁定であり、後続ステージで暗黙に緩和しない。
- ベースライン・免除の増加が必要になった場合は、理由、影響、代替案を示して明示的な変更判断へ戻す。
- Issue #1963 の外部修正が統合時に競合する場合は、PR #1970 の契約を正本として解消し、旧実装を復活させない。
