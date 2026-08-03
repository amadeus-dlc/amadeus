# Scalability Design — text-mutation-loud-failure

## 上流入力

本設計は `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md` を入力とする。document bytes `D`、stage数 `S`、target数 `T`、caller family数 `C` を独立したscale軸として扱う。

## Capacity tiers

| tier | stages | targets | document | latency | peak RSS増分 |
| --- | ---: | ---: | ---: | ---: | ---: |
| L1 | 32 | 32 | 256 KiB以下 | 証跡のみ | 128 MiB以下 |
| L4 | 128 | 128 | 512 KiB以下 | 証跡のみ | 128 MiB以下 |
| L8 | 256 | 256 | 1 MiB以下 | 各run 1秒以内 | 128 MiB以下 |

fixtureはseed固定でcanonical line identity、checkbox／suffix grammar、非対象projectionを同じ規則から生成する。target順を変えてもcanonical key byte順へ正規化され、結果bytesとfailure kindを一致させる。

## Scaling構造

| structure | scale | bound |
| --- | --- | --- |
| validated stage index | S | Map構築 `O(D + S)`、lookup average `O(1)` |
| target validation | T | Set重複検査 `O(T)`、sort `O(T log T)` |
| step mutation | D, S | setter内parse＋caller reparseで各 `O(D + S)` |
| bulk transaction | T, D, S | `O(T × (D + S))` |
| document retention | D | original／current／candidate最大3世代 |
| caller inventory | C | symbol／callsiteの一方向集合検査 `O(C)` |

上流が要求する各step二回のreparseを維持し、それを隠すcacheやincremental parserを初期導入しない。全中間document、step別audit、target別writerを保持しないため、memoryとI/OはTに比例して増幅しない。

## Overload policy

L8上限、256 stage、1 MiB、256 targetのいずれかを超えた場合はcapacity reviewを要求する。warning success、first-match、validation sampling、partial bulk、implicit resyncへ縮退しない。

改善の順序は中間document参照解放、validated index lookup、target sort key再利用である。parallel worker、cache、incremental parser、lock serviceは、postcondition同等性と決定性を別scopeで承認するまで導入しない。multi-writer化や新mutation dimensionもscope changeとする。

## Caller拡張

新しいcaller familyはsymbol inventory、exhaustive `TextMutationResult` switch、invariant catch、failure call-count、既存stderr／exit互換testを同時に追加する。未検査resultが1件でもあればscale成功ではなくstatic test failureとする。

## 検証項目

- L1／L4／L8でD／S／T、fixture digest、parse count `2T+2`、document世代最大3、writer最大1を記録する。
- not-foundをtarget列の先頭／中央／末尾へ置き、規模にかかわらずstate／audit bytes不変を確認する。
- 同値／相反duplicate targetを適用前に拒否する。
- L8を3 warmup＋10 measurementで測り、最大elapsedと `maxRSS` 増分を合否へ使う。
- caller inventoryを増やすfixtureで未検査resultを静的に検出する。

水平autoscaling、queue、database、network concurrencyは本Unitの単一process batch mutationには非適用である。
