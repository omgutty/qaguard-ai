# User Story: User Login

## Story ID
QA-DEMO-001

## Title
User Login with Valid Credentials

## User Story
As a registered user,

I want to log in with my username and password,

So that I can securely access my account dashboard.

The login form must validate both fields before authentication.

## Acceptance Criteria

### AC-01: Successful Login
Given the user is on the login page,
When the user enters a valid username and valid password,
And clicks the Login button,
Then the user is authenticated and redirected to the dashboard.

### AC-02: Invalid Credentials
Given the user is on the login page,
When the user enters an invalid username or password,
And clicks the Login button,
Then login fails and a clear authentication error message is displayed.

## Test Environment

Environment: Demo / Staging

Application URL: https://example.com/login

## Test Data

Valid Username: demo.user@example.com

Valid Password: <VALID_PASSWORD>

Invalid Password: <INVALID_PASSWORD>
