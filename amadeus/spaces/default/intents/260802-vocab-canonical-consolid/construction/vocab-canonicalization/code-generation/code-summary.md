# Code Summary — vocab-canonicalization

上流入力(consumes 全数): requirements.md、business-logic-model.md、business-rules.md、domain-entities.md

- 充足確認: `requirements.md` の FR-1(101語統合)/FR-2(機械生成)/FR-3(13面供給)/FR-4(2ファイル削除)/FR-5(t414 ガード+落ちる実証)/FR-6(count-free)と NFR-1〜4 を下記実測で充足
- 実装は `business-logic-model.md` の ADR-1/ADR-2/生成フロー/TDD 順序、`business-rules.md` の BR-1〜8、`domain-entities.md` の E-1〜E-6 に準拠。逸脱は2回とも実装前停止→裁定(下記)

## 成果(PR)

- **PR #2044**(branch `bolt/vocab-canonicalization`、head `b783fe45c`、base 再接地後 origin/main `bf8de21f7`、`Closes #2030`、未マージ・auto-merge 無効)
- コミット8件(物理、`git log --oneline origin/main..HEAD` 実測、merge コミット1件含む): 正本一本化 → 生成器+drift guard → 投影化 → 旧面退役 → カバレッジ補強 → リンク再基底(裁定B)→ 再接地 merge → t414 改番

## 実測値(builder 報告+conductor 裏取り)

- 正本: glossary EN/JA 各 **57→101語**(キー集合・行順一致を機械照合)。Projection Manifest(fenced YAML)追加
- 投影4面: knowledge=101 / protocol=17 / reference=21(EN/JA)。core 面 `{{HARNESS_DIR}}` 置換・docs 面 `<harness-dir>` 維持(相互残存 0 を実測)。S-1 は 1 core+7 dist+5 self = 13面同期
- 旧面削除: `domain-language.md`(消費者 `.coderabbit.yaml` は正本パスへ差替)+ `CONTEXT.md`(参照ゼロ)
- 生成器: `scripts/glossary-projection.ts`(write/check、決定的、fail-closed = BR-2 全5条件+リンク未解決検査)。テスト: t414 unit **33 tests** + t414 integration **12 tests**(計45 — `bun test` の Ran 行から転記。BR-2 1条件1テスト、write/check round-trip)
- **落ちる実証(FR-5b)**: 正本1語の一時改変 → check exit 1(3面 drift 列挙)→ revert → exit 0(2回実施・注入未コミット、PR 本文に逐語掲載)

## 裁定記録(実装中の停止2回)

1. **リンク再基底(ユーザー裁定 B、2026-08-02)**: 正本の docs/guide 起点相対リンクが投影先で解決不能(reference 1件・core 12種を実測)→ 面ごと再基底(reference=../guide/ 前置、core=repo ルート相対)+ 再基底後の未解決リンクを fail-closed(`surface-link-unresolved`)。正本無変更
2. **契約外是正2点(conductor 受理)**: t15 knowledge inventory 60→61(S-1 追加分)/ 正本 Learning loop 定義から version マーカー除去(t55 禁止トークン)— いずれも既存ガード赤化への機械的追随、PR 本文に申告済み

## 再接地(base-advance-regrounding)

- 検証中に origin/main が `a864822fa`→`bf8de21f7` へ前進。交差 0 件(`comm -12`)・merge-tree マーカー 0 件を実測し `--no-ff` merge(parent 2 / `ls-files -u` 0 の完遂機械確認)
- **t413 採番衝突を検出**: 前進が t413-self-scope-face-parity を持込 → 本 PR 側を **t414 へ改番**(swarm-test-number-reservation の並行 intent 実例)

## 検証(再接地後、exit code 個別取得)

| コマンド | 結果 |
|---|---|
| typecheck / lint / dist:check / promote:self:check | 全て exit 0 |
| `glossary-projection.ts check` | exit 0(4 surfaces in sync)— conductor も独立再実行で exit 0 を確認 |
| `bash tests/run-tests.sh --ci` | PASS(0 fail) |
| `coverage:ci` + patch gate(--base origin/main) | **PASS: measured 332 / covered 332 / allowlisted 0 / uncovered 0** |
| t34 / t174 / t15 / t55 | 個別 green |

## 残作業(ステージ外)

- PR #2044 の収束確認(リモート CI)とユーザーによるマージ承認(no-AI-merge)
- マージ後: #2030 は `Closes` で自動クローズ、in-progress ラベルは workflow 完了境界で自動除去(#2016 実装)
