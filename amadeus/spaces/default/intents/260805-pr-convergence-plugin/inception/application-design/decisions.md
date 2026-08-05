# Decisions (ADR): PR 収束 opt-in プラグイン

上流入力(consumes 全数): requirements、architecture、component-inventory

測定 ref: observed = origin/main `8409c2039c52`(requirements・codekb architecture / component-inventory と同断面)

## ADR-1: seam の実 frontmatter 接続方式(requirements OQ-1 / FR-2a)

**Context**: compose の seam 機構(SEAM_NAMES/merge/台帳/drop 復元)は既存だが、host stage 認識面が合成バイト形(`stage: <slug>` 1行目要求)で実 Markdown ステージに未接続(architecture の「plugin seam 機構の半実装状態」節、amadeus-plugin-compose.ts:552-554 コメント verbatim「the real frontmatter serializer is U11+」)。

**Decision**: **(a) frontmatter 保存型 parse/serialize を新設**し、`parseHostStageSeams` の受理集合を実ステージ frontmatter(`---` 区切り YAML の produces/consumes/sensors/required_sections 配列)へ拡張する。serialize は frontmatter の対象4配列だけを書き換え、それ以外のバイト(本文・他フィールド・コメント)を保存する。compose は install 時に host workspace の `code-generation` ステージ実ファイルの produces へ `pr-convergence-report` を追記し、seam 台帳が drop 時の復元を所有する。compile は既存どおり実 frontmatter を読むため、`unitCovered` は node.produces 経由で自動的に新 produces を検査する(engine のガード側は無変更 — FR-2b/C-2 充足)。

**Consequences**: (+) 既存 seam 基盤(merge/台帳/drop)を全量再利用。ガード本体無変更。compile 側も無変更。(−) frontmatter serializer の正確性(バイト保存)が新たな正しさ面になる — 往復(parse→serialize)の byte-identity テストと、対象外フィールド不変のテストで固定する。Reversibility: 中 — serializer は core の共有機構になるため、後続 plugin が seam を使い始めると受理集合の変更が波及する。受理集合(frontmatter 4配列)を最小に保つことで固定面を絞る。

**Alternatives Rejected**:
- (b) `QualityRequiredOutputDescriptor`(amadeus-quality-repair.ts:125-130)の接続: 型は存在するが `compileQualityContribution` :242 が requiredOutputs 非空を fail-closed 拒否し、消費者は repo 全域 0 件(component-inventory の再利用候補3件の実測)。接続には activation 変更+unitCovered との二重判定面の新設 = engine 改修が (a) より大きく、ガード1定義所有(C-2)に反する第2ガード面を作る。
- (c) install 時に seam 機構を経由せず code-generation.md を直接書き換え: drop 復元の台帳所有が失われ、可逆性(FR-1b)の実現を独自実装することになる — 既存 seam 台帳の再発明。

## ADR-2: mergeStateStatus 正規化の所有(requirements OQ-2 / FR-3c)

**Context**: 既存 `parseMergeability`(scripts/metrics-publication-domain.ts:256-262)は UNKNOWN→pending・未知値 throw の fail-closed を持つ。ただし `scripts/` は repo-only であり配布されない — 出荷 core/tools から scripts/ への参照は t258 boundary guard が禁じる(project.md cid:code-generation:c1-1569-shipped-comment-vocab)。

**Decision**: **意図的別定義**とする。収束述語(4区分+UNKNOWN-retry+mergeStateStatus 接地)は plugin 出荷 tools 内の単一モジュール `pr-convergence-predicate.ts` に1定義で置く。これは配布面(plugin)内の canonical 1定義であり、metrics ドメイン(repo-only、publication 用の3値 bucket 化)とは消費者・出力語彙が異なる(収束述語は CLEAN 等値判定+UNKNOWN retry / metrics は mergeable/pending/conflicting の bucket)。意味論の整合(UNKNOWN を成立扱いしない・未知値 fail-closed throw)は両者共通とし、収束述語側のテストに未知値 throw ケースを含めて固定する。

**Consequences**: (+) 配布境界(t258)と両立し、plugin の self-contained 性を保つ。収束述語は出荷面内で1定義。(−) 意味論の平行定義が2箇所(metrics / plugin)に存在する — 未知値 fail-closed・UNKNOWN 非成立の共通契約をそれぞれのテストで独立に固定し、乖離はテスト赤で検出する。Reversibility: 高 — 将来 core へ共有定義を抽出する場合も plugin 側の消費 seam は関数1点で差し替え可能。

**Alternatives Rejected**:
- 共有定義への抽出(core へ移設し scripts と plugin の両方が import): metrics scripts の依存方向を逆転させる横断リファクタで、本 intent のスコープ(C-2 surgical)を超える。両者の出力語彙が異なるため共有関数は分岐パラメータを持つ複雑化になる。
- scripts/ からの直接 import: 配布境界違反(t258)で構造的に不可。

## ADR-3: override 経路の受理面(requirements OQ-3 / FR-7b)

**Context**: GitHub 不達時は park 既定+人間承認記録付き override(裁定 Q2)。ガードは「レポート実在」なので、override は「収束未確認のままレポートを生成する」行為として設計する必要がある。

**Decision**: override は plugin 出荷の収束 CLI の専用 verb `override` で受理する。実行には(advisory-choice record の既習形に倣い)**最新の実 HUMAN_TURN への束縛**を要求し、受理時に (i) レポートを `converged: false, override: {humanTurn, reason, timestamp}` の様式で機械生成し (ii) audit へ override 事実を emit する。レポートが実在するため unitCovered は通過するが、レポート本文と audit が「収束未確認の前進」を恒久記録する(FR-7b の無音バイパス禁止)。override verb なしでレポートを手書きした場合は NFR-3 の様式検査(センサー可視化+レビュー観点)で偽装として検出する。park 経路は既存 engine park をそのまま使う(新規機構なし)。

**Consequences**: (+) ガード(unitCovered)は無変更のまま override が成立し、記録(レポート本文+audit)が恒久に残る。park 経路も新規機構ゼロ。(−) override レポートと収束レポートの2様式が生まれる — センサー(C8)と §12a レビュー観点の検査対象に両様式を含める。Reversibility: 高 — verb の削除で経路ごと消え、既発行の override 記録は audit として残存する。

**Alternatives Rejected**:
- state フィールドでの override フラグ: レポート不在のまま unitCovered を通すには engine 側の判定変更が必要になり C-2(新規ガードコード禁止)に反する。
- AMADEUS_SKIP_ARTIFACT_GUARD 類の env バイパス: 記録が残らない無音バイパスであり検証劇場 Forbidden に該当。

## ADR-4: mergeable UNKNOWN retry の数値(requirements OQ-4 / FR-3b)

**Context**: 既存コードに対照定数なし(requirements が実測確認済み)。GitHub の mergeability は PR 更新直後に非同期計算され、初回クエリはほぼ常に UNKNOWN(Issue #1971 実測)。

**Decision**: plugin tool の named constants として `MERGEABLE_UNKNOWN_RETRY_MAX = 5`(回)・`MERGEABLE_UNKNOWN_RETRY_INTERVAL_MS = 10_000` を定義する(上限バウンド 50 秒)。導出: GitHub の mergeability 再計算は通常数秒〜十数秒で完了する(mirror 系運用の実測クラス)ため、10 秒間隔×5回で通常ケースを十分に覆いつつ、工程 (2) 監視の1周を1分未満に抑える。上限到達時は UNKNOWN のまま「不成立」を確定し、工程 (4) 再監視の次周期へ委ねる(busy-wait を作らない)。テストは実時間待機でなくタイミングシーム(interval 注入)で回数・順序を決定的に検証する(cid:build-and-test:wtfbt-c3 / bt-timeout-verification-shape)。

**Consequences**: 新規マジックナンバーだが、named constant+導出根拠+テスト固定の3点で cid:requirements-analysis:constants-from-code の趣旨(無根拠な要約帯の禁止)を満たす。Reversibility: 高 — 定数2つの変更のみで調整可能、タイミングシームによりテストは値へ非依存。

**Alternatives Rejected**:
- 無制限リトライ(収束まで待つ): 工程 (2) の1周が非有界になり busy-wait 化。GitHub 側の恒久 UNKNOWN(例: 大規模 PR の計算不能)で停止する。
- リトライなし(初回 UNKNOWN で即不成立): 初回クエリはほぼ常に UNKNOWN の実測(Issue #1971)により、全 PR が最低2周を強制され工程 (4) の再監視コストが常態化する。

## ADR-5: センサー manifest の配置(FR-6b の設計確定)

**Context**: plugin manifest schema は sensors を持たない(component-inventory 実測)。formal-model-check の sensor manifest は core 側にある既習形。

**Decision**: `pr-convergence-report-format` センサー manifest を `packages/framework/core/sensors/amadeus-pr-convergence-report-format.md` に置き、plugin 出荷のステージ本文断片の frontmatter `sensors:` が宣言する。compile の未知 id loud 拒否(既存結線)により、plugin install 前に core 側 manifest が先行着地している必要がある — Bolt 順序の制約として delivery-planning へ申し送る。

**Consequences**: (+) compile の未知 id loud 拒否と既存センサー基盤(advisory・detail finding)へそのまま接続。(−) plugin の可搬性が core 側 manifest の先行着地に依存する — Bolt 順序制約(C8 → plugin stage 宣言)として delivery-planning が直列化を所有。Reversibility: 中 — manifest は独立ファイルのため削除は容易だが、plugin stage frontmatter の宣言と対で外す必要がある。

**Alternatives Rejected**: manifest schema への sensors 追加(engine 改修 — FR-6b が既習形への訂正を確定済み)。加えて、センサーを plugin バンドル内 md として出荷し install 時に core sensors ディレクトリへ複製する案も却下 — 複製は drop 時の復元対象を増やし、compile の sensor 解決が「出所2系統」になる複雑化に見合う利得がない。

## ADR-6: gh 実行面の実装形(FR-4b 改訂の設計固定 — E-PCP-ADDEV 裁定)

**Context**: requirements FR-4b 初版は「既存 `amadeus-github-gateway.ts` へ相乗り」と定めたが、conductor 実測により plugin tools から core tools への import は import-closure guard で構造的に拒否されることが確定した — `checkManifestClosure`(scripts/import-closure-guard.ts:169-189)は closure 全 member に declared ∧ owned の二重被覆を要求し、owned は `posix.join(pluginHostPrefix(name), a.relativePath)`(scripts/plugin-projection.ts:920)で plugin bundle prefix 配下に限定されるため、core パスは owned に入り得ない。設計逸脱選挙 E-PCP-ADDEV(2026-08-05、2-0)が FR-4b の契約準拠形への申告改訂を裁定した。

**Decision**: gh 実行子は plugin 内の独立ファイル C6(`plugins/pr-convergence/tools/pr-convergence-gh-runner.ts`)とし、C4(台帳生成器)が `GhRunner` 型を import して消費する(C5 は C4 経由でのみ gh に触れる)。C6 は gateway と同一契約の4点をテスト可能な assertion として満たす: (i) 実行前 readiness 検査(`gh --version` runnable+`gh auth status --hostname github.com`) (ii) argv 配列のみで起動(シェル文字列化しない) (iii) token を保持・出力しない(credential は gh の store へ委譲) (iv) 失敗(不在・未認証・API/rate-limit・非0 exit)は typed error で loud fail。4契約の assertion 化は functional-design で固定する。component-methods の `GhRunner` 型は plugin 内定義(gateway 型の import はしない)。

**Consequences**: (+) plugin の self-contained 性・opt-in 境界・import 閉包宣言(NFR-4)を維持。(−) gh 実行子の平行実装が core(gateway)と plugin の2箇所になる — 契約4点の同一性をそれぞれのテストで固定し、意味論乖離はテスト赤で検出(ADR-2 と同じ平行定義の扱い)。Reversibility: 高 — 将来 guard に core 参照許可が入れば import へ置換可能、契約 assertion はそのまま流用できる。

**Alternatives Rejected**:
- 実 import(FR-4b 初版の字義): 上記実測により構造不可(選挙 choice 2/3 の却下理由も参照)。
- 収束 CLI の core/tools 配置(選挙 choice 2): core は全ハーネス dist へ投影されるため未 install 環境にもツール実体が漏出し(cid:code-generation:harness-tools-placement)、opt-in 自己完結が弱まる — 2票とも不採用。
- import-closure guard の拡張(選挙 choice 3): ガードの意味(composed host での missing import 防止)を弱める engine 改修でスコープ拡大 — 2票とも不採用。

## 承認・裁定トレース

- OQ-1〜OQ-4 の設計確定は requirements の明示委譲に基づく設計判断であり、いずれも要件(FR/NFR/C)の変更を含まない
- ADR-1 の「engine ガード側無変更」確約は、供給面(produces の読取点 = compile の実 frontmatter parse、unitCovered の node.produces 消費)を RE(re-scans/260805-pr-convergence-plugin.md §1a・§2c)の file:line 実読で確定済み(cid:functional-design:c8 の事前充足)
