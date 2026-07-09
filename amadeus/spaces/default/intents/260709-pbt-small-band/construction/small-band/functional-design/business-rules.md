# Business Rules — プロパティカタログ(検証する法則)

トートロジー禁止(NFR-3): 全プロパティは実装から独立に定義できる法則のみ。各 Bolt は変異注入の落ちる実証(exit code 付き)を完成条件とする(FR-1.4/2.3/3.3/4.4/5.4)。

## B1: semver / version-spec

| ID | 法則 | 生成域 |
|---|---|---|
| P-SV1 | parse∘format = id(roundtrip): 有効な SemVer 文字列 s について format(parse(s)) が s と正規化同値 | 有効 semver 文字列生成器 |
| P-SV2 | 不正入力は必ず Result エラー(throw しない・null を返さない) | 壊れた文字列生成器(欠落・非数値・空) |
| P-SV3 | 比較律(strict order `isLaterThan`): **非反射**(isLaterThan(a,a)=false)・**非対称**(isLaterThan(a,b) ⇒ ¬isLaterThan(b,a))・**推移** | **stable のみ**(prerelease 非比較のため。factory:20) |
| P-SV4 | VersionSpec の受理域 = SemVer.parse の受理域に閉じる | 有効+無効混合 |

## B2: manifest

| ID | 法則 | 生成域 |
|---|---|---|
| P-MF1 | parse(toJSON(build(entries))) = 構造同値(roundtrip) | 一意 path のエントリ列 |
| P-MF2 | 重複 path を含む入力は build/parse が必ず拒否(Result エラー) | 重複を必ず1組含む列 |

## B3: plan seam

| ID | 法則 | 生成域 |
|---|---|---|
| P-PL1 | classify の全域性: 任意の relPath で FileClass のいずれかを返す(throw しない) | 任意相対パス(区切り・大文字小文字・拡張子変異) |
| P-PL2 | classifyAction の横断律(実装事実に基づく): (a) `exists=false` ⇒ action は常に `"add"`(force/cls に依らない) (b) `exists=true ∧ force=true` ⇒ action は cls のみで決まる(この部分域での決定性) (c) conflict 系 action は `exists ∧ ¬force` の域でのみ出現(条件式は実装照合のうえ精密化し、精密化結果を本表へ反映してから完成扱い) | bool×bool×FileClass 全域 |

## B4: audit-escape

| ID | 法則 | 生成域 |
|---|---|---|
| P-AE1 | unescape∘escape = id(roundtrip): CR/LF/バックスラッシュ混在文字列で往復同値 | 制御文字・\n・\r\n・\\n リテラルを混ぜた文字列 |
| P-AE2 | escape 出力は改行を含まない(監査ブロックの1行不変条件、t111:227-270 の一般化) | 同上 |

## 共通規約(FR-1.2)

- 生成器はテスト側ヘルパーにドメイン型ごとに併置。brand 型はスマートコンストラクタ経由で構築(無効状態を生成器が直接作らない — 無効入力テストは「文字列」生成域で行う)
- PR CI: 固定シード+既定 numRuns(FR-1.4 の +60 秒制約から逆算、OQ-1)。--release 層: 高 numRuns
- 失敗時 seed/counterexample 出力必須。shrink 済み反例は example-based としてピン留めコミット
