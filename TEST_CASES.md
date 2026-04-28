# Test Cases for Assigned Requirements

## TC-01 Password minimum length is enforced
- **Precondition:** User is logged in.
- **Steps:** Open Profile → Edit Profile → enter `1234567` in New Password → click Save Changes.
- **Expected Result:** The system blocks saving and shows `Password must be at least 8 characters`.

## TC-02 Blank password keeps current password
- **Precondition:** User is logged in.
- **Steps:** Open Profile → Edit Profile → leave New Password blank → update display name or bio → click Save Changes.
- **Expected Result:** Profile saves successfully and the current password is not changed.

## TC-03 Valid password update is saved securely
- **Precondition:** User is logged in.
- **Steps:** Open Profile → Edit Profile → enter `NewPass123` in New Password → click Save Changes → log out → log in with the new password.
- **Expected Result:** Profile update succeeds; the user can log in with `NewPass123`; the password is stored as a BCrypt hash, not plaintext.

## TC-04 Incomplete draft can be created
- **Precondition:** User has contributor/reviewer/admin role.
- **Steps:** Open Create New Resource → leave title/category/copyright blank → click Create Draft.
- **Expected Result:** Draft is created successfully and remains in `DRAFT` status.

## TC-05 Incomplete draft remains editable and does not duplicate
- **Precondition:** An incomplete draft exists.
- **Steps:** Open the draft edit page → add a description only → Save Changes → reopen the same draft.
- **Expected Result:** The entered description is still available, the status remains `DRAFT`, and no duplicate resource record is created.

## TC-06 Incomplete draft cannot be submitted for review
- **Precondition:** A draft is missing title, category, or copyright declaration.
- **Steps:** Go to My Resources → click Submit for Review on that draft.
- **Expected Result:** The system blocks submission and reports missing metadata.

## TC-07 Invalid URL is rejected
- **Precondition:** User is creating or editing a draft resource.
- **Steps:** Add external link URL `abc` or `ftp://example.com` → click Create Draft or Save Changes.
- **Expected Result:** The system blocks saving and shows a red validation error: `External link 1 must be a valid http or https URL` or backend message `URL must be a valid http or https address`.

## TC-08 Valid URL is saved and opens in a new tab
- **Precondition:** User is creating or editing a resource.
- **Steps:** Add external link `https://example.com` → save the resource → open resource detail page → click the link.
- **Expected Result:** The link is saved, displayed under External Links, and opens in a new browser tab.
