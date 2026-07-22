# Business Logic Model — goa-sparse-acceptance

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

## 目的と境界

本 Unit は、`unit-of-work.md` がまとめる FR-1〜FR-4 を単一 Bolt で実装可能な処理契約へ落とす。利用者ジャーニーは `unit-of-work-story-map.md` の「§13 persist 文の書き手」「選挙 CLI 利用者」「週次蒸留の将来実装者」「レビュアー/CI」である。`requirements.md` の裁定どおり、書き側 `renderGoaLine`、既存集計、選挙 store/timeline は変更しない。

`components.md` の3コンポーネント境界を維持する。core 正本の `amadeus-norm-metrics.ts` が GoA レコードの抽出・parse と E-code count を所有し、配布外の `amadeus-election-record.ts` が選挙 ID の値検証を、`amadeus-election.ts` が CLI エラー表示だけを所有する。`component-methods.md` の公開関数 shape と `services.md` の4出力契約が実装・テストの正本である。

## GoA corpus 処理フロー

1. `extractGoaRecords(text)` が全文から `GoA[E-...]:` head occurrence を列挙し、各 occurrence を1レコード文字列へ切り出す。同一物理行に複数 head があっても各 occurrence を失わない。
2. 各レコードを `parseGoaLine(record)` へ渡す。head が不正なら既存の `not a GoA line` 失敗を返す。
3. body の最初の空白区切り token が有効なサブ問ラベル `/^[cC][1-9][0-9]*$/` に一致するときだけ sparse 経路へ入る。それ以外は canonical 候補として既存経路へ渡す。このため既存の不正 canonical 例 `2x4 1x0 ...` は従来の `bin out of order`、`1xz ...` は従来の `malformed vote bin` へ到達する。
4. sparse 経路では `/` ごとにセグメント化し、各セグメントのラベルと1個以上の vote token を検査する。先頭ラベルは経路判定で検査済み、後続ラベルは同じ文法で検査する。
5. 各セグメントは8要素のゼロ配列を作り、明示 token の bin だけを count で置換する。欠落 bin は0であり、推測や前セグメントからの継承をしない。
6. 行全体の `votes` は全セグメントの同じ bin を加算する。`segments` は入力順・ラベル表記を保存する。canonical 経路には `segments` を付けない。
7. どれか1セグメントでも不正ならレコード全体を `ParseFailure` にし、部分集計を返さない。

### Sparse parser の疑似処理

- ラベルは `/^[cC][1-9][0-9]*$/`。入力表記を保存し、ASCII 小文字化したラベルを重複キーにする(E-GSFFD1、3-0)。
- レコード候補は head から次の `GoA[` または改行まで。不正 body token は温存する。末尾 `/` を除けるのは、終端理由が「次の有効な `GoA[...]` head」で、その直前の `/` がレコード間区切りである場合だけ。改行・`)`・HTML comment で終端した候補の末尾 `/` は温存し、`sparse/empty-segment` で拒否する(E-GSFFD2、3-0)。`)` 以降と HTML comment 以降は provenance suffix として除く。
- 4拒否クラスは型を変えず、`sparse/duplicate-label: ...`、`sparse/bin-sequence: ...`、`sparse/malformed-token: ...`、`sparse/empty-segment: ...` の安定 prefix + 詳細で返す(E-GSFFD3、3-0)。
- bin はセグメント内で昇順かつ一意でなければならない。`1x<n>`〜`8x<n>` 以外、逆順、同一 bin の再出現は fail-closed とする。
- count は既存 canonical 経路と同じ10進非負整数変換を使い、新しい上限や丸めを導入しない。

## E-code 受理域の整合フロー

`component-methods.md` に従い、`GoaLineCode.parse` は `^E-[A-Z0-9]+(-[A-Z0-9]+)*$` へ、norm metrics の `ECODE_RE` は `\bE-[A-Z0-9]+(?:-[A-Z0-9]+)*` へ受理域だけを拡大する。自然形 `E-SDE-CG4` と既存圧縮形の双方を受理し、変換・canonical 化はしない。`handleOpen` は検証を `GoaLineCode.parse` に委譲したまま、利用者向け期待形式だけを新 regex と一致させる。

`ECODE_RE` は `countMatches` の入力だけを変える。旧 regex と新 regex の corpus match 数が等しいことを対照で固定し、切詰められていた複節 ID は1 occurrence のまま全長を match する。

## データ変換と不変条件

| 入力 | 変換 | 出力 | 不変条件 |
|---|---|---|---|
| canonical GoA record | 既存8-bin parse | `GoaBreakdown` | byte-equivalent な入力は現行と同じ `votes`、`segments` なし |
| sparse GoA record | segment parse + bin別加算 | `GoaBreakdown` | `votes[i] = sum(segments[*].votes[i])` |
| malformed sparse record | 全体拒否 | `ParseFailure` | 部分的な成功値を返さない |
| memory corpus text | occurrence 抽出 | `string[]` | head occurrence 数と返却要素数が一致 |
| election ID | regex 受理域拡大 | 元文字列 | 変換なし、旧受理値を全て温存 |

## 検証シナリオ

- Happy path: `c1 2x2 7x1 / c2 1x3` は `votes=[3,2,0,0,0,0,1,0]` と2 segments を返す。
- Case preservation: corpus に実在する `C1` と `c1` はどちらも受理し、返却 label は入力表記を保存する。同一レコード内では case-fold 後が同じため重複として拒否する。
- Fail-closed: 重複ラベル、範囲外/重複/逆順 bin、不正 token、空セグメントの各クラスを独立に拒否する。
- Corpus sweep: memory 層全域を `extractGoaRecords` → `parseGoaLine` の2段で走査し、着手時に再測定した全 occurrence を成功/意図的拒否のどちらかへ分類する。抽出漏れを parse 成功と数えない。
- Compatibility: canonical 8-bin、圧縮単節 election ID、`renderGoaLine` 出力、`checkGoaLine` の既存 round-trip を不変に保つ。
- Distribution: core 正本変更後に dist 6面と self-install を生成し、配布コピーの手編集はしない。
- Test layers: parser/extractor の文字列 fixture は unit test に置く。memory 層の実ファイルを発見・読込する corpus sweep は integration test に置き、unit test から実 FS を触らない。これは `components.md` の unit test 集約案を Construction の FS テスト規則に合わせて精密化する配置是正である。

## UI 非該当

`services.md` が明記するどおり、本 Unit は CLI 内部ライブラリの受理域拡大であり frontend/UI を含まない。そのため optional の `frontend-components.md` は生成しない。

## Review

- Iteration 1: NOT-READY(Major 3 / Minor 1)。canonical/sparse 判定の曖昧さ、末尾 `/` の無音修復余地、実 FS sweep の unit 配置、ADR-3 識別子不足を検出。
- Iteration 2: READY(Critical 0 / Major 0 / Minor 0)。4件の閉包、FR-1〜FR-4 / ADR-1〜ADR-4 の全数写像、E-GSFFD1〜3 の A/A/A、センサー形状、非変更面を独立確認。
- Gate cross-check: BLOCKED。optional candidate の全数列挙漏れにより、UI非該当にもかかわらず stale `frontend-components.md` が残存し、Q3 stable prefix と矛盾していた。candidate 不存在条件に従い削除し、増分再確認へ回付。
- Incremental recheck: READY(Critical 0 / Major 0 / Minor 0)。ディレクトリ全数4ファイル、optional `frontend-components.md` 不存在、UI非該当条件、必須3成果物の非退行を独立確認。
