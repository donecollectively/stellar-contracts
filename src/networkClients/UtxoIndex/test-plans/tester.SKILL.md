
## NOTICE: Agents MUST READ WHOLE FILE to be successful as a tester

---

## Phase 1: Planning

### Plan Document Structure

Test plans should include these sections (see Plan B for reference):

1. **Workflow Loop: REQUIRED** - Reference to this workflow document
2. **Test Helpers: REQUIRED** - Reference to the testHelpers file
3. **Required Imports** - Any new imports needed (e.g., `vi` from vitest)
4. **Existing Helpers** - Table summarizing helpers the tests will use
5. **New Helpers Needed** - Sketches of helpers to be created
6. **Shared Config Pattern** - The `baseConfig` object for reducing repetition
7. **Functions to Test** - Test cases and sketches for each function

### Mockability Analysis

For each function to be tested, analyze:

1. **Success indicators** - What behavior distinguishes success? (e.g., "returns from cache" vs "fetches from network")
2. **Observable methods** - Which internal methods indicate that behavior? (e.g., spy on `fetchFromBlockfrost` to verify cache hit)
3. **State variations** - What state setup enables each test case? (e.g., isolated DB with/without specific data)
4. **External dependencies** - Which imperative code makes external calls (API, I/O) that need mocking to eliminate externalities?
5. **Runtime variations** - Which data or runtime conditions can vary in practice (external responses, data shapes, timing, edge cases) where we want to control those (mocked) conditions and verify correct handling

Include a **Mockability Notes** subsection under each function listing:
- Methods to spy on (with expected call patterns)
- Methods to mock (to control external behavior and runtime conditions)
- State variations needed (populated cache, empty cache, partial sync, etc.)

### Planning Practices

- Draft test sketches using `//! ...pseudocode placeholders` to make human review on semantics easy. Design this pseudocode with consistency in mind and alignment to the overall testing strategy.
    - wrong: `fetchSpy = vi.spyOn(isolatedIndex, "someFooBarMethod");\n//[...]\nexpect(fetchSpy).not.toHaveBeenCalled()`
    - correct: `//! spy on FooBar\n[...stuff...]\n//! the fooBarSpy should NOT have been called`
- When there is a helper to be used in a test sketch, include the helper call directly (not as pseudocode) even if it involves undefined variables (with good descriptive names) that the implementer will create.
- Always leave comments in the test sketch indicating the general flow of the test.
- Include draft/sketch versions of any newly-needed helpers in the plan document, with real code (if very short) or mock implementation with pseudocode comments for readability.
- Provide a brief summary of existing helpers that the tests will need, when needed for the plan to make good sense.
- Design test-helper interfaces (names and signatures) to be type-safe and optimized for readability and low surprise at the points of use.
- Align helper names with the readable pseudocode (for example, "create instance with limited fetch size" → `createInstance({fetchSize: ...})`)

---

## Phase 2: Pre-Implementation

Before starting the test development loop:

1. **Identify helpers needed** - Review all test sketches and identify test helpers and other code changes needed to support the tests.
2. **Implement helpers first** - Create or modify helpers before writing any tests.
3. **Ensure consistency** - Use test helpers as consistently as possible to reduce cognitive load for understanding the differences between different test scenarios.

---

## Phase 3: Test Development Loop

The agent MUST take the tests described in the plan one at a time, thinking about each one and how the code works for that case. Then it must use this workflow:

### Per-Test Steps

1. **Check for helpers** - Add any helper functions needed after checking for existing reusable helpers
2. **Maintain compatibility** - Ensure any modifications to helpers remain compatible with existing usages (or modify those usages to ensure other tests keep working as designed)
3. **Implement the test** - Augment the sketch to follow inline guidance on testing approach, using helper methods effectively
4. **Retain comments** - Keep comments interleaved with test implementation to create continuity between plan and implementation, without unnecessary redundancy
5. **Run the test** - Ensure it passes
6. **Run the test suite** - If any implementation code was changed, you must ensure it didn't break any other tests
7. **Implement other closely related tests** e.g. of that same function, especially if the tests are small.  Don't group tests that require code changes.  Don't group tests of different functions.
8. **Check for type errors and build the project** - to be sure nothing was broken
9. **Update the plan** - to reflect the updated status of implemented test(s)
10. **Watch for rate limits** - Look out for errors caused by Blockfrost rate limits and stop work if necessary

### After Each Test

Pause for human review and commit of the increment.

### Completion

Once the entire test plan is complete, print celebratory emojis.
