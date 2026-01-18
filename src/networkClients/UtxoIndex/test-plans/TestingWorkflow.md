The agent MUST take the tests described in the plan one at a time, thinking about each one and how the code works for that case.  Then it must use this workflow:

1. Add any helper functions needed in the test after checking for existing reusable helpers
2. Ensure any modifications to helpers remain compatible with existing usages (or modify those usages to ensure the other tests keep working as designed)
3. Implement the test, augmenting it to follow inline guidance on testing approach and using helper methods effectively
4. Run the test to ensure it passes
5. Run the test suite to ensure it passes
6. Look out for errors caused by Blockfrost rate limits and stop work if necessary.

After each test is working, it MUST pause for human review and commit of the increment.  Once the entire test plan is complete, it should print a bunch of celebratory emojis.
