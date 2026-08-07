# Code Summary — U1 detection-skeleton

**上流入力(consumes 全数)**: `unit-of-work`(U1 完了条件 AC-1/AC-2・fail-open テスト)/ `requirements`(FR-1/FR-2・NFR-1〜4)/ `business-logic-model` / `business-rules`(BR-U1-1〜8)/ `domain-entities` / `logical-components` / `security-design` / `unit-of-work-story-map` / `code-generation-plan`(本書の計画対照面)

**測定 ref**: observed `7060956c5617125dd2f4e284957aa180cb306484`(実装は origin/main 上の3コミット — 下記)

## ファイルの作成・変更(3 コミット全数)

### `9730cda6c` feat(observability): classify subagent agent types against the allowed set

| ファイル | 種別 | 内容 |
|---|---|---|
| `packages/framework/core/tools/amadeus-subagent-observability.ts` | 新設(85 行) | C-4 台帳 `BUILTIN_AGENT_TYPES`(7 エントリ・count-free・origin コメント付き・`unknown` 意図的除外)、`TypeVerdict` 4 値 union、`isWarnableVerdict`、`classifyAgentType`(C-2 純関数・BR-U1-1 の先勝ち判定順)、`sanitizeAdvisoryValue`(C0 除去 + 1行化) |
| `tests/unit/t451-subagent-type-classify.test.ts` | 新設(127 行・13 テスト) | AC-1 の in-process 固定 — 4 verdict 全分岐、判定順の不変条件(unknown 注入耐性・builtin 先勝ち・空 allowed)、ケーシング対照、台帳内容、sanitize 3 件 |

### `54c2117e1` feat(observability): derive the persona half of the allowed set from agent definitions

| ファイル | 種別 | 内容 |
|---|---|---|
| `packages/framework/core/tools/amadeus-subagent-observability.ts` | 拡張(+56 行) | `AllowedSetResolution` / `resolveAllowedAgentTypes`(C-1)— frontmatter `name:` の機械導出 + 台帳合成。dir 不在・読取失敗・name 無しは `warnings` に積み台帳のみで続行、**throw しない** |
| `tests/integration/t452-subagent-observability.integration.test.ts` | 新設(104 行) | 実 FS 経由の許可集合解決: 正常系 / name 無し skip / 非 md 除外 / dir 不在 fail-open |

### `7667586f9` feat(hooks): record the subagent type verdict on SUBAGENT_COMPLETED

| ファイル | 種別 | 内容 |
|---|---|---|
| `packages/framework/core/hooks/amadeus-log-subagent.ts` | 拡張(+33 行) | C-5 completed 半面 — `normalizeAgentType`(`:50`)直後に `typeVerdictFor` を差し込み。警告対象 verdict で stderr advisory 1行、`fields` へ `"Type Verdict"` 追加。catch は null を返す終端 catch — null なら属性スキップで emit 継続 |
| `packages/framework/core/otel/event-registry.ts` | 変更(+4/-1 行) | C-6 U1 半面 — `SUBAGENT_COMPLETED` optionalAttributes へ `"Type Verdict"` 追加(required 不変・STARTED 側は U2 範囲) |
| `tests/integration/t452-subagent-observability.integration.test.ts` | 拡張(+158 行) | completed hook 経由の AC-2 落ちる実証 + 通る実証 + fail-open(下記「テストカバレッジ」) |
| `tests/.coverage-registry.json` | 再生成(+4 行) | 新設 integration ファイルを `hook:amadeus-log-subagent` の coverer へ登録(freshness ratchet) |

## 主要な実装判断(設計裁定への紐付け)

1. **警告面 = registry optional 属性 + stderr advisory の二面(ADR-1)**: verdict は audit 行の `Type Verdict` 属性(事後の機械集計用)と stderr 1行(セッション運転者への即時シグナル — story-map 検出ジャーニー)の両方に出す。advisory は stderr のみで audit を汚染しない。fail-closed 拒否はしない(FR-2b・#2279 代替案2の非採用)
2. **完全一致・7エントリ count-free 台帳(ADR-2)**: 組込型はハーネス内にあり repo から observable でないため手保守台帳。`Explore` / `explore` のケーシング差は別値として併記。`unknown`(normalizeAgentType の fallback)は台帳に入れない — FR-2b の警告対象そのものであり、RE の観測タリー8種が fallback を混数したものとコメントで明記
3. **fail-open の一方向遮断(NFR-3 / BR-U1-3)**: 照合・解決・属性組立のどの throw も emit を止めない。C-1 は never-throw 設計(warnings 縮退)、hook 側は catch → stderr 警告 → 属性スキップ → 既存フィールドで emit 継続。無音失敗は禁止(catch 経路は必ず stderr へ)
4. **registry は optional 追加のみ(NFR-4 / BR-U1-5)**: required・既存属性・STARTED 側は不変。既存 audit 行の遡及書換なし(append-only 保護)
5. **判定順は builtin 先勝ち(BR-U1-1)**: `unknown` verbatim を先頭に判定し(台帳・persona 側の誤収載でも型未指定は必ず警告対象 — 不変条件2)、台帳を persona 合成集合より先に照合することで AD の3フィールド署名を保存したまま persona/builtin を区別(FD iteration 1 BLOCKER の是正設計をそのまま実装)
6. **終端 catch によるセンサス保護**: 分類をトップレベル try ではなく `null` を返す関数内 catch に閉じ込め、no-silent-drop センサスの基準カウント(213)を増やさない(コミットメッセージ記載どおり)
7. **依存方向の固定**: 新設モジュールは `amadeus-lib.ts` を import しない(循環の構造的排除 — business-logic-model)。`CONTROL_CHARS` は共有せず複製(下位モジュールが上位を引けないため)
8. **hook 発火ごとの再読・キャッシュなし(BR-U1-6)**: `.claude/agents/` の読取規模上限は不問とする判断(logical-components が code-generation 段へ明示引き継ぎ)を受け、十数ファイル規模の dir を発火ごとに読む実装のまま上限機構は設けなかった

## テストカバレッジ

戦略: **Comprehensive(self-feature スコープ)** — unit + integration 両層が必須で、両方が存在する。

- **実測**: `bun test tests/unit/t451-subagent-type-classify.test.ts tests/integration/t452-subagent-observability.integration.test.ts` → **23 pass / 0 fail / 77 expect()**(2026-08-06T02:32Z に本ブランチで再実測)
- **AC-1(純関数 in-process)** — t451 13 テスト: (i) persona 名が集合に入る(= `persona` verdict)(ii) 台帳組込型が入る(= `builtin`)(iii) 未知値が入らない(= `outside-allowed-set`)。加えて判定順の不変条件(台帳への `unknown` 注入でも `unknown-type` 優勝 / 同名衝突は `builtin` 優勝 / 空 allowed で台帳独立)、ケーシング(`Explore` ≠ `explore`)、台帳内容(7 エントリ・`unknown` 非含有)、sanitize 3 件
- **AC-2(落ちる実証)** — t452「an ad-hoc type warns on stderr and records outside-allowed-set (AC-2)」: 集合外型の completed payload を hook 経由で流し、stderr advisory の発火と audit 行の `Type Verdict: outside-allowed-set` を実測
- **通る実証(誤検知ゼロの片側)** — t452: persona 型・builtin 型で警告ゼロ + 正しい verdict 記録
- **fail-open(completed 面の完了条件)** — t452: dir 不在で warnings 縮退・throw なし(resolver 層)、agents dir 不在でも emit 成功(hook 層)、型未指定は `unknown-type` で警告、改行混入値でも advisory は1行
- **カバレッジ設定**: `tests/.coverage-registry.json` を再生成し t452 を `hook:amadeus-log-subagent` の coverer に登録(freshness ratchet 充足)

## 計画からの逸脱

1. **salvage 由来の事後記録(最大の逸脱)**: 実装は先行セッションの swarm ワーカーが隔離 bolt worktree 内で完了させていたが、merge-back とステージ成果物(本3ファイル)は未生成のまま放置されていた。conductor が3コミットを本ブランチへ cherry-pick し、本セッションが記録成果物のみを事後作成した — code-generation-plan.md の全チェックボックスが `[x]` なのはこのためで、プランは「これからやる手順」ではなく「実行された手順の忠実な記録」として書いた
2. **`bun run build` が前提(NFR-1 parity の実地確認)**: cherry-pick 直後の trunk では dist が古く、t452 は hook の再生成前 dist を読むためテストが通らなかった。trunk で `bun run build` を実行して dist を再生成した後に 23 pass を確認。dist はビルド産物であり本 Unit の変更としては計上しない
3. **ステップ→ストーリーの代替写像**: `inception/user-stories/` が存在しないため、トレーサビリティは FR/AC + story-map ジャーニーへ写した(プラン「トレーサビリティの対応付け方針」節に記録)
4. **それ以外の逸脱なし**: 実装範囲・判定順・サニタイズ水準・fail-open 構造は FD/BR の設計契約どおり。TDD(BR-U1-8)は salvage のため逐次 Red→Green の実況記録は残らないが、テストが実装と同一コミット単位で同梱されており vertical slice 単位(純関数層→解決層→配線層)はコミット境界と一致する

## 残課題・後続 Unit への引き継ぎ

- `SUBAGENT_STARTED` 側の optional 追加と started 面配線は U2 の範囲(BR-U1-5 どおり U1 は completed 単面で出荷)
- corpus sweep 両側実証(AC-3)は U3 の完了条件 — U1 はテスト面(AC-1/AC-2)のみで誤検知ゼロの根拠を持つ(story-map リリース刻みどおり)
- 組込型と同名 persona の衝突確認(U3 BR-U3-6)は U3 で機械確認予定
