# Security Design — cast-guard (#1980 / AD U4)

上流入力(consumes 全数): business-logic-model.md(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用。加えて decisions.md(ADR-1〜4)・components.md・component-methods.md も宣言外の追加入力として本文で file:line 引用している)

本書は business-logic-model.md §2(対象ドメイン = 「ディスク/外部から読んだ JSON を型の証明なしにドメイン値として名乗らせるキャスト」)・§5(状態モデルと exit code)・§6 I-2(fail-closed 全域性)・§12(非目標)に依拠する。宣言外の追加入力として同 unit の business-rules.md(BR-CG-18 / 25 / 34 / 45)と domain-entities.md §4(検証の所有)を併読した。

## 測定 ref

worktree HEAD **`26fc7ddb29228757d40e3d15d6d8c0513d505f63`**。performance-design.md 冒頭と同じ差分確認(`git diff --stat c8702be09..HEAD -- tests/ .github/workflows/ packages/framework/core/ scripts/` が出力 0 行 / exit 0)により、FD の file:line は HEAD で成立する。

## 1. 本 unit の security 面は二層ある — 混同しない

| 層 | 内容 | 本書での扱い |
| --- | --- | --- |
| (a) ガードが**守る**対象 | 信頼境界(ディスク上の JSON)で型の証明なしに値を受け入れる経路の再導入を機械的に抑止する | §2 |
| (b) ガード**自身**の攻撃面 | ガードは read-only の静的走査ツールであり、外部到達面・資格情報・ネットワークを持たない | §3〜§6 |

この2層を混ぜると「セキュリティ機構だから安全」という無根拠な断定になる。(a) は本 unit が生む正の効果、(b) は本 unit が持ち込むリスクであり、評価軸が別である。

## 2. ガードが守る性質 — 信頼境界での入力検証の実効性

construction フェーズガードレール「システム境界ではすべての入力を検証・サニタイズする」に対し、`JSON.parse(x) as T` は**検証したふりをして型の証明を捏造する形**である(business-logic-model.md §2)。decisions.md ADR-2「Security / Compliance 影響」節が「**正の影響**。本ガードは『外部から与えられた JSON を型の証明なしにドメイン値として扱う』経路を可視化・単調減少させる」と裁定しており、本 unit はその機械化にあたる。

保証の範囲と限界を明示する(一枚岩の断定を避ける — `cid:nfr-design:c4`):

| 保証する | 保証しない |
| --- | --- |
| SCAN_ROOTS 上で `JSON.parse(...) as T`(T ≠ `unknown`)の**件数が増えない**こと(BR-CG-14) | 既存 33 件が安全であること。33 件は「可視化された技術的負債」であり、是正は本 unit の非目標(BR-CG-47) |
| 多行形・引数に括弧を含む形も母集団に入ること(I-3、regex 述語の再現率 27% を AST で置換) | `JSON.parse` 以外の無検査な値取り込み(`readFileSync` → 手書きパース、`satisfies` 経由など)。`kind` 語彙は当面 1 つ(BR-CG-48) |
| `dist/` は core の投影であるため走査不要であること(BR-CG-8) | `tests/` 配下の同形(SCAN_ROOTS 外 — BR-CG-9)。テストコードは信頼境界の内側という前提を明示的に置く |

## 3. ガード自身の入力と検証の所有

ガードが受け取る入力は3種のみである。

| 入力 | 出所 | 検証 | 失敗時 |
| --- | --- | --- | --- |
| 走査対象ソース(`.ts`) | リポジトリ内 | 検証しない(**読むだけ**。実行も import もしない — business-logic-model.md §1 が「プロダクション源を `import` せずテキストとして読み AST へ解析する」と確定) | 読取失敗は `UNEXPECTED` / exit 1(BR-CG-27) |
| 台帳 JSON(`tests/.unchecked-cast-allowlist.json`) | リポジトリ内(PR レビューを経て変更される) | `parseAllowlist` の4検査 = JSON 構文 / オブジェクト性 / `direction === "shrink-only"` / `sites` がオブジェクト(BR-CG-18) | `ALLOWLIST_UNREADABLE` / exit 1(fail-closed) |
| argv | CI / 開発者 | 既知の3形のみ受理 | `USAGE_ERROR` / exit 2(BR-CG-26) |

検証の所有は単一である(domain-entities.md §4): 台帳スキーマの検証は `parseAllowlist` **のみ**が行う。読み口を2つ以上にすると片方だけ検証が緩む(`cid:requirements-analysis:symmetric-pair-review`)。

**走査対象ソースを検証しない**ことは意図的な設計である。ガードは対象コードを実行しないため、悪意あるソースが実行される経路が無い。TypeScript の構文解析は入力を評価しない。

## 4. ゲート無効化耐性 — 「黙らせる経路」を構造的に消す

検証劇場(org.md Forbidden)の最も安い形は「ゲートを黙らせる」ことである。本 unit で想定した無効化経路と、それぞれの遮断機構:

| 無効化の試み | 結果 | 機構 |
| --- | --- | --- |
| 台帳ファイルを削除する | exit 1(`ALLOWLIST_UNREADABLE`) | BR-CG-18。実走査の結果を見る前に判定が終わる(BR-CG-19 の順序契約、兄弟 `tests/callsite-guard.ts:332`〜`:334` 実文 `  const loaded = loadAllowlistOrFail(options.allowlistPath ?? allowlistPath());` / `  if (loaded.kind === "failed") {` / `    return fail("ALLOWLIST_UNREADABLE", [loaded.detail, "Regenerate with: bun tests/callsite-guard.ts --update"]);`) |
| `direction` を書き換えて ratchet を無効化する | exit 1(同上) | BR-CG-18。兄弟 `:259` 実文 `  if (doc.direction !== "shrink-only") {` |
| `sites` を空オブジェクト以外の値(配列・null 等)にする | exit 1(同上) | BR-CG-18。兄弟 `:262` 実文 `  if (doc.sites === null || typeof doc.sites !== "object") {` |
| CLI 引数から census を差し替えて OK を作る | 不可能 | census 注入 seam は **argv から到達できない**(BR-CG-34 / P-CG-8。兄弟 `:321-322` 実文 `  // The census to judge, for tests. It defaults to a live scan, and argv has no` / `  // way to set it — \`main\` only ever measures. The seam exists because the`) |
| 台帳の値を手で増やして違反を吸収する | **機械では止まらない**。PR diff に現れ、レビューで拒否する(BR-CG-21) | 人の規律。この非対称は reliability-design.md §5 に明記する |
| CI ステップを削除する | 本 unit の機構では止まらない。ci.yml の diff としてレビューに現れる | — |

最後の2行を「保証している」と書かないことが本節の要点である。**機械が保証するのは「measured > allowed で赤くなること」までであり、台帳とワークフローの改変は人のレビューが担う。**

## 5. 出力に機微情報を混ぜない

| 出力 | 内容 | 混ぜないもの |
| --- | --- | --- |
| stdout 残存レポート(BR-CG-28) | 相対ファイルパスと件数のみ | ソース本文 |
| stderr 違反行(BR-CG-24) | `<file>: <kind> — allowlist <a>, measured <m>` 形 | 違反箇所のソース断片 |
| `--report <path>` の JSON(BR-CG-29) | 生成時刻・総数・ファイル別件数 | 同上 |

ソース断片を出力に含めない設計は、CI ログ(公開リポジトリでは誰でも読める)へコード内容が漏れる面を作らないためである。件数とパスはリポジトリを読めば分かる情報であり、追加の露出を作らない。

## 6. パス取り扱いの前提を明示する(暗黙にしない)

`--check --report <path>`(BR-CG-29)と台帳パスの上書き(`CheckOptions.allowlistPath`)は、呼び出し側が与えたパスへそのまま書く/読む。ガードは path traversal の検査を行わない。

**この前提を明文化する**: これらのパスの出所は CI ワークフローとテストコードであり、いずれも信頼境界の**内側**である。ガードは外部入力(ネットワーク・ユーザー提出データ)からパスを受け取る経路を持たない。将来この前提が変わる場合(例: 外部からパスを受ける形の追加)は、その時点でパス検証を設計する必要がある — 暗黙の安全ではなく、前提付きの安全である。

`--update` の書き込み先は既定パス固定であり、argv からの上書き経路を持たない(component-methods.md `U4` :200 `runUpdate`)。

## 7. 資格情報・ネットワーク・実行時挙動

いずれも**扱わない**。

- ネットワークアクセス: なし(走査・判定はローカル FS のみ)。
- 資格情報・シークレット: 読まない・書かない・出力しない。環境変数からの秘密取得経路を持たない。
- 実行時挙動への影響: 本 unit は `packages/framework/core/` へ書き込まない(BR-CG-45。落ちる実証 面 B の一時注入とその revert を除く)。出荷物(`dist/`)へ投影されない(BR-CG-49)ため、利用者環境で動くコードを1行も増やさない。

decisions.md ADR-2 の Security 節が記録する「ガード自身は読み取り専用の静的走査で、資格情報・ネットワーク・実行時挙動に触れない」はこの3点である。

## 8. 落ちる実証 面 B の一時注入が持つセキュリティ上の含意

business-logic-model.md §8 の面 B は `packages/framework/core/` の実行時に評価される式へ違反を一時注入する。これはプロダクション源への一時的な**意図的な欠陥挿入**であり、注入が head に残ると出荷物へ混入しうる。

したがって `cid:code-generation:falling-proof-injection-one-set` に従い「赤の実測 → revert 完了」を不可分の1セットとし、注入状態で報告・待機しない(BR-CG-36)。revert 後の差分ゼロを PR diff で確認することが完了条件である(BR-CG-45 の検証手段と同一)。

## 9. 本 unit に非適用のセキュリティ設計(根拠付き)

| 領域 | 非適用の根拠 |
| --- | --- |
| 認証・認可 | 到達面が無い。CI ジョブ内のローカルプロセス1本 |
| 暗号・鍵管理 | 秘密を扱わない(§7) |
| 秘密スキャン・SAST/DAST の追加導入 | 既存ブロッキング集合(requirements.md NFR-5 :59)を変えないことが本 unit の制約(BR-CG-41 / 44)。本 unit は lint ジョブに1ステップを足すのみ |
| 依存脆弱性対応 | 新規外部依存ゼロ(`typescript` は既存 devDependency — `package.json:42` 実文 `    "typescript": "^6.0.3"`)。本 unit は依存面を動かさない |
| レート制限・DoS 耐性 | 外部からの要求を受けない |

これらは「検討していない」のではなく「対象が存在しないことを確認したうえで非適用」である。

## 上流参照の補足

- 本 unit の利用者価値は unit-of-work-story-map.md 段3(バリデータ非経由の読み戻し経路新設の CI 機械ブロック)に対応する。§2 の「守る性質」はこの価値の security 面での言い換えである。
