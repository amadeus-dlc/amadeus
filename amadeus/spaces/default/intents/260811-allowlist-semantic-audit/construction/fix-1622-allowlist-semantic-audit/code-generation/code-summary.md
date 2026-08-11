上流入力(consumes 全数): requirements.md / unit-of-work.md(SKIP 由来で不在 — 設計どおり)

# Code Summary — fix-1622-allowlist-semantic-audit

Issue #1622。`tests/.coverage-patch-allowlist.json` の `reason` とセレクタが指す実コードの
意味的不一致(無音転位)を是正し、再発を止める機械ガードを新設した。

`requirements.md` の FR-1〜FR-7 / NFR-1〜NFR-4 を契約とし、実装方針は
`code-generation-plan.md` の「契約最終確定 — 2026-08-12 ユーザー裁定その3」に従う。
再実行可能な述語と実測値はすべて `evidence/` 配下にある(FR-7)。

測定 ref: 是正前 = `a96bfde5588328611cb46c7836c346d57223fe8d`(park コミット) /
是正後 = `6fb1ba27971f6da1d3ad457c3e6457fcde26ea58`。

## 何を作ったか

### 1. `selector.class` — 宣言を入力として受け取るデータフィールド

台帳の `selector` に optional な `class` を足し、**それだけを AST と照合する**。
`reason`(散文)はゲートの判定経路に一切入らない。

- 閉語彙は AST で判定可能な 3 クラス: `type-only` / `catch-arm` / `dispatch-case`
- `spawn-only`(到達性の主張)と `unmeasurable-other`(述語なし)は**宣言できない** —
  宣言できても検査できず、ゲートの担保が増えないため
- 語彙外の値・空文字・非文字列は parse 段階で fail-closed(NFR-2)
- フィールドは optional なので**ラチェット**として機能する。現在の宣言は 4 件で、
  エントリが見直されるたびに opt-in が増える。一度付いた宣言は退行できない

**なぜ `reason` を読まないか**: 主題を散文から抽出する設計は 4 回試して 4 回とも実測で否定された
(構文クラス述語 / 全件規約化 / 関数名照合 / 宣言クラス × AST の食い違い)。`reason` は対象・根拠・
被覆状況・到達条件が 1 文に混在する人間向けの説明文であり、主題の機械抽出は本 intent の射程に
収まらない。宣言を**推論ではなく入力**にすることで、偽陽性が構成上生じない形へ移した。

### 2. `tokensInRange` の zero-token 欠陥修正(前提バグ)

走査が `ts.forEachChild` を使っており、句読点・キーワードトークンを訪れなかった。
`} catch {` だけの範囲はトークン 0 個になり、全クラス述語が無条件に偽を返していた。
`node.getChildren()` 経由の走査へ変更し、句読点は「クラスを担わないトークン」として除外する。

- 修正前の走査でトークン 0 個だった範囲: **39 件**
- そのうち修正後に分類されたもの: **24 件**
- 述語は `evidence/classify-ledger.ts` が `preFixTokenCount` として保持しており再測定可能

### 3. 転位 18 件の是正(FR-2)

RE が verbatim 実読で確定させた T1〜T18 を、**lcov の DA 実測**を根拠に処理した。
散文ではなく計測値で「免除に値するか」を決めている。

- 真の対象が **DA:0**(計測対象だが未被覆) → 免除に値する → **セレクタを張り直し**(11 件)
- 真の対象が **DA > 0**(実際に走っている) → 免除に値しない → **エントリ削除**(7 件)

台帳は 623 → 616 件、免除行は 3452 → 3400 行。当初「防御的 catch だから免除」と読める
5 件が実測では被覆済みと判明し削除側へ移った — 散文だけで判断していれば誤って残していた。
エントリ単位の判断理由は `evidence/fr2-remediation.md`、機械可読版は `evidence/remediation.json`。

### 4. ガードの適用点

`tests/coverage-patch-gate.ts` の `runCheck` 内、allowlist 解決の直後 1 箇所のみ
(requirements.md Constraints「第 2 の解釈器を作らない」)。宣言と実コードが食い違えば exit 1。

## 受け入れ基準の充足状況

| 契約 | 状況 | 実測の所在 |
|---|---|---|
| FR-1(全数分類・恒等式) | 充足 | `evidence/README.md`。`43 + 413 + 160 = 616` が台帳件数と一致 |
| FR-2(1) `--check` exit 0 | 充足 | `evidence/verification.md`。`Patch coverage gate: PASS` |
| FR-2(2) 免除行の帰属 | 充足 | `evidence/attribute-diff.ts` が未帰属を検出したら非0。**未帰属の増加行 0 件** |
| FR-2(3) エントリ単位の根拠 | 充足 | `evidence/fr2-remediation.md` の 18 行表 |
| FR-3(規約化と `判定不能` 0 件) | **撤回済み** | 裁定その3により `reason` の parse をやめたため契約から外れた(下記) |
| FR-4(落ちる実証の両側) | 充足 | `evidence/falling-proof.md`。(a) 現行台帳で緑 (b) 宣言反転で赤 (c) 語彙外で throw |
| FR-5(集約 `needs` 経由の blocking) | 実装面は充足 / PR 実測は未 | `evidence/ci-wiring.md`。実 PR での赤の実測は conductor が別ブランチで行う |
| FR-6(2 クラスの検出) | 充足 | 規約違反 = 語彙外の値、構文クラス不定 = 判定不能クラスの宣言。t536 / t537 が固定 |
| FR-7(再実行可能な記録) | 充足 | `evidence/README.md` の再実行手順。述語スクリプトは repo 内に置いた |
| NFR-1(決定性) | 充足 | 2 回実行の byte-identical テスト + ネットワーク/LLM 非 import の静的 assert |
| NFR-2(fail-closed) | 充足 | 語彙外・解決失敗・source 不在はすべて赤。空出力を「一致」と解釈しない |
| NFR-3(実行時間) | 充足 | 既存 patch gate と同一ステップ内。閾値は観測データがないため置かない |
| NFR-4(検証劇場の禁止) | 充足 | 全フィールド消費の fixture テスト + 「宣言が実在すること」を別テストで固定 |

### FR-3 の扱い(申告)

FR-3(`reason` の記述規約化と `判定不能` 0 件)は、実装過程の実測により**受け入れ基準が
両立不能**と判明し、ユーザー裁定で撤回された。経緯は `code-generation-plan.md` の
「契約再改訂」「契約最終確定」に記録済み。要約すると:

- 前置クラス宣言のみを読む抽出器は、現行 `一致` エントリ(前置宣言の保有は実測 0 件)を
  `判定不能` へ落とす。宣言を足せば FR-3 AC(3)違反、足さなければ AC(2)を満たせない
- 5 クラス中 2 つ(`spawn-only` / `unmeasurable-other`)は宣言だけで通り、AST 検証が効かない。
  書き換え後にこの 2 つが多数を占めるとガードが実質何も検査しない状態になる

FR-6 が求める 2 クラスの検出は、`reason` 面から `selector.class` 面へ写像して充足している。

## 達成されないこと(明記)

`tests/README.md` と `evidence/README.md` に記載済み。

1. 全 616 件の意味的照合の自動化 — ゲートが検査するのは宣言済み 4 件のみ(ラチェット)
2. `spawn-only` の到達性の機械検証 — 到達性は構文の性質ではない
3. `reason` の主題抽出を要する転位の自動検出 — 4 回の設計試行が実測で否定

**分離先の Issue(Step 8)**:

- **#2901** — 上記 1〜3(`selector.class` 未宣言エントリの意味照合をどこまで自動化するか)。P3
- **#2900** — `expiry`(解除条件)の意味整合の棚卸し。P2。requirements.md Out of scope が
  「別 Issue へ分離する。起票は construction までに行い、Issue 番号は construction の記録側へ残す」
  と定めた分離先であり、承認済み requirements.md は書き戻していない

## §12a レビュー後の是正(iteration 1、verdict READY)

reviewer(`amadeus-architecture-reviewer-agent`)が MAJOR 1 件を捕捉した。conductor が実測で追認し是正済み。

- **MAJOR(是正済み)**: `evidence/ci-wiring.md` がガードの所属ジョブを `coverage` と誤記していた。実測
  (`grep -nE "^  [a-z-]+:" .github/workflows/ci.yml`)では `:471-477` の Patch coverage gate ステップは
  `coverage-head`(`:428`)の内側で、`coverage`(`:573`)は別ジョブ。blocking 性自体は成立している —
  `coverage` が `needs: coverage-head` を持ち、先頭ステップ `test "${{ needs.coverage-head.result }}" = success`
  (`:583-586`)が既定シェル `bash -e` の下で結果を assert するため赤が伝播する。`ci-wiring.md` と PR 本文の
  両方を訂正した(`cid:code-generation:same-root-inventory`)
- **FOLLOW-UP(conductor が閉包)**: FR-3 撤回のユーザー承認の実在は reviewer の read scope 外だった。
  audit シャードの実測で当該時間帯に `HUMAN_TURN` 18 件(seq 226-259、2026-08-11T15:20Z〜16:15Z)を確認し、
  plan の「契約改訂」3 段が記録する裁定の時間窓と一致する。裁定文そのものの正本は
  `code-generation-plan.md` の当該節である
- **NIT(不採用)**: FR-6 の 2 クラスが同一コードパス(`validSemanticSelector` の拒否)を 2 通りに解釈している
  という指摘。t536 の 2 テストで区別しており実害がないため、記録のみとする

## 変更ファイル

**正本**

| ファイル | 変更 |
|---|---|
| `tests/coverage-patch-gate.ts` | `selector.class` の型と fail-closed parse、AST クラス述語、`findSyntaxClassMismatches` を `runCheck` へ配線 |
| `tests/allowlist-semantic-audit.ts` | 三値監査を advisory として残置。ゲートが読まないことを冒頭に明記 |
| `tests/.coverage-patch-allowlist.json` | 転位 18 件の是正(張り直し 11 / 削除 7)。623 → 616 件 |
| `tests/README.md` | `selector.class` の意味・閉語彙・ラチェット、達成されないことの明記 |

**テスト**

| ファイル | 内容 |
|---|---|
| `tests/unit/t534-allowlist-semantic-audit.test.ts` | zero-token 欠陥の回帰(`} catch {` が `catch-arm` へ分類される) |
| `tests/unit/t536-allowlist-declared-class.test.ts`(新規) | 閉語彙の受理/拒否、判定できないクラスの拒否、決定性、非 import の静的 assert |
| `tests/integration/t537-allowlist-declared-class.integration.test.ts`(新規) | `runCheck` 経由の 4 面 + 実台帳スイープ + 宣言実在の固定 |
| `tests/integration/t535-allowlist-semantic-audit.integration.test.ts` | 件数の追従 |

**記録**: `evidence/` 配下 11 ファイル(述語スクリプト 4 + 記録 6 + 分類結果 JSON 1)

## 検証(Step 9)

`evidence/verification.md` に全コマンドの exit code と出力要点を記録。すべて 1 コマンドずつ
直書きで実行し exit code を個別に読んだ。

- `bun run typecheck` = 0 / `bun run lint` = 0 / `bun run build` = 0(追跡ファイル不変)
- `bun run coverage:ci` = 0(`Failed assertions: 0`)
- `bun tests/coverage-patch-gate.ts --check` = 0(`allowlisted: 0, uncovered: 0`)
- `bash tests/run-tests.sh --ci` = 0
- 制御バイト走査 = TAB/LF/CR 以外の C0 と DEL は 0 件

**patch gate は自分の追加行にも効いた**。1 回目は自変更 4 行が uncovered で赤になり、
allowlist へ逃がさずテスト追加と過剰防御の削除で解消した。最終状態の `allowlisted` は 0 —
新設ガードのために新しい免除を 1 件も足していない。

フルスイート 1 回目の赤(4 files / 18 assertions)は全件が `timed out after 30000ms` で
assertion 失敗 0 件。3 点対照(並行負荷あり / 単独実行 / 負荷なし再実行)で負荷起因と帰属した。
**証拠の限界**: 3 点はいずれも変更後ツリー上の観測であり、変更前コミットを同一負荷で回す対照は
取っていない。状況証拠として当該 4 ファイルは本変更の diff に含まれない。
