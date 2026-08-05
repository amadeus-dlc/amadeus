# Code Generation Plan — fix-2285-cross-harness-resume

上流入力(consumes 全数): requirements.md

## 方針

requirements.md の FR-1〜FR-5 を TDD(Red → Green の vertical slice 反復)で実装する。編集正本は `packages/framework/core/` と `packages/framework/harness/kimi/`、生成は `bun run build`。各 Step の合否述語は requirements.md の受け入れ基準の**逐語**である(縮小しない)。

## Step 1: FR-1 拒否原因の判別化

- `authorizeMainConductor` の拒否を判別可能な原因値で区別する型へ拡張(`MainConductorAuthorization` の denied variant へ原因フィールド追加。既存呼び出し元 2 箇所 — `amadeus-orchestrate.ts` / `amadeus-state.ts` — の消費を同時更新)
- **合否述語(requirements FR-1 AC 逐語)**: 「判別値は (a)(b)(c)(d) の4種であり、RE の決定的再現ケースへの写像は C1 → (b)、C2 → (c)、C3 → (a)、C5 → (d)、C6 → (b)(carrier 分裂の実効状態は marker 不在であり、C1 と同一の (b) を返すことが正)である。テストは次の2点を固定する: (i) C1/C2/C3/C5 が互いに異なる原因値を運ぶこと (ii) C6 が C1 と同一の (b) を運ぶこと。C4(整合状態)は authorized のまま。C6 専用の第5原因値は新設しない」
- テスト: integration 層(実 FS の carrier fixture 合成 — NFR-3 逐語「carrier 状態の合成は repo 外 tmp ディレクトリの fixture で行い、実 FS を触るテストは integration 層に置く」)

## Step 2: FR-2 拒否メッセージへの復旧ガイド

- `callerAuthorizationError` を原因値を受け取る形へ拡張し、原因+次の一手(FR-4 verb 名 or Kimi 再起動)を含める
- **合否述語(requirements FR-2 AC 逐語)**: 「各原因値に対応するメッセージに復旧手順(実行可能なコマンド名)が含まれることをテストが固定する。既存 `tests/integration/t365-kimi-reviewer-boundary.integration.test.ts` の substring assert(`"is not the main conductor"` — 拒否側 :504/:536/:573/:646、許可側 not.toContain :669/:689 の全6件)は改訂せずグリーンを維持する。本 AC の射程はメッセージへの追記であり、既存 substring の削除・変更は含まない」

## Step 3: FR-3 SessionStart 自動回復の閉包(自動層)

- **合否述語(requirements FR-3 AC 逐語)**: 「C1/C2/C3 の各 carrier 状態を合成 → SessionStart 相当の処理を実行 → `authorizeMainConductor` が authorized を返す、の閉包テスト。非 kimi ハーネスは現行どおり認可素通り(`:75`)のため自動層の対象は kimi のみ」
- ギャップ(例: `.lock` 残存の非解除)が実測されたら同一 Step 内で是正(FR-3 本文逐語「ギャップが実測されたら(例: `.lock` 残存の非解除)、同一 FR 内で是正する」)

## Step 4: FR-4 手動復旧 verb(手動層)

- 復旧 verb を新設(名称は実装で確定し code-summary に記録。配置は `amadeus-utility.ts` 系の caller-authorization 非ゲート面)
- **合否述語(requirements FR-4 AC 逐語)**: 「(a)〜(f) の各契約をテストが固定する。(f) は『拒否状態 → verb 実行 → unpark 成功』の経路テスト」— (a) 人間確認必須・確認なしは fail-closed 拒否 (b) (a)(b)(c) いずれの状態からも再バインド (c) role 残存時は無条件に奪わず残存 role 明示+人間確認 (d) audit 記録(実行結果由来のみ) (e) `--project-dir` 対応 (f) 実行後 `unpark` / `next` / `report` が通ること

## Step 5: FR-5 引き継ぎ手順書

- **合否述語(requirements FR-5 逐語)**: 「docs にハーネス跨ぎ引き継ぎの手順書を追加すること。内容: 自動層(対象ハーネスの再起動)→ 手動層(復旧 verb)の順の手順、原因別の対応表、`docs/guide/11-session-management.md` の「resume works on every harness」記述との整合」
- NFR-1 逐語: 「手順書・エラーメッセージのいずれもこの env(`AMADEUS_HARNESS_TYPE`)を復旧手段として案内しない」

## Step 6: 横断検証

- `bun run typecheck` / `bun run lint` / 関連テスト(新規+t365+t10+t-kimi-adapter)/ `bun run build`(全ハーネス再生成+追跡ファイル不変確認)
- NFR-4 逐語: 「`amadeus-caller-authorization.ts` への行挿入は coverage-patch-allowlist の機械 remap+span 検査、no-silent-drop census の再バインドを伴う」— 行シフト発生時に実施
- NFR-2 逐語: 「本変更は認可の既定を緩めない — 復旧 verb 以外の経路の拒否挙動は不変。人間確認のない takeover は常に拒否」— 既存 t365 全6 assert のグリーン維持で固定

## 制約(requirements CON-1〜5 継承)

スコープ外: 3ハーネス配線是正 / env バイパス封鎖 / raw-cwd 対称化(別 Issue)。逸脱(既存様式への準拠と判断する場合を含む)は実装前に停止して conductor へ報告する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T14:37:07Z
- **Iteration:** 1
- **Scope decision:** none

計画のAC逐語性と要件充足は概ね良好だが、code-summary.md の検証結果表(t10を含む集計 161 pass/0 fail)と同一節内の t10 既存赤2件の記述が自己矛盾しており、検証エビデンスの実測性を確立できない。

### Findings

- BLOCKER | code-summary.md:47 は t10 を含む集計を『161 pass / 0 fail』と報告するが、:53 は tests/e2e/t10-halt-and-ask-discard.test.ts の既存赤2件を明記しており同一節内で直接矛盾。numbers-from-command-output-only / report-final-values-only の求める実測転記になっていない。是正: (a) t10 を除外した run の内訳明記、または (b) 正しい pass/fail 内訳への訂正と既知赤2件との整合。
- FOLLOW-UP | NFR-1(AMADEUS_HARNESS_TYPE を復旧手段として案内しない)の実装・検証証跡(grep 確認・実文抜粋)が code-summary に欠落 — FR-1〜5・NFR-2〜4 は検証記述を伴うのに NFR-1 のみ不在。
- FOLLOW-UP | FR-4 (a)〜(f) 契約のテスト対応付けが包括記述のみ — FR-1/FR-2 と同水準の file:line トレーサビリティ(t450 の個別テスト名対応)を付すべき。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T21:40:55Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1 の BLOCKER(t10 集計矛盾)は2ファイル存在の説明+フルパス run 表+件数照合で解消し、FOLLOW-UP(NFR-1 証跡・FR-4 トレーサビリティ)も実測・行番号対応で閉包。NIT の (b)/(c) 境界表記も conductor が精密化済み。

### Findings

- FOLLOW-UP | BLOCKER 解消確認: 「t10 は2ファイル存在する」の明示により run A(tests/unit/t10-hook-session-start.test.ts 含む6ファイル・113 pass/0 fail)と既存赤(tests/e2e/t10-halt-and-ask-discard.test.ts 2 fail)が分離され、run A〜C に既存赤が含まれないと明記。フルパス+Ran across N files の指定数照合で実測転記の体裁になった。
- FOLLOW-UP | NFR-1 証跡の閉包確認: grep -c 実測(エラーメッセージ側 0/0、手順書側 1/1)と手順書 :153-155 の実文抜粋が NFR-1「案内しない」と CON-4「文書化する」を同時に満たす。
- FOLLOW-UP | FR-4 トレーサビリティの閉包確認: (a)〜(f) が t450 の個別 test 名+行番号へ対応付けられ FR-1/FR-2 と同水準。
- NIT | FR-4(b) の対応付けに置かれた :338 は文言上 (c) の成功系に近い — (b)/(c) の境界表記に精密化の余地(verdict を左右しない)。conductor が (b)=:368/:298、(c)=拒否 :311/:324+成功 :338 へ是正済み。
- FOLLOW-UP | 是正 diff 内の新規引用・数値(f31156e2a、census 213/213/213、TDD 件数)は自己矛盾なく、fix-diff-independent-reverify で追加の誤りなし。
- FOLLOW-UP | consumes ヘッダ(requirements.md のみ)は self-fix が units-generation/application-design を skip する設計と整合し degrade scope として妥当。
