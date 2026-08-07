# Requirements Analysis — 明確化質問(Intent 260807-tla-specs-relocation)

- 対象 Issue: [#2398](https://github.com/amadeus-dlc/amadeus/issues/2398) — TLA+ 仕様(`specs/tla/`)を `amadeus/spaces/<space>/specs/tla/` へ移設し、仕様層の正準配置を `amadeus/spaces/<space>/specs/{rfc,tla}` に統一する
- Scope: self-refactor / Depth: Minimal(質問予算 ≤4)/ Test Strategy: Comprehensive
- 一次入力: Issue 本文(完了条件5件)、クロスレビュー2 verdict(ESTABLISHED_WITH_REFINEMENTS)、RE 差分 scan(`inception/reverse-engineering/developer-scan.md` / codekb re-scan 記録)
- 既決事項(質問対象外): 移設先は `amadeus/spaces/<space>/specs/tla/`、モデル意味論・TLC 実行契約・verdict 語彙は不変、無音の二重読み禁止・後方互換シム不設置(Issue 本文の明示)、digest 再ピン込み、歴史記録(audit jsonl・elections・codekb・memory learned)は書換禁止
- 質問モード: autonomy full の grant 下、solo election による一括裁定(先例: 260805-semi-redefine-autonomy-f の E-SRA-RA1 と同型)

---

## Q1. active-space 解決規則 — どの space の `specs/` を watch・ロード・センサー対象にするか

背景: 現行の spec 解決はリポジトリルート固定で space 概念を持たない。`activeSpace()` resolver(`packages/framework/core/tools/amadeus-lib.ts:1122`)は存在するが formal-verif 系からの参照は 0 件(RE 実測)。移設後は `amadeus/spaces/<space>/specs/tla/` が space ごとに存在しうるため、どの space の specs を対象にするかの規則が必要になる(RE open question 1・4、reviewer-1 未解決1)。

- A. active-space カーソル連動 — watch 基底・model-map ロード・センサー対象・loader のすべてを `amadeus/spaces/<activeSpace>/specs/tla/` に解決する。単一チーム運用(default のみ)では移設後のパスがそのまま使われ、マルチスペース時は `/amadeus space <name>` の切替に追随する。**(推奨)**
- B. default 固定 — 常に `spaces/default/specs/tla/` を見る。実装は最小だが、space を分けたチームは仕様層を持てず、#2396(RFC プラグイン)の space スコープ前提と矛盾する。
- C. 明示指定 — space を呼び出し引数・環境変数で都度指定する。柔軟だが全呼び出し点(activation・sensor・loader・CI runner・テスト)に指定経路の新設が必要で、移設の変更面が大きく膨らむ。
- X. Other (please specify)

推奨根拠: A は workspace 構造原則(memory/codekb/knowledge がすべて space スコープの active-space カーソル連動)と同じ解決規則を specs 層へ適用するだけで、新機構の発明がない。単一チーム利用者(single-team users only ever see `spaces/default/`)にはパス移設以外の挙動差が出ない。

[Answer]: A (E-TSR-RA1 により裁定。decision: auto-decision-7a69682c6daab8899290302c8b98d9e1、decider: solo-election)

## Q2. `specs/tla-evidence/` sibling root の扱い

背景: `plugins/formal-model-check/tools/tla-evidence.ts:434` の `DEFAULT_STORE_ROOT = "specs/tla-evidence"` が唯一のコード参照で、store 実体は observed SHA 上未生成(RE 実測)。260804-tla-authoring の ADR で watch glob 外に置くことが決まっている。Issue の完了条件は `specs/tla/` のみを名指ししており、tla-evidence は未定義の同根面(reviewer-2 の同根指摘)。

- A. 同移設する — 正準 store root を `amadeus/spaces/<space>/specs/tla-evidence/` に移し、watch 除外は新 root 基準で維持する。spec 由来の証跡も仕様層のツリーに同居させ、「仕様に関わるものの置き場が 2 つ」という非対称の再発を防ぐ。**(推奨)**
- B. ルートに残す — Issue の字面どおり `specs/tla/` のみ移す。変更面は最小だが、`specs/` ルート直下に evidence だけが残り、本 Issue が解消しようとしている非対称が evidence で再現する。
- C. 本 intent では触らない — 未生成の store なので実害はなく、別 Issue で判断する。ただし DEFAULT_STORE_ROOT の旧パスが残り、初回実行時にルートへ `specs/tla-evidence/` が新規生成されて非対称が確定する。
- X. Other (please specify)

推奨根拠: A は変更が `tla-evidence.ts:434` の定数1箇所+docs 2ファイル(英日)に閉じ、store 未生成のため移行考慮が発生しない。B/C はどちらも「ルート `specs/` が残存する」状態を恒久化・確定させる。Issue スコープからの逸脱は requirements.md の Out/訂正申告で明示する。

[Answer]: A (E-TSR-RA1 により裁定。decision: auto-decision-74ddb4580df97e1a65d1f800df68e141、decider: solo-election)

## Q3. spec-hash watch 基底の再宣言の形

背景: 現行は `specRootForHost(hostRoot) = dirname(hostRoot)`(`packages/framework/core/tools/amadeus-plugin-activation.ts:100-102`)で、ホストルート(= `plugins/formal-model-check`)の dirname = リポジトリルートを基底に `specs/tla/**` を watch する。`cid:code-generation:cg-watch-root-separation`(project.md:408)は「監視 glob の基底は所有ルートで明示宣言」を既定する。移設後の基底の宣言方法を確定する(RE open question 3)。

- A. 所有ルートを space 配下へ再宣言 — watch 基底を `amadeus/spaces/<activeSpace>/specs/` と明示宣言し、glob は `tla/**` にする。spec の所有ルートが space 配下にあることを基底解決が直接表現する。**(推奨)**
- B. 基底はルートのまま glob だけ変える — `dirname(hostRoot)` を維持し、glob を `amadeus/spaces/<space>/specs/tla/**` の長い形にする。差分は小さいが、基底(リポジトリルート)と所有ルート(space 配下)が分離し、cg-watch-root-separation の「基底は所有ルートで宣言」の読みに反する。
- C. glob を `**/specs/tla/**` のような再帰形にする — space 非依存に見えるが、別 space の spec 変更でも drift が鳴り Q1 の space 解決規則と衝突する。
- X. Other (please specify)

推奨根拠: A は cid:code-generation:cg-watch-root-separation の既定どおり「監視 glob の基底 = 所有ルート」の対称を保ち、Q1-A(active-space 連動)と組合わせたとき基底解決が `specRootForHost` 1 箇所の変更に閉じる。

[Answer]: A (E-TSR-RA1 により裁定。decision: auto-decision-5bb78a24d1f44a4c5e43cf9ed3c45b9d、decider: solo-election)

## Q4. 移設告知(migration notice)の設計

背景: Issue 完了条件は「旧パスに spec を持つ既存 workspace 向けの検出+案内(loud な移設案内。無音の二重読みはしない — 要求されない後方互換シムは追加しない)」と既決。残る設計論点は検出点と強度だけである。現行の spec hash drift advisory は「spec hash CHANGED (specs/tla)」の文言を持ち(`amadeus-plugin-activation.ts:229` ほか :231/:233/:304-305)、260804-tla-authoring の audit に実記録があるユーザー可視契約である。

- A. 解決点1箇所で loud に失敗させる — spec root 解決(loader/activation/sensor が共有する1経路)で旧 `specs/tla/` に spec を検出したら、新パスへの移設手順を明示するエラーで fail-closed に停止する。二重読みは構造的に不可能。**(推奨)**
- B. loud advisory で警告して新パス優先で続行 — 旧パスを検出しても警告だけ出して新パスを読む。利用者を止めないが、旧パスの spec が無視される「無音ではないが読み捨てる」状態は drift 検出の基底を曖昧にしうる。
- C. 検出は doctor のみ — 実行経路は新パスのみを見て、旧パス検出は `doctor` の診断に限定する。実行面は最小だが、doctor を回さない利用者には移設が知られない。
- X. Other (please specify)

推奨根拠: Issue は「無音の二重読みはしない」「互換シムは追加しない」を明示しており、A はこれに沿う最小の強度である。検出を spec root 解決の1経路に集約すれば、loader・activation・sensor・CI runner が同じ判定を共有し、要求されない二重実装(org.md Forbidden)を置かずに済む。

[Answer]: A (E-TSR-RA1 により裁定。decision: auto-decision-357610e564ef05693881abe5b3ac11d8、decider: solo-election)

---

## 裁定の記録(E-TSR-RA1)

- **E-code**: E-TSR-RA1(kind: clarification、solo-election、trigger: auto)
- **票数 / GoA 内訳**: 2-0 established(choice 1「4問すべて推奨どおり採用」)。`GoA[E-TSR-RA1]: 2x2`(subagent-1 GoA 2 / subagent-2 GoA 2、棄権・追加議論・ブロックいずれも 0)
- **決定の記録**: 4問すべて `amadeus-bolt decide-question` により `decider: solo-election` / `reviewState: unreviewed` で記録(decision ID は各 `[Answer]` 行に併記)。裁定の evidenceFingerprint は選挙 tally の SHA-256(`sha256:9c1072fb0de6f39935dadaa3cb93e901bebd1742990790e17acb5e4af12cf98f`)
- **留保の転記(per-voter 3件)**:
  1. (subagent-1 / Q2) 推奨根拠の「変更が tla-evidence.ts:434 の定数1箇所+docs 2ファイルに閉じる」はやや楽観的。DEFAULT_STORE_ROOT は静的文字列であり、space 連動化には fallback 使用側 `tla-authoring.ts:189`(`return raw ?? DEFAULT_STORE_ROOT;`)で activeSpace 解決を挟む変更が必要。requirements.md には「store root 解決は Q1 と同一の active-space 規則に従い、`tla-authoring.ts:189` の fallback サイトを含む」と明記すること。
  2. (subagent-1・subagent-2 / Q4) 推奨根拠の引用「org.md Forbidden」は実在しない — `org.md:53` の Forbidden 節は空(エントリ0件)。根拠は Issue #2398 完了条件の「無音の二重読みはしない — 要求されない後方互換シムは追加しない」に修正して引用すること。
  3. (subagent-2 / Q4) 選択肢A の「loader/activation/sensor が共有する1経路」は現状でなく設計目標 — 現行は3系統独立(activation: `specRootForHost`=dirname(hostRoot) / sensor: `MODEL_MAP_RELATIVE_PATH` を rootReal 基準解決 `amadeus-sensor-model-completeness.ts:37,247-250` / loader: `findRepositoryRoot` が `.git`+`package.json`+`specs/tla` 存在を条件に遡上 `tla-model-loader-internal.ts:133-152`)。requirements.md に「spec root 解決の単一経路化は移設実装の一部として新設」と明記し、loader の root 判定条件(`:140` の specs/tla 存在チェック)の変更必須を変更面に列挙すること。
