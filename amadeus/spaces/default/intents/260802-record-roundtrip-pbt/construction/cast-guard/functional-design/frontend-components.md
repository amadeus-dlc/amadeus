# Frontend Components — cast-guard (#1980 / AD U4)

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md(参照実体は本文各節+末尾の上流参照補足。設計裁定の引用元として decisions.md / unit-of-work-dependency.md も併読した — 宣言外の追加入力)

測定 ref: **worktree HEAD `c8702be09`**(`git diff --stat 5a6f79727..HEAD -- packages/framework/core/tools/ packages/framework/core/otel/ tests/ .github/workflows/ scripts/` は出力 0 行 = 差分ゼロ)。

## N/A — 本 unit は UI を持たない

本 unit(cast-guard)に UI コンポーネントは存在しない。components.md `U4`(:37-43)が定める所在は `tests/` 配下のガード本体・allowlist JSON・そのガード自身のテストのみで、画面・ビュー・コンポーネント階層を持つ成果物は含まれない。unit-of-work.md の Unit 一覧(:13)も本 unit の種別を「test tooling 365〜480行」と規定し、対応 FR を requirements.md `FR-3a〜3c`(:29-31)に限定している。当該 FR はいずれも CI 上で走る静的ガードの検出述語・台帳・落ちる実証を要求するもので、利用者が対話する面を要求しない。requirements.md 全体を通じても UI に関する FR は存在せず(FR-1〜FR-7 はコア改修・PBT・静的ガード・CI ジョブ・文書台帳)、decisions.md の ADR-1〜4 にも UI の裁定はない。unit-of-work-dependency.md(:41)が本 unit を batch 3 の CI 系ワークフロー変更として位置づけていることも同じ性格を示す。したがって本書は engine の produces 実在検査を満たす薄い書として、UI の代わりに**利用者が実際に触れる面 = CLI の出力契約**を記録する。

## 代替の出力契約(UI の代わりに人間が読む面)

本 unit の「画面」に相当するのは、CI ジョブログと開発者の端末に出る**文言と exit code** である。契約は unit-of-work.md :31 が本 unit の実装制約として確定した S1 出力契約(AD 原典は services.md S1)であり、そこへ兄弟様式 `tests/callsite-guard.ts` の実装事実を照合して確定する。詳細な規則は business-rules.md § D、状態モデルは business-logic-model.md §5 にある。

### verdict × exit code

| verdict | 条件 | ストリームと文言 | exit |
| --- | --- | --- | --- |
| **OK** | 新規サイトなし(全 (file, kind) で実測 ≤ 台帳) | **stdout**: 残存レポート(`… N unchecked cast(s) remaining across M file(s)` + ファイル別内訳)+ `unchecked-cast guard: OK — 0 new casts, N remaining (shrink-only)` | **0** |
| **OK(縮小検知)** | 上記かつ実測 < 台帳の entry が1件以上 | **stdout**: 上記に加え `unchecked-cast guard: K allowlist entr(ies) now over-count — prune with --update:` と該当行 | **0** |
| **NEW_CAST** | いずれかの (file, kind) で実測 > 台帳 | **stderr**: `UNCHECKED CAST GUARD FAILED [NEW_CAST]:` と違反行(`<file>: <kind> — allowlist <a>, measured <m>`)+ 是正案内 | **1** |
| **ALLOWLIST_UNREADABLE** | 台帳が不在 / 不正 JSON / `direction !== "shrink-only"` / `sites` 非オブジェクト | **stderr**: `UNCHECKED CAST GUARD FAILED [ALLOWLIST_UNREADABLE]:` + 再生成コマンド案内 | **1**(fail-closed) |
| **使用法エラー** | 未知の引数 | **stderr**: usage | **2** |
| **UNEXPECTED** | 上記いずれでもない実行時例外 | **stderr**: `UNCHECKED CAST GUARD FAILED [UNEXPECTED]: <message>` | **1** |

exit code の値域は `{0, 1, 2}` で、6 終端状態からの写像は全射(0←2 / 1←3 / 2←1)。未定義の終端は無い(business-logic-model.md §5 の個数照合)。

引用元 `tests/callsite-guard.ts` との照合(`cid:application-design:citation-semantics-check`): 同ファイルは `fail(code, lines)`(`:295-296` 実文 `function fail(code: string, lines: readonly string[]): number {` / `  console.error(\`CALLSITE GUARD FAILED [${code}]:\`);`)で 1 を返し、台帳不読も同じ 1(`:334`)、未知引数は 2(`:378-379` 実文 `    console.error(USAGE);` / `    return 2;`)、想定外例外は 1(`:381-382`)である。本 unit はこの4方針をそのまま継承し、**相違は見出し語(`CALLSITE GUARD` → `UNCHECKED CAST GUARD`)とコード名(`NEW_CALLSITE` → `NEW_CAST`)のみ**である。component-methods.md :205 も引用元との「相違なし」を確認済み。

### 起動形(利用者が打つ文字列)

```
bun tests/unchecked-cast-guard.ts --check                   # ゲート実行(既定)
bun tests/unchecked-cast-guard.ts --update                  # allowlist を再走査から書き直す
bun tests/unchecked-cast-guard.ts --check --report <path>   # 残存レポートを JSON で併出力
```

兄弟の使用法コメント(`tests/callsite-guard.ts:34-36` 実文 `//   bun tests/callsite-guard.ts --check           # CI gate (exit 1 on a new site)` ほか)と同じ3動詞・同じ並びを採り、新しい CLI 文法は発明しない。

### 出力の設計上の要点

- **残存レポートは verdict によらず毎回出す**(business-rules.md BR-CG-28)。ゼロへの歩みが常に CI ログに残る形を、兄弟 `:279-280` 実文 `// The residual report BR-9 keeps visible on every run: the same shape all the` / `// way down to zero sites, so the U8 deletion gate reads one format.` と同じ意図で採る。
- **数値はすべて走査由来**(BR-CG-30)。文言に埋め込む残存数・違反数は census から機械計算した値のみで、定数を書かない。
- **正常系は stdout、失敗系は stderr**(BR-CG-31)。CI ログでの視認性と、`--report` の JSON 出力(機械可読面)を人間向け出力から分離する。
- **`--report` の JSON** は `ResidualReport`(domain-entities.md §3.4 — `generatedAt` / `total` / `byFile`)を `JSON.stringify(…, null, 2)` で書く。これは UI ではなく後続ツール向けの機械可読面である。

### 表示面のない領域(明示)

- 進捗表示・対話プロンプト・色付け・TTY 判定は持たない。1回の走査と1回の判定で終わる非対話プロセスである。
- Web/TUI のいずれの面も持たないため、アクセシビリティ・レスポンシブ・テーマ対応の設計項目は該当しない。
- 本 unit の成果物は `tests/` 配下のみで dist へ投影されないため、ハーネス別の表示差も生じない(business-rules.md BR-CG-49)。

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段3(バリデータ非経由の読み戻し経路新設の CI 機械ブロック)に対応する。
