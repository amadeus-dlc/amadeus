# Architecture Decision Records — 260814-plugins-rename-drift

上流入力: `requirements.md` Open Questions 1〜7、spike 実測(`application-design-questions.md` ヘッダ)、裁定 Q1〜Q7(semi 梯子 AUTO_DECIDED — 裁定 id は questions ファイル承認証跡)。

## 裁定 ↔ ADR 対応表

| 裁定 | 内容 | 記録先 |
|---|---|---|
| Q1 | scope-bindings 移行方式 | ADR-2 |
| Q2 | フィクスチャ名の追随可否 | ADR-1 |
| Q3 | env 宣言スキーマの先送り | ADR-3(Decision 4) |
| Q4 | seams 注入先 | ADR-4 |
| Q5 | センサー方式 vs advisories | ADR-4 |
| Q6 | 配布経路 | ADR-4 |
| Q7 | 設定受け渡し経路 | ADR-3(Decision 3) |
| — | core import 禁止(既存制約の採録) | ADR-6 |

## ADR-1: 改名は git mv + 全消費者同期の単一 PR、識別子 4 種とフィクスチャディレクトリは不変

- **Context**: `amadeus-plugin-compose.ts:344` が name=ディレクトリ名を強制するため部分改名は構造的に不成立。ステージ slug・センサー id・スキル名・ツールファイル名は cid・監査・ノルム言及の連続性を担う。`tests/fixtures/pr-convergence/` は不変のステージ slug に整合する名前で、パス述語 `plugins/pr-convergence` に非該当。
- **Decision**(Q2=A): ディレクトリ+name+全消費者(パス軸 26 のうち歴史記録を除く全て、素の名前軸 4 面)を 1 PR で同期。fixtures ディレクトリ名は維持し README のパス文字列のみ更新。`t445:52` の `PLUGIN` 定数は実プラグイン名軸のため `"github-pr-convergence"` へ追随。
- **Consequences**: 残存参照検査の除外リストに fixtures ディレクトリの維持根拠を記載。t445 は改名 PR 内で green を維持。
- **Alternatives Rejected**: fixtures ディレクトリも改名(ステージ slug と乖離した名前になり、slug 軸の連続性根拠と矛盾。変更面も無用に拡大)/ name のみ改名(compose 検証で構造的に不成立 — Issue 確定済み)。
- **Reversibility**: 高(再 git mv で戻せる。監査・cid は slug 軸のため無傷)。

## ADR-2: scope-grid 退行は落ちる実証付きテストで検証、恒久 fail-closed はスコープ外

- **Context**: `amadeus-graph.ts:1513` の `bindings[plugin]?.[stage.slug] ?? []` により、scope-bindings 外側キーの同期漏れはステージが全スコープ行から**無音脱落**する(改名 PR の主要リスク)。恒久の外側キー検証は #2996 が別 Issue 候補と明記。
- **Decision**(Q1=A): 本リポジトリの config 同期を改名 PR に含め、「config の scope-bindings キーとインストール済みプラグイン名の整合が崩れると scope-grid からステージ行が消える」ことを検出するテストを追加する。落ちる実証(注入 → 赤 → revert の 1 セット)で完成扱いにする。
- **Consequences**: 下流 workspace の移行は release notes / README 記載(activation.names は doctor が loud に誘導、scope-bindings はこのテストパターンを下流も使える)。恒久対策は別 Issue へ。
- **Alternatives Rejected**: 恒久 fail-closed 検証の同時実装(スコープ膨張 — Issue が明示的に切り出し済み)/ 手順書のみ(silent 退行に対する機械検証ゼロは主要リスクの放置)。
- **Reversibility**: 高(テスト追加のみ)。

## ADR-3: plugin.settings は「宣言 = plugin.json(optional)/ override = config 3 層 / 解決 = core・引数渡し」

- **Context**: プラグインは core を import できない(ADR-6、`scripts/import-closure-guard.ts` fail-closed)。config 検証は registry 駆動で未知パス検出が自動追随(`amadeus-config.ts:637-644`)。`parsePluginScopeBindings`(:497-521)が per-plugin ネストの確立パターン。`parsePluginManifest` は optional フィールド追加で旧 manifest byte-identical(tools の前例 :365-368)。compose エンジンの SCOPE コメント(:14-20「managed settings are OUT OF SCOPE」)は harness の settings.json 管理を指すが、誤読回避のため plugin.settings が対象外でないことを明記改訂する。
- **Decision**(Q7=A + FR-SET 系):
  1. 宣言: plugin.json `settings`(optional)— キー名・型(string/number/boolean/enum の閉語彙)・default・description。parse は manifest エラー集約へ相乗り(fail-closed)。宣言側の綴り誤りは `settings` 近傍キーの実在検査で loud 化(全未知キー検査は advisories 二重パーサの是正を伴いスコープ外 — #2997 の宣言側手当ては settings 誤綴りの無音化防止が要件)。
  2. override: `AmadeusConfigKey` へ `"plugin.settings"` 1 キー追加、layers = project/space/intent(実行時チューニング値のため 3 層 — activation/scope-bindings の project-only はホスト構成の性質による差で、矛盾ではない)。字句検証(キー名・機密パターン・スカラー型)は config parse、宣言スキーマとの型・閉語彙突合は解決時。
  3. 解決・受け渡し: `amadeus-sensor.ts fire` が解決し `--settings-json` で子プロセスへ。解決失敗(未宣言キー override・型不一致・閉語彙外)はセンサー実行中止 + loud 記録(デフォルト続行はしない — 無音デフォルト化の禁止)。
  4. env 宣言スキーマ(Q3=A): **先送り**。実消費者(将来の github-* 系)不在での先行着地は inception ガードレール違反。機密キー名パターン拒否は本 intent で実装し、機密の置き場が settings に無いことを保証する。
- **Consequences**: docs 2 本 + ja の更新が t432 で強制される。settings 追加は pluginContentDigest 経由で stale 検出対象(自然な鮮度連動)。
- **Alternatives Rejected**: プラグイン自前の config 読取(検証の二重実装 — オラクル相殺と同族)/ core CLI spawn での設定取得(spawn 1 回分のレイテンシと失敗様式が増えるだけで、core 解決・引数渡しに対する利点なし)/ per-plugin union キー拡張(scope-bindings 前例により不要 — Issue クロスレビュー確定)/ env スキーマ先行着地(消費者ゼロ)。
- **Reversibility**: 中(config キーと宣言形式は公開契約になる。ただし optional 宣言のため撤退時は宣言削除で戻る)。

## ADR-4: git-drift はセンサー方式・code-generation + build-and-test 注入・opt-in 配布

- **Context**: spike により stages:[] + sensors + seams は構造的に処理可能(構成要素は coverage-patch-quick / pr-convergence で実証済み、組合せのみ前例 0)。advisories 機構はステージ境界 hold + 人間選択の機構。センサーは active stage の sensors_applicable でのみ発火し、advisory severity は audit 記録のみ。t341 conformance は fixture 固定で新形状被覆外。
- **Decision**(Q4/Q5/Q6=A): センサー方式で `code-generation` と `build-and-test` の sensors seam へ注入(Construction の長時間作業帯)。advisory severity。配布は既存 3 プラグイン同型の opt-in(dist/plugins バンドル + activation.names)。本 workspace は names へ `git-drift` を追加。stage-less のため scope-bindings 不要。stages:[]+sensors+seams 形状の conformance ケースを追加し、seam id と manifest id の不一致が graph compile で loud になる失敗様式(spike 弱点 3)もテストで固定する。
- **Consequences**: git 非リポジトリ・fetch 副作用への配慮は install/drop 境界で構成可能。全ユーザー既定有効にはならない(将来 framework 標準化は別裁定)。
- **Alternatives Rejected**: advisories 配送(受動的早期警告に機構不適合 — hold はワークフローを止める)/ framework 標準センサー(非 git workspace への副作用、Issue 非採用理由確定済み)/ statusline 常時表示(発火点がステージ機構に接地しない — Issue 非採用理由)。
- **Reversibility**: 高(drop で 0-plugin ベースラインへ復帰する既存トランザクション)。

## ADR-5: スロットルは「fetch のみ skip・判定は毎回」、警告は merge queue 整合文言、逃がしフラグなし

- **Context**: レイテンシ実害の源は `git fetch`(ネットワーク)であり、ローカル判定(rev-list/diff)は軽い。`amadeus-worktree.ts:143-165` の base 鮮度ガードは SHA 一致判定 + `--allow-stale` 逃がしを持つが、目的(worktree 作成時の hard stop)が異なる。
- **Decision**: スロットルは fetch のみ skip し、判定は前回の remote-tracking ref で毎回実行(警告の空白期間を作らない)。既定値は **`fetch-throttle-seconds = 600` で設計段確定**する。これはゲート閾値(観測レンジ内側ノルム `cid:code-generation:c1-threshold-inside-observed-range` の対象)ではなく、ユーザーが settings で変更できるチューニング既定値であり、設計根拠は「PostToolUse 発火頻度(書込ごと)に対し fetch(ネットワーク往復)を高々 10 分に 1 回へ抑制すれば、検知遅延の上限 10 分は手戻り検知の目的に十分早く、レイテンシ寄与は無視できる」という定性トレードオフ。code-generation 段では既定値の再裁定は行わず、実 fetch 所要時間の 1 回の実測が「レイテンシ実害なし」の主張(NFR-1)の検証として記録される — 実測が既定値の不当性を示した場合のみ設計逸脱として梯子へ戻す。警告文言は「origin/<default> が N コミット先行。交差ファイル: … — 取り込み(mirror/rebase)または先着地の判断を検討」の形で worktree ガードと語彙を揃え、即 rebase は指示しない。`--allow-stale` 相当の逃がしフラグは作らない(advisory + throttle 設定が既に逃がし)。台帳系交差は優先警告(スカッシュ運用で台帳は競合解決コストが最大のクラス — cid:code-generation:cg-ledger-blob-reconstruction の患部)。
- **Consequences**: オフライン時も前回 ref で判定が動き、fetch 失敗は loud skip(fail-open)。
- **Alternatives Rejected**: 判定ごと skip(スロットル中に警告が完全消灯し早期検知の目的を損なう)/ blocking severity(未実行 = 不合格の完了ガードに接続され、オフライン環境でワークフローが止まる — fail-open 要件と矛盾)。
- **Reversibility**: 高(settings 値と文言はいつでも変更可能)。

## ADR-6: プラグインの core import 禁止(既存機構制約の採録)

- **Context**: 本設計(特に C4 の設定受け渡し)は「プラグインは core を import できない」制約を前提にする。これは本 intent の新決定ではなく既存機構であり、正本は次の 2 面: (1) `scripts/import-closure-guard.ts` — fail-closed・allowlist なしのビルド時ガードで、プラグイン外へ出る import は `missingFromManifest` として投影を write-0 で拒否する。(2) `plugins/pr-convergence/tools/pr-convergence-cli.ts:20-22` のコード内コメント「a plugin may not reach into core (ADR-6), so the process boundary is the same one already used for `gh`」— 過去 intent がこの制約を "ADR-6" と呼んだ痕跡だが、その ADR 文書自体は現行 record 群から辿れない(codekb `architecture.md:4055` の同名 ADR-6 は無関係の別 intent の決定)。
- **Decision**: 本 intent はこの既存制約を **ADR-6 として本ファイルに採録**し、設計上の依存(C4 の core 解決・引数渡し、C5 の core 非依存 CLI)の典拠を本 ADR に一本化する。実装上の担保は import-closure-guard の実行(ビルド時)であり、新しいガードは追加しない。
- **Consequences**: 実装者は「core の関数を plugin から呼ぶ」形の設計を検討対象から外す。settings の検証ロジックは core 側にのみ存在し、プラグインは解決済み値だけを受け取る。
- **Alternatives Rejected**: 制約の緩和(ガードへの allowlist 追加)— 検証の二重実装を許すことになり、fail-closed 境界が崩れる。制約の再導出を省き "ADR-6" の名前だけ引用し続けること — 実体不在の参照は実装者が正本を辿れない(本レビュー BLOCKER 1 の患部)。
- **Reversibility**: 採録自体は文書行為で高。制約の変更は framework 全体の境界設計変更でありスコープ外。
