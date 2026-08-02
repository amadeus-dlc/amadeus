# Domain Entities — vocab-canonicalization

上流入力(consumes 全数): requirements.md

- `requirements.md`: FR-1(正本確立)/ FR-2(機械生成)/ FR-3(供給)/ FR-5(drift guard)と OQ-1〜3 を本設計のエンティティ定義へ写した。宣言 consumes のうち unit-of-work.md / components.md / component-methods.md / services.md は本スコープ(units-generation / application-design SKIP)により設計上不在(expected: true)— ステージ本文のフォールバックに従い、本書がエンティティ定義の起点となる(不在成果物の内容は捏造しない)

## E-1: CanonicalGlossary(正本)

- 実体: `docs/guide/glossary.md`(EN)+ `docs/guide/glossary.ja.md`(JA)の1ペア
- 構造: `| **<Term>** | <Definition> |` の表。JA 行は `| **<Term>(<和訳>)** | <定義> |` — **英語キー `<Term>` が EN/JA 行ペアの機械照合キー**(RE 実測: 現行57/57語で成立)
- 吸収後の内容(FR-1b): 現57語 + §9 固有6語 + docs/reference 固有4語 + self-* 4語 + domain-language.md のチーム固有語彙(仕分けは OQ-4/CG)。FR-1c の矛盾解消(Unit of Work / Guardrail / Scope 外延)は正本の定義文に対して行う
- JA 固有の `## 表記規則` 節は用語表とは別クラスとして維持(EN/JA 集合一致の照合対象外 — FR-5a (i))

## E-2: ProjectionManifest(投影宣言)

- 実体: 正本 EN ファイル内の **fenced YAML ブロック**(用語表の後、`## Projection Manifest` 節)
- 様式(ADR-1、business-logic-model.md 参照):

```yaml
projections:
  protocol:      # stage-protocol.md §9 の subset
    terms: [aidlc, agent, artifact, bolt, ...]
  reference:     # docs/reference/04-stage-protocol{.md,.ja.md} Terminology の subset
    terms: [aidlc, agent, artifact, bolt, approval-gate, inline-stage, subagent-stage, lead-agent, ...]
  knowledge:     # core knowledge 供給コピー(全語)
    terms: all
```

- キーは英語 Term の kebab-case 正規化(生成器が正規化を所有)。`terms: all` は全語集合
- 未知の projection 名・正本に存在しない term キー・重複キーは生成器が **loud reject**(NFR-2)

## E-3: ProjectionSurfaces(投影面)

| 面 | 実体 | 生成範囲 | トークン形 |
|---|---|---|---|
| S-1 knowledge 供給コピー | `packages/framework/core/knowledge/amadeus-shared/glossary.md` (新規・生成物) | ファイル全体(GENERATED ヘッダ+全語表。EN のみ — 実行文脈の作業言語は英語) | `{{HARNESS_DIR}}`(package.ts transform が解決) |
| S-2 protocol §9 | `packages/framework/core/amadeus-common/protocols/stage-protocol.md` の `## 9. Terminology` 節 | **マーカー区間のみ差替**(`<!-- glossary:projection:begin/end -->`) | `{{HARNESS_DIR}}` |
| S-3 reference EN | `docs/reference/04-stage-protocol.md` の Terminology Glossary 節 | マーカー区間のみ差替 | `<harness-dir>` リテラル |
| S-4 reference JA | `docs/reference/04-stage-protocol.ja.md` の同節 | マーカー区間のみ差替(JA 定義は正本 JA 行から) | `<harness-dir>` リテラル |

- S-1 は coreDirs(manifest `knowledge` エントリ)の既存投影で 7 dist + 5 self-install へ流れる(FR-3b、13ファイル同期)
- S-2〜S-4 は「ファイル内の生成区間」— ファイル自体は手書き文書のまま、区間だけが generator 所有(区間外への手書き編集は自由)

## E-4: GlossaryProjector(生成器)

- 実体: `scripts/glossary-projection.ts`(新規)。verbs: `write`(S-1〜S-4 を正本から再生成)/ `check`(再生成結果と committed 実体の byte-diff、差分あれば exit 1)
- 先例: `amadeus-runner-gen.ts` の write/check 型(RE 実測の家風)。決定性(NFR-1)・fail-closed(NFR-2)
- 変換規則(BR-4): 正本の定義文はトークン中立の `<harness-dir>` 形で保持し、S-1/S-2 への投影時に `{{HARNESS_DIR}}` へ機械置換(逆方向は禁止)

## E-5: VocabDriftGuard(検証ゲート)

- 実体: `tests/integration/t413-glossary-projection.integration.test.ts`(新規)
- 検査: (i) EN/JA 語集合一致(英語キー) (ii) `glossary-projection.ts check` の green(S-1〜S-4 の drift) (iii) 独立定義の禁止走査(旧面の不在: domain-language.md / CONTEXT.md、正典自称の残存) (iv) symlink・ポインタのみ md 不在 (v) slo-sli-patterns.md の非衝突(FR-5c)

## E-6: RetiredSurfaces(削除対象)

- `amadeus/spaces/default/knowledge/amadeus-shared/domain-language.md`(消費者 `.coderabbit.yaml:83` を正本パスへ差替 — FR-4a)
- `CONTEXT.md`(参照ゼロ — FR-4b)
