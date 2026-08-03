# Scalability Requirements — repository-adoption

## 上流入力

本書は `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md` を入力とし、repository、finding、ledger、evidence、harness projectionの増加に対するcapacity契約を定義する。serviceの水平autoscalingは非適用である。

## スケール軸

| 軸 | 測定値 | 要求 |
| --- | --- | --- |
| corpus | expected files、source bytes、candidate数 | 3 authored rootsを全件走査し、増加をscan省略へ変換しない |
| evidence | raw finding、classification、approved entry数 | identity全単射を維持し、未分類／重複／余剰を許さない |
| ledger | previous／current baseline・exemption identity数 | identity集合のsubset／added／removed／replacementを判定する |
| CI event | PR base、fork PR base、push before | eventごとにbase SHAを一つだけ選び、gate invocationを増やさない |
| distribution | canonical sourceとgenerated harness数 | packagerのmanifest全件を再生成し、一部harnessを黙って省略しない |

## Capacity要件

- repository基準負荷 `R0` は初回approved pre censusのexpected file数、source bytes、candidate数、raw finding数、baseline数、exemption数をevidence reportへ記録する。
- `tests/integration/t-no-silent-drop-repository-capacity.test.ts` のseed文字列 `repository-adoption-capacity-v1` を固定generatorの正本とする。generatorは本番checkoutを変更せず、使い捨ての隔離Git workspace内に正規の3 authored rootを作り、`R0` manifestの各sourceを `replica-0000` から始まるpath namespaceへ複製する。検査はU1公開CLIだけを呼び、U1内部schema／identity codec／algorithmをgeneratorへ複製しない。
- `R2` はnamespace 2組、`R4` は4組とし、source file／bytes／candidate／finding／ledger identityの各非zero集合をexactly 2倍／4倍にする。`R0` で0件の軸は0件のまま維持し、期待値を0としてmanifestへ明示する。positive／negative rule比率、baseline／exemption membership比率は各replicaで同一にする。
- generatorはschema version、seed、source revision、各replica path／SHA-256、expected file／byte countを単一manifestへcanonical byte順で記録する。candidate／finding／ledger identityとdigestはU1の公開 `census-evidence` が生成したreview済みfixture receiptを正本とし、実scan receiptと全単射で比較する。U4はidentityを再計算しない。
- `R0` はcold／warm15秒、`R2` は20秒、`R4` は25秒以内に完全走査とratchet判定を終え、30秒TERMまで5秒以上の余裕を保つ。U4は同じroot gateのcommand recordとdigestを参照し、scanner algorithmを複製しない。
- evidence／classification／ledger集合演算の `O(n log n)` 上限はU1が所有するfocused complexity testの合格receiptで証明し、U4はそのcommand、full revision、exit、test-output digestをrepository acceptance reportへ結合する。U4は `identityOps` seam、reset／取得interface、source構造検査を新設しない。U4自身のoperational capacityは公開root CLIのR0／R2／R4 elapsedとprocess countだけで判定する。
- CIではbase object確認最大2回、欠落時fetch最大1回、root gate 1回を固定し、finding数に比例してGit processやgate processを起動しない。

## 拡張trigger

次のいずれかでcapacity reviewを行う。

1. authored root、language、rule、semantic status-return catalogが追加される。
2. `R0` のcold／warm最大が15秒、`R2` が20秒、`R4` が25秒を超える、または30秒TERMまでの余裕が5秒未満になる。
3. evidence reportへraw artifactを複製する提案、またはclassification全単射をsamplingへ変える提案がある。
4. 新しいCI event、remote、artifact store、harness projectionが追加される。
5. baseline／exemption追加を性能対策として許可する提案がある。

## Scaling方針

- raw artifactはimmutable pathへ一度だけ書き、reportはpathとdigestを参照する。
- classification、approval、candidate、canonical ledgerを別artifactに保ち、巨大な可変combined ledgerを作らない。
- identityはcanonical byte順でsortし、hash set／mapで全単射と集合差分を判定する。
- sharding、partial scan、incremental cache、distributed serviceは初期導入しない。必要時もmanifest全単射とtrusted-base ratchetを弱めない設計変更として扱う。
- generated projection数はpackager manifestから導出し、固定した一部harness listで打ち切らない。

## 検証要件

- `bun test --timeout 120000 tests/integration/t-no-silent-drop-repository-capacity.test.ts` を固定commandとし、隔離Git workspaceの `R0`／`R2`／`R4` でmanifest digest、files、bytes、U1公開evidenceのcandidates／findings／ledger identities、elapsed、process count、GateResult digestを記録する。
- `R2`／`R4` のcountとidentity digestをgenerator manifestのexact期待値へ照合し、0件軸が0のままであることもassertする。
- elapsedは `R2 <= 3 × R0`、`R4 <= 6 × R0` を検査し、root gate 1回、base object確認最大2回、fetch最大1回を維持する。algorithmic complexityはU1所有focused test receiptの不合格・未実行・revision不一致をrepository adoption全体の不合格とする。
- raw／classificationを独立に増加させ、不足・余剰・重複identityを規模に関係なく拒否する。
- base SHAが既存／欠落／取得不能の各fixtureでprocess call countとblocking outcomeを確認する。
- packager manifestの全projectionがcanonical digestから再生成され、drift checkが全件greenになることを確認する。
- capacity超過時もwarning success、scan sampling、ledger growth、exemption growthへ縮退しない。
