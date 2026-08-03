# Security Design — unit `state-pbt` (#1980)

上流入力(consumes 全数): business-logic-model.md(§1 スコープ、§3 の5棄却分岐と判定順序、§4 P-ST2、§5 受理ドメインの実測、§6 実行契約、§7 NFR 当たり)(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用)

宣言外の追加入力(同 unit の FD 兄弟成果物): business-rules.md(BR-ST-3 / BR-ST-15 / BR-ST-16 / BR-ST-17 / BR-ST-18)、domain-entities.md(§1 型の所有)

測定 ref: **worktree HEAD `26fc7ddb29228757d40e3d15d6d8c0513d505f63`**。performance-design.md §5 の再確認表と同一断面。

---

## 1. 適用性の結論 — 大半は N/A、ただし全面 N/A ではない

本 unit はプロダクション改修ゼロの純テスト追加(business-logic-model.md §1、business-rules.md BR-ST-17)であり、認証・認可・暗号・秘密管理・ネットワーク境界・信頼できない外部入力の受口を**1つも出荷しない**。したがって典型的なセキュリティ設計項目は N/A である(§3 に一覧と根拠)。

一方で全面 N/A ではない。本 unit が扱う `parseMirrorBoundaryReceipts` は **入力検証境界(fail-closed バリデータ)そのもの** であり、その退行を常時監視する装置を出荷する。これは「セキュリティコントロールの実装」ではなく「**既存セキュリティコントロールの退行検出**」であり、本書が設計する唯一の実質的な面である(§2)。

| 面 | 本 unit の関与 |
| --- | --- |
| 入力検証コントロールの**実装** | なし(core が所有。business-rules.md BR-ST-17) |
| 入力検証コントロールの**退行検出** | **あり** — P-ST2(§2) |
| 認証・認可・暗号・秘密・ネットワーク・供給網 | なし(§3) |

---

## 2. 唯一の実質面 — fail-closed 入力検証の退行検出

### 2.1 守る対象(core 側のコントロール)

`parseMirrorBoundaryReceipts`(`amadeus-state.ts:239`)は、state ファイルの `Mirror Boundary Receipts` フィールドという**永続化された外部テキスト**を構造化値へ復元する境界であり、5つの棄却規則を持つ。

| # | 規則 | 行 | セキュリティ上の意味 |
| --- | --- | --- | --- |
| 1 | 重複 phase の棄却 | `:248` | JSON の last-write-wins による**サイレントな上書き**を拒否する。既存 example の名称が実文でこの意図を述べている(`tests/unit/t265-engine-boundary.test.ts:73` 実文 `  test("rejects duplicate phases instead of accepting JSON last-write-wins", () => {`)。ゲート状態が黙って書き換わる経路を塞ぐ |
| 2 | 不正 JSON の棄却 | `:257` | 部分パースによる不定状態を作らない |
| 3 | 非オブジェクトの棄却 | `:261` | `null` / 配列 / プリミティブが空 receipts と同一視されて**ゲート通過に化ける**ことを防ぐ |
| 4 | 未知 phase の棄却 | `:266` | 語彙外キーの黙殺を防ぐ |
| 5 | 不正 status の棄却 | `:270` | `"pending"` / `"completed"` 以外が完了扱いへ丸められることを防ぐ |

これらは **fail-closed**(疑わしきは throw)であり、org.md Forbidden が禁じる「検証劇場」の対極にある実装である。本 unit の役割は、この fail-closed 性が将来の変更で無音に fail-open へ倒れないことを常時監視することである。

### 2.2 監視の設計(P-ST2)と、そこに置く禁止事項

| 設計 | 内容 | 根拠 |
| --- | --- | --- |
| 判定 | `expect(() => parseMirrorBoundaryReceipts(s)).toThrow()` の1点のみ。**引数を取らない** | BR-ST-3、business-logic-model.md §4 P-ST2 |
| 禁止 | 棄却理由(メッセージ文言・分岐種別)をテスト側で再判定しない | `cid:build-and-test:pbt-oracle-cancellation`。棄却規則をテスト側に再実装すると、被検側の欠陥をテスト側の同型実装が打ち消す(**オラクル相殺**)。セキュリティコントロールの監視でこれが起きると「守られている」という偽の確信だけが残る |
| 到達性 | 5コンストラクタが5分岐へ1対1で到達することを lcov の DA で実測してから完了とする | BR-ST-6、`cid:build-and-test:error-path-reach-lcov`。**プロパティの緑は分岐到達の証拠にならない** — 全入力が分岐1へ吸い込まれても緑になる(reliability-design.md §3.2 F-1) |
| 未被覆の補完 | 分岐3(非オブジェクト、`:261`)は既存 example が存在しない唯一の分岐(business-logic-model.md §3)。P-ST2 がここを初めて常時被覆する | — |

### 2.3 本 unit が「やらない」こと(スコープの明示)

| やらないこと | 理由 |
| --- | --- |
| 棄却規則の追加・強化の提案 | business-rules.md BR-ST-17(core 無改修)。強化が必要と判明した場合は実装せず停止して申告(`cid:code-generation:deviation-stop-before-implement`) |
| `setField` のサイレント no-op を「脆弱性」として修正すること | requirements.md A-2 が現行挙動の維持を明示。本 unit は P-ST4 で**現行挙動を固定**するだけであり、無音の変更を禁じるのであって仕様変更を禁じるものではない(business-logic-model.md §4 P-ST4) |
| election / mirror / audit 境界の fail-closed 化 | 他 unit(`election-readpath` / `mirror-property`)の帰属。requirements.md FR-1 は core 改修を伴い、本 unit の非交差宣言(BR-ST-18)の外にある |

---

## 3. N/A 項目と根拠(反証可能な形で)

`cid:code-generation:c1`(N/A には反証可能な不存在/非適用根拠を併記する)に従い、各項目を実測可能な根拠で落とす。

| 項目 | 判定 | 反証可能な根拠 |
| --- | --- | --- |
| 認証 | **N/A** | 本 unit の成果物は `bun test` が読む純関数テスト4ファイルのみ(business-logic-model.md §6 の成果物表)。プロセス境界・呼び出し元認証の概念が存在しない |
| 認可 | **N/A** | 同上。engine の承認ゲート・delegate 経路に触れない(BR-ST-18 の書込面が `tests/` に閉じる) |
| 秘密管理 | **N/A** | 本 unit が導入する定数は `PBT_SEED` のみで、これは**公開定数**である(既存6宣言が repo にリテラルで存在 — 本ステージ実測 `grep -rn "PBT_SEED = " tests/`)。再現性のために公開されていることが要件(requirements.md NFR-4 の決定性)であり、秘匿対象ではない。認証情報・API キーを1つも導入しない |
| 暗号 | **N/A** | 暗号プリミティブを import しない。対象4関数のいずれも暗号を扱わない(domain-entities.md §1 の型・関数一覧) |
| ネットワーク境界 | **N/A** | テストファイルは `// size: small` を宣言し、`tests/lib/test-size.ts:36` の network シグナル正規表現(実文の一部 `\bnode:(?:net\|http\|https\|http2\|dgram\|tls)\b` / `\bWebSocket\b` / `\bfetch\s*\(` / `\.listen\s*\(`)に非一致であることが drift guard で機械的に強制される(BR-ST-16)。一致した時点で size が `large` へ上がりガードが赤くなる |
| ファイルシステム・プロセス境界 | **N/A** | 同 `:37`(spawn)・`:38`(filesystem)のシグナルに非一致であることを同じ drift guard が強制する。`classifyTestSize`(`:49`)は当該ファイルのソーステキストを走査する |
| 入力サニタイズ(本 unit が実装する側) | **N/A** | 実装しない。本 unit は **core のサニタイズを検査する側**(§2) |
| 出力エスケープ | **N/A** | 出力は `bun test` の verdict とテスト名のみ(business-rules.md「出力契約」)。ユーザー入力を含むレンダリング面を持たない |
| 監査ログ・改竄検知 | **N/A** | audit 境界は本 intent の他施策(#1979)/ 他 unit の帰属。本 unit は `amadeus-audit.ts` を import しない(BR-ST-15 の import 先が `amadeus-state.ts` / `amadeus-lib.ts` に限られる) |
| 権限昇格・サンドボックス | **N/A** | 新規プロセスを起動しない(spawn シグナル非一致、上記) |
| データ保持・PII | **N/A** | 生成器が作るのはランダム文字列と3語彙の組み合わせのみで、実データを読まない(実 FS を触らない)。ディスクへ書かない |

---

## 4. 供給網(依存)

| 項目 | 判定 | 根拠 |
| --- | --- | --- |
| 新規依存の追加 | **なし** | `fast-check` は既存 devDependency(本ステージ実測: `package.json:40` 実文 `    "fast-check": "^4.9.0",`)。本 unit は新規 npm 依存を1つも足さない |
| import 面 | **core 正本のみ** | BR-ST-15(`packages/framework/core/tools/`)。`dist/` 配下からの import を書かない — 検証は `grep -n "dist/" tests/unit/t418-*.ts tests/unit/t419-*.ts tests/helpers/arbitraries/state-*.ts` が 0 件 |
| 出荷面への影響 | **なし** | `tests/` は dist へ投影されない。BR-ST-17 の `git diff --name-only <base>..HEAD -- packages/ dist/` が空であることで機械確認する |
| 出荷 core の境界契約(NFR-3、`t258-boundary-guard`) | **適用外** | NFR-3 は出荷される `core/tools` のコメント・文字列に repo-only パストークンを書かないことを求める(`cid:code-generation:c1-1569-shipped-comment-vocab`)。本 unit は core を1行も変更しないため発火しない。**もし発火したら BR-ST-17 の前提が破れた合図**として停止する |

---

## 5. ブラスト半径

本 unit の変更が壊しうる範囲は次の3点に限られ、いずれも `tests/` の内側で閉じる。

| # | 半径 | 封じ込め |
| --- | --- | --- |
| 1 | 新規4ファイル自身の赤(CI ブロック) | 決定的 seed により再現可能(reliability-design.md §2.1 の実測)。ブロック時の切り分けは失敗 seed と縮小反例で完結する |
| 2 | `tests/helpers/arbitraries/` の名前空間衝突 | 本 unit は `state-receipts.ts` / `state-field.ts` のみを新設。`election.ts` は `election-readpath` の所有で本 unit は作成も参照もしない(domain-entities.md §3、BR-ST-18) |
| 3 | tNNN 名前空間の衝突 | BR-ST-12 の再確認(reliability-design.md §6)。衝突時は自 Bolt 側を改番し全参照を grep 更新 |

**半径外(明示)**: 実行時のプロダクション挙動、dist、self-install ツリー、engine の state・audit。いずれも本 unit の書込面(BR-ST-18)に含まれない。

---

## 6. 禁止事項(code-generation への制約)

| 禁止 | 根拠 |
| --- | --- |
| P-ST2 の `toThrow` に引数(メッセージ・エラー型)を与える | BR-ST-3。棄却理由の再判定はオラクル相殺(§2.2) |
| セキュリティ強化を理由に core の棄却規則へ手を入れる | BR-ST-17。必要と判断したら実装せず停止して申告 |
| 生成器から実ファイル・環境変数・ネットワークを読む | BR-ST-16(size 宣言と drift guard)。§3 の N/A 根拠が同時に崩れる |
| `PBT_SEED` を環境変数などで動的化して「秘匿」する | requirements.md NFR-4 の決定性要件に反する。seed は公開定数であることが要件(§3) |
| 生成器が repo 内へファイルを書く(replay ファイルの永続化等) | BR-ST-18 の書込面(新規4ファイルのみ)を越える。fast-check の replay は出力ログで足りる(business-rules.md「出力契約」) |

---

## 7. 未実測として残す項目(受け入れ基準に使わない)

| 項目 | 状態 | 理由 |
| --- | --- | --- |
| 5分岐への lcov DA 到達(§2.2) | **未実測** | 実装後。coverage 実行は単独所有者による直列化が必要(`cid:code-generation:c1-coverage-single-owner`) |
| test-size drift guard の緑(§3 の N/A 根拠を機械的に支える) | **未実測** | 実装後に `bash tests/run-tests.sh --ci` の一部として取る(business-rules.md 完了条件4) |
| `grep -n "dist/"` 0 件(§4) | **未実測** | 実装後。BR-ST-15 の検証欄 |
