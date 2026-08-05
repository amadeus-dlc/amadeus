# Business Rules: convergence-toolchain(U2)

上流入力(consumes 全数): unit-of-work、unit-of-work-story-map、requirements、components、component-methods、services

BR 集合は unit-of-work の U2 責務境界(検出+配送、前進判定なし)と unit-of-work-story-map の U2 担当 FR/NFR から導出する。

## BR 一覧(テスト可能形)

- **BR-U2-1(収束述語)**: 収束 = `replied-unresolved` 0 件 ∧ `ignored` 0 件 ∧ `mergeStateStatus == "CLEAN"` ∧ mergeable 解決済み。`replied-unresolved` を含む fixture で必ず不成立(NFR-2 の赤実証)
- **BR-U2-2(4区分の排他全被覆)**: bot 起点スレッド(最初の bot コメントを持つ thread)は classifyThread の決定表で必ず1区分に落ちる(未分類は型で表現不能)。bot コメント不在スレッドは `humanOnly` へ分離し violating に数えない(収束述語の分母は bot 起点のみ — 無音で落とさず台帳に記録)。`outdated` は独立区分として台帳に残る。先頭非 bot・bot 不在の両 fixture でテスト固定
- **BR-U2-3(bot 判定)**: `__typename === "Bot"` のみを bot とする。login 名の静的列挙をコードに置かない(grep で検査可能)
- **BR-U2-4(ページング全数)**: reviewThreads は `pageInfo.hasNextPage === false` まで取得。fixture に複数ページケースを含める
- **BR-U2-5(UNKNOWN retry)**: mergeable UNKNOWN は不成立として retry(MAX 5 回・10s 間隔 — named constants、ADR-4)。上限到達は "unknown-exhausted" で不成立確定。テストはタイミングシーム(interval 注入)で実時間待機なし
- **BR-U2-6(gh 4契約 — ADR-6/E-PCP-ADDEV 留保の assertion 化)**: (i) 実行前 readiness 検査(`gh --version` runnable ∧ `gh auth status --hostname github.com` 成功) (ii) argv 配列のみで起動(シェル文字列連結の不在をテストで固定) (iii) token を保持・出力しない(GhError の stderr は digest 化 — 生文字列を型に持たない) (iv) 失敗は typed error → exit 2 loud fail(無音の空台帳・部分台帳を返さない)
- **BR-U2-7(レポートの機械生成)**: レポート md は ConvergenceReport 型からの render のみ。report verb は converged 時のみ書込(不成立時の書込は fail-open であり禁止)。override レポートは `converged: false`+OverrideRecord を必ず含む
- **BR-U2-8(override の人間束縛)**: override verb は最新実 HUMAN_TURN の audit 実在検証を通過した場合のみ受理。受理は audit emit と対(記録なき前進の禁止 — FR-7b)
- **BR-U2-9(終端処理の抽出)**: 後続 PR で是正した thread の終端処理(却下返信+resolve+対応 PR/commit 記載)を台帳の `terminalized()` が機械抽出できる(FR-4c — #1887 集計の一次入力互換)
- **BR-U2-10(severity 転記)**: bot コメントの構造化 severity を台帳へ転記(FR-3d)。非構造化コメントは severity null(推測で埋めない)
- **BR-U2-11(core 非依存)**: `plugins/pr-convergence/tools/` の4ファイルは相互 import のみ。core への import 0 件(E-PCP-ADDEV 裁定 — import-closure guard の検査対象)

## テスト戦略との対応(Comprehensive)

- 純関数(classifyThread / evaluateConvergence): unit 層(fs 非依存)
- 台帳・CLI(fixture 駆動の実 FS・spawn): integration 層(fs-tests-integration-first)
- GraphQL fixture は実 PR 実測から採取(A-1)し、契約テストの正本とする
- tNNN は t444 以降を予約(NFR-5)
