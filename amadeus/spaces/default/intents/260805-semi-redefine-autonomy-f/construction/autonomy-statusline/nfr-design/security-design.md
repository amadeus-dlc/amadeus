# Security Design — `autonomy-statusline` NFR Design(#2253)

上流入力(consumes 全数): business-logic-model.md(present — 本書の全節が依拠する唯一の present consume)。nfr-requirements 系 consumes(security-requirements.md / tech-stack-decisions.md ほか)は scope の SKIP により設計上不在 — セキュリティ要求は requirements.md §Non-functional requirements(NFR 全 7 件の逐条照合 — questions D1)と既存コード実測から導出した。

本 Unit は読み取り専用の表示純関数であり、セキュリティ設計の目標は**新規攻撃面をゼロに保つこと**である(questions D3)。

---

## 攻撃面の棚卸し(新規追加分)

| 面 | 本 Unit の追加 | 根拠 |
| --- | --- | --- |
| ファイル I/O | **ゼロ** — `main()` が既に読んでいる state 文字列(business-logic-model.md 処理シーケンス `:286` 既存 read)を引数で受けるのみ。新規 `readFileSync` / `existsSync` を導入しない | ADR-10(business-logic-model.md 依拠箇所)。「追加 FS I/O ゼロ」原則の出所は questions D3 — NFR-3 自体は非適用(下表参照)であり、その設計原則を本 Unit の目標として**類推採用**したもの |
| 書込・状態変更 | **ゼロ** — 監査 journal・state・projection への書込なし(business-logic-model.md「書き手はいない」) | データフロー表(3 段とも読み・変換のみ) |
| プロセス起動・ネットワーク | **ゼロ** — 純関数のみ。spawn・fetch を含まない | business-logic-model.md アルゴリズム(getField + 値域判定のみ) |
| 認可境界 | **通過しない** — 本 Unit は認可判定を読みも書きもしない。表示する mode 名は状態の投影であって認可の根拠にならない(認可は semi-authorization-core の `SemiAuthority` / grant が所有) | questions D1(NFR-1/2/6 非適用の根拠) |

## 入力検証(fail-closed 縮退)

外部入力は state ファイルの `Intent Autonomy Mode` フィールド値 1 点のみ。検証は FD 決定表(business-logic-model.md)の閉じた値域判定で行う:

- 値域 `["none","semi","full"]`(canonical `AutonomyMode` — `amadeus-intent-autonomy.ts:9` 由来の literal 配列、`import type` で束ねる)に**含まれない値・フィールド不在はすべて空文字 `""` へ縮退**し、セグメントを表示しない。
- 縮退は無音だが安全側(表示の欠落であり、誤った autonomy 水準の表示ではない)。state ファイルへの不正値注入は「昇格表示」を作れない — 3 値のいずれかへ正確に一致しない限り何も表示されない(部分一致・大文字小文字ゆらぎ・前後空白は `trim()` 後の全一致判定で排除)。
- インジェクション類(表示文字列への制御文字混入): 返り値は入力の写しではなく **canonical 3 値のいずれか**であるため、state 由来の任意文字列が statusline 出力へ流れる経路は構造的に存在しない(値域判定が sanitize を兼ねる)。

## 秘密情報・暗号・コンプライアンス

該当なし(1 行理由 — nfr-design.md Step 2 の様式): 本 Unit は認証情報・秘密・個人情報を読まず、表示する mode 名(`none`/`semi`/`full`)は既に `--status` の `Autonomy:` 行(requirements.md FR-DISP-1)で表示済みの公開状態値である。暗号化の対象データなし。

## 適用 NFR との対応

| NFR | 本設計での充足 |
| --- | --- |
| NFR-4(TDD) | 失敗テスト先行 → 最小実装(FD の t448 設計 — 決定表 5 ケースの in-process assert)。実 FS を触らない純関数のため unit 層でよい |
| NFR-5(ドリフトゼロ) | 編集正本は `packages/framework/core/tools/amadeus-lib.ts`(関数)と `packages/framework/core/hooks/amadeus-statusline.ts`(配線 1 行)のみ。`bun run build` 後の追跡ファイル不変を検証 |
| NFR-7(ゲート集合) | PR CI のブロッキング集合(typecheck / lint / 再現性 / source-only / graph / run-tests --ci / coverage 両ゲート / complexity / plugin-conformance-e2e)を全て通す |
| NFR-1 / NFR-2 / NFR-6 | **非適用**(認可ゲート・監査書込・provenance を持たない — questions D1)。非適用は省略でなく本行の明記で扱う |
| NFR-3 | **非適用**(1 行理由: NFR-3 は `--autonomy` flag parser の走査計算量・parse 段 FS I/O を縛る要件で、所有 Unit は `launch-autonomy-flag` — 本 Unit は parser に触れない)。ただしその設計原則「追加 FS I/O ゼロ」は本 Unit の表示側目標として類推採用し(questions D3、攻撃面表 1 行目)、検証は「セキュリティ観点の検証手段」の grep 0 hit で行う |

以上で NFR 全 7 件の分類が閉じる: **適用 3 件(NFR-4/5/7)・非適用 4 件(NFR-1/2/3/6)**(questions D1 の逐条照合と一致)。

## セキュリティ観点の検証手段

- 値域外入力の縮退(不正値 → `""`)は t448 の決定表ケースに含まれる(FD 検証シーケンス — 不正値・フィールド不在の 2 ケース)。型不正・ゆらぎ入力で例外を投げず空文字へ落ちること(catch 不要の全域関数であること)を同テストで固定する。
- 「新規 FS I/O ゼロ」は実装 PR レビューで `autonomySegment` 関数本体と配線 diff への grep(`readFileSync|existsSync|spawn`)0 hit で機械確認する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T12:18:59Z
- **Iteration:** 1
- **Scope decision:** none

NFR-3 の適用/非適用分類が security-design.md 内で自己矛盾しており、7 件全数の根拠付き分類という審査観点を満たさない

### Findings

- BLOCKER | amadeus/spaces/default/intents/260805-semi-redefine-autonomy-f/construction/autonomy-statusline/nfr-design/security-design.md:13,37 — 攻撃面棚卸し表の「ファイル I/O」行が根拠として『NFR-3 の表示側適用(questions D3)』を挙げ NFR-3 を設計判断の裏付けとして援用しているが、末尾の『適用 NFR との対応』表は適用 3 件(NFR-4/5/7)・非適用『NFR-1/NFR-2/NFR-6』のみを列挙し NFR-3 を欠落させている。NFR-3 が適用なのか非適用なのかが文書内で確定できず、冒頭(:3)の『NFR 全 7 件の逐条照合』という主張と矛盾する。7 件全数の根拠付き分類(適用3/非適用4)を明記し、NFR-3 の扱いを一意に確定すること(non-applicable なら 1 行理由、applicable なら NFR 対応表へ追加し検証手段も記す)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-05T12:20:41Z
- **Iteration:** 2
- **Scope decision:** none

NFR-3 の適用/非適用が security-design.md 内で一意に確定し(非適用+類推採用の理由明記)、7件全数分類(適用3/非適用4)の閉包文が追加され、logical-components.md との矛盾もない

### Findings

- None
