# Source Capsule Template

Each active Source gets exactly one canonical folder: `src/03_sources/SRCxxx/`.

Required shape after intake begins:

```text
SRCxxx/
├─ manifest.json
├─ authority/
│  ├─ authority.json
│  └─ sha256.txt
├─ original/
│  └─ original.html
├─ baseline/
├─ split/
│  ├─ index.html
│  ├─ styles.css
│  ├─ script.js
│  └─ assets/
├─ evidence/
│  ├─ source/
│  ├─ split/
│  └─ parity/
└─ tests/
```

`original/original.html` must be the frozen resolved authority. `split/` is the first implementation surface. Adapter/product files do not belong in this capsule.
