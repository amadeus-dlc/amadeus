# Code Summary — U3 `subagent-stats`(集計 CLI)

**上流入力(consumes 全数)**: `code-generation-plan.md`(Steps 1〜9)/ `functional-design/`(BR-U3-1〜8・domain-entities 不変条件1〜5)/ `nfr-design/` / `inception/units-generation/unit-of-work.md`(§U3)/ `inception/requirements-analysis/requirements.md`(FR-4・AC-3・AC-6・NFR-1〜4)/ `inception/application-design/decisions.md`(ADR-5・ADR-6)

## 作成・変更ファイル

| ファイル | 種別 | 内容 |
|---|---|---|
| `packages/framework/core/tools/amadeus-subagent-stats.ts` | 新設(〜370行・コメント込み) | C-7 集計 CLI。export 純関数 `composeStatsReport` / `renderStatsText` / `serializeStatsReport` + 走査 seam `scanAuditCorpus` + `main`(BR-U3-8) |
| `tests/unit/t460-subagent-stats-compose.test.ts` | 新設 | 純関数層の in-process テスト 16 件 |
| `tests/integration/t461-subagent-stats.integration.test.ts` | 新設 | 実 FS / CLI spawn / corpus sweep テスト 9 件 |
| `tests/.coverage-registry.json` | 再生成(差分ゼロ) | `bun tests/gen-coverage-registry.ts` 実行。t451/t452 と同様、claims は列挙単位に join せず registry は不変(`--check` exit 0) |

## 主要な実装判断

- **verdict 決定(BR-U3-3)**: `Type Verdict` 属性が4値 union に適合すれば記録時 verdict を採用(append-only の読み側 — audit 行を改変しない)。union 非適合は再分類へ落とし `verdictMismatchCount` に計上。属性なしの旧行は `normalizeAgentType` と同じ trim + `"unknown"` fallback を集計側で適用してから U1 の `classifyAgentType` で分類(不変条件3 の全域性)。属性値と再分類の食い違いは常に計数し注記行へ。
- **model 軸(ADR-5 の読み side)**: `Model` 属性が存在かつ非空白なら `byModel` へ、それ以外は `unresolvedModelCount` へ(不変条件4: `unresolvedModelCount + Σ byModel = completedTotal` を t460/t461 で固定)。`Model` のみで `Model Source` 欠落の対欠落行は Model 側のみ計上し、差分は導出値として `renderStatsText` が注記行「model/source asymmetry」を出す(専用フィールドを追加しない — domain-entities 不変条件4 注記どおり)。
- **COMPLETED 単独タリー(ADR-6)**: `SUBAGENT_STARTED` は `startedTotal` に併記するのみで verdict バケツに入れない。`composeSubagentLifetimes` は使わない。イベント判定は両スキーマ(v1 `event` / v2 `attributes.Event`)を正規化した上での**等値比較**(grep 部分一致の偽陽性回避 — fixture に `SUBAGENT_COMPLETED` を本文に含む `WORKFLOW_STARTED` 行を混ぜて固定)。
- **fail-open / fail-loud / fail-closed の3分類**(エラーモデル表・訂正注記): 行の JSON parse 失敗は skip + `parseSkippedCount`(fail-open、件数を隠さない)。実在シャードの読取失敗は `unreadableShardCount` に計上して走査続行 + path を stderr + **exit 非0**(fail-loud — 観測宇宙の欠けた集計を完全と誤読させない)。未知フラグ・不正 `--space` は Usage 付き loud エラー exit 2(fail-closed)。audit dir 不在は正常系の 0 件レポート。
- **warnings の役割分担(BR-U3-5)**: 許可集合解決の warnings 本文は stderr へ(`advisory:` 接頭辞 — hook と同一様式)、レポートには `allowedSetWarnings` として保持し件数を注記行へ。
- **属性値の出力サニタイズ(security-design「属性値の出力サニタイズ」/ §12a iteration 2 BLOCKER の是正)**: `agentType` / `model` / `modelSource` は audit 由来の任意文字列。除去点は **render のみ** — `renderStatsText` が U1 `amadeus-subagent-observability.ts` の export する `sanitizeAdvisoryValue`(先頭行への縮約 + 制御文字除去)を通してから描画する。compose は生値を保持(集計キーを表示都合で変えない)、`--json` も生値のまま(JSON エンコードが構造を守り、機械消費側は生値を要する)。供給元を observability に置くことで stats → observability の一方向依存に載り、`amadeus-lib.ts` 非依存と両立する。t460 に「制御文字が描画テキストへ到達しない」「改行による行偽造が成立しない」「compose 側は生値のまま」の3点を固定。
- **依存方向**: `amadeus-lib.ts` へは依存しない(FD の依存方向固定)。import は U1 の `amadeus-subagent-observability.ts` と `amadeus-harness.ts`(node builtins のみに依存)だけ。`resolveProjectDir` / active-space cursor の2つの小さな様式は lib と同じ規則で local に mirror(コードコメントに明記)。`normalizeType` も `normalizeAgentType` と逐語同一の規則を local mirror。
- **測定 ref(FR-4b / NFR-3)**: 出力冒頭に測定時刻(ISO 8601)・scanScope(space 名 + 走査 glob)・シャード数・イベント総数を必ず印字。全数値は実際に読んだ行からの計数のみ(検証劇場 Forbidden)。

## テスト coverage と AC 対応

テスト戦略: Comprehensive(self-feature スコープ)— unit 18 件 + integration 9 件、計 27 件・541 expect、全 green(t451/t452 含む 4 ファイル 50 件でも green)。※ unit は §12a レビューの FOLLOW-UP 是正でサニタイズ実証 2 件を追加(16 → 18)。

- **AC-3(corpus sweep 両側実証)**: t461「AC-3 corpus sweep」3 件で固定。
  - (0) `packages/framework/core/agents/*.md` の frontmatter `name:` 全数と組込台帳7エントリの衝突ゼロを機械確認(空配列 assert)。**パス等価性の前提**: requirements FR-1a が persona の正本と呼ぶのは `.claude/agents/*.md` だが、そちらは `packages/framework/core/agents/*.md` を promote:self が投影したもので、両者はトークン置換のため**バイト一致ではない**。一致するのは許可集合の根拠である frontmatter `name:` であり、実測で 14 件完全一致(`diff <(grep -h '^name:' packages/framework/core/agents/*.md | sort) <(grep -h '^name:' .claude/agents/*.md | sort)` が空)。オラクル側が core を読むのは、self-install 済みかどうかに許可集合を依存させないための意図的選択(t461 のコメントに明記)。したがって build 同期が遅れても `name:` 集合は同一であり (0) の検証対象は正しい。
  - (i) 許可集合内の観測型に警告分類(`unknown-type` / `outside-allowed-set`)を持つ byType 行がゼロ — warnable 行は全て `unknown` または集合外の型。
  - (ii) CLI `--json` の verdict 計数が**被検 CLI を経由しない独立オラクル**(テスト内の独自 shard walker + U1 `classifyAgentType`)の機械再計算値と完全一致(`byVerdict` 全4キーと `completedTotal` の等値 assert)。sweep は実 corpus の byte スナップショット(測定時点コピー)に対して実行 — 走査中の追記 race を排除しつつ実 corpus 全数を対象化。
- **AC-6(測定 ref + unresolved 区分)**: t460(renderStatsText のヘッダ/注記行/空 corpus)+ t461(実出力に ISO 時刻・scanScope・completed 総数・`unresolved` 区分を assert)。fixture JSON でも不変条件3/4 を wire shape 上で検証。
- **落ちる実証**: t461 で集合外行(`adhoc-injected`)を注入し `outside-allowed-set` 計数が 1→2 に増えることを実測。
- **検証コマンド**: `bun test tests/unit/t451-subagent-type-classify.test.ts tests/integration/t452-subagent-observability.integration.test.ts tests/unit/t460-subagent-stats-compose.test.ts tests/integration/t461-subagent-stats.integration.test.ts` → 50 pass / 0 fail。`bun run typecheck` / `bun run lint`(新規 error なし — cognitive-complexity warning は既存 baseline と同種)/ `bun tests/complexity-gate.ts --check`(OK — 0 new violations; composeStatsReport CCN 14 / scanAuditCorpus CCN 11)/ `bun tests/gen-coverage-registry.ts --check`(exit 0)。

## R-2 再計測の実演(BR-U3-7)— 実出力からの転記

測定時刻 2026-08-06T03:08:25Z、対象は本 worktree の space `default` 全 intent・216 シャード(audit は移動値 — requirements 訂正時点の 974 から増大している。増分は当 intent の Bolt 実行自体を含む):

```
events:  6870 completed / 61 started
verdicts:  persona 1668 / builtin 766 / unknown-type 3735 / outside-allowed-set 701
型別上位:  unknown 3735 [unknown-type] / amadeus-architecture-reviewer-agent 948 [persona]
          / default 541 [builtin] / amadeus-developer-agent 414 [persona]
          / amadeus-product-lead-agent 174 [persona] / amadeus-architect-agent 112 [persona]
models:    6870 (unresolved)   ← Model 属性を持つ行ゼロ(U2 未着地の読み側挙動 = ADR-5 の unresolved バケツ)
notes:     parse-skip 0 / verdict-mismatch 0 / allowed-set warnings 0 / unreadable shards 0
```

両側実証の読み方: 許可集合内の観測型(persona 10種 + 組込 7種 = 17種が当時点で観測)への警告分類はゼロ、警告対象 4,436 件(unknown-type 3,735 + outside 701)は全て警告バケツに計上。独立オラクル再計算との完全一致は t461 がスナップショット上で固定(上記 AC-3 (ii))。

## 逸脱・判断メモ

- **corpus sweep をスナップショットに対して実行**: FD の文言は「実 audit corpus 全数」。走査中に当 intent の監査 shard へ追記が続く(live 稼働中のため)と CLI と独立オラクルの読取時点がずれて flake するため、測定時点の byte コピーを作り CLI・オラクル双方が同一 byte を読む形にした。対象は実 corpus 全数のまま(移動値の時点固定は FR-4b の測定 ref の精神と一致)。加えて live corpus への直接実行を R-2 実演として上記に転記。
- **`Model` 空文字は unresolved 側に計上**: domain-entities の文言は「`Model` 属性があれば」だが、空文字は情報を持たず ADR-5 が禁じる捏造既定値に近いため、trim 後空は unresolved に落とした(実 corpus・U2 書込規約の下では両解釈は一致する。防御的分岐)。
- **coverage registry は差分ゼロ**: t461 の covers claim を当初 `function:main` と書いたところ lib 側の列挙単位 `function:main` へ誤 join したため、`function:scanAuditCorpus`(列挙対象外 — t451/t452 と同じく join しない慣行 claim)へ修正して再生成。registry への実登録は発生しない(t451/t452 と同一の帰結)。
- 規模: 実装はコメント込み 〜370行(見積 〜120行はロジック行の目安 — エラーモデル3分類・両スキーマ正規化・text renderer 5節で増分。ロジック自体は compose/scan/render の3関数に収斂)。
