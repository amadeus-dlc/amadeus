# Business Logic Model

## 目的

U002 は、参照リンク化方針のうち validator、eval、人間判断で扱う境界を扱う。

この Functional Design では、機械的に検出できる構造条件を validator に寄せ、誤検出しやすい品質条件を eval または人間判断へ残す。

## 対象 Unit

- U002 検出境界

## 業務ロジック

1. Construction 完了状態を、`state.json` の `construction.status: completed` または `construction.gate: passed` から判定する。
2. Construction 完了状態では、対象 Bolt ごとに `test-results.md` と `pr.md` を必須の Bolt 成果物として扱う。
3. `pr.md` は、Pull Request URL だけでなく、`[PR #nnn](https://github.com/<owner>/<repo>/pull/<nnn>)` 形式の GitHub Pull Request リンクを要求する。
4. `construction/traceability.md` の Task Generation 追跡では、Construction 完了状態の PR 欄に GitHub Pull Request リンクを要求する。
5. validator は、PRリンクの構造条件と成果物欠落を fail として報告する。
6. permalink の品質、リンク表示名の読みやすさ、文脈上の妥当性は eval または人間判断へ残す。

## 入力

- `state.json`
- `construction/traceability.md`
- `construction/bolts/<bolt-id>/pr.md`
- `construction/bolts/<bolt-id>/test-results.md`
- 対象 Bolt ID
- GitHub Pull Request URL

## 出力

- validator 判定
- eval 判定
- 人間判断対象
- 対象外理由
- PR記録欠落の検出結果
- PRリンク形式の検出結果

## 検出対象

1. 完了済み Construction の `requiredBoltArtifacts` に対象 Bolt の `pr.md` がない場合は validator で fail にする。
2. `pr.md` の Pull Request 欄に GitHub Pull Request リンクがない場合は validator で fail にする。
3. `construction/traceability.md` の PR 欄が裸の `PR #nnn`、`未作成`、`未実施`、空欄の場合は validator で fail にする。
4. `pr.md` が存在し、state から参照されていない場合も、既存の任意 PR 記録として構造を検査する。

## 対象外

- GitHub 上のファイルパスが commit SHA 付き permalink かどうかの全件確認は、この Bolt では実装しない。
- コードブロック内の例示、説明文、参照先が一意に決まらない一般語は validator の fail 対象にしない。
- Pull Request のCI状態、review状態、merge判断の妥当性は GitHub 側の確認と人間判断に残す。

## 未確認事項

- なし。
