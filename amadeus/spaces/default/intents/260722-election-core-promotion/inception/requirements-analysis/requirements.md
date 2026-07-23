# Requirements — チーム機能のコア昇格

> 上流入力(consumes 全数): intent-statement、scope-document、business-overview、architecture、code-structure、team-practices(本文の各所で参照)

## 承認系譜(approval-lineage-citation 申告段落)

本 intent のスコープ境界は intent-capture 内で拡大した。系譜: (1) 当初壁打ち裁定(2026-07-23 セッション前半)=「選挙エンジン単独の昇格+team-up.sh は scripts/ のまま非配布」→ (2) intent-capture Q3 でのユーザー逆質問「A,Bだけ提供して何になるのか — ユーザー体験から逆算すべき」→ (3) **チーム機能一式(起動/メッセージング/選挙/docs)への拡大をユーザー直接裁定**(IC Q3=C。intent-capture-questions.md Q3 [Answer] 行・decision-log.md D-3)。本 requirements は拡大後スコープを正とし、当初裁定の「team-up.sh 非配布」は失効済み。

## 前提(確定済み裁定の要約)

- 対象顧客: 主=外部利用者、副=ドッグフードチーム(intent-statement)
- herdr / agmsg / bun は必須外部 prerequisite(PATH 契約、同梱・抽象化なし — feasibility Q1)
- サポート下限: macOS + Linux。Windows はチーム機能対象外(feasibility Q2)
- Must 面 = 最小 UX(Claude 単一チーム・既定サイズ・起動→メッセージ→選挙完走)。バリエーションは Should(scope-definition Q1)
- 動作確認バージョン(実測): herdr 0.7.1 / agmsg 1.1.6 / bun(既存前提)

## FR-1 選挙エンジンの配布昇格

- **FR-1a**: `scripts/amadeus-election.ts` / `-model.ts` / `-store.ts` / `-record.ts` / `-transport.ts` の5ファイルを `packages/framework/core/tools/` へ**移動**する(コピー禁止 — scripts/ 側は削除。P5 二重実装禁止)
- **FR-1b**: 横断 import を同層相対へ収束する。現状の唯一の横断は `scripts/amadeus-election.ts:46` の verbatim `import { parseGoaLine } from "../packages/framework/core/tools/amadeus-norm-metrics";`(architecture.md 実測)— 移動後は `./amadeus-norm-metrics` となること。他4ファイルに横断 import がないこと(dependencies.md の import 全数実測を移動後に再確認)
- **FR-1c**: `bun scripts/package.ts` 再生成後、全6ハーネス dist の `tools/` に選挙5ファイルが投影され(cid:harness-tools-placement の構造どおり)、`bun run promote:self` 後に self-install 5面(claude/codex(.codex+.agents)/cursor/opencode — promote-self.ts managedDirs 実測)へ反映されること。検証: `dist:check` / `promote:self:check` exit 0
- **FR-1d**: 既存テスト(t234〜t244 の unit/integration/e2e 全数)が import パス追随後に green であること。選挙 CLI の外部契約(verb 集合 open/notify/vote/status/tally/render/verify/next/report、directive JSON 様式、store レイアウト `amadeus/spaces/<space>/elections/`)は**変更しない**(挙動不変の昇格)
- **FR-1e**: core 配置根拠の ADR を作成する(全6ハーネス投影の妥当性 = 選挙エンジンのハーネス中立性を明文化 — leader 指摘は agmsg 一次記録 2026-07-22T22:24:33Z 受信、cid:harness-tools-placement 準拠。※質問ファイルヘッダの 2026-07-22T22:24:58Z は WORKFLOW_STARTED の git 監査行で別事象 — agmsg-git-evidence-split による出典分離)

## FR-2 選挙スキルの配布昇格

- **FR-2a**: `contrib/skills/amadeus-election` を配布スキル正本(ハーネス表層)へ**移動**する(contrib 側は削除)
- **FR-2b**: SKILL.md 内の `scripts/amadeus-election.ts` 参照(compatibility 行含む全数)を `{{HARNESS_DIR}}/tools/amadeus-election.ts` 形へ書き換え、packager のハーネス別トークン置換で正しいパスに展開されること
- **FR-2c**: スキル面の配布範囲は **claude + codex の2面**(RA Q4=A。他ハーネスへの拡張は後続 intent)。CLI 本体は FR-1c のとおり全6面
- **FR-2d**: 「Requires ... this repository checkout」の compatibility 記述を配布後の実態(bun+配布コピー)へ更新すること

## FR-3 チーム起動の配布

- **FR-3a**: `scripts/team-up.sh` を **bash のまま**配布ツリーへ載せる(RA Q2=A。TS 化しない)。配置先はハーネス表層/core の別を設計で確定し、呼び出し契約は `bash {{HARNESS_DIR}}/tools/team-up.sh` 形とする(最終名称は設計で確定可 — ただし「bash 1コマンド」契約は不変)
- **FR-3b**: 同伴スクリプト(`team-msg.sh`、`team-up-codex-safety-wait.ts` — code-structure.md の依存実測どおり)も同時に配布し、team-up.sh からの相対参照が配布コピー内で解決すること
- **FR-3c**: herdr / agmsg 不在時、チーム起動は **exit 1+不在ツール名+インストール案内**の loud エラーで停止すること(RA Q3=A)。検出は PATH 探索のみ(バージョン検査は行わず、docs に動作確認バージョンを記録)
- **FR-3d**: macOS / Linux 以外(Windows 等)での起動は loud に非対応を告げること(サイレント破損禁止)
- **FR-3e**: Should 面(--codex / --instance / -c / -2/-4/-6 / spawn 系)はコードとして搬送し、既存テスト(t-team-msg / t-team-up-* / t245)green を維持する。新規 E2E 保証は付けない(scope-definition Q1)

## FR-4 doctor への advisory 統合

- **FR-4a**: `/amadeus --doctor` にチーム機能 prerequisite の advisory 行(herdr / agmsg の PATH 検出結果)を追加する。**不在でも doctor 全体は fail しない**(チーム機能はオプトイン — RA Q3=A)
- **FR-4b**: 検出結果の表示は「検出パス or 不在+インストール案内への参照」をツール別に1行ずつ

## FR-5 配布境界ガード

- **FR-5a**: 「配布ツリー(`packages/framework/`・`dist/`・self-install 5面)内のファイルが `scripts/` を参照しない」ことを検査する drift guard テストを新設する
- **FR-5b**: 落ちる実証は現存の層またぎ(contrib スキル SKILL.md → `scripts/amadeus-election.ts`)を fixture として赤を実測し、FR-2b の是正で green 化する順序で行う(org.md Mandated の落ちる実証要件)
- **FR-5c**: ガードは既存 CI(`tests/run-tests.sh --ci`)に組み込み、正当な既存データで赤にならないこと(corpus sweep — cid:corpus-sweep-for-new-guards)

## FR-6 クリーン環境 E2E

- **FR-6a**: temp HOME+隔離 PATH+self-install ツリーで構成したクリーン環境相当で、Must 面(チーム起動→メッセージ疎通→選挙1回完走)を自動検証する e2e テストを追加する(feasibility Q3=X: 手動実証不採用)
- **FR-6b**: herdr / agmsg は既存の fake-binary seam パターン(t-team-msg.test.ts の fakeHerdr 様式 — code-structure.md 実測)で代替する。実バイナリでの完走はドッグフード環境の検証記録として record に補完する
- **FR-6c**: 依存不在の loud エラー(FR-3c)と doctor advisory(FR-4)の各分岐も同 seam で検証する(エラー経路の実到達は lcov DA で確認 — cid:build-and-test:error-path-reach-lcov)

## FR-7 docs

- **FR-7a**: docs/guide に Team Mode 章を新設する(en/ja 対)。内容: Operating Modes 契約(ソロ/チーム判定 `AMADEUS_OPERATING_MODE`)、prerequisite 節(bun/herdr/agmsg — PATH 契約+動作確認バージョン herdr 0.7.1 / agmsg 1.1.6)、セットアップ〜選挙完走の手順、Windows 対象外の明記
- **FR-7b**: 3層配置規約(`scripts/`=開発専用 / `contrib/`=ドッグフード専用 / `packages/framework/`=配布正本)を開発者向け docs(docs/reference または harness-engineering)へ文書化する
- **FR-7c**: prerequisite 節は各外部ツールの公式入手先を参照する(bun.sh / herdr.dev / agmsg の公式配布先)。インストールは利用者責務であり、amadeus 側で入手経路の保証・整備・同梱はしない(RA Q5=X、2026-07-23 ユーザー裁定 — raid-log D-2 は本裁定で解消)。合否基準: prerequisite 節に3ツールの公式入手先参照が実在すること
- **FR-7d**: memory シードテンプレは変更しない(scope-definition Q2=A — docs のみ)

## FR-8 メッセージング統合面の配布整合(scope In 項目3)

- **FR-8a**: amadeus 側のメッセージング統合面(`team-msg.sh` の send/history 委譲、選挙 transport の agmsg `send.sh` spawn — 既定パス `$HOME/.agents/skills/agmsg/scripts/send.sh`、election.ts:293 実測)が配布コピーで解決可能であること。env override(`AGMSG_ROOT` / `AGMSG_SEND` / `AGMSG_HISTORY`)の既存契約は不変
- **FR-8b**: `TEAM_MSG` backend 選択契約(agmsg 既定 / herdr 切替、未知値 loud エラー — t-team-up-msg-backend.test.ts で既存検証)は配布後も不変であること
- **FR-8c**: agmsg 本体は配布しない(T-1 / Out of scope 参照)。統合面の検証は fake-binary seam(FR-6b)で行う

## NFR

- **NFR-1**: 既存 CI 基準の green 維持: `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check` / `bash tests/run-tests.sh --ci` すべて exit 0(project.md Testing Posture)
- **NFR-2**: 挙動不変: 選挙 CLI・team-up.sh の既存外部契約(verb・env・exit code)は移動によって変化しないこと(バグ修正・機能追加は本 intent のスコープ外)
- **NFR-3**: カバレッジ: 新規行は codecov patch ゲートの既存規律に従う(spawn 盲点は in-process seam — 既存ノルム群)
- **NFR-4**: リリース面不変: バージョン・バッジ・リリースノートに触れない(release.yml 一本の既決)

## 将来条件チェックリスト(requirements-analysis:c4)

- **規模増**: 該当なし — 本 intent はレジストリ・ページング系の新設なし(選挙 store の既存レイアウトを不変維持)
- **クラッシュ耐性**: 選挙 store の既存 atomic 契約(fail-closed ballot 等 #1273 系)を変更しないことで担保 — 新規の書込機構は境界ガード(テストのみ)と doctor 行(読取のみ)
- **別 OS**: Windows はチーム機能対象外を FR-3d / FR-7a で明示。選挙 CLI 単体は既存どおり(制約変更なし)
- **消費側棚卸し**: `scripts/amadeus-election` / `team-up.sh` を参照する全消費側(SKILL.md、tests/、docs/、.claude/skills 投影面)を実装時に repo 全域 grep で棚卸しし、参照を新パスへ全数更新する(cid:enumeration-reverify-at-implementation)

## Constraints(制約 — constraint-register 全11件の要点再掲。件数は register の T/O/R タグ機械集計 T×6+O×3+R×2=11 から転記)

- Bun-only 配布: 配布フレームワークへの runtime dependency 追加は文書化なしに禁止(T-1)— herdr/agmsg は同梱せず PATH 前提
- core/tools 配置は全6ハーネス dist へ構造投影(T-2)— ADR 必須(FR-1e)
- チーム起動系は bash・macOS+Linux 限定(T-3)、Windows は対象外
- 正本編集→dist 再生成→drift guard の定型(T-4)
- 配布面→scripts/ 参照禁止(T-5 — FR-5 で機械化)
- 外部依存契約は「PATH 上に存在し実行可能」のみ(T-6)
- PR マージ人間承認・リリース release.yml 一本(O-1)、判断はユーザー直接回答(O-2)、team.md ノルム本文は移動しない(O-3)
- 規制要件なし(R-1)、ライセンス伝播なし — 外部コード非同梱(R-2)

## Out of Scope(除外 — scope-document Won't の再掲)

- herdr / agmsg のコード同梱・取り込み・抽象化レイヤー(Forbidden 級 — 要求なき互換レイヤー禁止とも整合)
- memory シードテンプレへの Operating Modes 節追加(scope-definition Q2=A)
- Windows 対応
- バリエーション機能の新規 E2E 保証(Should 面は既存テスト green 維持のみ)
- 手動実証(feasibility Q3 でユーザー却下)
- 選挙 CLI の機能拡張(移動と配布化のみ)

## Open Questions(後続ステージへの申し送り)

- team-up.sh の配置先(ハーネス表層 vs core)と配布ファイル名の最終確定 — application-design で裁定(FR-3a の「bash 1コマンド」契約は不変の前提)
- スキル正本の配置ディレクトリ(claude+codex の2面をどのソース位置から投影するか)— application-design で既存スキル投影機構の実測に基づき確定(FR-2c の範囲裁定は不変の前提)
- 上記2件以外の未決なし(agmsg 入手経路は RA Q5 で解消済み)

## 質問裁定対応表

| FR/NFR | 裁定 |
|---|---|
| FR-1/FR-2 呼び出し契約 | RA Q1=A(既存パターン踏襲) |
| FR-2c スキル配布範囲 | RA Q4=A(claude+codex) |
| FR-3a 配布形態 | RA Q2=A(bash のまま) |
| FR-3c/FR-4 依存検出 | RA Q3=A(loud エラー+doctor advisory) |
| FR-5 境界ガード | IC Q2=A |
| FR-6 E2E | IC Q4=A+feasibility Q3=X |
| FR-7 docs | IC Q3=C の docs 要素+scope-definition Q2=A |
| FR-7c prerequisite 節 | RA Q5=X(公式入手先参照・利用者責務) |
| FR-8 メッセージング統合面 | scope-document In 項目3(feasibility Q1 の PATH 契約を統合面へ適用) |

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-23T01:13:57Z
- **Iteration:** 1
- **Scope decision:** none

Critical2件(FR-7c未決の埋没/Open Questions節不在)+Major2件(メッセージング統合面FR孤児/Constraints・Out of scope節不在)+Minor2件

### Findings

- Critical1: FR-7c agmsg入手経路が未決のままFR条件節に埋没(requirements.md:61、ruling-dependent-placeholder違反)— Q5ユーザー確認で是正
- Critical2: Open Questionsセクション不在(Step 10必須)
- Major3: scope-document In項目3(メッセージング統合面)に対応する独立FRなし — トレーサビリティ孤児
- Major4: Constraints / Out of scope独立セクション不在(herdr/agmsg同梱禁止等の再掲なし)
- Minor5: leader指摘とWORKFLOW_STARTEDのタイムスタンプ出典分離が未明記
- Minor6: raid-log D-2はレビュースコープ外で逐語照合不可(Critical1/2の是正で解消想定)

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-23T01:22:20Z
- **Iteration:** 2
- **Scope decision:** none

前回6件中5件CLOSED(Critical1/2・Major3・Minor5/6)+Major4部分CLOSED。新規Major1件: Constraints節見出し「全13件」vs列挙11件の件数不整合(fix-diff-independent-reverify / ledger-count-mechanical-recalc類型)

### Findings

- 新規Major: requirements.md:84 見出し「constraint-register 全13件の要点再掲」に対し列挙タグは T-1..T-6/O-1..O-3/R-1..R-2 の11件 — 機械再計算で数値一致させるか count-free 表現へ


## Post-review closure(conductor 記帳 — reviewer verdict ではない)

- 2026-07-23T03:22:05Z — Iteration 2 の残余(Constraints 見出し件数)は機械検証可能クラスとして conductor が是正・閉包済み: constraint-register の T/O/R タグ機械集計(T6+O3+R2=11)で見出しを「全11件+集計式」へ是正(本文 :84 現物)。閉包記録は本ステージ diary(memory.md)に固定。ゲートはユーザー実 HUMAN_TURN で承認済み(GATE_APPROVED 監査行)。cid:requirements-analysis:delegated-review-analysis-with-owned-verdict 追補 (b) の適用。
