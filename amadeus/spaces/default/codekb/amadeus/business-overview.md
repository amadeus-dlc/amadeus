# ビジネス概要

## プロダクトと利用者価値

Amadeus は、要件整理、設計、実装、検証、Pull Request 提出までを監査可能な stage として進める AI-DLC CLI フレームワークである。リポジトリは長時間稼働するサービスではなく、Bun で実行する短命な TypeScript ツール、複数 AI ハーネスへの配布面、Markdown/JSON の workflow record から構成される。

[Issue #2838](https://github.com/amadeus-dlc/amadeus/issues/2838) の目的は、Amadeus 自身を変更する `self-document`、`self-feature`、`self-fix`、`self-refactor` の全 workflow が、ローカル成果物だけで完了せず、Pull Request の提出、レビュー、必須 CI の収束を通ることを保証することである。merge は引き続き人間の独立判断であり、PR convergence は merge 権限を持たない。

## 現在の実装状況

観測コミット `854692fd7` では、delivery boundary の配線は実装済みである。

- `amadeus/config.json` は `pr-convergence` plugin を有効化し、4つの self-* scope に stage を binding する。
- host の scope grid では4 scopeすべてが `pr-convergence: EXECUTE` になる一方、plugin stage 自身は `scopes: []` を維持し、非 self-* scope の opt-in 契約を保つ。
- plugin compose は `pr-convergence-report` を `code-generation.produces` に overlay し、通常の engine per-unit coverage は report がない Unit を未完了として扱う。
- CLI は PR 作成、状態取得、収束 report、human override、merged PR の landed report、Intent/Bolt/Unit provenance 検証を提供する。

ただし Issue #2838 の完了条件は未達である。現在の report は CLI 実行 receipt、content digest、audit event identity、署名などの attestation を持たないため、正規 shape を手書き・コピー・改変しても判別できない。format sensor は advisory で、stage の `sensors` も空であり、手動実行されなかった場合や `SENSOR_FAILED` でも completion を機械的に拒否しない。

## 業務影響と成功条件

現状では「self-* workflow に stage が含まれる」ことと「CLI が実際の PR を検査して生成した証跡だけが受理される」ことが同値ではない。偽 report と direct completion path が残るため、レビュー bot、branch protection、patch coverage、reproducible build を経ていない変更を Completed と誤認し得る。

Issue を解決したと判断できる最小条件は次のとおりである。

1. report を CLI execution と audit identity に暗号学的または決定的に結び付け、copy/tamper/replay を拒否する。
2. report 検査を blocking sensor または同等の completion precondition にし、未実行・失敗を fail-closed にする。
3. `create` が clean local branch、commit、push、remote head SHA の一致を検査する。
4. engine 経由だけでなく direct state completion chokepoint でも全 required artifact と attestation を検証する。
5. 4 self-* scope × 全ハーネス × compose/drop × resume × completion の回帰を固定する。

## 対象外

- PR の merge 自動化
- 非 self-* scope の一律必須化
- GitHub 以外の SCM provider 対応
- pr-convergence loop 全体の再設計
## 運用形態の縮小と、macOS 既定での検証不能（260814-fmc-macos-provider、履歴、observed `5f6b5bf97`）

**観測 ref**: observed = `5f6b5bf97068f59dee53dcd4a2f6564967c3d164`、差分 base = `89532174c30ef9cc7ff29496cd6916586fdda00a`（9 commits）。

### 提供する運用形態はソロ運用へ縮小した

`8b6089275`（#2975）が `team-up.sh` / `team-up-codex-safety-wait.ts` / `team-msg.sh` を撤去したことで、**フレームワークが起動手段を提供するチームモードは無くなった**。ユーザーが得られる運用形態は 1 エージェントによるソロ運用（必要に応じたサブエージェント委任）に一本化され、`docs/guide/20-team-mode{,.ja}.md` と `docs/guide/team-messaging{,.ja}.md` も相応に縮小した。これはノルム側（`memory/team.md` の「チームモードの運用ノルムは 2026-08-12 の整理で退役」）と整合する変化であり、機能欠落ではない。

### 本 intent の業務課題 — macOS 既定で formal-model-check が通らない

[Issue #2361](https://github.com/amadeus-dlc/amadeus/issues/2361)（ミラー [#2995](https://github.com/amadeus-dlc/amadeus/issues/2995)）は、macOS のユーザーが既定設定（`--provider auto`）のまま formal-model-check を実行すると、`sandbox-exec` 経路が固定的に選ばれ、JDK が固定 patch 版（`OpenJDK 26.0.1`）でない環境では `ENVIRONMENT_UNAVAILABLE` で停止するという問題である。Docker が使える環境であっても自動的にそちらへ切り替わらないため、**ユーザーから見ると「auto なのに環境に適応しない」**という不整合になる。

この Issue は性格の異なる 2 つの主張を含んでおり、業務判断としても分けて扱う必要がある。

1. **provider フォールバックの不在** — 文書はむしろ環境適応を約束している（`plugins/formal-model-check/stages/formal-model-check.md:45` 逐語: `letting it select the execution provider for the current environment`）。フォールバック不在を宣言した文書は存在しない。**bug（仕様への回復）としての性格が明確**。
2. **JDK ピンの厳格さ** — patch 完全一致は `plugins/formal-model-check/README.md:74-79` と `mise.toml:3-5` が「model-check receipt は再現性の契約(NFR-1)であり、異なる JDK は異なるツールチェーン identity である」として **deliberate と明示宣言した既存契約**である。これを緩めることは既決の設計判断の変更であり、bug fix ではなく**仕様変更**に当たる可能性が高い（`memory/team.md` エスカレーション正準リスト (4)）。

なお README `:60-62` は同じ JDK 要件を「major 26」と書いており、`:74-79` と**文書内部で矛盾している**。この表記の是正だけなら documentation 相当で閉じる。1 と 2 のスコープ切り分けは requirements-analysis の所掌であり、本 RE では判断しない。

## 無人実行の前提が崩れる面（260813-advisory-requestion-fix、履歴、observed `c0f9edf27`）

[Issue #2967](https://github.com/amadeus-dlc/amadeus/issues/2967) は、semi / full の autonomy を有効にしたユーザーが得られるはずの価値 —「裁定済みの事項で人間を止めない」— が advisory 経路で成立しない状態である。ladder が run-now を裁定して receipt を記録しても、次の `next` で同じ advisory が hold として再評価され、single-spend guard により再記録が拒否されるため、human 向けの再質問が発行される。人間が run-now を選び直しても受理されず、同じ問いが繰り返し提示される。

業務影響は 2 つある。(1) 無人実行の連続性が失われ、autonomy 設定の意味が advisory 経路でのみ無効化される。(2) 提示された選択肢がどれも状態を前進させないため、ユーザーから見て「答えても進まない」不整合な対話になる。

なお本欠陥は仕様変更ではなく仕様への回復であり、intent scope は `self-fix` である。修正方針（`recordAdvisoryChoice` の戻り値の型付け、run-now の解除経路の再設計、8/8 ハーネスの skill 散文同期、欠陥挙動を固定している 4 テストの扱い）の選定は requirements-analysis / application-design の所掌であり、本 RE の範囲外とする。
## Issue #2813 多問選挙の断面（履歴、observed `c0f9edf2782`）

[Issue #2813](https://github.com/amadeus-dlc/amadeus/issues/2813) は、1つの stage で複数の明確化質問を扱う際に、問ごとの choice・Gradients of Agreement（GoA）・留保を第一級データとして保持し、一部の問だけが成立／保留となる結果を機械判定可能にする self-feature である。利用者は選挙を運転する conductor、独立に投票する voter、後日裁定を監査する人間である。

現行実装は `Election.question: string` と、voter ごとに1組だけの `choiceInternalNo` / `goa` / `reservation` を持つ。したがって複数問を1つの question prose と3択へ束ねる暫定運用では、異なる問に異論を持つ2票が同じ「一部別案」を選ぶと、問ごとの合意が無くても選挙全体が `established` になり得る。`tally.json` は単一 winner または単一 hold reason、`record.md` は集約 GoA 1行と自由記述の留保を残すだけで、結果を問へ帰属させる構造を持たない。

完了条件は次の4点である。

1. 複数質問の choice・GoA・留保を question ID へ帰属させ、`tally.json` と `record.md` から機械的に再導出できる。
2. 同一選挙で established と hold が混在でき、再審議は hold 問だけを対象とし、成立済み結果を不変に保つ。
3. 既存の単問定義・append-only 選挙ストアを旧 schema として読み、新規 write は新 canonical schema に統一する。
4. model、store、CLI directive、record、skill、migration、`FormalElection` と model-map identity、回帰テストを同じ cardinality へ揃える。

ノルムの鮮度として、旧 bundled workaround `E-SRA-RAS13` / `election-cli-canonical` の長文は commit `bd567fd1b78bbde8a524b2cc767bd176dfbfe95f` で削除済みである。現行 `team.md` には `cid:requirements-analysis:always-elect` の「1選挙1質問」が残り、実装着地後に多問契約へ更新する必要がある。

## Issue #2985 multi-Unit Bolt の PR 証跡断面（履歴、observed `0fbbec42bb33d625bdb9d034789c0ff391df1287`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260814-priority-bug-batch の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

[Issue #2985](https://github.com/amadeus-dlc/amadeus/issues/2985) は、Delivery Planning が複数 Unit を1つの Bolt に束ねられる一方、Construction の実行・PR convergence・完了証跡が「1 Unit = 1実行単位 = 1 PR identity」を前提とするため、code-generation が正規証跡を作れず停止する self-fix である。

期待される取引は「Delivery Bolt に属する複数 Unit を1つの PR で届け、その同一 PR の収束証跡により各 Unit の完了を判定する」ことだが、現行 runtime は Delivery Planning の Bolt 編成を実行入力にせず、unit dependency DAG の topological batch を実行形へ投影する。PR title/body、CLI option、report attestation、sensor、state completion は単一 Unit を所有者として扱い、Delivery Bolt → `units[]` → 1 PR → 各 Unit evidence の合成境界がない。

### 正常経路と停止条件

- 1 Unit / 1 Bolt / 1 PR では、Unit worktree から CLI が report・attestation・audit receipt・blocking sensor PASS を同じ Unit path に結び付けられる。この証跡は統合側へ carry-forward できる。
- 複数 Unit / 1 Delivery Bolt / 1 PR では、PR identity を Unit A に結び付けると Unit B が provenance mismatch になる。Unit ごとに別 PR を作ると one-Bolt-one-PR と複数 Unit fold 禁止の契約に反する。
- state completion は Unit ごとの report と sensor verdict を要求するため、片方の Unit の証跡だけでは完了できない。

### 未決の修復方向

Reverse Engineering では、(A) Bolt identity が `units[]` を所有し1つの PR evidence を各 Unit 完了へ正規投影する、(B) Delivery Planning・runtime・PR convergence を 1 Unit = 1 Bolt = 1 PR に統一する、の2案を記録するだけで決定しない。後続 requirements で one-Bolt-one-PR、既存単一 Unit 正常経路、fail-closed completion を同時に満たす条件として選択する。

## auto 設定が無人実行に反映されない面（260814-unit-failure-autoelectio、履歴、observed `cd64486a6`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260814-priority-bug-batch の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: observed = `cd64486a68c6a1144db50fbe3fde8273f5e18455`、差分 base = `d7ffaa5442266508d8e67babc3e0b947fb4c1637`（4 commits）。

[Issue #2976](https://github.com/amadeus-dlc/amadeus/issues/2976) は、`solo-election.trigger.mode = auto` を設定したユーザーが得られるはずの価値 —「裁定を選挙に回して人間を止めない」— が Unit 失敗時の halt で成立しない状態である。stage-protocol は branch 1（solo + auto）で「prompt を提示しない」と規定するが、engine の `emitConstructionFailureIfPresent` は config を読まずに必ず Retry/Skip/Abort の ask directive を emit するため、conductor が `next` を回した時点で人間向けの停止が発生する。

業務影響は 2 つある。(1) auto を設定しても Construction の失敗ごとに人間の介在が必要となり、無人実行の連続性が失われる。(2) フレームワークが文書（stage-protocol）で約束した挙動と実装が食い違うため、ユーザーから見て設定が効いていない不整合になる。

本欠陥は仕様変更ではなく仕様への回復であり、intent scope は `self-fix` である。ただし「engine が election を open できない」という構造制約から、ask 抑止の実現方式（新種 directive を出すか、既存 ask にメタを載せるか）は engine / conductor の責務境界に触る設計判断であり、requirements-analysis / application-design の所掌として本 RE では確定しない。

## オープンバグ5件の業務課題（260814-open-bug-batch-6、履歴、observed `a49f9e9fd`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260815-priority-bug-batch-2 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

本 intent は業務価値ではなく**既存契約への回復**を扱う 5 件のオープンバグを対象とする（scope `self-fix`）。5 件は独立な欠陥だが、業務影響の観点では 2 つの束にまとまる。

### 束 A: ワークフローが完了不能になる（#3062）

merge queue + auto-merge を使う運用で、PR が `report` 実行より先に着地すると pr-convergence ステージを閉じる経路が存在しない。逃がしは `AMADEUS_SKIP_BLOCKING_SENSOR_GUARD=1` のみであり、escape hatch の常用化はゲートの信頼性そのものを毀損する。**5 件のうち唯一、運用を止めるクラス**。

### 束 B: 検証面・記録面が黙って欠ける（#3026 / #3028 / #3031 / #3032）

- #3026 — formal-model-check の完全性検査が投影に到達せず、宣言されているつもりで一切発火しない。検証面の無音欠落
- #3028 — ハーネスエンジニアリングガイドのセンサー表が実在集合から drift し、開発者が誤った全数を得る。#3026 のような宣言漏れの発見も遅れる
- #3031 — CI の偽陽性赤による再実行コスト。収束ループが余計に1周する
- #3032 — 実 record の監査純度（P2）。テストが env 隔離を守っても実 record を汚しうるクラスが残っているかの判定

### 成功条件

束 A は「マージ済み PR に対する最終化経路が定義され、落ちる実証を伴って動く」こと。束 B は各 Issue の受け入れ条件に加え、**#3026 と #3028 が同一の構造的原因（宣言・文書が実在集合から fail-open で乖離する）を共有する**ため、個別修正だけでなく再発検出の要否判定を成果物に残すことを条件とする。

### 本区間で分母が動いた点（実装時の注意）

`git-drift` プラグインの着地により、#3026 の期待投影件数は Issue 本文の「12 → 13」ではなく **13 → 14**、#3028 の docs 表欠落は「3 件」ではなく **4 件**である。詳細は `re-scans/260814-open-bug-batch-6.md` §2.2 / §2.3。

## 優先バグ 4 件の業務影響（260814-priority-bug-batch、履歴、observed `d64fd7cac`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260815-priority-bug-batch-2 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**観測 ref**: base `1d08374cd7e4ef89637b4a8000bab3fcf1a0f780` → observed `d64fd7cac049d7c2cda7dd7dc7d9d0a652ff02d7`（23 コミット、`git rev-list --count 1d08374cd..HEAD`）。

本 intent は [#3065](https://github.com/amadeus-dlc/amadeus/issues/3065) / [#3034](https://github.com/amadeus-dlc/amadeus/issues/3034) / [#3040](https://github.com/amadeus-dlc/amadeus/issues/3040) / [#3035](https://github.com/amadeus-dlc/amadeus/issues/3035) の 4 件を扱う。いずれも現行 HEAD で成立しており、既修正のものはない。

業務価値の観点では 4 件は 2 クラスに分かれる。#3065 / #3040 / #3035 は「負荷下のプロセス境界イベントを実時間の固定予算で待つ」形が壊れており、CI の赤が変更の欠陥ではなくマシンの空き具合を反映する。これは検証の信頼性そのものを損なう — 赤を無視する習慣が育てば、本物の退行も同じ扱いを受ける。#3034 だけは性質が異なり、テスト fixture が live repo を検査するため、ローカルで build / plugin compose した直後に無関係な赤が出る。開発者が自分の作業ツリーの状態でテスト結果を左右される点で、隔離の破れである。

### 本区間で変わったフレームワーク側の断面

- **有効プラグインが 3 から 4 へ**。`git-drift`（origin drift の早期 advisory sensor、PR #3055）が加わり、`pr-convergence` は `github-pr-convergence` へ rename された（PR #3051）。利用者から見た振る舞いは変わらないが、プラグインを指すパスの表記が変わる。
- **プラグイン設定が宣言型になった**（PR #3052）。プラグインが `plugin.json` で型付きの設定項目と既定値を宣言し、利用者は `amadeus/config.json` の `plugin.settings` を project / space / intent の 3 レイヤで上書きする。宣言にないキーや型違いは既定値へ落とさず**拒否**するため、設定の書き損じが黙って無視されることがない。
- **選挙 CLI が多問(multi-question)化した**（PR #3036）。1 回の選挙で複数の問を扱い、問ごとに成立（established）と保留（hold）が混在してよく、再実行は保留中の問だけを対象にできる。これは team.md が既に前提としている運用（「definition は複数 question を持てる。回答は question 単位」）に実装が追いついた形である。

## Construction が完走しても後段へ渡らない業務影響（260815-per-unit-outcome、履歴、observed `78146f435a`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260815-stale-epoch-landed の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

対象: [Issue #3099](https://github.com/amadeus-dlc/amadeus/issues/3099)（P1）。base `9ba8170bb` → observed `78146f435a`。

業務上の損失は「実装が終わっているのにワークフローが前へ進めない」ことである。units-generation を EXECUTE した intent が per-unit dispatch で全 Unit を完走させても、後段の build-and-test が `producer-outcome-pending` で fail-closed するため、**成果物は存在するのにステージが到達不能**になる。ユーザーから見れば完了した作業が宙に浮き、回復には手作業の介入が要る。

適用範囲は限定的だが構造的である — degrade スコープ（`self-fix` / `self-refactor` / `self-document` のように units-generation を SKIP する運用）は早期 return により影響を受けない一方、**直列（幅 1）の Unit 計画は autonomy の設定に関わらず必ずこの経路へ落ちる**（`amadeus-lib.ts:8416`）。すなわち「Unit を正式に切って計画的に進める」ほど踏みやすい。

**本差分での業務境界そのものの変化はなし**（区間の非 record 変更 40 ファイルはいずれもエンジン内部の修正・plugin sensor 宣言・docs 同期であり、製品の対象ユーザー・提供価値・スコープ境界を動かしていない）。詳細な機序は `architecture.md`、患部配置は `code-structure.md` の各対応節を参照。

## record が最終化できず intent が恒久停止する業務影響（260815-stale-epoch-landed、履歴、observed `83e1dbeef`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260816-open-bug-batch-7 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**業務境界そのものの変化なし。** base `78146f435a` → observed `83e1dbeef` の非 record 17 ファイルはいずれもエンジン内部の修正・テスト・docs 同期であり、対象ユーザー・提供価値・スコープ境界を動かしていない。

[Issue #3110](https://github.com/amadeus-dlc/amadeus/issues/3110) の業務上の損失は「**PR が正常にマージされたのに、その事実を record へ書き残せない**」ことである。verdict 後に record checkpoint を積んだ PR が merge queue で着地すると、以後 `report` は attestation の stale を理由に拒否し続け、当該 intent の pr-convergence ステージが恒久停止する（実測: intent 260814-open-bug-batch-6 が park）。

**踏みやすさが運用ノルムと結びついている**点が本件の性質である — チームのノルムは自 intent の record checkpoint を Bolt PR へ同梱してよいと定めており、同梱すれば head は必ず前進する。すなわち**ノルムどおりに運用するほど本欠陥を踏む**。原因は同梱に限らず create 後の任意の追加 push（レビュー指摘対応の修正コミット、main 取込など理由不問）である。

回復には `AMADEUS_SKIP_BLOCKING_SENSOR_GUARD` という緊急バイパスしかなく、これは record に「escape hatch」として自己認識される性質の操作である。加えて既に `260814-plugins-rename-drift` の 3 unit が `kind: created` のまま恒久残置しており、**過去の完了済み intent にも record drift として残留している**。機序は `architecture.md`、テスト空白と台帳は `code-quality-assessment.md` の各対応節を参照。

## オープンバグ 3 件の業務影響（260816-open-bug-batch-7、履歴、observed `5c5911ee3`。**現在時制マーカーのみ降格**（`cid:reverse-engineering:c1`、260816-priority-bug-batch-3 の差分リフレッシュ時。本節の file:line は本節が宣言する observed 断面の値として保存する））

**業務境界そのものの変化なし。** base `83e1dbeef` → observed `5c5911ee3` の 28 コミットは RFC-0001 intent autonomy modes（#3116）の全 unit 着地と #3110 の是正（PR #3113）であり、いずれもエンジン内部の権限・監査・記録の機構である。製品の対象ユーザー・提供価値・スコープ境界は動いていない。

autonomy の着地が業務上もつ意味は「**無人実行の権限を Intent Autonomy Mode という単一の正本へ集約し、その派生として設定面・待機・完了報告を揃えた**」ことである。設定キーの二重定義（`solo-election.trigger.mode`）が廃止され、待機が park と区別される第一級の terminal になったため、「なぜ止まっているのか」「誰の承認を待っているのか」が record から一意に読めるようになった。

本 intent が扱う 3 件の業務影響は次のとおりで、**いずれもユーザー配布物の欠陥ではなく、自リポジトリの開発運用の信頼性に関わる**。

| Issue | 誰が困るか | 損失 |
|---|---|---|
| [#2363](https://github.com/amadeus-dlc/amadeus/issues/2363) | pi ハーネスで本リポジトリを dogfood する開発者 | §12a reviewer の read-only allowlist（`tools: read, grep, find, ls`）が作業ツリーへ配布されないため、レビュアーが本来持たない書込権限を持ちうる。**外部ユーザーの導入経路（`bunx @amadeus-dlc/setup install --harness pi`）は無傷**で、損失は dogfood 面に限定される |
| [#2162](https://github.com/amadeus-dlc/amadeus/issues/2162) | no-silent-drop ゲートを信頼する全員 | bootstrap provenance が到達不能な revision を含み、かつ `postRevision` に到達性検査が無い。現行 CI 経路では発火しない**潜在的な fail-closed** であり、将来 events 台帳を持たない断面から検証が走ると恒久的に赤くなる。加えて存在しない `baseline.json` を指す死んだ経路が残っている |
| [#3097](https://github.com/amadeus-dlc/amadeus/issues/3097) | センサー機構を docs から学ぶ開発者・エージェント | `docs/reference/07-sensor-system.md` の `matches` 表が実在 manifest と乖離（**4 件欠落・2 件の値が陳腐化**）。読者は「宣言されていないセンサーは存在しない」と誤読しうる。docs は AI エージェントの一次入力でもあるため、誤った表は誤った実装判断へ直結する |

**3 件に共通する運用上の性質**は、いずれも「壊れていることが誰にも通知されない」点である。#2363 は逆向きガードが無く、#3097 は検査射程の外にあり、#2162 は分岐によって検証コードに到達しない。**修正の価値の半分は欠陥そのものの解消ではなく、同じ drift を次回は検知できるようにすること**にある。

機序は `architecture.md`、コンポーネント境界は `component-inventory.md`、テスト空白は `code-quality-assessment.md` の各対応節を参照。

## 優先バグ 5 件の業務影響 — 権限・記録・自動化の信頼性（260816-priority-bug-batch-3、現在、observed `89053172e`）

**業務境界そのものの変化なし。** base `5c5911ee3` → observed `89053172e` の 15 コミットは、直前 intent `260816-open-bug-batch-7` の 3 unit 着地と `260815-rfc-autonomy-modes` の R-22 修正であり、いずれも自リポジトリの開発運用機構である。製品の対象ユーザー・提供価値・スコープ境界は動いていない。

区間で唯一、業務上の意味を持つ観測は**オープンバグ数が 4 → 11 に増えた**ことである（metrics snapshot の `collectors.bugs.values.open` 直読、測定元は `metrics/2026-08-16T11-04-41-875Z-3e1c6a19ed5b.json` と `metrics/2026-08-16T20-57-24-618Z-2555e5b42914.json`）。本 intent が扱う 5 件はこの増分を含む。既存バグを潰した区間ではなく、**バグ探索で新しく可視化された欠陥が積み上がった区間**である。

### 5 件の業務影響

| Issue | 誰が困るか | 損失 |
|---|---|---|
| [#3153](https://github.com/amadeus-dlc/amadeus/issues/3153)（P1 / S2-CRITICAL） | 承認ゲートを信頼する全員 | autonomy が「この場面は人間が要る」と宣言しても承認可否には効かず、**別目的で打たれた 1 ターンが milestone 承認として消費されうる**。監査に残るのは「人間が答えた」か「engine が未消費ターンで通した」かを区別しない `GATE_APPROVED` 1 行だけなので、**事後に見分ける手段もない**。承認という制度の意味そのものが目減りする |
| [#3152](https://github.com/amadeus-dlc/amadeus/issues/3152)（P2 / S3-MAJOR） | 監査ログを読む全員 | 「人間へ落ちた occurrence」を 1 件記録するはずの監査行が、**読み取りのたびに append される**。実測で 1 つの `(intent, stage, kind, mode)` に最大 20 行。監査ログは何が起きたかを数える台帳なので、**同じ事象が 20 倍に見えることは計数を根拠にした判断を壊す** |
| [#3149](https://github.com/amadeus-dlc/amadeus/issues/3149)（P2 / S3-MAJOR） | Bolt を PR で配送する全員 | マージ前に収束を確定させた unit が、マージ後に **CLI からも sensor からも回復不能**になる（CLI は `converged` からの遷移を拒み、sensor は前進した checkout を通さない）。code-generation の stage approve が blocking sensor で止まるため、**ワークフローが恒久停止する**。緊急バイパス以外の逃げ道がない点は #3110 と同型で、**本欠陥は区間内で当該 intent が park した実績を持つ** |
| [#3156](https://github.com/amadeus-dlc/amadeus/issues/3156)（P2 / S3-MAJOR） | degrade スコープで solo Bolt を回す開発者 | 実際にコードを書いたのに `workspace_requires` ガードが「作業が無い」と誤判定してステージを止める。**チームのノルムどおり（record checkpoint を head checkout へ後から積む手順）に運用するほど踏みやすい**形状であり、回復は環境変数によるガード無効化しかない — すなわち**正しく働いているガードを毎回切る運用**へ誘導する |
| [#3046](https://github.com/amadeus-dlc/amadeus/issues/3046)（P3 / S3-MAJOR） | 選挙で合意を作るチーム全員 | 並行 voter が同じ採番を取ると、**その選挙の pending 台帳が以後恒久的に `corrupt` を返す**。チームの意思決定機構（P1「判断は独立検証された合意で行う」）そのものが止まるため、影響は 1 選挙に留まらず裁定待ちの作業全体へ波及する。現時点では潜在欠陥（実発生の記録はない）だが、設計前提「single writer」が運用実態と乖離している |

### 5 件に共通する業務上の性質

3 つある。第一に、**いずれもユーザー配布物の欠陥ではない** — 損失は自リポジトリの開発運用の信頼性に閉じる。第二に、**#3153 / #3152 / #3149 / #3156 の 4 件は「記録と権限」の欠陥**であり、壊れ方が「間違った結果が出る」ではなく「**正しさを事後に確認できない / 進めなくなる**」形を取る。第三に、**#3149 と #3156 は回復手段が緊急バイパスしかない** — バイパスは本来 escape hatch として設計されたものなので、常用は制度の摩耗を意味する。

機序は `architecture.md`、コンポーネント境界は `component-inventory.md`、テスト空白は `code-quality-assessment.md` の各対応節を参照。
