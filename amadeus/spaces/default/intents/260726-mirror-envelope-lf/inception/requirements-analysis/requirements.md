# Requirements — 260726-mirror-envelope-lf(#1498 P1/S2)

上流入力(consumes 全数): business-overview.md(auto-mirror 5 verb 全面不成立の業務含意 — Intent 分析の P1/S2 根拠)、architecture.md(envelope パース機序・5 verb 影響表 — FR-1/FR-2 の患部整理の依拠元)、code-structure.md(増幅面・修正時ファイル目録 — NFR-1 の 14 パスの依拠元)

測定 ref: file:line は reverse-engineering/scan-notes.md の observed(区間27コミット、mirror-gateway 系は区間無変更を diff 空で確認)からの転記。

## 承認系譜

- 起点: クロスレビュー 2/2 成立済み #1498 の修正 intent 化+P/S ラベル引き上げ(P2→P1、S3→S2)をユーザーが承認(2026-07-26、AskUserQuestion)。
- 裁定 Q1(ユーザー、2026-07-26T11:41:28Z、questions ファイル転記済み): find は **--slurp 廃止で1ページずつ取得**(A案)。

## Intent 分析

mirror gateway の HTTP envelope パーサが gh の実出力を一度も実測しない仮定文法(CRLF ステータス行・非 interleave)で実装され、全5 verb(create/find/view/edit/close)が `invalid-response` で不成立 = auto-mirror 機能の全面停止(回避策なし、P1/S2)。修正は「実出力への回復」であり仕様変更ではない。CI が偽 green だった機序(自作 CRLF fixture)も同時に封鎖する。

## 機能要件

### FR-1: 単一系 envelope パーサの LF/CRLF 両対応

- 患部: `packages/framework/core/tools/amadeus-mirror-gateway.ts` — `parseHttpEnvelope` がステータス行終端を `bin.indexOf("\r\n", pos)`(:196)で探すが、gh 2.96 はステータス行のみ **bare LF 終端**(ヘッダは CRLF)。`STATUS_LINE_RE`(:179、非 multiline)へ2行分が渡り :199 で malformed → :509→:525-534 で `invalid-response`(exit 0・retryable=false)。
- 要件: ステータス行・ヘッダ終端を LF/CRLF 両対応で parse する。envelope の意味論(status 列挙・body 抽出・`:669` 系の不変条件)は不変。
- 受け入れ基準(regression-first): (a) scan-notes §5 に採取済みの**実 gh 出力バイト列**(単一 GET)を fixture 化し、修正前 malformed → 修正後 ok を赤→緑で固定 (b) 既存の自作 CRLF fixture(t272:61)も引き続き ok(両終端対応の対称テスト) (c) create/view/edit/close の4 verb 経路(:649/:690/:704/:718)が実出力 fixture で成立。

### FR-2: find の --slurp 廃止(裁定 Q1=A)

- 患部: find の argv 構築 `findArgv`(:118-131、`--slurp` は :125 — 実測 grep で確定。:134-139 は viewArgv で別物)が `--paginate --slurp` を使い、実出力は interleave 文法で設計宣言(260724-mirror-auto-modes の security-design.md:37)と3点相違(LF 終端・interleave・末尾 LF 不在)。
- 要件: `--slurp` を外し1ページずつ取得する。各ページは単一 envelope となり FR-1 のパーサで完結。`outer.length === pageCount` 不変条件は「取得ページ数 = 反復回数」として維持。ページング終端は gh の Link ヘッダまたはページ空判定の既存慣行に従う(実装時に gh 挙動を実測して確定)。
- 受け入れ基準: (a) P=2 の実採取素材(scan-notes §5)から導いたページ別 fixture で find が全件を返す (b) 修正前の --slurp 経路が malformed になる赤を固定してから移行 (c) 既存 t272 の paginated テストを新方式へ更新(合成 fixture は実出力形へ差し替え)。

### FR-3: fixture の実出力化(偽 green の封鎖)

- 要件: envelope 系 fixture の正本を「実 gh 出力から採取したバイト列」とし、自作整形はエッジケース(CRLF 版・異常系)に限る。fixture 出自(採取コマンド・gh バージョン)をコメントで記録する。
- 受け入れ基準: t272 系に実出力 fixture 経路が存在し、パーサを CRLF 専用へ退行させる注入(LF 対応の除去)で赤くなることを落ちる実証として固定。

### FR-4: Issue クローズ整合

- 要件: PR は `Closes #1498`。PR 本文に機序(bare LF 主因・'[' は副次)・5 verb 影響・裁定 Q1 を明記し、Issue タイトルの機序表記(--slurp 先頭 '[')との差異を PR 本文で訂正参照する。

## 非機能要件

- NFR-1(配布同期): `amadeus-mirror-gateway.ts` は増幅 **14 パス**(正本1+self-install5+dist7+テスト1 — Kimi harness #1522 着地後の Architect 再実測。scan-notes 時点の12から増加)。**区間で Kimi harness(#1522)が追加されたため、dist 再生成は最新 origin/main 起点で行い kimi ツリーを含むこと**(cross-merge-dist-tree-blindspot 対策)。`dist:check` / `promote:self:check` green 必須。
- NFR-2(ゲート維持): typecheck / lint / `bash tests/run-tests.sh --ci` / coverage patch / complexity green。push 前ローカル lcov で追加行未カバー 0。
- NFR-3(allowlist 行ピン): `.coverage-patch-allowlist.json` の gateway ピン5件(447-448/602/615-620/702/716)は :179-235 への行挿入で stale 化する — 同一 PR で全エントリの reason↔現行行を照合して更新(E-FSPBTS13)。

## 制約

- 1 PR(Issue 単位)。要求外の互換レイヤー禁止(LF/CRLF 両対応は「実出力への回復」であり互換シムではない — 意図を doc コメントに明記)。
- 過去 intent の設計宣言(security-design.md:37)は歴史的成果物として改変しない。誤りの記録は本 intent の record と PR 本文で行う。
- マージは人間承認(no-AI-merge)。

## 前提

- 実 gh 出力素材は scan-notes §5 に read-only 採取済み(gh 2.96.0)。他バージョンの gh での挙動差は未実測 — パーサを両終端対応にすることでバージョン非依存化する方向(仮説: 旧 gh が CRLF を出していた可能性は排除しない。fixture は両形を持つ)。

## Out of scope

- interleave 文法対応パーサ(裁定 Q1 で不採用)。
- mirror 機能の仕様変更・他 verb の追加。
- security-design.md の歴史的訂正キャンペーン。

## Open questions(後続へ)

- find のページング終端判定の具体形(Link ヘッダ vs 空ページ)— 実装時に gh 挙動を実測して確定し、code-summary に記録。
