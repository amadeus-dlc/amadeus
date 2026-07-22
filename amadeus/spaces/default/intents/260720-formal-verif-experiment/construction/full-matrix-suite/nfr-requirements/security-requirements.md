# Security Requirements — full-matrix-suite

## Threat boundary

`business-logic-model.md` のcanonical input / schedule / LOC、`business-rules.md` のsame conditions / no drift、`requirements.md` のblind comparison、`technology-stack.md` のlocal Git / Bun stackを正本とする。脅威はarm別input、schedule manipulation、fixture semantics漏洩、path / LOC misclassification、raw evidence改竄である。

## Input and arm isolation

- baseline、manifest alias順、input-set identity、runner class、resource / network profileを両armへexactly同じに渡す。
- scheduleはinput-set identityをpreimageに含むhashからfirst armを決め、開始後変更しない。operator指定first armを拒否する。
- arm processは各U4/U6のread / write allowlist sandboxを維持し、他arm source / evidence、fixture期待値を読めない。
- schedule / matrix metadataはopaque aliasを使い、expected verdictやdefect classをarm inputへ含めない。

## Cost integrity

LOCはbaseline→freezeのGit numstatをfrozen arm-owned path manifestへ限定する。Git executable realpath / version / content identity、isolated system / global / local config、実効config identity、hooks disabled、`--no-ext-diff --no-textconv`、`LC_ALL=C`をreceiptへ固定する。binary、rename ambiguity、shared / unknown pathを拒否する。

elapsedはU1 Coordinator start / freeze receipts、suite timingはU3 monotonic receiptsだけを使う。commit timestamp、mtime、conversation time、handwritten durationを採用しない。

## Verification

arm別input / order、schedule preimage drift、manual first arm、sandbox escape、shared LOC混入、Git config / external diff、evidence hash driftをred fixtureとする。credential、network、external election store readは0件とする。
