# Requirements — 260724-watcher-timeout-fix(Issue #1449)

上流入力(consumes 全数): business-overview.md, architecture.md, code-structure.md

## Intent 分析

Issue #1449 の実測により、`packages/framework/core/tools/team-up.sh` の `verify_watchers_armed`(:1139-1178、commit `0d24c6f93` / #1421 で新規追加、#1384対応)が、1メンバーでも agmsg watcher が unarmed だと、既定値 `WATCHER_READY_TIMEOUT=90`秒 × (`WATCHER_RESEND_MAX=2`+1)=最大270秒(4.5分)、`mux_attach`(ユーザーが実際にteamペインへアタッチできる時点)をブロックすることが判明した。ユーザーはこれを「team-up.sh 起動が直近で大幅に遅くなった」と体感していた。

reverse-engineering 段階の実測(`amadeus/spaces/default/codekb/amadeus/architecture.md`、`code-quality-assessment.md`、`re-scans/260724-watcher-timeout-fix.md` 参照)により、根本原因は実装逸脱ではなく、元intent #1384(`260722-teamup-prompt-race`)requirements.md FR-3 [e4] 留保が明示的に予見し先送りしていた設計トレードオフの顕在化であることが確認されている。ユーザーが達成したいのは、agmsg watcher armingの検証・再送というQ機能自体(#1384で導入済み、正しく動作している)を保ったまま、1メンバーの unarming が全体の起動体感を過大に劣化させない状態である。

## 機能要件

### FR-1: worst-case ブロッキング時間の短縮
- 現状: 1メンバーでもwatcher unarmedだと最大270秒(90秒×3ラウンド)ブロックする。
- 要求: 【裁定待ち — Q1選挙結果で確定】。選択肢A(--no-wait フラグ)/B(mux_attach後への移動)/C(タイムアウト予算縮小)/D(A〜Cいずれか+タイミングseam先行追加)のいずれかを Q1 の選挙裁定に従って採用する。

### FR-2: 正常系のコスト維持
- 全メンバーが起動直後にarmedになる正常系では、修正後も検証コストがほぼゼロ(実測ベースライン: 59.1ms、7メンバー構成)であること。回帰させない。

### FR-3: 既存契約の保持
- exit code契約(0=全員armed/非ゼロ=1名以上unarmed)を保持する。`team-up.sh` 呼び出し元・CI等がこのexit codeに依存していないか確認が必要(該当箇所の棚卸しは design 段階で実施)。
- no-silent-success(検証劇場 Forbidden): unarmedのまま黙って成功扱いにしない。

### FR-4: リカバリガイダンスの保持
- 現行の `verify_watchers_armed` は unarmed メンバーを名指しし、手動リカバリ手順(`/agmsg mode monitor` の再送方法)をstderrへ出力する(:1174-1176)。この落ちる実証・リカバリガイダンスは維持する。

## 非機能要件

### NFR-1: タイミングの実測検証可能性
- 修正はタイミングseam(`WATCHER_READY_TIMEOUT`/`WATCHER_RESEND_MAX` の環境変数オーバーライド、既存で実装済み)を使い、短縮値での「落ちる実証」で検証できること。実チーム起動を伴う重い統合テストへの依存は Q2 の選挙裁定に従う。

### NFR-2: 定数の根拠保持
- `WATCHER_READY_TIMEOUT=90` は agmsg `spawn.sh:132` に接地された値であり、変更する場合はこの接地根拠の再確立(または意図的な逸脱の明記)が必要。

## 制約

- `packages/framework/core/` が正本、`dist/<harness>/` は生成物。修正は正本編集→`bun scripts/package.ts` で dist 再生成→`bun run promote:self` の順で行う(project.md Way of Working)。
- 既存テスト `tests/integration/t-team-up-watcher-arming.test.ts`(7テスト、フィクスチャで `WATCHER_READY_TIMEOUT: "0"` を使用)との整合を維持し、必要なら拡張する。
- amadeus-bugfix スコープにつき walking-skeleton セレモニーはスキップ(既存コードへのインクリメンタル修正、team.md Walking Skeleton)。

## 前提

- 実測(scenario B: timeout=5s×3ラウンドで理論値15000ms・実測15959ms、+6.4%)により、`verify_watchers_armed` の待機時間はほぼ線形にスケールすることを確認済み。本番既定値(90秒)への外挿は理論値からの比例計算であり、90秒設定での直接実測は行っていない(実チーム起動を避けるため)。

## スコープ外

- agmsg 側(`~/.agents/skills/agmsg/scripts/spawn.sh`)の変更は対象外。今回は `team-up.sh` 側の修正のみを扱う。
- watcher arming の検証・再送という機能自体(#1384の要件)の撤去は対象外。

## 未解決事項(次段階への引き継ぎ)

- Q1(修正方針)・Q2(検証方法)は選挙裁定待ち。裁定成立後、本ファイルの該当欄・design段階の設計判断を更新する。
