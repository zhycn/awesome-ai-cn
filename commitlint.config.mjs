/** Conventional Commits：与 CONTRIBUTING.md 的约定一致 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "header-max-length": [2, "always", 100],
    // 中文标题没有大小写概念
    "subject-case": [0],
    "subject-full-stop": [0],
    "body-max-line-length": [0],
  },
};
