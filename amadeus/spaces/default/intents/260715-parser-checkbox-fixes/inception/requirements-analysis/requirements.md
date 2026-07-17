# Requirements — parser-checkbox-fixes(Issue #1013 / #1015 修正バッチ)

> 上流入力: intent-statement(intent birth 記述 = Issue #1013/#1015 の修正)、codekb `code-structure.md`「parser/checkbox 欠陥面の観測」節(RE 実測、observed `6495e03a1`)、`re-scans/260715-parser-checkbox-fixes.md`(鮮度追補あり)、Issue #1013 / #1015 本文+クロスレビュー(各2名成立)。
> 既決照合: E-PB2 裁定(Q1=A、全面 fail-closed)/ E-CS1 Q3(fail-closed 先例)/ construction ガードレール「canonical な1定義から導出」/ Mandated 品質契約(落ちる実証・dist 同期・lcov)。
> 行番号はすべて RE で現 HEAD(`6495e03a1`)実測済みの現行値。編集正本は `packages/framework/core/tools/`(`.claude/tools/*` は byte 同一、`dist/<harness>/` は生成物)。

## FR-1: parseRules の契約検証(#1013)

`amadeus-state.ts` `handlePracticesPromote` の `parseRules`(:2556-2561)に、stage 契約(`practices-discovery.md:101`)の書式検証を追加する。

- **受理文法**(実測接地、選挙不要判定承認済み): 非空・非コメント(`<!--`)・非見出し(`#`)の各行は、先頭の任意 `- ` を除去した後、節別キーワードで始まらなければ**契約違反行**とする — `## Mandated` 配下は `ALWAYS `、`## Forbidden` 配下は `NEVER `(半角スペースまで含む前方一致)。
  - 根拠: stage 契約 :101(節別 format)、t75 fixture の素形(`tests/integration/t75.test.ts:170-176`)、既存 memory 層の手書き様式(`- NEVER …`)との整合。
- AC-1a: 素形(`ALWAYS xxx` / `NEVER xxx`)と bullet 形(`- ALWAYS xxx` / `- NEVER xxx`)はともに受理され、従来どおり verbatim + `(affirmed <date>)` で append される(既存挙動の保存 — t75 の既存 green を維持)。
- AC-1b: Mandated 配下の `NEVER xxx`、Forbidden 配下の `ALWAYS xxx` は**節不一致の契約違反行**として扱う(節別検証)。
- AC-1c: 空セクション・コメントのみ・見出しのみの draft は従来どおりルール0件として成功する(現行挙動の保存 — E-CS2 L2 の運用回避形が引き続き有効)。

## FR-2: 契約違反時のアトミック reject(#1013、E-PB2 裁定=A)

- AC-2a: 契約違反行が **1行でも**あれば、promote 全体を失敗させる — `PRACTICES_OVERRIDE` audit を emit し **exit 非0**、`project.md` / `team.md` には**一切書き込まない**(書込前に検証を完了する — 検証は Step 3b の parseRules 直後、write より前)。
- AC-2b: エラー出力は**全違反行を収集**して列挙する(fail-fast 1件打ち切りにしない — BR-11 類例)。各違反は「節名+行内容」を含み、期待書式(節別キーワード)を1行で示す。
- AC-2c: 実装は既存 `fail()` 経路(`amadeus-state.ts:2478-2489`)を再利用する(裁定の推奨。新規のエラー機構を発明しない)。
- AC-2d: 成功時の出力契約(`{"emitted":"PRACTICES_AFFIRMED", …}`)と正常系の挙動は不変。

## FR-3: scope-change の6状態保存(#1015)

`amadeus-utility.ts` `handleScopeChange` の Stage Progress 再構築(:3228-3230 の三項)を、6状態(`pending / in-progress / awaiting-approval / revising / completed / skipped`)すべてを保存する形に置換する。

- AC-3a: marker の写像源は `CHECKBOX_MAP`(`amadeus-lib.ts:60-67`)の **canonical 1定義からの導出**とし、手書き三項の状態列挙を残さない(construction ガードレール+RE 対称性契約「parse⇔rebuild の6状態対称」)。
- AC-3b: `[?]`(awaiting-approval)/`[R]`(revising)を含む state ファイルへの scope-change 後、当該 checkbox 状態が**そのまま保存**される(Issue #1015 再現手順の閉包)。
- AC-3c: existing が見つからないステージは従来どおり `[ ]`。completed/in-progress/skipped の保存も従来どおり(既存挙動の保存)。
- AC-3d: scope-change 直後に `approve` が「still pending」で拒否される事象(e2 監査シャード :1237/:1423 の実測列)が、awaiting-approval 保存により再発しない(E-CS2 L1 の運用回避ノルムの失効条件)。

## FR-4: 再構築ヘッダの6状態統一(#1015 副次 drift)

- AC-4a: scope-change が書き戻す Stage Progress ヘッダコメント(:3238 の4状態表記)を、正本テンプレート(`amadeus-utility.ts:2748`)と同一の**6状態表記**へ統一する。
- AC-4b: 表記の複製を避けられる場合(共有定数化等)は canonical 1定義へ寄せる — 判断は design へ委ねる(手書き複製の禁止を満たす範囲で最小実装可)。

## FR-5: 落ちる実証+リグレッションテスト(両 Issue、Mandated)

- AC-5a(#1013): 散文行(例: `(昇格候補なし — …)`)を Mandated/Forbidden 配下に注入した draft で promote が exit 非0+無書き込みになるテストを追加する。**修正前実装ではこのテストが赤になる**ことを実証してから完成扱いにする(落ちる実証)。節不一致(AC-1b)と bullet 受理(AC-1a)のケースを含む。
- AC-5b(#1015): `[?]`/`[R]` を載せた state ファイルへの scope-change 後に両状態が保存されるテストを追加する。**修正前実装では赤**(`[ ]` へ崩落)を実証する。Issue #1015 の再現手順(scratch 手順)を verbatim 再適用した閉包確認をレビューで行う(fix-review-replays-origin-repro)。
- AC-5c: 既存テスト(t75 / t194 / t27 ほか)の green を維持する。RE 実測どおり両欠陥の既存カバレッジは 0 のため、既存 fixture の変更は原則不要(変更が必要になった場合は逸脱として停止・報告)。

## FR-6: 品質契約(既決の再確認、テスト可能)

- AC-6a: 正本編集 → `bun scripts/package.ts` / `bun run promote:self` で dist・self-install 同期、`bun run dist:check` / `bun run promote:self:check` exit 0。
- AC-6b: `bun run typecheck` / `bun run lint` / `bash tests/run-tests.sh --ci` 相当の関連プロファイル exit 0(既存赤はベースライン記録の上で区別)。
- AC-6c: push 前にローカル lcov で diff 追加行の未カバー 0 を実測(local-lcov-pre-push。spawn 経由でしか通らない行は in-process seam — 判定ロジックの exported 純関数化を design で検討)。
- AC-6d: PR 前に deslop 実行+全検証再実行。
- AC-6e: 修正着地後、暫定運用ノルム(E-CS2 L2 `promote-no-prose-in-rule-sections`)の失効棚卸しを leader へ報告する(失効はノルム PR 経由 — 本 intent の成果物ではなく報告義務のみ)。

## トレーサビリティ

| 要件 | 由来 |
|------|------|
| FR-1/FR-2 | Issue #1013(クロスレビュー2名)+ E-PB2 裁定 A + stage 契約 :101 |
| FR-3/FR-4 | Issue #1015(クロスレビュー2名+行番号訂正記録)+ canonical 1定義ガードレール + RE 対称性契約 |
| FR-5 | Mandated「落ちる実証」+ fix-review-replays-origin-repro + RE テスト空白実測 |
| FR-6 | project.md Mandated / team.md 品質契約(local-lcov-pre-push / deslop-in-workflow / same-root-inventory は RE で同根2箇所確定済み — :3229 修正対象 / :2656 非欠陥) |

## スコープ外(明示)

- `amadeus-state.ts set` の偽成功(Issue #1027)— 別 intent(クロスレビュー進行中)。同ファイル交差の可能性があるため、着手前に c6 の実 diff 交差判定を行う。
- v7 state への `Construction Autonomy Mode` フィールド migrate(#1027 付随論点)。
- `utility.ts:2656`(init 二値 marker)— RE で非欠陥と確定。
