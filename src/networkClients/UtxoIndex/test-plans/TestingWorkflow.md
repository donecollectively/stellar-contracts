
## NOTICE: Agents MUST READ WHOLE FILE to be successful as a tester

### Plan Document Structure

Test plans should include these sections (see Plan B for reference):

1. **Workflow Loop: REQUIRED** - Reference to this workflow document
2. **Test Helpers: REQUIRED** - Reference to the testHelpers file
3. **Required Imports** - Any new imports needed (e.g., `vi` from vitest)
4. **Existing Helpers** - Table summarizing helpers the tests will use
5. **New Helpers Needed** - Sketches of helpers to be created
6. **Shared Config Pattern** - The `baseConfig` object for reducing repetition
7. **Functions to Test** - Test cases and sketches for each function

### Key Practices

 - draft test sketches using `//! ...pseudocode placeholders` to make human review on semantics easy.  design this pseudocode with consistency in mind and alignment to the overall testing strategy.
    - wrong: `fetchSpy = vi.spyOn(isolatedIndex, "someFooBarMethod");\n//[...]\nexpect(fetchSpy).not.toHaveBeenCalled()`
    - correct: `//! spy on FooBar\n[...stuff...]\n//! the fooBarSpy should NOT have been called`
- when there is a helper to be used in a test sketch, include the helper call directly (not as pseudocode) even if it involves undefined variables (with good descriptive names) that the implementer will create.
- always leave comments in the test sketch indicating the general flow of the test.
 - use test helpers as consistently as possible to reduce cognitive load for understanding the differences between different test scenarios.
 - if possible, include draft/sketch versions of any newly-needed helpers in the plan document, with real code (if very short) or mock implementation with pseudocode comments for readability.  And provide a brief summary of existing helpers that the test will need, when needed for the plan to make good sense.
 - before starting the test development loop, identify test helpers and other code changes needed to support the tests, and apply them first.
 - design test-helpers (names, interface and implementation details) to be type-safe and optimized for readability and low surprise at the points of use.
 - when possible, align helper names with the readable pseudocode (for example, "create instance with limited fetch size" -> createInstance({fetchSize: ...})))
 - when implementing tests, use test-helper functions consistently
 - when implementing tests, retain comments interleaved with test implementation to create continuity between plan and implementation, without leaving unnecessary redundancy in the comment text


### Workflow: Test Development Loop

The agent MUST take the tests described in the plan one at a time, thinking about each one and how the code works for that case.  Then it must use this workflow:

1. Add any helper functions needed in the test after checking for existing reusable helpers
2. Ensure any modifications to helpers remain compatible with existing usages (or modify those usages to ensure the other tests keep working as designed)
3. Implement the test, augmenting it to follow inline guidance on testing approach and using helper methods effectively
4. Run the test to ensure it passes
5. Run the test suite to ensure it passes
6. Look out for errors caused by Blockfrost rate limits and stop work if necessary.

After each test is working, it MUST pause for human review and commit of the increment.  

#### When Test Implemention Process is

Once the entire test plan is complete, it should print a bunch of celebratory emojis.
