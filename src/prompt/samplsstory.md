Implement a "Load Sample Story" feature on the QAGuard AI Requirement Analysis page.

IMPORTANT:
- Do not change the existing AI architecture.
- Do not change the OpenRouter provider.
- Do not change the Requirement Agent.
- Do not change the existing Analyze Requirement functionality.
- Do not introduce unnecessary dependencies.
- Preserve the current production behavior.

CURRENT SAMPLE FILE:
examples/story.md

GOAL:
Allow a user to click a button and automatically load the sample story from
examples/story.md into the existing requirement input field.

USER FLOW:

1. User opens the Requirement Analysis page.
2. User sees the existing requirement input textarea.
3. Add a clearly visible button near the requirement input:

   "Load Sample Story"

4. When the user clicks "Load Sample Story":
   - Fetch the contents of /examples/story.md.
   - Populate the existing requirement textarea with the file contents.
   - Do NOT automatically start AI analysis.
   - The user must still explicitly click "Analyze Requirement".

5. After the story is loaded, the textarea should remain fully editable.
   The user can modify the sample story before analyzing it.

6. Existing "Analyze Requirement" button must continue to work exactly as it
   currently does.

UX REQUIREMENTS:

- Use a secondary/outline style for "Load Sample Story" so it is visually
  different from the primary "Analyze Requirement" action.
- Add a small helper text such as:
  "Try the included demo login story"
- Show a loading state while the sample story is being fetched:
  "Loading sample..."
- Prevent multiple clicks while loading.
- If loading fails, show a user-friendly error message.
- Never expose implementation details or stack traces in the UI.
- After successful loading, the user should immediately see the story in the
  textarea.
- Do not automatically submit or analyze the story.

IMPLEMENTATION:

Use the existing Next.js architecture.

Prefer a simple client-side fetch of:

/examples/story.md

The file is located in the repository's public-facing static path.

IMPORTANT:
If the current Next.js application does not serve the repository-level
examples/story.md directly from /examples/story.md, implement the smallest
appropriate change to make the sample file accessible at runtime.

Do NOT duplicate the story content inside the React component.

The source of truth must remain:

examples/story.md

Do not hardcode the sample story into page.tsx.

PRESERVE STATE:

The existing workflow/localStorage behavior must continue working.

Loading the sample story should only update the requirement input.
It must not clear or modify existing generated test cases, test data,
reviews, automation artifacts, or quality data unless the existing application
already does that when a new requirement is explicitly analyzed.

ACCESSIBILITY:

- Button must have an accessible label.
- Keyboard navigation must work.
- Loading state should be understandable to screen readers.
- Do not use an icon alone without accessible text.

VERIFICATION:

After implementation:

1. Run npm run lint.
2. Run npm run build.
3. Verify the Requirement Analysis page.
4. Click "Load Sample Story".
5. Confirm examples/story.md contents appear in the textarea.
6. Confirm the story is editable.
7. Confirm no AI call occurs when "Load Sample Story" is clicked.
8. Click "Analyze Requirement".
9. Confirm the existing real Requirement Agent/OpenRouter flow executes.
10. Confirm generated analysis/test cases continue to work.
11. Confirm existing navigation and workflow state are not broken.

Do not commit or push changes.

At the end, report:
- files created/modified
- exact implementation approach
- lint result
- build result
- manual verification result
- confirmation that the sample story is NOT hardcoded in the React component
- confirmation that Analyze Requirement still uses the real AI agent