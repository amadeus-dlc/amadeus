# Reliability Requirements — static-gate-engine

## 上流入力

本書は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` を入力とする。availability SLAではなく、1回の短命CLI実行が完全性、決定性、byte不変、typed outcomeを守ることを信頼性の中心に置く。

## 信頼性目標

| ID | 目標 | 合格条件 |
| --- | --- | --- |
| REL-SG-01 | fail-closed | tool、rule、I/O、semantic、scan完全性、ledger欠落・schema不正は検査基盤異常としてError／exit 2。新規finding、baseline増加・置換、exemption増加・置換・失効はpolicy findingを持つViolations／exit 1 |
| REL-SG-02 | 完全走査 | expectedとscannedが全単射、重複0、走査前後manifest一致 |
| REL-SG-03 | 決定性 | 同一入力でResult JSON、identity、順序、digestがbyte-identical |
| REL-SG-04 | 非破壊性 | 通常check前後でsource、config、baseline、exemption、canonical evidence bytesが一致 |
| REL-SG-05 | evidence原子性 | evidence commandは未存在pathへの新規出力だけを許し、検証失敗時にpartial canonical artifactを残さない |
| REL-SG-06 | ratchet | baseline／exemptionはtrusted previous setのsubsetだけを許し、growthと同数置換を拒否 |
| REL-SG-07 | bootstrap一回性 | base baseline欠落時のprovenance fallbackは全digest一致する初回だけ許可し、base baseline存在後は再利用不可 |

## Failure分類

- `Violations` はsourceまたはpolicy findingが1件以上ある正常な検査結果であり、`BASELINE_GROWTH`、`RATCHET_REPLACEMENT`、`EXEMPTION_INVALID` を含めscan summary必須、exit 1とする。
- `Error` は検査基盤が信頼できない状態であり、baseline／exemptionの欠落、読取不能、schema不正、base revision不正を含めfindings空、manifest確定前のみscan null、exit 2とする。
- unknown exceptionは `INTERNAL_ERROR` へ正規化するが、既知の詳細codeを覆い隠さない。
- child failureは次の閉じた写像とし、retryしない。package binary欠落・実行不可・platform receipt欠落は `TOOL_MISSING`、bundle schema／capability／stdout schema不正は `RULE_INVALID`、spawn後timeout・signal・EPIPE・resource exhaustion・理由を安全に分類できないnonzero exitは `INTERNAL_ERROR` とする。各messageはそれぞれ固定prefix `AST_GREP_MISSING`、`AST_GREP_RULE_INVALID`、`AST_GREP_TIMEOUT`、`AST_GREP_SIGNAL`、`AST_GREP_IO`、`AST_GREP_RESOURCE`、`AST_GREP_EXIT` を保持し、top-level InfraCodeを増やさず原因を失わない。
- failure時に「前回結果を使う」「候補0件として続行する」「stderr警告だけでexit 0にする」fallbackを設けない。

## データ耐久性と回復

- 通常checkはread-onlyであり、失敗回復は再実行で行う。途中状態をcanonical ledgerへ保存しない。
- `census-evidence`、`approve-evidence`、`baseline-candidate` は入力digestを出力へ結合し、既存pathがあれば停止する。
- evidence adapterはoutputと同じdirectoryに`O_CREAT | O_EXCL`でtemp fileを作り、write、file `fsync`、close、regular-file `lstat`を完了してから、`link(temp, canonical)`でatomic no-replace commitする。`EEXIST`ではcanonicalを変更せず失敗し、link成功後にdirectory `fsync`してtemp名だけをunlinkする。crashがlink後に起きてもcanonical名は完全にclose済みのinodeを指し、temp名が残るだけである。
- source adapterはopen前`lstat`と`O_NOFOLLOW` open後`fstat`のdevice／inode一致を必須とし、descriptor経由bytesだけをsnapshotへ渡す。pathを後からsymlinkへ差し替えても開いたinode以外を解析しない。
- bootstrap provenanceはbase revision、B_pre、B0、initial exemption、approval receiptを再検証できなければ利用しない。
- canonical baselineへの昇格はrepository changeと人間reviewの責務であり、本Unitの通常commandが自動実行しない。

## 可観測性

- stdoutはschema version 1の単一JSON objectだけとし、machine verdictの正本とする。
- stderrは人間向け要約に限定し、機械判定でparseしない。
- Resultにはcode、message、scan summary、finding identity／locationを契約どおり保持する。
- 性能証跡にはelapsed time、expected／scanned count、candidate数、manifest digest、tool receiptを記録する。
- timestamp、PID、temp path、filesystem列挙順をstdoutへ含めず、再現性を損なわない。

## 検証要件

- root欠落、zero、partial、symlink、source change、unreadable source、tool missing、rule invalid、baseline invalid、semantic unresolvedを個別に注入する。
- 各注入で期待するInfraCode、findings空、exit 2、canonical bytes不変を検査する。
- ast-grepのmissing、bundle invalid、malformed stdout、timeout、signal、spawn I/O、resource exhaustion、nonzero exitを上記InfraCode／固定message prefixの表へexactに照合する。
- evidence write／fsync／close／link／directory fsyncの失敗と、link直前の競合writerを注入し、既存canonicalの上書き0件、成功時のpartial canonical 0件を確認する。
- valid violationはexit 1、Passはexit 0とし、Errorとの混同がないことをCLI round-tripで固定する。
- 同一snapshotの反復、path separator差、trivia差、filesystem列挙順差でidentityとstdoutが安定することをgolden testで確認する。
- baseline／exemption growth、replacement、stale exemptionはViolations／exit 1、bootstrap provenanceの欠落・不正・再利用はError／exit 2として拒否する。
