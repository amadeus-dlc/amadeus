# Requirements — 自前 project カバレッジゲート(260710-codecov-project-gate)

> scope: refactor / 由来: #734 選挙 A(4/6 多数決)+ 付帯条件3点 / 明確化6問は全問 A で選挙確定(`requirements-analysis-questions.md`)。

## 1. インテント分析

**達成したいこと**: Codecov が本リポジトリに `codecov/project` status を emit しない外部ブロッカー(#734、実測で継続中)に依存せず、**main ベースライン比で総カバレッジの低下を fail-closed で検知する CI ゲート**を自前実装する。目的は「project カバレッジの静かな低下を PR マージ前に止める」ことであり、Codecov UI との絶対値一致ではない。

**ゴールでないもの**: Codecov project status の復旧そのもの(将来 Codecov 側が直った際の再導入は新規 Issue として判断する)。

**選挙で固定済みの付帯条件**(本書はこれらを要件化する):
1. ratchet ベースラインの一方向更新運用(いつ・誰が上げるか)の定義 → FR-5
2. マージ時に #717/#734 の Codecov 待ち経路を明示 close/supersede → FR-8
3. fail 注入で赤くなる「落ちる実証」必須 → NFR-1

## 2. 上流入力(参照)

- `amadeus/spaces/default/codekb/amadeus/business-overview.md` — プロジェクトの目的・配布モデル(フレームワーク本体はリポ CI 資産と分離)の背景理解。
- `amadeus/spaces/default/codekb/amadeus/architecture.md` — core/harness/dist の境界と CI 検証面の全体像。本 intent の変更がリポ CI 資産側(dist 非対象)に閉じることの根拠。
- `amadeus/spaces/default/codekb/amadeus/code-structure.md` — 「Coverage CI 経路」節(本 intent の RE で追記): ci.yml の4ジョブ DAG、`tests/run-tests.ts` の総%算出箇所、既存 ratchet 機構の file:line。
- `../reverse-engineering/re-synthesis-summary.md` — 設計論点3つ(母集団/取得経路/CI 配線)の固定材料と選択肢、ratchet 前例の運用テンプレート。

## 3. 機能要件

### FR-1 機械可読カバレッジ emit(選挙 Q2=A)

`tests/run-tests.ts` のカバレッジ集計(`writeCoverageHtml()` が使う `totalHits`/`totalLines` と同一の値)から、機械可読な JSON ファイルを coverage 実行時(`bun run coverage:ci` 経路)に出力する。

- 母集団は**生 LCOV 正規化後の全体**(選挙 Q1=A。`tests/**` 等を含む既存 HTML と同一定義。`codecov.yml` の `ignore` は適用しない)。
- 単一情報源: JSON の値は HTML と同じ算出変数に由来し、乖離ゼロ(二重算出禁止)。
- 合否基準: coverage 実行後に JSON が存在し、hits/lines(整数)を含み、その値が HTML 表示と同一ソースから出ていることがコード上追跡できる。

### FR-2 ベースラインファイル(選挙 Q4=A)

main の総カバレッジ値を**リポ内コミット済みファイル**で管理する(既存 `tests/.coverage-ratchet.json` と同型の方式。artifact 参照・外部ストアは用いない)。

- 保持する値は hits/lines の整数(%は導出値 — 丸め安全のため)。正確なパス・スキーマは functional-design で確定。
- 合否基準: ファイルが git 管理下にあり、CI の判定ステップがそれを読む。

### FR-3 fail-closed 判定ステップ(選挙 Q3=A、Q5=A)

既存 `coverage` ジョブ内に判定ステップを追加する(新規ジョブ・polling は設けない)。

- 判定式: 現在% < ベースライン% − **0.02 百分点** なら失敗(exit 非ゼロ)。ジョブ失敗は既存 `ci-success` の `require_result` にそのまま拾われ PR をブロックする。
- 判定に使う値はすべて実行結果由来(FR-1 の JSON と FR-2 のファイルの実読み)。status のハードコード・自己参照比較は禁止(team.md Forbidden「検証劇場」)。
- 合否基準: 閾値超の低下を注入すると赤、閾値内なら緑(NFR-1 で実証)。

### FR-4 欠落時 fail(fail-closed の完全性)

FR-1 の JSON 不在・FR-2 のベースライン不在・いずれかのパース不能は、すべて判定ステップの失敗とする(旧 `if_not_found: failure` と同等の意味論)。

- 合否基準: それぞれの欠落・破損を注入すると赤(NFR-1 で実証)。

### FR-5 ベースライン更新の一方向運用(選挙 Q4=A、付帯条件1)

- 更新手段: 再生成コマンド(既存 ratchet の「`--check` なし実行で再生成」と同型。実装位置は functional-design で確定)がベースラインを現在値へ書き直す。
- 更新主体とタイミング: **カバレッジを向上させた PR の作成者**が、同一 PR 内に再生成結果を含め、通常のレビュー・スカッシュマージフローで承認を受ける。
- 自動 bump ジョブ・bot コミット経路は設けない(人間レビューを通らない書き込み経路の禁止)。
- 一方向性の担保: 機構上は再生成で下がる値も書けるが、ベースラインファイルの diff は PR レビューで必ず可視になる。**意図的な引き下げはユーザー承認事項**としてドキュメントに明記する(FR-7)— これは既存 ratchet と同じ運用構造。
- 合否基準: 更新手順が FR-7 のドキュメントに存在し、自動 bump の CI 配線が存在しないこと。

### FR-6 codecov.yml の project status 節削除(選挙 Q6=A)

`codecov.yml` から `coverage.status.project` セクションを削除する。`patch` セクションと `ignore`/`fixes` は一切変更しない。

- 合否基準: 削除後の codecov.yml に project 節が存在せず、patch 節が変更前とバイト同一。Codecov 再稼働時の project status 再導入は #734 close 後の新規 Issue として扱う旨を FR-8 の close コメントに記す。

### FR-7 ドキュメント(選挙 Q1=A の必須条件)

英語ドキュメント(掲載先ページは functional-design で確定)に以下を明記する:

1. 母集団定義(生 LCOV 正規化後の全体。`tests/**` 等を含む)
2. **Codecov UI の project% と絶対値が乖離する**こと、および乖離してよい理由(前後比較の一貫性が一次要件)
3. 許容幅 0.02 百分点の判定式
4. ベースライン更新手順(向上 PR 内で再生成・レビュー承認)
5. 意図的にベースラインを引き下げる場合の手順(ユーザー承認事項)

- 合否基準: 上記5点が該当ドキュメントに存在する。

### FR-8 #717/#734 の明示 supersede(付帯条件2)

本 intent の実装 PR マージ時に、(a) PR #717(park 中の Codecov project 待ち経路)を close し、(b) Issue #734 を close する。いずれも本 intent の PR へのリンクと supersede の根拠(自前ゲートで project 保護を達成、Codecov 復活時の再導入は新規 Issue)をコメントに残す。

- 実行主体: leader のマージ執行フロー(no-AI-merge ノルム準拠 — マージ承認とセットでユーザーに提示)。
- 合否基準: 両者が close され、コメントに根拠リンクがある。

## 4. 非機能要件

### NFR-1 落ちる実証(team.md Mandated、付帯条件3)

新設ゲートは失敗ケースを注入して**実際に赤くなること**を実証してから完成扱いにする。

- 実証パターンは既存 ratchet の前例(`AMADEUS_COVERAGE_RATCHET` による temp-tree 差し替え+`spawnSync` でのプロセス境界実測)に準拠する。
- 最低限の実証ケース: (a) 閾値超の低下注入 → exit 非ゼロ (b) JSON 欠落 → 非ゼロ (c) ベースライン欠落 → 非ゼロ (d) 閾値内 → ゼロ。
- 判定ロジック自体は in-process seam(関数直接呼び出し)でも単体テストする — `bun --coverage` は spawn したサブプロセスを計測しないため(project.md Corrections: bun-coverage-spawn-blindspot)、spawn 経由テストだけでは新規行が patch ゲートの盲点に入る。

### NFR-2 決定性・丸め安全

- 判定は整数 hits/lines から%を導出して行い、同一入力に対して決定的であること。
- 0.02 百分点の比較は浮動小数点の丸めで結果が反転しない実装であること(実装方式は functional-design)。

### NFR-3 CI 影響の上限

- 新規ジョブ・外部 polling を追加しない。`coverage` ジョブへの追加は判定ステップ1つで、実行時間の増分は既存ジョブのタイムアウト設定を脅かさない数秒オーダーとする。

### NFR-4 テスト姿勢(org.md: refactor スコープ)

- 既存テストスイートのグリーン維持。本ゲートの回帰テスト(NFR-1 のケース)を `tests/` 配下に TypeScript で追加し、既存ランナーで実行可能にする。

## 5. 制約

- `ci-success` / `require_result` の配線は変更しない(選挙 Q3=A の帰結)。
- 自動 bump ジョブ・bot コミット経路の新設禁止(選挙 Q4=A)。
- バージョン・リリース面(release.yml、バージョンファイル、バッジ)には一切触れない(project.md Mandated)。
- 変更対象はリポ CI 資産(`tests/`、`.github/workflows/ci.yml`、`codecov.yml`、docs)に閉じる見込みで、`core/`・`harness/` は触らない想定 → dist/self-install 同期は不要のはずだが、実装時に `bun run dist:check` / `promote:self:check` で無影響を確認する(functional-design で最終確認)。
- 後方互換レイヤー・移行シムを作らない(team.md Forbidden)— 旧 Codecov project 待ち経路は削除・置換(FR-6/FR-8)。

## 6. 前提

- Codecov の **patch** status は正常稼働中であり、本 intent で変更しない(RE 実測: 直近5 main コミットで patch は全 emit)。
- `coverage` ジョブは既に `coverage/lcov.info` を生成している(ci.yml、`bun run coverage:ci` = `bun tests/run-tests.ts --ci --coverage --coverage-dir coverage`)。
- 総%の算出ロジック(生 LCOV の正規化と Σ LH/Σ LF)は `tests/run-tests.ts` に既存であり、本 intent はそれを emit 面で再利用する(再実装しない)。

## 7. スコープ外

- Codecov project status の復旧・サポート起票・再連携(ユーザー裁定で見送り継続。将来の再導入は新規 Issue)。
- Codecov patch ゲートの変更。
- 母集団を `codecov.yml` の `ignore` に整合させる作業(選挙 Q1 で B 案は非採用)。
- カバレッジ%そのものの向上作業。
- GitHub ブランチ保護設定の変更(人間の UI 操作領域。既存 required check 構成のまま `ci-success` 経由でブロックが効く)。

## 8. 未解決事項(後続ステージへ)

- FR-1 JSON / FR-2 ベースラインファイルの正確なパス・スキーマ(functional-design)。
- ベースライン再生成コマンドの実装位置 — run-tests.ts のフラグか独立スクリプトか(functional-design)。
- FR-7 ドキュメントの掲載先ページ(functional-design)。
- 判定ステップの実装形態 — coverage ジョブ内の bun スクリプト呼び出し想定(functional-design)。

## Review

**Verdict: READY**

Reviewer: amadeus-product-lead-agent、日付: 2026-07-10、iteration: 1

実測による裏取り: `codecov.yml`(ignore 8パターン・`coverage.status.project`/`patch` の現行値)、`.github/workflows/ci.yml`(`ci-success` の `require_result` が `check`/`coverage`/`codecov-status` の3ジョブを対象とする配線)、`tests/run-tests.ts`(`writeCoverageHtml()` の `totalHits`/`totalLines` 算出箇所)、`tests/.coverage-ratchet.json` と `tests/gen-coverage-registry.ts`(`runCheck()` の単調 fail-closed 判定・コミット済みファイル方式)を確認し、いずれも requirements.md の記述と一致した。

選挙6問(Q1〜Q6、全問 A)は FR-1(Q2)・FR-2/FR-5(Q4)・FR-3(Q3・Q5)・FR-6(Q6)に過不足なく写像されている。選挙付帯条件3点(ratchet 一方向更新運用の定義/#717・#734 の明示 supersede/落ちる実証の必須化)は、それぞれ FR-5・FR-8・NFR-1 として要件化されており、いずれも未解決事項へ先送りされていない。各 FR/NFR には file:line 相当の実測または注入パターンに基づく合否基準があり、テスト可能である。ステージ定義が要求する7区分(インテント分析・機能要件・非機能要件・制約・前提・スコープ外・未解決事項)はすべて存在する。

ideation フェーズが本 intent ではスコープ別に全面 SKIP されており(amadeus-state.md 実測)、`intent-statement`/`scope-document`/`team-practices` の各成果物自体が生成されていない。requirements.md がこれらに言及していないのは同フェーズが実行されなかった結果であり、本ステージ側の欠落ではない(該当 `consumes` はいずれも `required: false`)。

指摘事項: なし(blocker/major 該当なし)。

軽微な所見(non-blocking、参考情報):
1. (minor, §3 FR-2/FR-7) ベースラインファイルの正確なパス・スキーマとドキュメント掲載先ページが未確定だが、これは stage 定義上 functional-design で確定すべき設計詳細であり、requirements 段階での先送りとして適切。
2. (minor, §4 NFR-3) 「数秒オーダー」という表現はやや定性的だが、「新規ジョブ・外部 polling を追加しない」という構造的制約と対で書かれており、閾値化を要求するほどの曖昧さではない。
