# Intent Backlog — no-silent-drop

## 上流と優先付け方式

本バックログは `ideation/intent-capture/intent-statement.md` の成功指標、`ideation/feasibility/feasibility-assessment.md` の Go 条件、`ideation/feasibility/constraint-register.md` の C-01〜C-16、および `scope-definition-questions.md` の確定回答を proto-Unit へ分解する。

全項目を Must とする。優先度は MoSCoW に加え、`WSJF = (Business Value + Time Criticality + Risk Reduction) / Job Size` の相対値で比較する。ただし、実行順は WSJF だけでなく依存関係を優先する。値は1〜10、Job Size は相対ポイントである。

## 優先バックログ

| 順位 | ID | Proto-Unit | MoSCoW | BV | TC | RR | Size | WSJF | 依存 |
|---:|---|---|---|---:|---:|---:|---:|---:|---|
| 1 | U0 | 最新 main・#1963 上流契約の統合確認 | Must | 8 | 8 | 9 | 2 | 12.5 | なし |
| 2 | U1 | no-silent-drop 検出契約と固定ツールチェーン | Must | 10 | 8 | 10 | 5 | 5.6 | U0 |
| 3 | U2 | census・精度改善・初期 baseline / exemption 確定 | Must | 9 | 7 | 10 | 5 | 5.2 | U1 |
| 4 | U3 | #1878 persistBlocked 系の fail-closed 化 | Must | 9 | 7 | 9 | 5 | 5.0 | U2 |
| 5 | U4 | #1874 setCheckbox / setStageSuffix 系の fail-closed 化 | Must | 9 | 7 | 9 | 5 | 5.0 | U2 |
| 6 | U5 | #1963 外部修正の回帰契約 | Must | 8 | 6 | 8 | 3 | 7.3 | U0、U1 |
| 7 | U6 | shrink-only ratchet・CI・配布・完了証跡 | Must | 10 | 9 | 10 | 5 | 5.8 | U2〜U5 |

WSJF が高い U5 は U1 完了後に U2 と並行可能である。U3 と U4 も U2 完了後は相互独立に進められる。U6 はすべての結果を CI と配布契約へ統合するため最後に置く。

## Proto-Unit 詳細

### U0 — 最新 main・#1963 上流契約の統合確認

**目的:** [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) を正本として #1963 の重複実装を防ぐ。

**受け入れ条件:**

- 最新 main に [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) の契約が含まれることを確認する。
- 未知 section が `section-unrecognized` となり、state のバイト列を変更しない期待値を固定する。
- 統合競合があっても旧実装を復活させない。

### U1 — no-silent-drop 検出契約と固定ツールチェーン

**目的:** 無音化3形態を構造的に検出し、内部異常を成功へ丸めない実行基盤を作る。

**受け入れ条件:**

- ast-grep を再現可能なバージョンへ固定し、frozen install を通す。
- 3形態の positive / negative fixture を100%分類する。
- 走査対象を `core`、`harness`、`scripts` の手書き正本へ限定する。
- ツール、ルール、baseline、0件走査、部分走査の異常を型付き診断付きで拒否する。

### U2 — census・精度改善・初期 baseline / exemption 確定

**目的:** 既存債務を可視化し、増やせない初期値へ変換する。

**受け入れ条件:**

- 全初期検出に真陽性・偽陽性と根拠を記録する。
- 偽陽性率を5%以下にする。未達時は baseline 追加でなくルールを改善する。
- #1878・#1874 修正前の測定値を保存し、修正後に対象分を除去する。
- `intentional-drop` の非空理由・単一ノード適用と、baseline / exemption の shrink-only 初期値を固定する。

### U3 — #1878 persistBlocked 系の fail-closed 化

**目的:** 永続化失敗を成功に見せず、呼び出し元へ伝播する。

**受け入れ条件:**

- 戻り値破棄を解消し、失敗経路を明示的に処理する。
- 失敗注入時に偽成功を返さず、state / audit の部分更新を起こさない。
- 修正により no-silent-drop baseline が減少する。

### U4 — #1874 setCheckbox / setStageSuffix 系の fail-closed 化

**目的:** 対象不在の更新を無言 no-op にしない。

**受け入れ条件:**

- 各 callsite の対象行存在保証を棚卸しする。
- 保証できない経路だけを loud failure または再同期誘導にする。
- 正常な既存 callsite の契約を不必要に変更しない。
- 修正により no-silent-drop baseline が減少する。

### U5 — #1963 外部修正の回帰契約

**目的:** 外部で解決済みの修正を維持し、統合時の後退を検知する。

**受け入れ条件:**

- [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) の実装を再実装しない。
- 未知 section の型付きエラーと state バイト不変を自動テストで確認する。
- 最新 main 統合後に回帰テストが green になる。

### U6 — shrink-only ratchet・CI・配布・完了証跡

**目的:** ローカル検出を継続的な再発防止と配布保証へ変換する。

**受け入れ条件:**

- baseline 外違反、baseline 増加、exemption 増加を CI fail にする。
- 既存 lint 系導線に blocking step として接続し、単独15秒以内を実測する。
- packager から全ハーネス投影を再生成し、package / promotion drift guard を通す。
- Comprehensive テスト、赤・緑 fixture、census 差分、性能値を完了証跡として残す。

## 実行・レビュー計画

テキストフロー: `U0 → U1 → U2 → {U3 || U4 || U5} → U6`。

成果は単一 initiative として管理し、walking-skeleton を含む Bolt ごとに独立した [PR](https://github.com/amadeus-dlc/amadeus/pulls) を作る。Bolt と U1、U2、U3〜U5、U6 の対応は Units Generation / Delivery Planning で確定し、各 Bolt は単独で検証・承認できる deployable slice とする。U3〜U5 はファイル競合と契約依存を確認したうえで並行可能とする。固定デッドラインは置かず、全 Proto-Unit の受け入れ条件と Scope Document の S-01〜S-08 が満たされた時点を完了とする。このレビュー境界は Approval & Handoff で 2026-08-02T01:26:20Z に補正承認された。

## 非バックログ化した項目

次は本 intent の backlog へ入れない。

- #1906 と、#1878・#1874 以外の既存真陽性の一括修正
- Biome 全般、汎用静的解析基盤、AWS・デプロイ・監視
- 生成投影の直接編集、テスト fixture の本番走査
- [PR #1970](https://github.com/amadeus-dlc/amadeus/pull/1970) の #1963 修正の重複実装
