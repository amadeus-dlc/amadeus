# Domain Entities — docs-drift-repair (functional-design)

上流入力(consumes 全数): requirements.md (注: stage 宣言の他 consumes — unit-of-work / components / component-methods / services — は amadeus-document スコープが units-generation / application-design を SKIP するため設計上不在(engine directive でも expected-absent)。degrade 構成の documented fallback として requirements.md 単独を上流とする)

依拠箇所: 対象文書の母集団・乖離クラスタ・受け入れ基準はすべて requirements.md(FR-1〜FR-7、NFR-1〜4)から継承。件数・file:line は RA 起草時の直接実測(測定 ref: HEAD `aabc0527d`)の転記であり、CG 着手時に origin/main 前進(PR #1572 マージ等)を踏まえて再接地する(cid:code-generation:base-advance-regrounding)。

## エンティティ1: 対象文書コーパス

| 区分 | 実測値(ref: aabc0527d) | 備考 |
|---|---|---|
| ルート README | 2(README.md / README.ja.md) | 対訳ペア完備 |
| docs/*.md 総数 | 197(EN 100 / JA 97) | `find docs -name '*.md'` 転記 |
| 非対訳 EN | 3 | guide 2件は FR-5 で対訳新規、research 1件は対象外(裁定済み) |
| 孤児 JA | 0 | 維持条件(FR-5 受け入れ基準) |

対象外領域: `amadeus/` workspace 文書、`.claude/` 等 framework 内部文書、`docs/research/`(凍結記録)。

## エンティティ2: 乖離レコード(乖離目録の1行)

乖離目録(FR-6c)の正規形。フィールド:

- `id`: 連番(D-001 形式)
- `所在`: file:line(検出時実測)
- `記述`: 乖離している記述の verbatim 断片
- `真実源`: 実装側の根拠(file:line または ls/grep コマンドと出力)
- `クラス`: count-stale(件数陳腐化)/ enum-missing(列挙欠落)/ pair-drift(EN/JA 乖離)/ pair-missing(対訳欠落)/ semantic(意味論乖離)/ impl-bug(実装側欠陥 → Issue 経路)
- `処置`: 修正コミット参照 または Issue 番号(閉包規則は business-rules.md BR-5)

## エンティティ3: 修正対象クラスタ(requirements からの継承)

| クラスタ | 対象ファイル | 起因 | PR |
|---|---|---|---|
| A: README Kimi 欠落 | README.md / README.ja.md | #1522(Kimi ハーネス追加) | PR-1 |
| B: 19-plugins 投影面 | docs/guide/19-plugins.md / .ja.md | #1522 | PR-1 |
| C: hook EN/JA 乖離 | FR-3d の8ファイル(JA 側)+ 06-hooks-and-tools.md(EN) | #1554(12番目 hook) | PR-2 |
| D: 既存乖離 | 01-architecture.md:60 / .ja.md:60 ほか FR-6 検出分 | 区間外(pre-existing) | PR-2 |
| E: 対訳新規 | team-messaging.ja.md / publishing-setup.ja.md(新規) | 対訳欠落 | PR-2 |

## エンティティ4: 真実源インベントリ(照合の右辺)

| 真実源 | 取得コマンド | 消費するクラスタ |
|---|---|---|
| ハーネス集合(7) | `ls packages/framework/harness/` | A, B |
| 投影面配列(7/5) | `scripts/plugin-projection.ts` の PACKAGE_HARNESSES / SELF_INSTALL_HARNESSES(実配列の転記) | B |
| hook 集合(12) | `ls .claude/hooks/amadeus-*.ts` ほか正本 `packages/framework/core/hooks/` | C |
| agent ファイル集合(14 = domain 11 + reviewer 2 + composer 1) | `ls packages/framework/core/agents/` | D |
| CLI コマンド・パス | 各ツールの実在(`ls .claude/tools/`)と README/guide の記述照合 | FR-6 全域 |

## エンティティ5: EN/JA 対応写像

- 規則: `<name>.md` ⇔ `<name>.ja.md`(同一ディレクトリ)。写像の全域検査は `find docs -name '*.md'` の集合差で機械導出する(FR-5/FR-7 受け入れ基準の実行形)
- 例外: `docs/research/` 配下は写像対象外(裁定済み)

テキストフォールバック: 本書は図を含まない。上表がエンティティ間の関係(コーパス ⊃ クラスタ、乖離レコード → 真実源参照、EN/JA 写像)のすべてである。
