# code-summary — Bolt FR-4 / Issue #840

## 変更概要
`detectWorkspace` の言語走査を `SCAN_SOURCE_DIRS` 限定から、SCAN_EXCLUDE・ドット始まり・symlink・非 dir を除く全トップレベル dir へ一般化。走査ロジックを `countLangsInTopDirs` ヘルパーへ抽出(complexity ratchet 保全 + in-process seam 化)。

### 触れたファイル(surgical)
- `packages/framework/core/tools/amadeus-utility.ts`(正本): `countLangsInTopDirs` を新設(export)、`detectWorkspace` の SCAN_SOURCE_DIRS 走査ループを呼び出しへ置換。
- `dist/{claude,codex,kiro,kiro-ide}/**`・`.claude/`・`.codex/`(生成物): `bun scripts/package.ts` + `bun run promote:self` で同一コミット同期。
- `tests/unit/t211-workspace-scan-generalize.test.ts`(新規): in-process seam テスト4件。
- `tests/.coverage-registry.json`: `subcommand:amadeus-utility:init` の coveredBy に t211(mechanism=none)を追記(regen)。

## 契約同等性(元修正 765fe4f20 / #459 と同等)
- SCAN_EXCLUDE(`topSet` が :1924 でフィルタ済み)+ ドット始まり除外 + symlink 除外 + 深さ6 を維持。
- 元修正の `for (const entry of topSet)` 反復と同一構造。差異は (i) 正本が `.agents/...` → `packages/framework/core/...` へ移動 (ii) ループをヘルパー関数へ抽出(挙動不変)の2点のみ。
- 元修正が同梱していた `dev-scripts/evals/workspace-detect/check.ts`(旧レイアウトの TDD eval)+ `package.json` の test:it:all 結線は、現行レイアウトに `dev-scripts/evals/` が存在しない(restart で消失)ため、現行 `tests/` 構造の in-process テスト t211 で代替。

## 現行適合点
- `hasAppSourceDir`(:2005、`SCAN_SOURCE_DIRS.some(...)`)は言語走査と独立した brownfield 存在信号であり、本修正対象外(e4 クロスレビューで確認済み)。不変。

## 落ちる実証
dist の呼び出しを旧 `SCAN_SOURCE_DIRS` ループへ一時 revert → t211 case 1(packages/-only)が `Expected "Brownfield" / Received "Greenfield"` で RED を実測。core から再生成し GREEN 復帰を確認(リファクタ後の形でも再実証済み)。

## 閉包実測(#840 症状の非再現)
Issue #840 の症状(ソースが `packages/` 等の非定型 dir のみ・他 brownfield 信号なし → Greenfield/Unknown 誤判定)を verbatim 再現する fixture(case 1)で、修正後 `projectType="Brownfield"` + `languages` に TypeScript 検出を実測。誤判定の非再現を確認。

## 同根棚卸し
`SCAN_SOURCE_DIRS` 参照は core 内3箇所のみ: :1762(定義)、:1950 相当(コメント)、:2005(`hasAppSourceDir` = 独立した存在信号、対象外)。言語走査での限定利用は本修正で解消。他の走査箇所なし。

## 検証(全 exit code = 0)
| 検証 | exit |
|---|---|
| typecheck | 0 |
| lint | 0 |
| dist:check | 0 |
| promote:self:check | 0 |
| complexity-gate --check | 0(detectWorkspace CCN 19 維持) |
| gen-coverage-registry --check | 0 |
| t211(新規4件)+ t20/t70/t71/t203 関連 | pass |
| push 前 lcov(diff 追加行未カバー) | 0 |

## codecov 追対応(#867/#869 着地後の rebase + PM1-1 false-red 解消)
- origin/main が3コミット先行(#869/#867/#868)したため origin/main へ rebase(交差ファイル0・clean)。
- rebase 後 codecov/patch が 94.44%(missing = core `amadeus-utility.ts` の `countLangsInTopDirs` 内 catch 閉じ `}` 行)。原因は PM1-1 と同種の構造的 false-red: bun --coverage の load-only チャンクが bare `}` を DA:0 で stamp し、実行チャンクが再 stamp しない。
- 対応: `catch { continue; }` を単一行化し bare `}` 行を消去(挙動不変)。あわせて本体内 standalone コメントを排除し、rationale をモジュールスコープ(関数宣言直上)へ集約(PM1-1 = bun-inbody-comment-da0 順守)。t211 case 4(phantom entry)が単一行 catch を DA>0 で貫通。
- マージ lcov 実測(t211+t20+t70+t71+t203)で helper 全 diff 追加行 DA:0 = 0 を確認。

## 逸脱
なし。要件(差分再接地・契約同等性宣言)どおり。codecov false-red 解消は挙動不変のリファクタで、契約(全トップレベル dir 走査)に影響なし。
