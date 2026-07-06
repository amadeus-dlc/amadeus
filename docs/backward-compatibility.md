# Backward Compatibility

このファイルは `.agents/rules/backward-compatibility.md` が定める互換性維持対象の台帳である。
ここに記載のない構造、入口、成果物名、配置は互換性維持対象ではない。
`amadeus-validator` は、Intent record の検証時にこのファイルを参照する。
`aidlc/spaces/<space>/intents/<dirName>/` の形式で記載された record は、AmadeusValidator の現行（v2 事前適応、以下「旧形式」）検査を維持する。
記載のない record ディレクトリには、v2 契約検査（`.claude/amadeus-common/stages/` の frontmatter `produces:` から導出した必須成果物、`verification/phase-check-<phase>.md`、`audit/*.md` shard の存在検査）を適用する。

## 対象

- 対象: `aidlc/spaces/default/intents/260703-aidlc-v2-full-compliance/`
- 対象: `aidlc/spaces/default/intents/260703-amadeus-skill-english-rollout-plan/`
- 対象: `aidlc/spaces/default/intents/260704-v2-parity-completion/`

## 維持理由

- `260703-aidlc-v2-full-compliance` と `260703-amadeus-skill-english-rollout-plan` は完了済み（Status: Completed）の record である。
- 完了済みの record は、生成当時の成果物契約のまま保持する方針（D007、`260703-aidlc-v2-full-compliance` の決定）に従い、書き換えない。
- `260704-v2-parity-completion` は本 Intent 自身の進行中 record である。
- `260704-v2-parity-completion` は、旧エンジン（現行 skill 群）で生成した成果物と、新エンジン導入後に生成される v2 契約成果物が混在する移行期の hybrid 形式である。
- 3 record とも、v2 契約検査（frontmatter 由来の必須成果物、`verification/phase-check-<phase>.md`、`audit/*.md` shard）をそのまま適用すると、旧形式の実成果物と整合しない。

## 終了条件

- 3 record とも、歴史記録として恒久的に維持し、削除や新形式への移行を行わない。
- `AmadeusValidator` の旧形式検査（`checkCompletedArtifacts` のハードコード済み `stageCatalog` に基づく必須成果物検査、`audit/audit.md` 単一 shard 前提の audit 検査）が退役し、v2 契約検査へ一本化された場合は、3 record を検査対象から除外する（validator の実行対象外へ移行する）。
- その場合も、この一覧と維持理由は削除せず、退役した経緯の記録として残す。

## Lint 許可リスト（no-stub-compat）

`lints/no-stub-compat` は、後方互換層・stub の兆候を検出する rule である（Issue #528）。
この節の表だけを機械可読の許可リストとして解析する（他の節の散文は対象外）。
対象 glob は `Bun.Glob` で照合し、brace 展開（`{a,b}`）で `skills/` と `.agents/skills/` の二重コピーを 1 行に圧縮する。
維持理由・終了条件が空の行は宣言として無効であり、検出結果は fail のまま残る。

| 対象（glob） | カテゴリ | 維持理由 | 終了条件 |
|---|---|---|---|
| {skills,.agents/skills}/amadeus-validator/validator/AmadeusValidator.ts | compat-symbol | 宣言済み旧形式 record 3 件（本ファイル冒頭の「対象」節）の互換検査を実装するための `legacy` / `legacyFiles` / `legacyDirectories` である。 | `AmadeusValidator` の旧形式検査（本ファイル冒頭の「終了条件」節）が退役した時点。 |
| {skills,.agents/skills}/amadeus-validator/validator/*.ts | compat-comment | 宣言済み旧形式 record の互換検査、および registry status `in-flight` の互換許容（Issue #455）を説明するコメントである。 | 上記と同じく `AmadeusValidator` の旧形式検査が退役した時点、および Issue #455 の互換許容が解消した時点。 |
| dev-scripts/evals/{amadeus-templates,amadeus-validator}/check.ts | compat-symbol | 上記の宣言済み互換対象を検査する eval fixture のための変数名である。 | 対応する `AmadeusValidator.ts` の compat-symbol 宣言が終了する時点。 |
| dev-scripts/evals/{doctor-drops,engine-gap-trio,amadeus-validator}/check.ts | compat-comment | 宣言済みの互換挙動（drops なし出力、マルチ Per unit の後方互換、registry status `in-flight` の後方互換 = Issue #455）を検査する eval の説明コメントである。 | 対応する実装側の互換許容が解消した時点。 |
