export default [
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        URLSearchParams: "readonly",
        matchMedia: "readonly",
        navigator: "readonly",
        location: "readonly",
        history: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
        performance: "readonly",
        Math: "readonly",
        Date: "readonly",
        JSON: "readonly",
        Map: "readonly",
        Set: "readonly",
        Promise: "readonly",
        Array: "readonly",
        Object: "readonly",
        String: "readonly",
        Number: "readonly",
        Boolean: "readonly",
        Error: "readonly",
        Intl: "readonly",
        Event: "readonly",
        CustomEvent: "readonly",
        HTMLElement: "readonly",
        HTMLCanvasElement: "readonly",
        Image: "readonly",
        Audio: "readonly"
      }
    },
    rules: {
      "no-unused-vars": ["error", { "vars": "all", "args": "none", "ignoreRestSiblings": true, "caughtErrors": "none" }],
      "no-undef": "error",
      "no-unreachable": "error",
      "no-console": ["warn", { "allow": ["warn", "error"] }]
    }
  }
];
