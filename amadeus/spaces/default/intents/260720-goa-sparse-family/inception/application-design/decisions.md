# Design Decisions — 260720-goa-sparse-family

上流入力(consumes 全数): requirements.md(FR-1〜FR-4・裁定・留保)、architecture.md/component-inventory.md(core 正本と scripts 層の分離・既存部品目録)、team-practices.md(適用プラクティス無変更)

## ADR-1: parseGoaLine のスパース受理は「同関数拡張+後方互換 shape」で行う

- **Context**: E-GSFRA1 裁定 (a) は verbatim「parseGoaLine の bin 段をサブ問別スパース表記へ拡張する」。既存消費者は checkGoaLine(選挙 CLI の canonical round-trip — election.ts)と将来の distill 集計。GoaBreakdown.votes(8bin 固定)を型変更すると checkGoaLine が壊れる。
- **Decision**: parseGoaLine 自体を拡張し、戻り値 GoaBreakdown を**後方互換のまま**にする — canonical 行は現行どおり votes のみ。スパース行は votes = **サブ問横断のビン別合計**(既存意味論「行全体のビン度数」の自然拡張)+ 新規 optional フィールド `segments: [{label, votes}]` にサブ問別内訳を保持。既存消費者は votes だけ読むため無影響、将来集計は segments を選択的に消費。
- **Consequences**: 型は additive(optional 追加)で消費側追随ゼロ。t-norm のスパース拒否ピン(:666-671)は受理の正テストへ反転(裁定どおりの意図的変更 — 申告済み)。
- **Alternatives Rejected**: (B) 別関数 parseGoaLineSparse 新設 — parseGoaLine 非変更は裁定 verbatim(「parseGoaLine の bin 段を拡張」)からの無申告逸脱になる+canonical 1定義原則に反する二重 parse 経路を作る。(C) GoaBreakdown.votes をサブ問別配列へ破壊的変更 — checkGoaLine ほか消費側全数追随が必要で blast radius 過大、受理域拡大という裁定趣旨を超える契約変更。
- **セキュリティ/コンプライアンス**: 入力は trusted repo ファイル(E-PM10D 範囲外)。fail-closed 境界(ADR-2)で無検証受理を遮断。

## ADR-2: スパース受理域の fail-closed 境界(e2 留保の履行)

- **Context**: e2 留保(GoA2)— 受理拡大が無検証受理に滑らない境界仕様。
- **Decision**: loud 拒否(ParseFailure)とする不正形 — (i) サブ問ラベル重複(c1 が2回) (ii) 範囲外 bin(1-8 外・重複 bin・順序逆転はセグメント内で canonical と同基準) (iii) 不正 token(GOA_TOKEN_RE 不適合) (iv) 空セグメント(`/` 区切りの空要素)。ラベル文法は FD で確定(FR-1(iii) 委譲維持)— 本 ADR は拒否クラスの列挙のみ固定。
- **Consequences**: norm-metrics のスパース拒否ピン(t-norm :666-671)は fail-closed 4クラスの境界テスト群へ再編(不正形の拒否は維持しつつ正当スパースは受理へ)。ParseFailure の error 文言が新分類を含むため、error 文言に依存する既存テストの grep 棚卸しを CG で実施。
- **Alternatives Rejected**: 寛容受理(不正セグメント skip)— 検証劇場 Forbidden の無音失敗クラス。
- **セキュリティ**: fail-closed により不正データの集計混入を受理段で遮断。

## ADR-3: GoaLineCode 拡張・ECODE_RE 整合は正規表現の受理域拡大のみで行う

- **Context**: E-GSFRA2 裁定 (a)(圧縮形ピン維持)+FR-3(count 不変)。
- **Decision**: `GOA_LINE_CODE_RE` → `^E-[A-Z0-9]+(-[A-Z0-9]+)*$`、`ECODE_RE` → `\bE-[A-Z0-9]+(?:-[A-Z0-9]+)*`。変換ロジック・呼び出し形は一切変更しない(受理域の純拡大)。t238:102 の圧縮形ピンは温存、handleOpen メッセージ(election.ts:241-242)のみ新受理形へ更新。
- **Consequences**: 受理域拡大により t238 の BR-R1 否定アサーション(:96-98 — E-SDE-CG4/E-TPR-RE の .ok===false ピン)が**必ず偽になる — 複節受理の正テストへ反転する(裁定 E-GSFRA2 の帰結としての意図的変更、申告済み)**。テスト名・意図コメントも「複節は受理・非 E-code 形は拒否」へ書き換える。:102 の圧縮形ピンは温存(E-GSFRA2 (a))。handleOpen(:241-242)のメッセージ表記更新、handleRender(:374)の parse 呼びはメッセージに regex 非埋め込みのため無変更。
- **Alternatives Rejected**: 圧縮変換ヘルパーの新設 — 変換は CLI に不存在(RE 実測)で、導入は要求なき新機構。

## ADR-4: レコード抽出契約 — 「1物理行=1レコード」前提を置かず、occurrence 分割を走査側の責務とする(reviewer C-2 是正)

- **Context**: 実 corpus に1物理行へ複数の独立 GoA レコードが同居する形が実在する(team.md:282 = 4レコード連結、:139/:241 = 各2レコード — 実測 12物理行/17 occurrence)。しかもレコード間連結の区切りとサブ問区切りが同じ「 / 」で衝突しうる。parseGoaLine(line)へ物理行をそのまま渡す設計では E-PM10B/C/D 級のデータが構造的に回収不能。
- **Decision**: **parseGoaLine の入力単位は「1レコード文字列」**(GoA[E-code]: で始まりトークン列が続く区間)と契約で明記する。物理行からのレコード抽出は走査側(corpus sweep テスト・将来の集計スキャナ)の責務とし、抽出境界は「次の `GoA[E-<code>]:` トークン(regex: `GoA\[E-[A-Z0-9-]+\]:`)の直前」(occurrence 分割 — サブ問セグメントは c1 等のラベルで始まり GoA[ で始まらないため決定的に区別可能)。抽出ヘルパー extractGoaRecords(text) を norm-metrics に追加し corpus sweep テストと1定義共有(canonical 1定義原則)。
- **Consequences**: FR-1 AC(i) の sweep は extractGoaRecords → parseGoaLine の2段で全21 occurrence を対象化(components.md のテスト見積りに sweep テストを明示追加)。regex 定義 ECODE 系と抽出境界 regex は同一複節形を共有。
- **Alternatives Rejected**: (i) 複数レコード行を対象外として要件へ差し戻す — 21 occurrence 中8つ(複数レコード行の全 occurrence — team.md :139=2+:241=2+:282=4、project.md は全て単一レコード行で寄与0。機械再計算済み)が回収不能になり FR-1 の裁定趣旨(corpus が読める)を実質破る。(ii) parseGoaLine 内で行分割まで行う — parse と走査の責務混合で、行に依存しない呼び出し(選挙 CLI round-trip)へ不要な分岐を持ち込む。
