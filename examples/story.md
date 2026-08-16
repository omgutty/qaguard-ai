# User Story: User Login

## Story ID
QA-DEMO-001

## Title
User Login with Valid and Invalid Credentials

## User Story

As a registered user,

I want to log in to the application using my username and password,

So that I can securely access my account and use authorized application features.

## Background

The application provides authentication for registered users. Users must provide
valid credentials to access the application.

## Acceptance Criteria

### AC-01: Successful Login
Given the user is on the login page,
When the user enters a valid username and valid password,
And clicks the Login button,
Then the user should be successfully authenticated,
And the user should be redirected to the dashboard.

### AC-02: Invalid Username
Given the user is on the login page,
When the user enters an invalid username and a valid password,
And clicks the Login button,
Then the login should fail,
And an appropriate authentication error message should be displayed.

### AC-03: Invalid Password
Given the user is on the login page,
When the user enters a valid username and an invalid password,
And clicks the Login button,
Then the login should fail,
And an appropriate authentication error message should be displayed.

### AC-04: Empty Username
Given the user is on the login page,
When the username field is empty,
And the user enters a valid password,
And clicks the Login button,
Then the system should display a username validation message,
And authentication should not be attempted.

### AC-05: Empty Password
Given the user is on the login page,
When the user enters a valid username,
And the password field is empty,
And clicks the Login button,
Then the system should display a password validation message,
And authentication should not be attempted.

### AC-06: Empty Credentials
Given the user is on the login page,
When the username and password fields are empty,
And the user clicks the Login button,
Then validation messages should be displayed,
And authentication should not be attempted.

## Test Environment

Environment: Demo / Staging

Application URL: https://example.com/login

## Test Data

Valid Username: demo.user@example.com

Valid Password: <VALID_PASSWORD>

Invalid Username: invalid.user@example.com

Invalid Password: <INVALID_PASSWORD>

## Business Rules

- Only registered users can authenticate.
- Invalid credentials must not provide access to the application.
- Password values must not be exposed in generated test reports.
- Authentication errors should not reveal sensitive security information.