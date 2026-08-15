# Code Summary — U-5 audit-sink-investigation(#3032 / FR-5)

depth Minimal。調査ユニットのため箇条書きのみ。

## 分岐結果

- **機序は確定した**(計画 Step 4 で確定)。ただし原因は main へ着地しなかった WIP バイトであり、**現行バイトに是正対象は存在しない** — 計画 Step 5(TDD 是正)は前提不成立で不適用、**Step 6(クローズ準備)を適用経路とした**
- Issue #3032 の仮説「OTel per-process ワークスペースピンが監査行の宛先を決めている」は**反証**された。ピンは宛先の決定器ではなく不一致の検出器であり、不一致時の効果は別 workspace への着地ではなく**行の消失**

## 確定した機序

- 2026-08-07 の PR #2413 実装中、`resolveProjectDir`(`packages/framework/core/tools/amadeus-lib.ts:232-270`)の cwd workspace-marker 段が `CLAUDE_PROJECT_DIR` 段の**上**に置かれた WIP バイトが一時的に存在した
- その段順では、cwd が marker を持つ実 worktree にあり env を fixture へ向ける t214 のテストで `resolveProjectDir` が実 workspace を返す → state 不在ガードは実 workspace の state を見て通過 → `assertSameProject` も同一 workspace のため throw せず → 行が実 record へ静かに追記される
- 一次証拠: PR #2413 本文の逐語(「当初「env より上」で実装したところ state 系テストの隔離 seam が破れ実 record 汚染が発生」)/ 選挙記録 `elections/260807-e-pwf-cgdev2/record.md`(配信 2026-08-07T11:31:17Z = 着地の 11 分後、同インシデントを「audit へ rogue イベント多数」と記載)/ scratch での byte-level 再現

## 主要実測値

- 測定 ref: HEAD `a49f9e9fdbd19fd40e9374feba77e9360771d173`。再現環境は repo 外 scratch `…/scratchpad/u5-repro/`(出力 `out/current2.json` / `out/wip.json`)
- 着地2行の時刻 `2026-08-07T11:20:09Z` は、`git log --all` が当該時間帯に返す **5 件**(main の squash 3 件 + squash 前ブランチ 2 件)のうち、直前の `4a3da7d62`(09:24:51Z)と直後の `d4f0513c5`(11:47:53Z)の**間** — 実装作業のさなか。5 件すべてで `resolveProjectDir` の段順は env が marker の上(または marker 段未導入)であり、WIP バイトはコミットされていない
- 選択性の一致: t214 の 3 テストのうち env 段のみに依存する 2 件(`seam: something went wrong` / `seam: no state`)だけが着地。argv 段の 1 件は不着地(`grep -rn --exclude-dir=260814-open-bug-batch-6 "seam: argv project-dir" amadeus/spaces/default/intents/` → 0 行・**exit 1**。除外は本 intent の record ディレクトリ — 本ファイルと `investigation-log.md` が needle を含むため)
- 現行バイト実測: A を先にピン → env=B で `recordEngineError` → **A にも B にも 0 行**(RE §2.5 の経路読解どおり)。cwd=A(marker)/ env=B では解決先 = **B**(env 段が上であることの pin)
- WIP 段順バイト実測: 同条件で A へ 2 行着地。属性 4 種(`Command:""` / `Error` / `Event:"ERROR_LOGGED"` / `Tool:"amadeus-orchestrate"`)・順序・連番・同一秒まで観測行と一致
- 実 record 無汚染の機械確認(すべて `--exclude-dir=260814-open-bug-batch-6` で再実測): 着地シャードは調査前後とも **393 行**、needle 件数不変(`seam: something went wrong` / `seam: no state` 各 1 行・exit 0)、プローブ文字列は 0 行・**exit 1**、`git status --porcelain -- amadeus/spaces/default/intents/260807-projectdir-worktree-fix/` は **0 行**。除外条件を付けない述語は本ファイルと `investigation-log.md` 自身にヒットして再導出できないため、全述語に除外を付けて実行し直した(詳細は `investigation-log.md` §5)

## 変更ファイル

- **本 invocation でのソースコード変更は 0 件**(調査ユニットにつきテスト新設もなし — 目標なき検査を作らない)
- record への書込 2 ファイル: `investigation-log.md`(本ユニット)/ `code-summary.md`(本ファイル)

## 残課題・申し送り

- **Issue #3032 のクローズ**は人間承認境界。クローズ提案文面は `investigation-log.md` §6.1 に用意済み
- **既着地2行の revert は不要**を推奨(`investigation-log.md` §6.2)。監査 append-only 原則、2026-08-07 時点の同一インシデントに対する既裁定(「audit は append-only のまま保持」)、除去コストが便益を上回ることの 3 点が根拠。代替は provenance の記録による説明可能性の回復
- **申し送り(スコープ外)**: OTel が別 workspace にピン済みのとき、監査行は `catch {}` に握り潰されて無音で消える。Issue 完了条件2の「no-op」には該当するが可観測性はゼロ。エラーパス上の握り潰しは意図された契約のため本 intent では変更しないが、in-process 駆動の監査欠落を観測したい場合は別 Issue の主題になりうる
