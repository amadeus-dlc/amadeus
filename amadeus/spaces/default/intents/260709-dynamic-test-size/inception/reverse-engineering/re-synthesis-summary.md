# Reverse-Engineering 合成サマリ — 260709-dynamic-test-size(#699 / #684 Phase D)

- **手法**: diff-refresh(project.md 是正 cid:reverse-engineering:c1)。Developer スキャン(`developer-scan.md`)を受けた Architect 合成。
- **base**: `9a2f5c72`(前 intent `260709-pbt-small-band` の observed。本 intent に prior re-scan 記録なし → 直近 observed を採用)。**observed**: `24197d755`(現 HEAD 実測)。
- **差分の実質**: 5ファイルのみ(#721/#722 由来、fast-check 導入 + t92 test-44 skip ガード)で **#699 フォーカス面への影響ゼロ**。フォーカス面は現行コード直読で file:line 確定。

## 更新した成果物(5件)

| 成果物 | 更新内容 |
|---|---|
| `code-quality-assessment.md` | 先頭に「本 intent(dynamic-test-size)の観測面」4節を新設。#699-O1 永続化経路不在(wall-clock は `run-tests.ts:724/762`・root JUnit `time` で既測、`.meta` に DURATION 有り、だが `aggregateTierResults:430` で全削除・非 verbose は logDir ごと消滅 → JSON/registry 永続化ゼロ)/ #699-O2 合流点と隔離契約(`printSizeMatrix:895-948` は duration 非消費、`SizeClassification` 出力形状は安定契約、exit-code `try/catch:882-886` 隔離)/ #699-O3 t112 copy 伝播(`:91-94`)と registry 直交 / #699-O4 CI(ubuntu-latest・size 専用 artifact 未設置)。ヘッダポインタも更新。 |
| `architecture.md` | テストピラミッド節に「ランナー計測ライフサイクルと #699 Phase D の結合点」を追補(静的分類層 / per-file 計測層 / 静的レポート層の3層構造 + t112 copy・registry・CI のアーキテクチャ制約)。 |
| `technology-stack.md` | fast-check `^4.9.0` を devDependencies 追加として反映(テスト専用、production/配布物 非関与)。 |
| `code-structure.md` | 新規 PBT 2ファイル(`tests/helpers/arbitraries/semver.ts`・`tests/unit/setup-semver.pbt.test.ts`)+ 新規ディレクトリ `tests/helpers/arbitraries/` を目録追記。t92 test-44 skip ガード(M)も記載。 |
| `reverse-engineering-timestamp.md` | 鮮度ポインタを本 intent メタデータで last-writer-wins 更新。前 intent 節は参照用に温存。 |

新規: `re-scans/260709-dynamic-test-size.md`(per-intent base/observed/focus の真実源、#707 契約)。

## 温存した成果物(4件)と理由

- `api-documentation.md` — リリース/`package.ts --check` 契約に #699 の影響なし。
- `business-overview.md` — ビジネス面不変。
- `component-inventory.md` — 差分5ファイルは新規 PBT テストのみでコンポーネント目録(production tree)不変。
- `dependencies.md` — 依存マニフェスト変更は fast-check のみで technology-stack へ集約反映、依存構造図に影響なし。

## #699 実装に効く主要所見(要点)

1. **wall-clock は既に測れているが永続化経路が無い** — `.meta` は集約後に削除(`run-tests.ts:430`)、非 verbose は logDir ごと消滅。#699 は新規永続化(JSON アーティファクト等)の新設が必須。
2. **`SizeClassification` 出力形状は後方安定契約**(`test-size.ts:42-45`, L10-14) — 動的観測はこの形状を壊さず"重ねる"。
3. **`printSizeMatrix` は静的分類のみで duration 非消費** — 自然な合流点ではない。exit-code 隔離(`:882-886`)は動的計測追加時も踏襲必須(t112 が exit 契約を固定)。
4. **run-tests.ts の新 static import は t112 copy リスト(`t112.serial.test.ts:91-94`, `REAL_SIZE`)へ伝播必須** — 漏れると scratch runner ロード不能で t112 破損。
5. **CI は ubuntu-latest 確定・coverage artifact upload 既存だが size/duration 専用 artifact 未設置**。coverage registry は `covers:` join 軸で size/duration と直交 → レジストリ化は別アーティファクト新設が現実的。macOS DTrace SIP-blocked を継承し動的バックエンド選定は要検証。
