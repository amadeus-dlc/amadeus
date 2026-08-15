# Design Decisions — 260814-open-bug-batch-6

## D-1: #3062 是正方式 = A(landed 記録方式)

- **Context**: self record × landed の全 verb 拒否(CLI 3層)× blocking センサーの landed 拒否が、merge queue の auto-merge 先着時にステージ完了を構造的に不可能にする。この拒否は stage 文書に明記された意図的設計だが、Merge Queue 必須ノルムおよび predicate の landed 第一級定義と契約衝突(クロスレビュー2名一致)。
- **Decision**: 選挙 `E-260815-3062-LANDED-FINALIZATION`(2-0、GoA 3/3、run-2 ESTABLISHED → recorded)により **A: landed 記録方式**。self record でも landed を merge fact 束縛の第一級最終記録として report 書込可能にし、センサーは pr-convergence ステージで landed+merge commit 検証付き report を最終収束として合格にする。stage 文書の契約を「landed は既に起きたマージの記録事実」へ改訂。
- **Consequences**: 非 self record(exit 0)との対称性回復(FR-1 (3))。converged:false の意味論は維持(収束証拠と記録事実の区別を保つ)。旧拒否 3層は削除して置換(二重経路なし)。投票留保の反映: checkRollupState は記録項目とし合格必須条件にしない(post-merge workflow の偽 FAILURE 既知事象 `cid:code-generation:c1-landed-rollup-attribution`)。
- **Alternatives Rejected**: B(override 許可)— override は人間裁定の器具であり、機械的に着地した事実へ毎回 HUMAN_TURN を強制するのは記録の意味を歪め、status/report の非対称も残る。C(順序契約)— merge queue の着地タイミングは提出側が制御できずレースを構造的に排除できない。SKIP ガードの正規化は stage 文書の「skip する env はない」宣言と正面衝突しゲート弱体化(検証劇場禁止)に触れる。

## D-2: #3026 の同型インスタンスは起票のみ(#3078)

- **Context**: クロスレビューが「tools 未宣言の第2インスタンス」を精緻化として言及。
- **Decision**: 梯子 AUTO_DECIDED(`auto-decision-3f34474d…`)で本 intent スコープ外・起票のみ。起票後の実測で実態は `advisory-model-check.ts` 1件の孤児モジュール(tools は35件宣言済み)と判明し、#3078 の本文を訂正済み。
- **Consequences**: FR-2 は sensors 宣言に閉じる。**上流訂正の明示**: requirements.md FR-2 の「同一プラグインに tools 未宣言という同型の第2インスタンスが実在する」は、本ステージの実測(tools は35件宣言済み、未宣言は `advisory-model-check.ts` 1件の孤児のみ)により**粒度が誤り**と確定した — 本 decision が上流記述を supersede し、正しい事実は #3078(訂正済み本文)を正とする。requirements 本文は歴史記録として遡及編集しない。
- **Alternatives Rejected**: 同一変更での対応 — Issue の射程外でクロスレビュー未成立の変更を混ぜることになり、surgical 原則と 1 Issue = 1 Unit に反する。

## D-3: drift 検査は既存スイートへ追加(FR-2/FR-3 AC3)

- **Decision**: 梯子 AUTO_DECIDED(`auto-decision-d6e7700a…`)。(a) センサー資産 vs plugin.json 宣言の突合を既存 conformance/unit 系テストへ、(b) docs センサー表 vs 実在集合の突合を既存 docs 検証テストへ追加。新規 CI ジョブは作らない。両検査とも落ちる実証(欠落注入 → 赤 → revert)を経て完成扱い。
- **Alternatives Rejected**: 検査なし(根拠記録のみ)— 起票後の実区間で drift が 3→4 件へ拡大した実測があり、再発クラスと実証済み。
- **追補(2026-08-15、選挙 `E-260815-U3-NEWFILE-DEVIATION` 2-0 ESTABLISHED)**: 「既存 docs 検証テストへの追加」は「**既存スイート内への追加(1ファイル1主題の既存様式に従う)**」へ精密化する。U-3 の drift 検査は新規ファイル `tests/integration/t3028-sensors-docs-sync.integration.test.ts` として実装してよい — 06-sensors 面には既存検査ファイルが存在せず(drift の実在理由)、既存 docs 検証テスト群は1ファイル1主題様式であり、実 filesystem 走査の検査を unit 常駐の既存ファイルへ統合する案は `cid:code-generation:c2-doctor-seam`(medium test は integration へ)と非両立(両投票者の一致理由)。D-3 の operative な判断根拠(新規 CI ジョブなし・既存スイート再利用)は不変。

## D-4: FR-4 は判定分岐先行(是正は条件付き)

- **Decision**: 既着地 retry(PR #3056)の発火条件が観測失敗を覆うかの一次証跡判定を最初のステップとし、覆う場合は是正 0 件+record 記録で完了(FR-4 (a))。覆わない場合のみ最小是正(FR-4 (b)、時間アサーション裁定に適合する形)。
- **Consequences**: 「修正ありき」を排し、REFRAME_REQUIRED の収束結果に忠実。

## D-5: FR-5 は scratch 再現先行(是正は機序確定時のみ)

- **Decision**: repo 外 scratch の2 workspace 構成で最小再現を試行。現行バイトの経路読解(assertSameProject throw は catch で握り潰され行は書かれない)を再現設計へ織り込む。再現しなければ Issue 完了条件3(クローズ準備+申し送り)へ。
- **Consequences**: 実 record への書込リスクを構造的に排除(env 隔離 + scratch override 規律)。

## 発見事項(本ステージ中の実測、スコープ外へ起票)

- #3077: 選挙 v2 の単一 question hold → 再 tally が `preservedResultDigest` 検証と恒真的に矛盾し commit 不能(本ステージの選挙運営中に実測。store API 直接 commit で回復し、terminal まで到達済み)
- #3078: `advisory-model-check.ts` の孤児化(上記 D-2)
