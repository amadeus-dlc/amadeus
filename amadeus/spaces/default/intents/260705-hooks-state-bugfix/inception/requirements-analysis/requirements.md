# Requirements：hooks と engine state のバグ修正バッチ

Intent: 260705-hooks-state-bugfix
対象 Issue: [#464](https://github.com/amadeus-dlc/amadeus/issues/464)、[#476](https://github.com/amadeus-dlc/amadeus/issues/476)
確定判断の記録: `requirements-analysis-questions.md`（Q1〜Q4、すべて人間が Guide me で回答）

## Intent 分析

2 個のオープン Issue を 1 Intent に束ね、「エンジンと hooks が workflow の完了状態・セッションの所有権を正しく扱う」状態にする。

達成したいのは次の 2 点である。

1. PHASE_VERIFIED を通過した record が、手作業の整合なしに validator を pass する（#464）。
2. 並行セッション運用で、hooks が他セッションの workflow や完了済み Intent に対して誤動作しない（#476）。

両 Issue とも 2026-07-05 の実運用で再現済みであり、根拠となる実 record（`260705-engine-validator-gap`、`260703-skill-quality-repair`、`260704-engine-namespace` の sweep 連鎖）が存在する。

scope bugfix は Ideation をスキップするため、intent-statement と scope-document は存在しない（設計どおりの不在）。Intent の目的は対象 Issue 2 件と本書を正とする。

## 機能要求

### R001-phase-progress-update（#464 の 1 層目）

`PHASE_VERIFIED` を emit する経路（`amadeus-state.ts` の advance の phase 境界処理、および complete-workflow）は、同一トランザクション内で `aidlc-state.md` の `## Phase Progress` の該当 phase を `Verified` へ更新する。SKIP された phase は従来どおり `Skipped` とする。

### R002-phase-check-enforcement（#464 の 2 層目、Q1=A）

phase 境界処理は、`verification/phase-check-<phase>.md` の存在を phase 境界完了の条件として要求する。成果物不在の場合、エンジンは phase 境界の完了を拒否し、conductor へ生成を指示するエラーを返す（produces 不在時の report 拒否と同型）。成果物の内容生成は conductor の knowledge work のまま変えない。

### R003-stop-hook-ownership（#476 症状 2・4、Q2=A）

`amadeus-stop.ts` は、督促対象を「このセッションが所有する進行中の workflow」に限定する。判定は 2 条件の AND とする。

1. 所有: `.aidlc-sessions/<session-id>` ファイル（session→intent UUID 対応）を正とし、自セッションの対応 intent が現 cursor の intent と一致する。
2. 進行中: 一致した intent の registry（`intents.json`）entry の status が complete 系（`complete` / `completed`）でない（R004 と同じデータソース・同じ判定を用いる）。

いずれかを満たさない場合（他セッションの workflow、対応記録なし、または完了済み workflow）は block せずに stop を許可する。これが AC-3 の「未 engage または完了済み」の両枝を保証する。

### R004-mint-presence-skip（#476 症状 1、Q3=A）

`amadeus-mint-presence.ts` は、cursor の指す Intent の registry（`intents.json`）entry の status が complete 系（`complete` / `completed`）の場合、HUMAN_TURN の mint を skip する。進行中 Intent への mint（human presence gate の本来目的）は維持する。

### R005-guard-minimal（#476 症状 3、Q4=A）

stop hook の解放ガード（no-progress streak の上限解放）は現行実装を維持する。R003 の所有権判定により、他セッションの進捗による延命は督促対象の段階で解消されるため、ガード本体の signature 計算は変更しない。

## 非機能要求

| ID | 要求 | 検証方法 |
|---|---|---|
| N001-red-first | 各修正は、エンジン実出力形の fixture または hook 単体の決定論的検証で RED を先行させる（#455〜#458 と同じ流儀）。 | 各検証の RED→GREEN 証跡 |
| N002-standard-verification | 変更後に repo 標準検証が pass する。 | `npm run test:all` |
| N003-presence-contract | human presence gate の既存契約（進行中 workflow での承認拒否・presence 要求）が退行しない。 | `npm run test:it:engine-e2e` |
| N004-artifact-validity | 本 Intent の成果物が構造検証を pass する。 | `bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts . 260705-hooks-state-bugfix` |

## 制約

- エンジンツール（`.agents/amadeus/tools/`、`.agents/amadeus/hooks/`）を修正した場合、`dev-scripts/data/parity-map.json` の engineFileExceptions への宣言と `skills/` 正準ソースへの同一反映を行う（project.md の learning に従う）。
- audit は追記専用であり、記録済みイベントの書き換え・削除による解消は行わない（org.md 禁止事項）。
- 過去 record の遡及書き換えは行わない。既存 record の fail 解消は #464 の発見元 record に限り、通常フロー再現による検証の範囲で扱う。

## 前提

- `.aidlc-sessions/<session-id>` ファイル（session→intent UUID 対応）は現行エンジンが既に書いている（実環境で確認済み）。
- #476 症状 4（conversational carve-out の無効化）は、R003 の所有権判定が先に stop を許可することで実質解消するため、独立の修正対象にしない。

## 対象外

- kanban-sync 系 hook（#470 の成果物）への変更。
- stop hook の解放ガードの再設計（Q4=A で見送り。必要なら後続 Issue）。
- Phase Boundary Verification（phase-check）の内容様式の変更（既存の実例形式を正とする）。

## 受け入れ条件

- AC-1: intent-birth から通常フロー（advance / approve のみ）で phase 境界を通過した record が、手作業なしに AmadeusValidator を pass する（#464 受け入れ条件）。
- AC-2: 完了済み Intent を指す cursor の環境で、発話しても当該 Intent の audit shard が成長しない（#476 症状 1）。
- AC-3: workflow を所有しない（未 engage または完了済み）セッションの stop が督促されず、進行中セッションの督促は維持される（#476 症状 2〜4。R003 の 2 条件 AND で保証する）。
- AC-4: `npm run test:all`（engine e2e 含む）が pass する。
- AC-5: #464 の発見元 record `260705-engine-validator-gap` の validator fail 2 件が解消する。解消手段は、修正後エンジンの挙動に合わせた state フィールドの整合（Phase Progress の Verified 化）と `verification/phase-check-<phase>.md` の追補であり、audit の記録済みイベントは書き換えない（#455 の整合コミット e10f8294 と同じ型）。

## オープンな疑問

- なし（Q1〜Q4 で確定済み。未確定のまま設計へ先送りする論点はない）。

## Review
**Verdict**: READY
**Iteration**: 2
**Findings**:
- （解消済み）R003 が「所有」と「進行中（registry status が complete 系でない）」の 2 条件 AND に改訂され、一致した intent 自体が完了済みである場合は条件 2 を満たさず stop を許可する経路が明記された。判定データソースは R004 と共有され、AC-3 も「R003 の 2 条件 AND で保証する」と明記しており、AC-3 の「未 engage または完了済み」の両枝がトレース可能になった。Q2=A（所有権の一致判定）の決定と矛盾せず、Q3=A で確定した registry status データソースを再利用する自然な拡張であり、新たな矛盾は生じていない。
- （解消済み）AC-5 が追加され、Issue #464 の「発見元 record `260705-engine-validator-gap` の fail 2 件が解消する」という受け入れ条件が番号付き AC として明記された。解消手段（state フィールドの整合＋ phase-check 追補、audit 記録済みイベントは書き換えない）も具体化されており、実在するコミット e10f8294（`docs: reconcile intent record state with lifecycle contract`、Phase Progress の手動整合と phase-check 成果物追加を行った実例）と同型であることを確認した。制約セクションの「過去 record の遡及書き換えは行わない」との関係も、audit 非改変・修正後エンジンの挙動に合わせた整合という限定によって矛盾なく整理されている。QA は AC-5 単独で「対象 record の validator fail が 0 件になったか」を判定できる。
- （解消済み）「## オープンな疑問」セクションが追加され、Q1〜Q4 が確定済みで未解決事項がない旨が明記された。テンプレート充足が明示された。
