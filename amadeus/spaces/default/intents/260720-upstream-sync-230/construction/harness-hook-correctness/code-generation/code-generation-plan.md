# Code Generation Plan: harness-hook-correctness

## 目的と追跡性

本 Unit は FR-4 の項目13〜15を実装し、6 harness の hook 実行経路を、既承認の3 seam と既決契約の範囲だけで修正する。

## Plan Approval

- Election: `E-USSU07CGP1`
- Record: `amadeus/spaces/default/elections/E-USSU07CGP1/record.md`
- 決定: `choiceInternalNo=1 Approve Plan`
- 投票: `choice1=3票 / choice2=0票`
- GoA: `1x3 / 2x0 / 3x0 / 4x0 / 5x0 / 6x0 / 7x0 / 8x0`
- Reservation: `null`
- 裁定: Approve Plan — 現planの13手順で同一Unit実装・検証・reviewまで継続（推奨）

| 要求 | 実装対象 | 検証対象 |
|---|---|---|
| FR-4.13 / BR-U07-01〜03 | 実 child-spawn site で `process.execPath` を使用し、stdin/stdout/stderr/cwd/exit を保持する | PATH から `bun` を除いた in-process / subprocess 検証、6 harness inventory |
| FR-4.14 / BR-U07-04〜09 | Kiro IDE の `USER_PROMPT` 文脈を1回だけ正規化し、既知結果だけから成功した write path を抽出する | create/append/replace、失敗、未知文言、相対/絶対 path、audit→sensor、debug fail-open |
| FR-4.15 / BR-U07-10 | Claude の11 hook command だけで `$CLAUDE_PROJECT_DIR` を引用する | JSON parse、11件維持、空白入り workspace、statusLine/permission 不変 |
| FR-0.14 / BR-U07-03,11〜13 | 6 harness の authored/generated projection を整合させ、未使用 wrapper と core への host payload 流入を禁止する | inventory、dist drift、promote/self-check、公開 seam 数 |

## 実装計画

1. [x] **現状特性と変更境界を固定する。** Codex、Cursor、Kiro、Kiro IDE の実 child-spawn site、Claude と OpenCode の非該当性、Kiro IDE の現在の stdin race、Claude の11 hook command をテスト上の inventory として記録する。6 harness 全てを列挙し、実 spawn site のない harness に dormant wrapper を追加しないことを検証条件にする。

2. [x] **テスト設定を先に確認する。** 既存の `bun:test`、`tsconfig.tests.json`、coverage 設定、integration test の一時 workspace helper を再利用できることを確認する。既存設定で Unit / integration / E2E 相当の subprocess シナリオを実行できる限り、新しい test runner や設定ファイルは追加しない。設定変更が必要になった場合は実装を止め、理由と最小差分を再付議する。

3. [x] **`spawnHookWithRuntime(args, input)` seam の失敗テストを追加する。** runtime executable が `process.execPath` であること、引数、stdin、stdout、stderr、cwd、exit code が保持されること、PATH 上の `bun` に依存しないことを in-process seam で検証する。実 spawn site を持つ4 harness の adapter 経路について、各 call site が同じ契約を満たす integration / subprocess テストを追加する。

4. [x] **実 child-spawn site だけを修正する。** Codex、Cursor、Kiro、Kiro IDE の既存 adapter choke point に最小の canonical runtime seam を置き、文字列 `bun` ではなく `process.execPath` を使用する。stdin/stdout/stderr/cwd/exit の既存挙動を変えず、Claude/OpenCode および core には wrapper や host 固有 payload を追加しない。

5. [x] **`parseKiroIdeHookContext(payload)` seam の失敗テストを追加する。** `USER_PROMPT` を唯一の入力として `toolName`、`toolArgs`、`toolResult`、`toolSuccess` を正規化し、create/replace/append を Write/Edit に分類することを検証する。成功した既知結果形式3種だけから path を抽出し、失敗結果・未知文言・path 不明は visible hook-drop とする。相対 path は project root 基準の絶対 path、既に絶対の path は保持する。

6. [x] **Kiro IDE adapter を deterministic context 経路へ切り替える。** stdin の待機と race を削除し、`USER_PROMPT` を1回だけ parse する。成功時のみ audit を先に、sensor を後に実行する。payload-free runtime/state は audit tail から forward-only に復元し、古い stage へ rollback しない。subagent identity は結果先頭8行の `Reviewer` / `Agent` から抽出し、該当なしは `unknown` とする。debug は明示 opt-in、stdout 無汚染、debug 出力失敗は fail-open とする。

7. [x] **Kiro IDE の統合・E2E相当シナリオを追加する。** 空の stdin でも待機しないこと、成功 create/append/replace で audit→sensor が1回ずつ発火すること、`toolSuccess=false` と未知結果では発火しないこと、payload-free 起動で audit tail の最新位置だけを採用すること、debug failure が hook 終了を失敗させないことを一時 workspace の shipped adapter subprocess で検証する。外部 UI を必要としないため、独立 E2E runner は増やさず、この実配布物 subprocess を E2E 境界とする。

8. [x] **`renderClaudeHookCommand("$CLAUDE_PROJECT_DIR", hook)` 契約の失敗テストを追加する。** authored `settings.json.example` を parse し、`hooks.*.*.hooks[*].command` が11件のまま全て quoted project path を使うことを検証する。`statusLine.command` と permission glob は fixture/baseline から byte-equivalent であること、空白入り project directory で各 command が起動できること、参照 hook path が存在することを確認する。

9. [x] **Claude の11 hook command だけを修正する。** sole authored source の対象 command に project directory / script path の引用を適用する。`statusLine.command`、permission glob、hook 件数、event routing、他 harness の設定には触れない。

10. [x] **包括的な targeted test を確定する。** runtime seam、Kiro context seam、Claude render 契約ごとに正常系・境界・失敗系を合わせて10〜15ケース程度用意し、既存の `t147`、`t149`、`t209`、Cursor integration、Claude settings integration、mint classifier と重複しない最小追加にする。既存テストは regression 証跡として併走させる。

11. [x] **全6 harness projection を正規生成する。** authored source の targeted test が通った後に `bun scripts/package.ts` を実行し、`dist/` を手編集せず再生成する。変更された generated projection が authored source の差分だけであること、6 harness inventory と4 self-install 経路が欠落していないことを確認する。

12. [x] **同一最終 SHA 相当の検証を実行する。** targeted Unit/integration/subprocess tests、`bun run typecheck`、`bun run lint:check`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci` を、最終差分を固定した状態で連続実行する。coverage を取得し、本 Unit の追加実行可能行に未実行行がないこと、spawn blind spot が in-process seam で観測可能であることを確認する。

13. [x] **成果物と証跡を閉包する。** 各手順の完了時に本計画の checkbox を更新し、`code-summary.md` に変更ファイル、FR/BR 対応、test/sensor 結果、generated projection、既知例外を記録する。新 scope、U08 以降、別 stage、不要な改善は含めない。

## 完了条件

- 3 canonical seam の契約がテストで直接観測でき、host 固有 payload が core に流入していない。
- 実 spawn site は全て `process.execPath` を使用し、6 harness inventory に未対応・dormant wrapper がない。
- Kiro IDE は stdin に依存せず、成功した既知 write だけを audit→sensor の順に転送する。
- Claude の11 hook command だけが安全に quoted され、statusLine と permission glob が不変である。
- authored source、全 generated projection、targeted test、typecheck、lint、dist、promote、full CI、coverage が全て green である。
- `code-summary.md`、sensor、独立 review、§13、engine report に必要な evidence が揃っている。

## 非対象

- 新 API、schema、parser DSL、test harness、policy、threshold の追加。
- 実 spawn site のない harness への wrapper 追加。
- U08 以降、別 Unit、別 stage、既存 scope 外の refactor や cleanup。
- `dist/` の手編集、commit、push、PR、merge（Intent 完了後の別契約条件を満たすまでは実施しない）。
