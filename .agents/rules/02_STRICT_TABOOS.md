# DROPSHIP CRM - STRICT TABOOS & CONSTRAINTS

## ⛔ Absolute Taboos (DO NOT DO)

1. **NO Intermediate Modification Scripts**:
   - Never write Node.js regex replacement scripts to edit React JSX files.
   - Always view the file directly (`view_file`) and edit directly (`replace_file_content`).

2. **NO Disruption of Dual-Sync Data Layer**:
   - Never remove `localStorage` fallback from `dataService.js`.
   - All services must preserve data persistence across F5 page refreshes.

3. **NO Modification of 7-Column Accounting Invoice Table**:
   - All accounting tables must maintain exact sequence:
     `STT | Mã Đơn | Tên SP | Infor SP | Đơn Giá | SL | Thành Tiền`

4. **NO Hardcoded Sensitive Tokens in Git**:
   - Never commit Vercel recovery codes, passwords, or private access tokens into Git tracking.

5. **NO Unverified Success Declarations**:
   - Always run `npm run build` after modifying code before declaring completion to the user.
