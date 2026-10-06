# Paper handouts

From this folder install Core into the bank and the adapter into the course root:

```sh
cd bank
quarto add Afonenko-Course-Tools/quarto-course@v3.0.0 --no-prompt
cd ..
quarto add Afonenko-Course-Tools/quarto-course-print@v0.2.0 --no-prompt
quarto run build.ts
```

These tags are release candidates until published. Local candidate checks run `CORE=/absolute/path/to/quarto-course bash tools/check-demo.sh`
from the producer repository root. The course ID is declared once at
the course root; export explicitly selects `bank` and each variant. Default
`full` is a demo policy. No live LMS exchange is claimed. Sources/resources
inside this folder are sufficient; central documentation receives ready output.
