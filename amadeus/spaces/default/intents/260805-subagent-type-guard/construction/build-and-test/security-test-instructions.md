# Security Test Instructions — Issue #2279

**上流入力**: 3 Unit の `security-design.md` / `code-summary.md`、requirements の
CON-1(transcript 非接触)と NFR-3(fail-open)

本 Intent は**ネットワーク送出・資格情報・暗号化対象を持たない**(ローカル FS 読取と
既存 audit emit への optional 属性追加のみ)。したがって DAST・認証テスト・
インジェクション(SQL/コマンド)テストは該当しない。統制の焦点は
**信頼境界外の文字列の取り扱い**と**監査経路の完全性**である。

## 脅威モデル(設計から導出)

| 入力 | 由来 | 信頼 |
|---|---|---|
| `agent_type` | ハーネス payload | 外部・任意文字列 |
| `payload.model` / `tool_input.model` | ハーネス payload | 外部・任意文字列 |
| persona frontmatter `name:` / `model:` | repo 管理 | 宣言値 |
| audit 行(集計 CLI の入力) | 自リポジトリだが**信頼境界外**として扱う | 任意文字列 |

## 検査項目と実行

```bash
bun test tests/unit/t451-subagent-type-classify.test.ts \
         tests/unit/t460-subagent-stats-compose.test.ts \
         tests/integration/t452-subagent-observability.integration.test.ts \
         tests/integration/t454-subagent-model-attribution.integration.test.ts
```

### 1. 出力サニタイズ(ターミナル汚染・ログ行偽造)

- **stderr advisory**(U1): 集合外 `agentType` は `sanitizeAdvisoryValue` で
  1 行化 + 制御文字除去してから埋め込む。`t451` が sanitize 単体を、`t452` が
  「改行混入値でも advisory は 1 行」を実測。
- **集計 CLI の text 出力**(U3): `agentType` / `model` / `modelSource` は
  `renderStatsText` で同ヘルパを通す。`t460` が (i) 制御文字が描画テキストへ
  到達しないこと (ii) 改行による行偽造が成立しないこと (iii) compose 側は生値の
  ままであること、の 3 点を固定。
  **注**: この統制は §12a レビューの follow-up で実装欠落が判明し、本ステージ前に
  是正済み(commit `131600b11`)。回帰させないこと。

### 2. 値空間の閉鎖(注入面の消去)

- `Type Verdict` は 4 値 union のみを書く。payload 由来の生値を属性値にしない。
- `Model Source` は `harness` / `request` / `pin` の 3 値のみ。`unresolved` は
  **属性を書かない**ことで表現し、`"unknown"` 等のプレースホルダを発明しない。
- 集計側は union 非適合値を集計キーにせず再分類へ落とす。

### 3. path traversal の排除

- persona の引き当ては frontmatter `name:` の完全一致で行い、**basename 決め打ちを
  禁止**する。`agentType` を path 構成に使わないため traversal の余地が構造的に無い。
  `t454` が「basename ≠ `name:`」の対照ケースで固定。
- (本ステージで追加された pi ドライバの persona slug も同じ原則: slug 形を
  `/^amadeus-[a-z0-9]+(-[a-z0-9]+)*-agent$/` に閉じ、`tests/unit/t-pi-driver-contract.test.ts`
  が traversal 系 7 パターンの拒否を固定。)

### 4. CON-1(transcript 非接触)

- 読むのは payload の `agent_type` / `model` / `tool_input.model` フィールドのみ。
  prompt・transcript・last_assistant_message の本文には触れない。
- 集計 CLI は audit 行の集計値・型名・model 名・警告理由のみを出力し、
  Request/Response 本文を読み書きしない。

### 5. 監査経路の完全性(fail-open の安全設計)

- 照合・解決・属性組立のいずれの throw も emit を止めない(NFR-3)。
  `t452` / `t454` が agents dir 不在での emit 継続を実測。
- **無音失敗の禁止**: catch 経路は必ず stderr へ出す。
- 既存 audit 行の遡及書換をしない(append-only)。registry は optional 追加のみ。

## リポジトリの静的ガード(SAST 相当)

本 Intent 固有ではないが、変更が通過すべきブロッキング集合。

```bash
bun run lint                          # biome(セキュリティ系 rule 含む)
bun tests/callsite-guard.ts --check   # レガシー呼出し面の shrink-only ratchet
bun run source-only:check             # 生成物が Git 境界を越えないこと
```

## 実測結果(本ステージ実行時)

| 項目 | 結果 |
|---|---|
| サニタイズ・値空間・traversal・CON-1・fail-open の全テスト | **73 pass / 0 fail**(#2279 対象 6 ファイル) |
| `bun run lint` | exit 0(エラー 0) |
| `bun tests/callsite-guard.ts --check` | OK — 0 new call sites, 0 remaining |
| `bun run source-only:check` | clean |
