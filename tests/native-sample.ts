export const sample = () => ({
  schema: "course-body-package-v1",
  owner: "course-a",
  release: "native",
  apiVersion: [1, 23, 1],
  questions: [{
    owner: "course-a",
    id: "exr-manual",
    key: "course-a/exr-manual",
    source: "index.qmd",
    visibility: "public",
    answerType: "manual",
    condition: [{ t: "Para", c: [{ t: "Str", c: "Public native condition" }] }],
    publicAnswer: [],
  }],
  works: [{
    owner: "course-a",
    id: "sec-work-one",
    key: "course-a/sec-work-one",
    source: "index.qmd",
    kind: "lab",
    title: "Native work",
    items: ["course-a/exr-manual"],
  }],
  resources: [],
});
export const assert = (v: unknown, m: string) => {
  if (!v) throw Error(m);
};
