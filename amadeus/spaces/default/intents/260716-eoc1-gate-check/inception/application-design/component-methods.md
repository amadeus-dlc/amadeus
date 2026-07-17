# Component Methods — eoc1-gate-check(application design)

## 上流入力(consumes 全数)

`../requirements-analysis/requirements.md`(FR-1〜5)、`../refined-mockups/mockups.md`(M-1〜M-3 確定契約)、`../reverse-engineering/scan-notes.md`(挿入面台帳)、`../user-stories/stories.md`(US-1〜3)、codekb `architecture.md` / `component-inventory.md`(エンジン tool 内部のみの feature と非交差 — 参照非該当、code-structure「gate-start 検査挿入面」節を正とする)。

## 設計(functional-domain-modeling-ts 準拠 — 純関数+判別ユニオン)

### amadeus-lib.ts(共有述語 — export)

```
export type QuestionsEvidence =
  | { kind: "pass"; reason: "no-file" | "no-answer-tag" | "answer-blank" | "evidence-present" }
  | { kind: "fail"; reason: "no-evidence" | "unparseable-timestamp" };

export function checkQuestionsEvidence(questionsPath: string): QuestionsEvidence
```

- 読み取り専用・純関数(fs 読みのみ)。判別ユニオンで pass/fail と理由を型で運ぶ(parse-don't-validate)
- 判定順: ファイル不在 → pass(no-file)/ [Answer] タグ grep 0 → pass(no-answer-tag、E-OC1 0問様式)/ **blank 判定(決定的規則)** → pass(answer-blank)/ 記入あり → E-code(`/E-[A-Z0-9][A-Z0-9-]*/`)or 承認 ts 行(「承認」を含む行から ISO 8601 を抽出し **Date.parse で数値検証** — verification-numeric-parse)→ あれば pass(evidence-present)、承認行はあるが parse 不能 → fail(unparseable-timestamp)、どちらも無し → fail(no-evidence)
- **blank の決定的規則**(reviewer Critical 是正 — 実データ採取): タグ後コンテンツ(trim 済み)が (a) 空 (b) `N/A`(大小無視) (c) **全体が1つの丸括弧グループ**(`(...)` / `(...)` — 裁定待ちプレースホルダの実様式: 260712 実測 `- [Answer]: (AH-Q0 選挙の裁定受領後に記入 — cid:election-answer-after-ruling)`、「(なし)」もこの形)のいずれか。実回答の実様式は非括弧書き(260712 実測 `[Answer]: A` 等)。**誤分類の非対称性を意図的に設計**: 括弧書きの実回答が blank 誤判定されても pass 側(偽陽性拒否を作らない — ガードの目的は「証跡なき記入の検出」であり、括弧書き回答+証跡なしを見逃すのは fail-open だが、その形は実 corpus に0件で、検出強度より偽陽性ゼロを優先する裁定済みトレードオフ)
- **机上トレース(AC-1a 3形+実データ)**: `(AH-Q0 …記入 — cid:…)` → 規則(c) blank pass ✓ / `[Answer]: A` +承認行 → evidence-present pass ✓ / `[Answer]: A` +証跡なし → fail(no-evidence)✓ / 0問様式(タグ不在)→ pass ✓ / ファイル不在 → pass ✓

### amadeus-state.ts(配線)

handleGateStart: validateSlugInState 直後に
```
const ev = checkQuestionsEvidence(questionsPathFor(pd, stage.phase, slug));
if (ev.kind === "fail") error(<M-1 or M-2 文言>);
```
- questionsPathFor は stage 解決(既存 lookup)から `<record>/<phase>/<slug>/<slug>-questions.md` を構成(ハードコード列挙なし — AC-2b)
- fail 時 error() = exit 1・**STAGE_AWAITING_APPROVAL 非 emit**・checkbox 非遷移(ERROR_LOGGED 監査行は emitError 既存挙動どおり記録される — lib :5169-5178 実測。mockups.md M-1/M-2 の限定と一致、citation-semantics-check 照合: phase-boundary ガード(state :146-163)と同一 fail-closed 意味論)

## 対称性(symmetric-pair-review)

- 検査(read)⇔ 記入(write= conductor 手作業)の対: 検査は書き込み側を持たない(読み取り専用)— 片側実装だが意図的(ガードは観測のみ)
- pass 4理由 ⇔ fail 2理由: M-3 の3形+evidence-present / M-1・M-2 と1:1

## テスト設計(AC-3 → 実装)

- unit(in-process): checkQuestionsEvidence を fixture 直駆動 — pass 4形+fail 2形の6ケース+境界(裁定待ち文言バリエーション)。fixture は実データ様式(260712 系タグ形+本 intent 0問様式)から採取
- integration(spawn): gate-start 統合 — 注入(i)(ii) 拒否+正常系通過の3本(M-1/M-2 文言・exit code・非遷移を assert)
