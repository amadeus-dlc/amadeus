# Election Record
Election ID: E-260820-FMC-UG-S13
Run ID: run-1
Lifecycle: tallied
Established questions: 1
Hold questions: 0
Held question IDs: none

## Question q-learnings-selection: units-generation (intent 260820-fmc-drift-batch) の §13 学習選定。候補3件のうち project.md へ永続化するものを選べ。提案は『0件で可』— c1 (質問0問の判定) はステージ規定の exceptionally clear 条件の適用記録、c2 (story-map の FR trace 化) はスコープ SKIP 時の様式判断 (intent 固有)、c3 (FR-REG-5 の2 unit 分割維持) は ADR-1 の帰結 (intent 固有)。なお本ステージ §12a の実質的学習候補「並列 unit の write scope 非交差主張は生成台帳 (coverage-registry 等) の共有書込を織り込んで書く」は既存ノルム cid:build-and-test:registry-merge-recomposition が既に台帳交差の解決を規定しており、新規則性の判定は投票者に委ねる (採用する場合は choice 4)。
Established: 台帳交差の織り込み則を採用 (choice 4)
Choice counts:
- Choice 1 0件で可 (全候補不採用): 0
- Choice 2 c1 を採用: 0
- Choice 3 c3 を採用: 0
- Choice 4 台帳交差の織り込み則を採用: 2
GoA: favor=2 against=0 abstain=0 discuss=0
GoA frequency: 1x0 2x2 3x0 4x0 5x0 6x0 7x0 8x0
Reservations:
- Reservation subagent-1 [original:2026-08-20T13:10:01Z] GoA 2: 採用文は既存ノルム cid:build-and-test:registry-merge-recomposition への追補として書き、二重規定を避けること — 既存則は「着地時(PR landing)の台帳競合解決手順」を規定するのに対し、本則は「units-generation ステージで非交差主張を立てる際に生成台帳の共有書込を先に宣言する」という設計時の記述慣行であり、両者は適用面(解決 vs 宣言)が異なる。適用範囲は units-generation の非交差主張セクションに限定し、一般の write-scope 記述全般へ広げすぎないこと。実測根拠として本 intent の §12a iteration 1 BLOCKER(生成台帳の共有書込面の欠落)と iteration 2 の是正文言を cid 併記で引用すること。
- Reservation subagent-2 [original:2026-08-20T13:10:09Z] GoA 2: 既存ノルム cid:build-and-test:registry-merge-recomposition は台帳競合の解決手順(着地時)のみを規定し、units-generation で非交差主張を書く宣言時の慣行はカバーしていないため独立則と判定したが、これを既存ノルムの単なる適用例と読む余地も残る。project.md へ追補する際は「ソース面の非交差」と「生成台帳面の交差(既存手順で解決)」を明示的に書き分ける形にし、cid:build-and-test:registry-merge-recomposition / cid:code-generation:c5-regen-needs-build を相互参照させること。
Late responses:
- None
Run lineage: run-1

## Timeline
- tallied at=2026-08-20T13:10:46Z run=run-1