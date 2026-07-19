上流入力(consumes 全数): business-logic-model.md, business-rules.md, requirements.md, technology-stack.md

本書は codekb `technology-stack.md` を現行スタックの正本として消費し、`business-logic-model.md`・`business-rules.md`・`requirements.md` と U3 質問票の人間回答(A/A/A)を技術選択へ反映する。

# 技術スタック決定 — U3 移設選定台帳と層別カバレッジ整合計画

本 intent は設計・計画までである。実移設、classifier 変更、runner 変更、層別 lcov、CI 配線、強制ゲート、#1157 の実装は行わない。

## TECH-1: TypeScript/ESM + Bun の既存スタックを維持する

- 言語は TypeScript(ESM)、runtime と package manager は Bun を維持する。
- 型検査は既存 `tsc --noEmit`、lint は Biome、テストは `bun:test` と `tests/run-tests.ts` / `tests/run-tests.sh` を使う。
- Git と repository 内 markdown/audit を追跡面として使い、DB、cache、queue、cloud SDK、外部 SaaS、常駐 daemon、新しい runtime dependency を追加しない。
- 本ステージは markdown 成果物だけを生成し、`packages/`、`scripts/`、`tests/`、`dist/`、self-install、CI workflow を変更しない。

## TECH-2: 既存の分類・台帳型を再利用する

将来実装は次の既存資産を唯一の定義点として再利用する。

| 既存資産 | 用途 | 禁止する重複 |
| --- | --- | --- |
| `TestSize` / `SIZE_ORDER` | small/medium/large と大小比較 | 別の size union・序数を作らない |
| `SizeClassification` / `classifyTestSize` | measured と signals の導出 | U3 専用 regex 分類器を作らない |
| `Tier` / `NamedTier` | 開いた台帳 tier と4つの規約対象 tier | harness/lib を NamedTier へ暗黙昇格しない |
| `SizeLedger` | 442件を固定せず再生成可能な入力 | 候補数や signal 数をコードへハードコードしない |

既存 functional design の signal 主体2区分は、質問 Q1 の回答 A によりエビデンス優先の2段判定へ精密化する。最終状態は `seam-to-small`、`retier-to-integration`、`retier-to-e2e`、`classification-review` の4種とし、根拠不足を既定 remediation へ fallback させない。

判定入力は次の versioned 契約とする。実装時は同等の判別ユニオン/readonly 構造で表し、裸の自由記述を分岐条件にしない。

```text
CandidateEvidence {
  schemaVersion: 1
  observedRef: string
  file: repository-relative-path
  signals: SignalEvidence[]
}
SignalEvidence {
  signal: filesystem | spawn | network | timer
  locator: repository-relative-source-locator
  fact: short-falsifiable-summary
  disposition: seam-removable | behavior-essential | lexical-false-positive | unknown
}
```

各 emitted signal は同一 file/ref の `SignalEvidence` でちょうど1回覆う。欠落・重複・矛盾は入力 failure とする。valid input の決定表は次の順で閉じる。

| 条件 | final state |
| --- | --- |
| `unknown` または `lexical-false-positive` が1件以上 | `classification-review` |
| `behavior-essential` な network が1件以上 | `retier-to-e2e` |
| `behavior-essential` な network はなく、`behavior-essential` な spawn/timer が1件以上 | `retier-to-integration` |
| 全 non-small signal が `seam-removable` | `seam-to-small` |
| 上記以外（例: 本質的 filesystem） | `classification-review` |

`classification-review` は独立 `reviewQueue` に置き、file の case-sensitive code-unit 昇順で並べる。確定 remediation は `migrationQueue` に置き、`seam-to-small = rank 0`、両 retier = rank 1、同順位は normalized repository 相対 file 昇順とする。これにより既決の seam-first / retier-second を維持し、未決だった retier 間の優劣を発明しない。review queue が空になるまで計画全体は閉包済みではない。

## TECH-3: CoverageTierBinding を4 NamedTier + ledgerKeys[]へ精密化する

質問 Q2 の回答 A に従い、coverage binding は4 NamedTier ごとに1件とし、単一 `ledgerKey` を非ゼロキーの `ledgerKeys[]` へ置き換える。配列要素は U1 matrix の既存 `${tier}_${size}` キーから導出し、同一 tier の全 size キーを欠落なく保持する。

harness/lib は U1 台帳に残すが、標準 runner 外なので binding は生成せず N/A とする。`Tier` の開放性は維持し、coverage 対象だけを `NamedTier` に閉じる。

## TECH-4: coveragePath は状態として PENDING を表現する

質問 Q3 の回答 A に従い、存在しない per-tier path の文字列を発明しない。path 存在状態と CI 参加状態は、同時に保持できる直交した2フィールドとする。

```text
PathState = existing(path) | pending(owner) | not-applicable(reason)
CiParticipation = executed | not-executed | not-applicable
```

4 NamedTier binding は `pathState` と `ciParticipation` を両方持つ。unit/integration/smoke は `pending + executed`、e2e は `pending + not-executed` とする。現行 combined `coverage/lcov.info` は binding 外の `existing` 観測として保持する。harness/lib は binding を生成せず、補助 tier 観測で `not-applicable + not-applicable` とする。`existing` だけが path 値を持ち、`pending` は follow-up owner、`not-applicable` は反証可能な理由を必須にする。

具体的な per-tier path 名、出力形式、CI job、exit code は follow-up の要件・設計で人間確認後に決める。

## TECH-5: 変更対象と所有境界

- 本 intent: 5つの NFR 文書と質問回答の記録のみ。
- 後続の移設 intent: 163件を再生成した候補台帳の実移設、seam 化、retier、classifier/source 修正、再測定。
- 新規 follow-up Issue/intent: per-tier lcov path、runner/coverage 配線、必要なゲートの設計と実装。
- 閉鎖済み Issue #683: 既存の project/patch coverage gate の完了範囲を維持し、本 intent から再オープン・責務追加しない。

後方互換 shim、二重実装、先行 adapter、未消費の装飾フィールドを追加しない。
