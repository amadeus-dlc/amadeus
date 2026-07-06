<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is maintained by the orchestrator during stage execution. Add observations at the gate ritual, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-07-05T22:40:00Z — O-1（マニフェスト具体形）と O-2（スモーク = インストール先で amadeus-utility.ts doctor を実行、fail は exit 1）を確定した。AMADEUS.md の除去は実測（dev 参照が利用者向け節の内部に散在）に基づき、H2 節単位 + 宣言的ブロックの 2 層へ精緻化した（Q2 = A の宣言性と双方向検査の枠内。単純な節単位では負方向検査を満たせないため）。
- 2026-07-05T22:40:00Z — 成果物は construction/u001-engine-installer/functional-design/ に置く（directive.unit は未指定だが、units-generation の確定 Unit 名を使用。memory_path はエンジン解決のステージ階層のまま受け入れる = 前例踏襲）。

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-07-05T23:30:00Z — reviewer iteration 2 は NOT-READY（medium 1 = 偽陽性回帰 eval の FR 番号・Bolt 割当・検証分担の欠落、minor 2 = RegExp 構築形式・連続空行）。reviewer_max_iterations = 2 に達したため 3 回目は起動せず、3 件を修正して gate の人間確認で確定する（requirements-analysis の前例と同じ扱い）: FR-2.12 を requirements へ追補（B002 割当、BR-14 の検証手段に明記）、RegExp は new RegExp(文字列) 構築と明記、連続空行の圧縮を除去アルゴリズムに追加。informational（FR-1.11/FR-2.2〜2.4 の BR 未言及）は requirements 直読で実装可能なため対応しない。iteration 2 で reviewer が机上検証を独立再現し、除去仕様（正方向 4 件実在・負方向 0 件）と偽陽性リスクの根拠（resolveProjectDir 実装）の正しさを確認済み。

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-07-05T23:10:00Z — reviewer iteration 1 は NOT-READY（重大 2 = devReferencePatterns が利用者必須の validator コマンド行まで巻き込む・doctor の project dir 解決が cwd 依存で偽陽性、中 2 = マージ先ブロックの所有者未区別・BR-10 のバイト不変とフル再シリアライズの矛盾、軽微 2）。全件修正: パターンを負の後読み付き正規表現へ（source skill 参照だけ検出）+ 除去ブロックを段落境界に整列（parity 行は適応コピー段落に内包、sandbox e2e 段落を追加）+ 残存照合ゼロを机上検証、smoke は --project-dir 明示 + cwd + 偽陽性回帰 eval を契約化、マージ先は「manifest 管理コマンドを含む最初のブロック」、BR-10 を skills = バイト / settings = deep-equal に分離、5 工程 6 関数の内包関係を明記、BR-13〜15（FR-1.2/1.7/3.1）を追加。

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
