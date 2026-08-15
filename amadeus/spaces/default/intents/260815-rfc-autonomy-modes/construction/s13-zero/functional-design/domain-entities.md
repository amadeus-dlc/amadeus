# Domain Entities — unit s13-zero

## 本 unit が所有する型

```ts
// component-methods.md C10 のシグネチャを refine — SurfaceOutput への digest 追加を明示
interface SurfaceOutput {                    // 既存型(amadeus-learnings.ts:114-121)への拡張
  schema_version: 1;
  stage_slug: string;
  phase: string;
  memory_entries_total: number;
  candidates: SurfaceCandidate[];
  parked_open_questions: SurfaceParkedQuestion[];
  surfaceDigest: string;                      // 新設 — candidates + parked_open_questions から算出
}

type ZeroReceipt = { readonly kind: "zero"; readonly surfaceDigest: string; readonly confirmedAt: string };
type NotZero = { readonly kind: "not-zero"; readonly candidateCount: number };
confirmZeroCandidates(surfaceOutput: SurfaceOutput): ZeroReceipt | NotZero;

type EvidenceRefusal =
  | { readonly kind: "evidence-path-missing"; readonly path: string }
  | { readonly kind: "evidence-mismatch"; readonly path: string; readonly reason: string };
type AugmentedCandidateSet = { readonly candidates: readonly SurfaceCandidate[]; readonly addedFrom: readonly string[] };
addConductorCandidate(
  candidate: SurfaceCandidate,
  diskEvidencePath: string,
): { readonly ok: true; readonly value: AugmentedCandidateSet } | { readonly ok: false; readonly error: EvidenceRefusal };
```

## 再利用する既存型(refine しない)

- `SurfaceCandidate`(`amadeus-learnings.ts:100-107`)— `id` / `source_heading` / `ts` / `summary` / `context` / `default_scope` はそのまま。追加候補もこの型に適合させる(conductor 発の候補も既存候補と同一の表現で扱う)。
- `SurfaceParkedQuestion`(:109-112)— open questions は候補化しない既存契約を維持(digest 算出対象には含めるが `confirmZeroCandidates` の候補数判定には含めない)。

## 不変条件

- `surfaceDigest` は `candidates` と `parked_open_questions` の内容のみから決定的に算出される(実行時刻や呼出元には依存しない)— 同一 memory.md 断面からの再実行は同一 digest を返す。
- `ZeroReceipt` は `candidates.length === 0` の場合にのみ構築可能(型レベルで「候補ありの 0 件確定」を表現不能にする — parse-don't-validate)。
- `addConductorCandidate` は既存候補集合を単調増加させるのみ — 呼出後の `candidates.length` は呼出前以上。

## 意図的に NOT モデル化するもの

- 選定裁定そのもの(構造化質問・選挙)の内部ロジック — 本 unit は「発火するか否か」の入力(`ZeroReceipt` の有無)のみを提供し、選定裁定の実装(既存 stage-protocol.md 手順3)には立ち入らない。
- `surfaceDigest` のアルゴリズム選択(sha256 か既存 `autonomyDigest` ユーティリティの再利用か)は code-generation の実装選択に委ねる — 本書は「決定的で内容依存」という性質のみを契約する。
- 追加候補の disk 証跡の正当性判定方式(完全一致/部分文字列/意味照合)— Q2 の [Answer] のとおり code-generation へ委譲。
