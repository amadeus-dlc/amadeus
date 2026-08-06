# Requirements Analysis — 明確化質問

上流入力(consumes 全数): business-overview.md, architecture.md, code-structure.md

## 選挙不要判定・裁定の記録

- 本質問票の全問は **仕様裁定**（既存の要件・ユーザー可視契約・挙動の変更、またはピン留め済みテスト契約の改訂）に該当する。
  `cid:requirements-analysis:escalation-canonical` (4) によりエージェント選挙の対象外とし、ユーザーへエスカレーションする。
- `cid:requirements-analysis:election-answer-after-ruling` に従い、`[Answer]:` はユーザー裁定の受領後にのみ記入する。
- 裁定の根拠は全件クロスレビュー2名成立済み（run `xrev-20260805-openbugs`、レビュー対象 SHA `8409c2039c5281e533db88a637649276d8bc4a73`）。
  RE observed commit は `1043b7e67857494f38a4c9020709528e859c641b`。

### 裁定の受領

- **ユーザー承認: 2026-08-05T07:56:44Z** — 全7問（Q1〜Q7、副問 Q3b/Q4b/Q5b/Q6b を含む）を `AskUserQuestion` で3ラウンドに分けて提示し、全問について裁定を受領した。
- 本質問票の裁定はいずれも Intent autonomy 確立**前**に人間が実際に選択したものであり、自動裁定ではない。
- 参考: 本 intent は 2026-08-05T07:56Z 時点で Intent autonomy `full`（grant `intent-grant-bd63c4ce5991149e6a2ba1677cefbbfc`）へ移行済み。
  以後の質問・ゲートは engine が自動裁定するが、上記7問は人間裁定として確定済みのため再裁定しない。

## Q1. #2147 — invocationId の永続化と欠損時の挙動

reviewer runtime の replay 検査（`amadeus-reviewer-runtime.ts:449`/`:452`）は早期 return `:443` の後段にあり、spot-check を辞退した通常経路で執行されない。
両レビュアーが独立に、`scope` を一度も呼ばずに払い出されていない UUID で `check-read`→`complete-review` が exit 0・READY 着地することを実測した。
`runScope` は発行した invocationId を永続化しないため（唯一の write は `:612` の成果物 append）、早期 return の位置を直すだけでは照合対象が存在せず契約は回復しない。

A. `scope` 発行時に invocation store へ永続化し、`complete-review` は store 照合必須・**store 欠損は fail-closed**（照合できなければ READY を確立しない）
B. 同上だが **store 欠損は fail-open**（警告のみで従来どおり通す。既存 record との後方互換を優先）
C. 永続化せず、`check-read` / `complete-review` の署名を `scope` 出力に暗号学的に束縛する（store 不要だが実装量は増える）
X. Other (please specify)

[Answer]: A — scope 発行時に invocation store へ永続化し、complete-review は store 照合必須。store 欠損は fail-closed（READY を確立しない）。ユーザー承認: 2026-08-05T07:56:44Z

## Q2. #1946 — submittedAt の検証方式と t234 ピンの扱い

ballot の `submittedAt` は投票者の自己申告のまま無検証（`amadeus-election.ts:528-552` に比較式なし、`amadeus-election-model.ts:196-199` は shape 検査のみ）。
影響は台帳の見た目に留まらず、`resolveBallots`（`amadeus-election-model.ts:307-313`、submittedAt 最大を採用）により**未来日時の原票が真正な後続 amend を構造的に破棄**する（両レビュアーが決定的再現）。
矛盾は起票時の「2件」ではなく実測 **58行 / 41選挙**（receivedAt 保持行 626 の 9.3%、超過幅 中央値 1,396 秒・最大 33,173 秒）。「±数分許容」案では 17/58 行が素通りする。
**`tests/unit/t234-election-model.test.ts:310-315` が「開票前に受理された未来の submittedAt は on-time」を明示コメント付きでピン留めしている**ため、受理段で拒否するとこのテストは到達不能になる。

A. **受理側で刻印**（CLI が受理時刻を権威として `submittedAt` を刻む）。`resolveBallots` の軸も受理時刻へ移す。t234 のピンは「自己申告値は集計軸として使わない」旨へ明示改訂する
B. **受理段で拒否**（`submittedAt > receivedAt` を fail-closed で弾く）。t234:310-315 は削除または反転改訂する。ただし `resolveBallots` は自己申告軸のまま残る
C. A + B の両方（刻印しつつ、矛盾入力は受理段でも弾く）
X. Other (please specify)

[Answer]: A — 受理側で刻印する。CLI が受理時刻を権威として submittedAt を刻み、resolveBallots の軸も受理時刻へ移す。t234-election-model.test.ts:310-315 のピンは「自己申告値は集計軸として使わない」旨へ明示改訂する。ユーザー承認: 2026-08-05T07:56:44Z

## Q3. #2251 — 修正面の広さと typed directive の導入

completion 未コミット窓の `next` が想定内の正規状態を `ERROR_LOGGED` / `amadeus.operation.failed` として監査記録する（`amadeus-orchestrate.ts:3005` 近傍の errorDirective 分岐、導入は #2171 / `43b1be53e`）。
抑止側（`ERROR_LOGGED` を書かない）で直すと #839/#878 を退行させるため、方向は typed directive 化。
同型の refusal→errorDirective は `:585` / `:3020` / `:4970` と `amadeus-state.ts:2510` / `:2522` にもあり、うち `:585` と state 側は実運用シャードで実発火を確認済み。

A. **当該 `:3005` のみ**を typed directive 化する（最小変更。他4面は別 Issue へ）
B. **実発火を確認した面まで**（`:3005` + `:585` + state 側 `:2510`/`:2522`）を同一変更で typed directive 化する
C. **同型5面すべて**を typed directive 化する（`:3020`/`:4970` を含む）
X. Other (please specify)

## Q3b. 新しい directive kind の導入可否

typed directive 化は出荷 SKILL.md が規定する forwarding-loop の directive kind 集合を増やす＝**ユーザー可視の公開契約の変更**に当たる。

A. 新しい kind を導入してよい（全ハーネスの SKILL.md と docs を同一変更で同期する）
B. 既存の `print` kind に載せて新 kind を増やさない（loop は停止せず継続する）
X. Other (please specify)

[Answer]: B — 実発火を確認した面まで（:3005 + :585 + amadeus-state.ts:2510/:2522）を同一変更で typed directive 化する。:3020 / :4970 は未発火のため別 Issue へ回す。／ Q3b: A — 新しい directive kind を導入し、全ハーネスの SKILL.md と docs を同一変更で同期する。ユーザー承認: 2026-08-05T07:56:44Z

## Q4. #2145 — 修正スコープとラベル

`amadeus-shared/verification.md:15`/`:25` が実在しない `amadeus-docs/` を指す。source-only 移行（#2152）後、追跡コピーは正本1件のみで修正対象は **2行**（起票時の「13投影面×2=26箇所」は失効）。
Traceability Matrix の生成機構は不在（`git grep -n 'traceability.md'` の hit が仕様行1本のみ）。実装は #624 へ委譲済み。
**Issue の受け入れ条件が実行不能** — 引く `bun run dist:check` / `promote:self:check` は package.json に存在しない（現行は `source-only:check` / `distribution:check`）。
同根の陳腐化が sensor manifest 4件と knowledge 3件に残るが、`matches:` glob は生きているため一括置換は禁物。

A. **正本2行のみ**修正し、受け入れ条件を現行コマンドへ書き直す。同根は別 Issue へ
B. 正本2行 + **sensor manifest 4件**まで（`matches:` glob は温存し、記述面のみ是正）
C. 正本2行 + sensor manifest + **knowledge 3件**（`audit-format.md` は legacy fallback を意図保持しているため別方針が要る点に留意）
X. Other (please specify)

## Q4b. ラベル

レビュアー間で割れた。r1 は `cid:requirements-analysis:issue-type-decision` の判定順（必要な変更が文書面だけなら step 2 で `documentation` 確定）により `documentation`、r2 は `bug` 妥当と判定。

A. `documentation` へ変更する
B. `bug` のまま維持する
X. Other (please specify)

[Answer]: A — 正本2行のみ修正し、受け入れ条件を現行コマンド（source-only:check / distribution:check）へ書き直す。sensor manifest 4件と knowledge 3件は別 Issue へ。／ Q4b: A — ラベルを documentation へ変更する。ユーザー承認: 2026-08-05T07:56:44Z

## Q5. #1953 — 鮮度相関の実現方式と種別

approve 側の SWARM 実績突合が過去計画の stale 実績を現行証拠として受理する。
引用されている要件は FR-4 だが、実際に対応するのは **FR-2**（`requirements.md:31-37`）。
主症状は誤った拒否ではなく **silent pass**。
`260801-cg-plan-guard` の `business-logic-model.md:116-118` が鮮度検査を**この Issue 番号へ明示的に委譲**していた。

A. **世代キー**（DAG と3 emitter に generation を持たせ、世代不一致の実績を弾く）。legacy 行の扱いは fail-closed
B. 同上だが legacy 行は fail-open（既存 record を壊さない）
C. **時刻境界**（boundary timestamp を approve 経路で読む）。writer 側のスキーマ変更が不要な代わりに、時計依存が入る
X. Other (please specify)

## Q5b. 種別

`260801-cg-plan-guard` が鮮度検査を本 Issue へ委譲していた事実を踏まえ、`bug`（既存契約違反）か `enhancement`（未実装機能の追加）か。

A. `bug` のまま維持する
B. `enhancement` へ変更する
X. Other (please specify)

[Answer]: A — 世代キー方式（DAG と3 emitter に generation を持たせ、世代不一致の実績を弾く）。legacy 行も fail-closed。／ Q5b: A — 種別は bug のまま維持する。ユーザー承認: 2026-08-05T07:56:44Z

## Q6. #2112 — 多段 as の計数単位と逆方向の穴

`unchecked-cast-guard` が `JSON.parse(x) as A as B` を2サイトとして計上する（`unchecked-cast-guard.ts:95-103` の全ノード訪問 × `unwrapExpression` の as 剥がし）。
影響は起票より狭い — 台帳は同じ検出器で生成されるため過剰カウントは書き手・読み手に対称に乗り、**定常状態では赤にならない**。verdict が反転するのは「台帳収載済みファイルの単一 as を台帳更新なしに多段化する」遷移のみで、`--update` で回避可能。
現行コーパスに実例0件（AST 全数走査: 連鎖41件、うち unknown 非経由0件）。
逆方向の**過少カウント**（`<A>JSON.parse(s)` の角括弧アサーション単独、`satisfies` 単独）が0サイト＝ fail-open 側の穴として実在。

A. **最外の1サイトのみ計上**へ是正する。逆方向の穴は別 Issue へ
B. 最外1サイト化 **+ 逆方向の穴も同一変更で塞ぐ**（同じ関数を触るため）
C. 現状維持（実害が遷移時のみで回避可能なため `wontfix`）
X. Other (please specify)

## Q6b. `as unknown as` との相互作用

BR-CG-2 は `unknown` 経由を別扱いとする。最外のみ計上にすると `JSON.parse(s) as A as unknown as B` は 1 サイトか 0 サイトか。

A. 1サイト（`unknown` 経由でも無検査キャストとして数える）
B. 0サイト（`unknown` 経由は BR-CG-2 により除外）
X. Other (please specify)

[Answer]: B — 最外1サイト化に加え、逆方向の過少カウント（<A>JSON.parse(s) の角括弧アサーション単独、satisfies 単独）も同一変更で塞ぐ。／ Q6b: A — JSON.parse(s) as A as unknown as B は 1サイトとして数える。ユーザー承認: 2026-08-05T07:56:44Z

## Q7. 重大度の再分類

両レビュアーが独立に昇格を提案した2件。`cid:requirements-analysis:bug-severity-labels` の S2 定義は「主要機能の誤動作・回避策のない偽green/偽赤」。

- **#2147**: 提示された回避策（iteration ごとに `scope` 再実行）は reviewer-2 が CONTRADICTED（runtime の検証は一切増えない）。回避策なしの偽 green に当たる
- **#1946**: `resolveBallots` の乗っ取りをスコープに含めるなら S2 相当

A. 両方 S2-CRITICAL へ昇格する（#2147 は P1 も検討）
B. #2147 のみ昇格する
C. どちらも現状維持（S3-MAJOR）
X. Other (please specify)

[Answer]: A — #2147 と #1946 の両方を S2-CRITICAL へ昇格する（#2147 は P1 も検討）。ユーザー承認: 2026-08-05T07:56:44Z
