# Requirements(260727-e2e-plugin-conformance)

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md

- business-overview.md — §「4 Issue の業務含意」(doctor 無言・偽の baseline restored 宣言・配布境界リスク・導入体験が未検証のまま出荷)を Intent 分析の業務根拠として使用
- architecture.md — §plugin 現行アーキテクチャ(projection→配布→discovery→CLI→合成→graph→orchestrate の一方向連鎖)と4 Issue 欠陥所在の file:line を FR-1〜FR-4 の欠陥定義に使用
- code-structure.md — 区間面別内訳と本 intent 対象ファイル配置表を Constraints(変更面の同期義務)の導出に使用

測定 ref: observed `0c4709102`(HEAD、worktree plugin-dev)。file:line 引用はすべて RE 差分リフレッシュ(scan-notes.md、Architect spot-check 訂正0件)からの転記。

## 承認系譜

1. intent birth(2026-07-27): #1589 単独の amadeus-bugfix として開始(元 intent 260726-plugin-host-delivery の承認済み FR-4/FR-2/U2 検証未達の是正 — ユーザー裁定で完了済み intent への backward jump ではなく bugfix intent 帰属)
2. スコープ拡張(2026-07-27、ユーザー指示): #1575/#1585/#1586 を同一 intent へ巻き取り、4 Issue バッチ化(amadeus-state.md Project フィールド更新済み)
3. 明確化裁定(2026-07-27T11:37:24Z、AskUserQuestion 直接裁定・ソロモード): Q1=A(専用 blocking CI ジョブ)/ Q2=A(FS 完全復元)/ Q3=A(claude 面最小核)/ Q4=A(intent birth 込み実測)— requirements-analysis-questions.md に証跡

## Intent 分析

plugin 導入UX(元 intent 260726-plugin-host-delivery / epic #1543)は機能実装を完了したが、「Amadeus 開発者が出荷物だけでプラグインを導入して使える」ことを機械的に保証する検証面が欠けたまま完了した。その帰結として利用者面欠陥(#1569 実例)は CI を素通りし、手動監査でのみ捕捉された。本 intent は (a) 検証ギャップ本体(#1589)を名指し経路の E2E で閉じ、(b) 手動監査が発見した残存欠陥3件(#1575/#1585/#1586)を同時に修正する。ゴールは「同クラスの欠陥が再発したとき、人手でなく CI が赤くなる」状態。

## Functional Requirements

### FR-1 canonical 定数の一本化(#1575)

`scripts/promote-self.ts:184` が `scripts/plugin-projection.ts:56` の `SELF_INSTALL_HARNESSES`(5値)と値一致する集合を誤った名前 `PACKAGE_HARNESSES` で再定義している(plugin-projection.ts:53-55 のコメント verbatim「the five faces promote-self.ts reflects into the project root. Intentionally NOT the seven package faces」により canonical 帰属は plugin-projection.ts 側で一意)。plugin-projection.ts には別に真の `PACKAGE_HARNESSES`(7値、`:42`)が実在し、同名衝突が误読を誘発する。

- 合否1: `promote-self.ts` の重複定義を削除し、`plugin-projection.ts` の `SELF_INSTALL_HARNESSES` を import して消費する(canonical 1定義から導出 — construction フェーズ規範)
- 合否2: 消費側の2キー棚卸し(変数名 grep+展開後リテラル)で判明した同義ハードコード(`tests/integration/t-plugin-projection-packaging.test.ts:48` の7値三重定義、展開後リテラル `tests/unit/t209-promote-self-dangling-symlink.test.ts:152` / `tests/integration/t-plugin-projection-packaging.test.ts:161`)を canonical import 参照または canonical との等価 assert へ置換する
- 合否3: リグレッションテスト — 5値集合と7値集合の重複定義が再導入されたら赤になる検査(canonical export との集合等価 assert)を持つ

### FR-2 standalone doctor の 0-plugin 出力対称化(#1585)

standalone doctor(`packages/framework/core/tools/amadeus-plugin.ts:591-593`)は `result.lines` を直接ループし、0件 degrade を実装済みの純関数 `doctorPluginRows`(`:534-536` verbatim `if (section.lines.length === 0) return [{ pass: true, label: "Plugins: 0 installed" }];`)を通らない。統合 doctor は `amadeus-utility.ts:2890` で同関数を通る。決定的再現: 空ホストへの standalone `doctor` は exit 0 / stdout 0バイト。

- 合否1: standalone doctor が統合 doctor と同じ canonical レンダラ(`doctorPluginRows`)を通り、0-plugin ホストで「Plugins: 0 installed」相当の行を stdout へ出す(write⇔read 対称性のレンダラ同一性 — cid:code-generation:c1-drift-canonical-renderer と同族)
- 合否2: リグレッションテスト — 空ホスト standalone doctor の stdout 非空+統合 doctor の 0件行と同一文言を assert。修正前コードで赤になる(落ちる実証)

### FR-3 drop の FS 完全復元(#1586、Q2=A 裁定)

compose の `mkdirSync(..., {recursive:true})`(`amadeus-plugin-compose.ts:1150`)⇔ drop の `rmSync(abs(p))` ファイルのみ(`:1154`)の非対称により、drop 後に `plugins/<name>/stages/` を含む plugin 所有の空ディレクトリが残存する。`baselineRestored` 判定(`amadeus-plugin.ts:377`)は composition record のみを根拠に FS を見ないため、残存があっても「(baseline restored)」と宣言する。

- 合否1: drop が plugin 所有の空ディレクトリを除去する(compose が作成したディレクトリのうち、drop 後に空になったもの。plugin 非所有の既存ディレクトリは触らない — 走査は広め・除去述語は強めの非対称原則)
- 合否2: `baselineRestored` 判定が record に加えて FS 実測(plugin 所有物の不在確認)を含む
- 合否3: `.amadeus-plugin-drops.json` は監査データとして残存を許容し、その旨を契約(doctor/drop の利用者可視文書)へ明記する — 残存はbaseline 復元の失敗と判定しない
- 合否4: リグレッションテスト — compose→drop 後のディレクトリ構造照合(ファイルバイト限定の `hashSurface`(`tests/integration/t299-plugin-cli-walking-skeleton.integration.test.ts:94-97`)では構造的に検出不能だった盲点をディレクトリ構造込みの照合で閉じる)。修正前コードで赤になる(落ちる実証)

### FR-4 開発者視点 E2E(#1589、Q3=A / Q4=A 裁定)

`tests/e2e/` に plugin 系テストは 0件(RE 実測)。元 intent の承認済み FR-4 合否(統合)「通常 scope 実行からプラグインステージへ到達できる」/ U2「install → 自動 compose → 再 compile → 通常 scope 実行にプラグインステージ出現 → drop → baseline 復元」は、in-process+recompile stub(t299 ヘッダ verbatim「(recompile stubbed, engine real)」)の代替検証しか持たない。名指し経路そのもので検証する E2E を新設する。

- 合否1: `tests/e2e/` に plugin conformance E2E を追加し、以下のシーケンスを**出荷面**(dist/ 由来のホスト構成)と**実バイナリ spawn**(setup-install 系既習様式 — オフライン・live gate なし)で通す: (a) 使い捨てワークスペースへ claude 面を folder-drop 導入 (b) SessionStart auto-compose hook の実行経路で compose(手動 CLI 直叩きでの代替は不合格) (c) 実 recompile(stub 不合格) (d) intent birth 込みで engine `next` が composed plugin stage の run-stage directive を実際に emit することを実測(Q4=A) (e) doctor が installed/composed を報告 (f) drop 後に FS 完全 baseline 復元(FR-3 基準)
- 合否2: フィクスチャプラグインは canonical 参照実装(test-pro 系、`tests/fixtures/plugins/`)を使用し、実リポジトリの `plugins/`・`dist/` を汚染しない(temp workspace 隔離+実行後残渣ゼロ assert)
- 合否3: E2E はネットワーク不要・環境変数ゲートなしで決定的に実行できる(t-print-kimi 系の live gate 既定 skip 様式は不採用 — CI ガードにならないため)

### FR-5 CI 実行トリガー(Q1=A 裁定)

`run-tests.ts:125-126` の `--ci` は smoke+unit+integration のみ、`ci.yml:163` は `test:ci` を呼ぶため、現状 e2e 層は CI で一切走らない。

- 合否1: PR blocking の専用 CI ジョブを新設し、FR-4 の plugin conformance E2E を実行する(既存 `test:ci` プロファイルは変更しない — 影響範囲限定)
- 合否2: ジョブは E2E 失敗で赤になる(落ちる実証を CI 面でも実施 — 注入は別ブランチ推奨、falling-proof-injection-one-set 準拠)
- 合否3: 実行時間は bounded — 実測値を build-and-test で固定し、推定値を受け入れ基準にしない(cid:nfr-requirements:estimates-not-acceptance-criteria)

## Non-Functional Requirements

- NFR-1 **オフライン決定性**: FR-4 E2E はネットワーク到達・外部サービスを要さず、並列スイート実行下でも決定的(serial 命名規約に従い直列化が必要なら `.serial.` を付す)
- NFR-2 **隔離**: E2E・リグレッションテストは実リポジトリの `plugins/` / `dist/` / record を変更しない(temp workspace+実行後残渣ゼロ assert。t254 既習様式)
- NFR-3 **テスト層規律**: 実 FS を触る新規検証は integration/e2e 層へ置き unit allowlist を増やさない(cid:code-generation:fs-tests-integration-first)。修正ロジック本体は in-process seam でも検証し spawn 盲点の coverage 赤を防ぐ(cid:requirements-analysis:bun-coverage-spawn-blindspot)
- NFR-4 **CI 予算**: FR-5 ジョブの実行時間は実測で確定し、CI 全体のクリティカルパスを実質延長しない構成(既存ジョブと並行実行)とする

## Constraints

- `packages/framework/core/` を触る変更は7ハーネス全 dist 再生成+`bun run promote:self` を同一変更で同期(cid:build-and-test:bt-dist-regen-seven-harnesses / Mandated)
- 検証基準: `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci` + 新設 E2E
- core/tools のコメント・文字列に repo-only の `scripts/<file>` パストークンを書かない(t258 境界契約、cid:code-generation:c1-1569-shipped-comment-vocab)
- push 前にローカル lcov で diff 追加行の未カバー 0 を実測(cid:code-generation:local-lcov-pre-push)
- Bolt 実装は worktree 分離(cid:code-generation:solo-bolt-worktree-required)

## Assumptions

- 前提1: `emitComposedPluginStageIfInstalled`(`amadeus-orchestrate.ts:1017-1022`)の配線は正しく、E2E は既存配線の実測検証であって新規配線の実装ではない(FR-4 で directive emit が失敗した場合は新たな欠陥発見として Issue 起票し、裁定を仰ぐ)。精密化(reviewer 実測確認 2026-07-27): 本配線は `flags.stage` 必須 — composed plugin stage への到達は active workflow 内での `next --stage <plugin-stage>`(`--single` なし)による opt-in reach が設計どおりの正規経路であり、FR-4 合否1(d) の「engine `next` の directive emit 実測」はこの経路で充足する(元 intent の activation policy ADR-1 と整合。scope grid への無条件出現を要求しない)
- 前提2: SessionStart auto-compose hook は claude 面の配布物に含まれており(RE 実測: settings.json.example:34-46 配線)、E2E から直接駆動可能

## Out of Scope

- `packages/framework/harness/projections.ts` の `MIRROR_SURFACE_IDS`(7値、`:5`)とその filter 導出5値リスト — GitHub Mirror 配布用の別レジストリであり #1575 の症状(promote-self ⇔ plugin-projection の名前衝突)の対象外(reviewer 独立棚卸しで検出、`tests/unit/t285-mirror-projection-registry.test.ts` が既存検証を保持)
- claude marketplace 経路の discovery 着地検証(Q3=A 裁定で除外 — #1543 未検証面1として残存。必要なら別 Issue)
- claude 以外のハーネス面の導入経路 E2E(元 FR-2 の全ハーネス充足は本 bugfix の規模外 — 残ギャップは元 intent 側の記録に既存)
- TLA+ 実行資産の bundle 同梱(#1543 未検証面3 — 設計どおりの非同梱)
- e2e 層全体の CI 組み込み(Q1 で B 案不採用)

## Open Questions

- なし(Q1〜Q4 で裁定済み。実装時に前提1/前提2 が不成立と判明した場合は deviation-stop-before-implement に従い停止・報告)

## 承認後追補(2026-07-27 ユーザー裁定)

### FR-6 t132 ガードの count-free doc 追従(#1590)

承認系譜: 本 FR は requirements 承認後、CG Steps 1-3 の full CI 検証で発見された latent パイプラインブロッカー #1590 を、ユーザー裁定(AskUserQuestion、2026-07-27、「本 intent へ巻き取る」採用)により追加したもの。既承認 FR-1〜FR-5 は不変。

背景: doc の count-free 改稿(PR #1578 / 27af06897)が ci.yml の docs-only paths-ignore で Tests skip のまま着地し、`tests/unit/t132-hooks-doc-count-sync.test.ts` の count-word parse 3テストが NaN で恒久赤(対照実測: 0c4709102 と origin/main の doc 両方で 5 pass / 3 fail)。

- 合否1: t132 の count-word parse 依存の3テストを「doc が stale な件数断定を含まない」ことの検査(count-free 契約のピン)へ置換する。disk/settings 相互整合の既存5テストは不変
- 合否2: 現行 doc で t132 が 8/8 green、かつ doc へ stale な件数断定(例: 「uses twelve hook scripts」)を注入すると赤になる(落ちる実証)
- 合否3: `bash tests/run-tests.sh --ci` が exit 0(本 intent PR の CI 通過前提の回復)

### FR-7 compose⇔engine ホストルートの統一(#1591、承認後追補・ユーザー裁定 2026-07-27 = 案B)

承認系譜: FR-4 E2E 実装時の builder 逸脱停止(前提1不成立の実測)→ #1591 起票 → ユーザー裁定「案B: ハーネス側へ統一」(#1569 の project-root 方向の再裁定。#1569/#1591 へ裁定コメント記録済み)。

- 合否1: INSTALL.md 投影(plugin-projection.ts)・auto-compose hook(amadeus-plugin-compose.ts hooks)・compose CLI の既定 hostRoot がハーネスディレクトリ(claude 面では `<project>/.claude`)基準に統一され、engine/graph の読取ルート(pluginsHostRoot / pluginActivationHostRoot)と一致する。同根第3面として統合 doctor の plugin 観測ルート(amadeus-utility.ts)も含む(same-root-inventory 準拠の実装時追記 — reviewer Minor 1 のトレーサビリティ補完)
- 合否2: docs/guide/19-plugins.md(:30 と :183 の割れ)を裁定Bへ統一(EN+JA)
- 合否3: リグレッション — INSTALL 手順どおりの導入 → compose → ステージ到達、が FR-4 E2E の (a)〜(d) で固定される

### FR-8 compose 後 recompile の stage-graph 更新(#1592、承認後追補)

元 intent 260726-plugin-host-delivery の承認済み FR-4「compose 完了後、stage graph / scope grid が自動再コンパイル」の実装漏れ(spawnRecompile が runtime-graph のみ)。方針は承認済み要件から一意のため機械的修正。

- 合否1: compose 完了経路が stage-graph.json の再コンパイル(amadeus-graph.ts compile 相当)も実行し、auto-compose 単独で `next --stage <plugin-stage>`(--single なし)が run-stage directive を emit する
- 合否2: FR-4 E2E の (c)(d) がこれを固定する

### FR-4 追補(フィクスチャ裁定 2026-07-27)

合否2 のフィクスチャは出荷実装 `plugins/formal-model-check` を read-only 参照する(ユーザー裁定。test-pro は seams/fragments 宣言のため出荷面ホストへ compose 不能 — builder 実測)。

### FR-6 追補(t132 test 5/8)

count-word parse の NaN 同士比較で空振り pass していた test 5/8 は検証劇場 Forbidden の機械的執行として count-free 契約へ畳む(conductor 裁定 — 既決ノルムの執行であり選挙・エスカレーション不要)。
