# code-summary — Bolt FR-6(#848 docs-only の workspace_requires 免除経路の再接地)

- PR: https://github.com/amadeus-dlc/amadeus/pull/881
- ブランチ: `bolt/848-docs-only-exemption`(origin/main = 60f5e1edf #879 上に rebase 済み)
- コミット: `fix(state): restore docs-only workspace_requires exemption (declare-docs-only / GUARD_EXEMPTED) (#848)`

## 変更(正本 = packages/framework/core、dist/self-install 7面同期済み)

- `amadeus-lib.ts`: `IntentRegistryEntry.docsOnly?: {evidence}` 追加 / `setIntentDocsOnly`(唯一の書き込み口、非空 evidence 必須、`recordDirMatches` 照合、`writeFileAtomic`)/ `docsOnlyDeclaration`(読み側、空/欠落 evidence は null)を export。
- `amadeus-state.ts`: `declare-docs-only` subcommand dispatch + Valid 一覧追記 / `verifyDocsOnlyEvidence`(形式検査 + `findAllEvents`/`auditField` で audit 実在照合)/ `handleDeclareDocsOnly`(export、`withAuditLock` 内、matched=false を error 昇格)/ `verifyStageArtifacts` の workspace_requires 分岐を「宣言あり→`GUARD_EXEMPTED` emit / なし→従来 error(免除案内追記)」へ。
- `amadeus-audit.ts`: `GUARD_EXEMPTED` を VALID_EVENT_TYPES(Stage lifecycle)+ EVENT_HEADINGS に登録。件数コメント 71→73。
- `knowledge/amadeus-shared/audit-format.md`: header 71→73、Stage Lifecycle 6→7、GUARD_EXEMPTED 行追加。
- `docs/reference/12-state-machine.md` + `.ja.md`: prose 71→73、Stage lifecycle 表へ GUARD_EXEMPTED 行(emitter=amadeus-state.ts)。
- テスト: `tests/integration/t215-docs-only-exemption.test.ts`(spawn 6ケース)、`tests/unit/t-docs-only-exemption-seam.test.ts`(in-process 12ケース)。event-count pin(t28/t81/t111)を 73 へ。`tests/.complexity-baseline.json`(main 30→31、anonymous ordinal 12→14 の attributable 分のみ)、`tests/.coverage-registry.json` / `.coverage-ratchet.json` 再生成、`tests/unit/gen-coverage-registry.test.ts` の EXPECTED_NONE_TO_CLI に t215 追加。

## 実装上の適合判断(逸脱ではない)

- `verifyDocsOnlyEvidence` の approvalEvents Set は関数内 inline(module-top const は CLI dispatch の module-load 時 TDZ に触れるため — 元 B002 が文書化した罠)。
- whitespace split は `/\s+/` リテラルではなく `.split(" ").filter(Boolean)`。CLI --evidence は space 区切りであり、regex リテラルが complexity-gate の lizard TS lexer を desync させ関数境界を誤検出させる(実測: 誤検出で CCN 16→修正後 6)。
- in-body 説明コメントはモジュールスコープ(関数宣言直上)へ寄せた(bun-inbody-comment-da0 の codecov false-red 回避)。

## 落ちる実証

免除分岐を `const declaration = null;` に一時 revert → dist 再生成 → `t215` + `seam` の GUARD_EXEMPTED emit 断言が **2 fail**(approve/finalize rc≠0)→ 復元・再生成で **18 pass**。

## 閉包実測

#848 再現手順(docs-only code-generation を workspace 無作業で approve → 拒否 → declare-docs-only → approve 通過 + GUARD_EXEMPTED 記録)を t215 が verbatim 再現。ガード有効化(env SKIP を delete)で駆動し、免除が env bypass と独立(bypass は GUARD_EXEMPTED を emit しない)ことも実証。

## 同根棚卸し

write(setIntentDocsOnly)⇔read(docsOnlyDeclaration)、emit(GUARD_EXEMPTED)⇔terminal(audit.ts 登録 + audit-format + 12-state-machine EN/JA)の対称対を全数充足。workspace_requires 拒否点は verifyStageArtifacts 単一で全 completion 経路を1点カバー。c8ddabffc の #498/#501 部分はスコープ外(再設計/validator 消滅により消滅妥当)。

## 検証(exit code)

| ゲート | exit |
|---|---|
| typecheck | 0 |
| lint (Biome) | 0 |
| dist:check | 0 |
| promote:self:check | 0 |
| complexity-gate --check | 0 |
| gen-coverage-registry --check | 0(fresh/guards/ratchet green) |
| run-tests.sh --ci(post-rebase) | 0(Failed files: 0) |
| push 前 lcov(新規 core 行 in-process 被覆) | DA:0 = 0 |

## 逸脱

なし。承認済み要件(FR-6)・元契約(c8ddabffc B002)からの逸脱なし。実装前停止を要する事象は発生せず。

## 追記: #881 codecov missing 13行の最終分類(builder read-only トリアージ、CI lcov artifact 8249077551 / SHA 63f00537c 直読)

conductor の当初報告「全13行 = 単一 spawn-only 構造クラス」を以下のとおり精密化(waiver 妥当という結論は不変):

- **Class A(4行: :386-388, :391)** — CLI dispatch 配線。main() の import.meta.main guard により in-process 未到達。park/unpark/delegate 等の既存全 case 行も CI lcov で DA:0(コードベース共通の構造クラス、既存分は carryforward で緑・新規のみ patch に乗る)。真の spawn-only = waiver 妥当。#788 同様の argv パラメタ化 + seam 駆動で計測可能(将来の waiver 回避代替)。
- **Class B(9行: :583/:593/:620/:1093-1095/:1097-1098/:1100)** — 多行 error() 文字列の継続行。seam の error 分岐駆動で**実行済み**だが、bun は多行式の DA を先頭行のみ stamp し継続行を DA:0 に残す計測アーティファクト(bun-inbody-comment-da0 の多行文字列引数版)。単一行 collapse(挙動不変)で解消可能 — 真の被覆ギャップではない。
- ローカル DA:0=0 申告が偽陰性だった原因: チェック行範囲に dispatch 行を含めず、継続行はローカル lcov で DA エントリ absent(未計測)だったため。
