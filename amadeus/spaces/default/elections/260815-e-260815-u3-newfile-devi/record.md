# Election Record
Election ID: E-260815-U3-NEWFILE-DEVIATION
Run ID: run-1
Lifecycle: tallied
Established questions: 1
Hold questions: 0
Held question IDs: none

## Question q-u3-newfile: U-3(#3028)の drift 検査は、承認済み D-3 (b)『既存 docs 検証テストへの追加』に対し、新規ファイル tests/integration/t3028-sensors-docs-sync.integration.test.ts として実装された(§12a iteration 2 が無申告逸脱として BLOCKER)。裁定対象: この検査の置き場。前提事実: (1) 06-sensors の docs 面には既存の検査ファイルが存在しない(drift が実在した理由そのもの) (2) 既存 docs 検証テスト群(t132 hooks-doc-count / t174 docs-legacy-refs / t228 settings-docs 等)はそれぞれ別の doc 面を単一主題で検査する1ファイル1主題の様式 (3) 検査は実 filesystem 走査のため integration tier / size: medium が適合(unit tier の size purity ゲート実測) (4) D-3 の判断根拠は『新規 CI ジョブを作らず既存スイートへ』(reuse inventory)。
Established: A: 新規ファイルを容認し D-3 を追補 — 既存スイート(bun test 配下の integration tier)内の新規1ファイル1主題は reuse inventory の趣旨に適合。decisions.md D-3 へ帰属付き追補(『既存テストへの追加』は『既存スイート内への追加(1ファイル1主題の既存様式に従う)』へ精密化)を記録する (choice 1)
Choice counts:
- Choice 1 A: 新規ファイルを容認し D-3 を追補 — 既存スイート(bun test 配下の integration tier)内の新規1ファイル1主題は reuse inventory の趣旨に適合。decisions.md D-3 へ帰属付き追補(『既存テストへの追加』は『既存スイート内への追加(1ファイル1主題の既存様式に従う)』へ精密化)を記録する: 2
- Choice 2 B: 既存 docs 検証テストファイル(例: t132 または t174)へ本検査を統合し、新規ファイルを削除する — D-3 文言への字義通りの適合を優先する: 0
GoA: favor=2 against=0 abstain=0 discuss=0
GoA frequency: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
Reservations:
- Reservation subagent-1 [original:2026-08-15T04:30:11Z] GoA 2: 実体はAで是正するが、無申告逸脱という手続き瑕疵は消えない — decisions.md D-3 の追補には『実装時に逸脱を申告せず §12a iteration 2 で検出された』事実と本選挙IDを帰属として明記し、追補を根拠に手続き瑕疵を無かったことにしない(P3)。
- Reservation subagent-2 [original:2026-08-15T04:40:00Z] GoA 2: 置き場としての A は支持するが、承認は成果物の追補が伴うことを条件とする — decisions.md D-3 の追補には本選挙 ID(E-260815-U3-NEWFILE-DEVIATION)を帰属として明記し、実装時に事前申告がなかったこと自体は P3 の無申告逸脱として record に別途記録すること(置き場の追認は申告義務の免除ではない)。
Late responses:
- None
Run lineage: run-1

## Timeline
- tallied at=2026-08-15T04:33:13Z run=run-1