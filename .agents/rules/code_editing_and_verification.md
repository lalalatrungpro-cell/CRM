# Code Editing and Verification Rules

## Strict Code Modification Workflow
1. **Direct Inspection First**: Always inspect the target file using `view_file` to get exact line numbers and exact code context before making edits.
2. **Direct Replacement Only**: Use `replace_file_content` directly on the file. Do NOT generate temporary Node.js regex replacement scripts to modify source code files.
3. **Mandatory Build Verification**: After any code edit, execute `npm run build` to verify clean compilation with 0 syntax errors.
4. **Code Verification**: Check that the exact string/component exists in the modified file using code search before confirming to the user.
5. **No Premature Declarations**: Never claim a feature is complete until empirical runtime or build verification succeeds.
