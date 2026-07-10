# Requirements Analysis — 明確化質問(260710-codecov-project-gate)

> 回答方式: チームノルム(cid:requirements-analysis:election-protocol)に従い、エージェント間選挙で回答を確定する。
> 既決事項(選挙 #734=A の付帯条件)は質問対象にしない: fail-closed 判定、ratchet 一方向更新の運用定義義務、#717/#734 の明示 close/supersede、落ちる実証必須。
>
> 根拠となる実測は `../reverse-engineering/re-synthesis-summary.md`(以下 RE)を参照。

## Q1. 母集団定義 — 総カバレッジ%の分子分母に何を含めるか

RE 論点 (a)。生 LCOV(`coverage/lcov.info`)の Σ LH / Σ LF は `tests/**` 等を含み、`codecov.yml` の `ignore`(8 パターン)は Codecov 側でのみ適用されるため、生 Σ の絶対値は Codecov 報告値と一致しない(RE 実測)。本ゲートの本質は main ベースライン比の前後比較であり、PR CI とベースラインで定義が同一なら判定は正しく成立する。

- A. 生 LCOV 全体をそのまま母集団(run-tests.ts の既存総%算出と同一定義。一貫性 × 最小コスト。絶対値は Codecov UI と乖離することをドキュメントに明記)(推奨)
- B. `codecov.yml` の `ignore` 相当をゲート側でも適用して Codecov 定義に寄せる(説明可能性は最良だが ignore パターンの二重管理が発生)
- C. `packages/framework/core/` 配下のみに限定(中間。新たな第3の定義を導入)
- X. Other (please specify)

[Answer]: A(選挙 2026-07-10、4票多数決。UI 乖離のドキュメント明記は必須条件)

## Q2. 総%の取得経路 — ゲートは値をどこから得るか

RE 論点 (b)。総%は既に run-tests.ts `writeCoverageHtml()` が `totalHits/totalLines` から算出済みだが、機械可読な emit 経路は現状ゼロ(HTML 本文のみ)。

- A. run-tests.ts に機械可読 emit(JSON ファイル)を追加し、ゲートはそれを読む(既算出値の再利用で HTML と乖離ゼロ・単一情報源)(推奨)
- B. ゲート側で `coverage/lcov.info` を再パースして Σ LH/LF を独自算出(run-tests.ts 非改変だが、正規化ロジックの二重実装リスク — 採る場合は母集団定義の厳密一致責務がゲート側に生じる)
- X. Other (please specify)

[Answer]: A(選挙 2026-07-10、4票多数決)

## Q3. CI 配線 — 判定ステップをどこに置くか

RE 論点 (c)。`ci-success` は `check`/`coverage`/`codecov-status` の3ジョブ result を厳格比較済み。polling 型(codecov-status 同型)は自前判定に不要なため除外済み。

- A. 既存 `coverage` ジョブ内に判定ステップを追加(最小変更: lcov 生成済みのジョブ内で完結、ジョブ失敗が既存 `require_result` に拾われる。独立 check 名は増えない)(推奨)
- B. 独立ジョブ `coverage-project-gate` を新設し `ci-success` の needs / require_result に追加(独立 check 名で可視化・ブランチ保護に個別指定可。配線コスト中)
- X. Other (please specify)

[Answer]: A(選挙 2026-07-10、4票多数決)

## Q4. ベースライン更新ガバナンス — いつ・誰が・どうやって上げるか

選挙付帯条件 (1) の具体化。既存 ratchet 慣行(`tests/.coverage-ratchet.json`: リポ内コミット済みファイル、単調 fail-closed、`--check` なし実行で再生成 → レビュー付きコミット)が設計テンプレート(RE §3)。

- A. ratchet 同型: ベースライン%をリポ内コミット済みファイルで管理。上げる更新は、カバレッジを向上させた PR の作成者が再生成コマンドで同一 PR 内に含め、通常のレビュー・マージフローで承認する。自動 bump ジョブは設けない(人間レビューを通らない書き込み経路を作らない)(推奨)
- B. main マージごとに CI が自動でベースラインを bump コミット(常に最新 main に追随するが、bot コミット経路と実測値の flake に弱い)
- C. 定期(リリース時等)に leader がまとめて bump(更新が疎になり、向上分の保護が遅れる)
- X. Other (please specify)

[Answer]: A(選挙 2026-07-10、4票多数決)

## Q5. 許容幅(threshold)— どこまでの低下を許すか

codecov.yml の project status は `threshold: 0.02`(0.02% までの低下を許容)だった。自前ゲートの判定式に同種の許容幅を設けるか。

- A. 0.02% を踏襲(Codecov 時代と同じ運用感度。丸め・微小変動での偽赤を回避)(推奨)
- B. 0%(完全単調。1行でも下がれば赤 — ratchet と同じ厳格さだが、%は分母変動で無実の低下が起きうる)
- C. 0.1%(緩め。小規模リファクタの摩擦を減らすが保護が弱まる)
- X. Other (please specify)

[Answer]: A(選挙 2026-07-10、4票多数決)

## Q6. codecov.yml の project status セクションの扱い

RE §4。現状 Codecov は本リポに `codecov/project` を emit しないため実質無効だが、設定を残すと将来 emit 再開時に自前ゲートと二重化して値が食い違い運用者が混乱するリスクがある。patch status は正常稼働中なので対象外。

- A. `coverage.status.project` セクションを削除(自前ゲートが唯一の project 判定。将来 Codecov 再稼働時の再導入は #734 close 後の新規判断として Issue 起票)(推奨)
- B. `informational: true` に変更して残す(参考表示のみ。emit 再開時も CI をブロックしないが、二重の数字は残る)
- C. 現状維持(emit されない限り無害。ただし #717/#734 supersede の趣旨と不整合)
- X. Other (please specify)

[Answer]: A(選挙 2026-07-10、4票多数決。再導入は将来の新規 Issue)
