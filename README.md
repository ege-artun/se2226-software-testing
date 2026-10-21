# SE 2226 – Software Quality Assurance and Testing

Final project for **SE 2226 – Software Quality Assurance and Testing**. The team tested two applications with a range of manual-style and automated techniques and documented the results in a test completion report ([ISO/IEC/IEEE 29119-2](https://www.iso.org/standard/81291.html), section 7.4) and a presentation.

| Application under test | Type | Testing performed |
|------------------------|------|-------------------|
| [SauceDemo](https://www.saucedemo.com/) | Public demo web shop (black-box) | GUI tests with Selenium IDE, Selenium WebDriver (Java) and Playwright |
| [Library-DB-Express](https://github.com/jlayher/Library-DB-Express) (by jlayher) | Node.js / Express / SQLite web app (tested locally) | Unit and integration tests, code coverage, mutation testing and load testing |

## Results at a glance

| Area | Tool | Result |
|------|------|--------|
| SauceDemo – recorded GUI flows | Selenium IDE | 7 flows recorded (`.side` project + screen recordings) |
| SauceDemo – coded browser tests | Selenium WebDriver (Java, JUnit 4) | 2 tests passed (valid and invalid login) |
| SauceDemo – cross-browser tests | Playwright | 21 test cases × 3 browsers (Chromium, Firefox, WebKit) = **63/63 executions passed** |
| Library-DB-Express – unit/integration | Jest + Supertest | **48/48 tests passed** |
| Library-DB-Express – code coverage | Jest `--coverage` | **97.39 %** statements, **78.26 %** branches |
| Library-DB-Express – mutation testing | Stryker | 105 mutants, **60.19 %** mutation score |
| Library-DB-Express – load testing | Apache JMeter | 10, 50 and 100 users, **0.00 %** error rate |

The full analysis, deviations from the plan, completion criteria and defect log are in [`docs/SE2226_Test_Completion_Report.pdf`](docs/SE2226_Test_Completion_Report.pdf).

## Test design techniques (SauceDemo)

The 21 Playwright test cases (see [`test-case-list.txt`](sauce-demo/playwright/test-case-list.txt)) are organized by technique:

- **Equivalence Class Partitioning (ECP)** – TC01–TC05: valid credentials, wrong password, unknown user, empty username, empty password
- **Boundary Value Analysis (BVA)** – TC06–TC08: locked-out user, maximum-length username, one-character username
- **Decision table testing** – TC09–TC12: combinations of empty / valid / invalid / locked user and password
- **Use case testing** – TC13–TC21: end-to-end purchase, remove item from cart, four product sorting options, logout, product detail page, cart badge count and app-state reset

## Repository structure

```
se2226-software-testing/
├── docs/
│   ├── SE2226_Test_Completion_Report.pdf
│   └── SE2226_Testing_Presentation.pptx
├── sauce-demo/
│   ├── playwright/                    # 21 tests, Chromium + Firefox + WebKit
│   │   ├── tests/SauceDemo_Playwright_Tests.spec.ts
│   │   ├── evidence/playwright-report.html
│   │   └── test-case-list.txt
│   ├── selenium-webdriver-java/       # Maven project, JUnit 4, Selenium 4.21
│   │   └── src/test/java/             # ValidLoginTest, InvalidLoginTest
│   └── selenium-ide/                  # Testing.side + screen recordings of 7 flows
└── library-db-express/
    ├── jest/                          # books.test.js (48 tests) + coverage output
    ├── mutation/                      # Stryker config + console output
    └── jmeter/                        # Test Plan.jmx + load test screenshots (docx)
```

## How to run

### SauceDemo – Playwright

Requires Node.js 18+.

```bash
cd sauce-demo/playwright
npm install
npx playwright install      # downloads the browsers
npm test                    # runs all tests on the 3 browsers
npm run report              # opens the HTML report
```

### SauceDemo – Selenium WebDriver (Java)

Requires JDK 17+, Maven and Google Chrome.

```bash
cd sauce-demo/selenium-webdriver-java
mvn test
```

### SauceDemo – Selenium IDE

Install the [Selenium IDE](https://www.selenium.dev/selenium-ide/) browser extension, open `sauce-demo/selenium-ide/Testing.side` and run the tests. The `.mp4` files show each recorded flow.

### Library-DB-Express – Jest, Stryker and JMeter

> **Note:** the application under test, [Library-DB-Express by jlayher](https://github.com/jlayher/Library-DB-Express), is **not included in this repository** and was not written by the team. Only the test assets we created are stored here, in [`library-db-express/`](library-db-express/).

To reproduce the results, clone (or fork) the original project and add our files to its root:

1. Copy `jest/books.test.js` and `mutation/stryker.config.json` to the project root.
2. In `config/config.json`, point the `test` environment to an in-memory database so the tests never touch `library.db`:
   ```json
   "test": { "dialect": "sqlite", "storage": ":memory:" }
   ```
3. Add the test script and Jest setting to `package.json`:
   ```json
   "scripts": { "test": "jest --runInBand" },
   "jest": { "testEnvironment": "node" }
   ```
4. Install the tools and run them:
   ```bash
   npm install
   npm install --save-dev jest supertest @stryker-mutator/core @stryker-mutator/jest-runner
   npm test                  # 48 tests
   npx jest --coverage       # coverage report
   npx stryker run           # mutation testing
   ```
5. Load testing: start the app with `npm start` (port 3000), open `jmeter/Test Plan.jmx` in [Apache JMeter](https://jmeter.apache.org/) and run it. The saved plan shows the last configuration used (100 users, 1 s ramp-up, `GET /books`); the 10-, 50- and 100-user runs were executed separately and their screenshots are in `jmeter/JmeterLoadTesting.docx`.

## Notes

- The tests use SauceDemo's publicly documented demo accounts (for example `standard_user`), so no real credentials are involved.
- The Library-DB-Express routes are form-based (`GET /books`, `POST /books/new`, `POST /books/:id`, `POST /books/:id/delete`) rather than REST-style; the tests follow the real routes. This and other deviations are explained in the report.

## Authors

- Berkay Yıldırım
- Ege Artun
- Serdar Sabit Güngör
- Toprak Güçlü
