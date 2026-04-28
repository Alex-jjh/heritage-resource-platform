# Assigned Requirement Changes

This package implements the three assigned requirements:

1. **Password length restrictions**
   - Added optional password update to profile editing.
   - Enforced minimum 8-character password validation on frontend and backend.
   - Password is encoded with the existing Spring Security `PasswordEncoder` before saving.

2. **Draft save condition limitations**
   - Draft resources can now be saved without title, category, or copyright declaration.
   - Submit-for-review still validates required metadata through `ResourceService.validateRequiredMetadata`.
   - Resource response and frontend pages now tolerate `null` title/category/copyright values for incomplete drafts.
   - Added Flyway migration `V5__allow_incomplete_drafts.sql` to allow nullable database columns.

3. **URL Format Check**
   - Added backend validation for external links using `@Pattern` and nested `@Valid` validation.
   - Added frontend URL validation using `new URL(...)` and allowed only `http://` or `https://`.
   - Existing resource detail page already opens external links in a new tab using `target="_blank"`.

## How to apply

Copy these files into the same paths in your project. If using the ZIP, extract it into your project root folder `heritage-resource-platform`, allowing files to be replaced.

## How to run tests locally

From the backend folder:

```powershell
cd "C:\Users\ROG\Work Place\Cpt 202 Group Coursework\heritage-resource-platform\backend"
mvn test
```

Note: I could not run Maven tests in this ChatGPT container because `mvn` is not installed here. The test files are included and should run in your local environment where Maven is already available.
