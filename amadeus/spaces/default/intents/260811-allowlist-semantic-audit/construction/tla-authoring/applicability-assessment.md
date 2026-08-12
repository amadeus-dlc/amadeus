上流入力(consumes 全数): requirements.md

# TLA+ Authoring — 適用性評価

**結論: `not-applicable`(terminal)。モデルの作成・改訂は行わない。**

ステージ契約 Step 1 に従い、「モデルが無いから対象外」と推定せず、requirements.md の
安定識別子を全数列挙して 1 件ずつ判定した。

## 選定基準

契約が定める対象は「**並行または再開可能なアクタが状態を共有し、安全性違反が無音で残りうる**
振る舞い」を含む subject に限る。これは `cid:build-and-test:two-layer-verification-posture` が
定める発動条件(並行プロトコルの spec 変更に限定し、すべての変更へ一律義務化しない)と一致する。

## 検査した識別子(全数)

| ID | 内容 | 判定 | 理由 |
|---|---|---|---|
| FR-1 | 台帳全 623 エントリの意味整合を照合 | non-target | 静的な台帳への 1 回きりの分類。アクタが 1 つで共有状態を持たない |
| FR-2 | 転位エントリの是正 | non-target | 人手の編集と機械 diff。並行実行の要素がない |
| FR-3 | `reason` の記述規約(**撤回済み**) | non-target | 契約から外れた。撤回の経緯は code-generation-plan.md |
| FR-4 | 整合を検査する機械ガードの新設 | non-target | 純関数 + AST 判定。プロセス内で完結し、共有状態も再開点も持たない |
| FR-5 | ガードの CI blocking 配線 | non-target | ジョブ間の順序は GitHub Actions の `needs` が保証する既存機構。本 intent は新規の並行プロトコルを導入していない |
| FR-6 | 規約違反・構文クラス不定の検出テスト | non-target | 決定的な入出力の検査 |
| FR-7 | 判定・是正の記録 | non-target | ドキュメント成果物 |
| NFR-1 | 決定性(同一入力→同一判定) | non-target | 決定性は**要件そのもの**であり、並行実行に由来する非決定性を含まない。同一入力 2 回実行の byte-identical テストで固定済み |
| NFR-2 | fail-closed | non-target | 単一プロセス内の分岐。無音で残る安全性違反の余地は「空出力を一致と解釈しない」形で閉じており、状態機械の探索を要さない |
| NFR-3 | 実行時間 | non-target | 数値目標を持たない(build-and-test の performance 判定を参照) |
| NFR-4 | 検証劇場の禁止 | non-target | 検査手段の性質に関する要件 |

**選定された subject: 0 件。**

## 判定の根拠(実装面)

本 intent が追加した実行経路は `tests/coverage-patch-gate.ts` の `runCheck` 内 1 箇所で、
入力は台帳 JSON とソースファイルの文字列、出力は不一致の一覧である。

- 並行アクタなし — CLI プロセス内で同期的に完結する
- 共有可変状態なし — `sourceFileCache` はプロセス内のメモ化で、観測可能な振る舞いを変えない
- 再開点なし — 途中状態を永続化しない
- 無音の安全性違反なし — 不一致は exit 1 と標準エラーへの一覧で loud に出る

したがって形式モデルが捉えるべき状態空間が存在しない。

## 停止

契約 Step 1 の「no subject meets the formal-model criterion → terminal `not-applicable` を記録して
成功として停止」に従い、Step 2 以降(モデル作成・referee・独立レビュー・登録)は実行しない。
`subjects declare` / `applicability receipt` は非空の選定集合に対する手順であるため呼び出さない。
