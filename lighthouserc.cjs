module.exports = {
  ci: {
    collect: {
      staticDistDir: "./dist",
      numberOfRuns: 3,
      url: ["http://localhost/"],
      settings: {
        // Mobile emulation is the default in Lighthouse
        onlyCategories: [
          "performance",
          "accessibility",
          "best-practices",
          "seo",
          "pwa",
        ],
        skipAudits: ["uses-http2"],
      },
    },
    assert: {
      // No preset - using only custom warn-only assertions (report, don't block)
      assertions: {
        // Core Web Vitals
        "first-contentful-paint": ["warn", { maxNumericValue: 2500 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 4000 }],
        "cumulative-layout-shift": ["warn", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["warn", { maxNumericValue: 300 }],
        "speed-index": ["warn", { maxNumericValue: 4000 }],
        interactive: ["warn", { maxNumericValue: 5000 }],

        // Category scores
        "categories:performance": ["warn", { minScore: 0.7 }],
        "categories:accessibility": ["warn", { minScore: 0.9 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.9 }],
        "categories:pwa": ["warn", { minScore: 0.5 }],
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
