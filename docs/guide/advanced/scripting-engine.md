# Programmatic API Testing (Scripting)

Testing isn't just about JSON Schemas. Sometimes you need to execute complex mathematical assertions, chain cryptographic keys, or programmatically extract and save Bearer tokens.

API360 includes a complete JavaScript evaluation sandbox designed to mock the industry-standard `pm.*` Postman SDK interface.

## Pre-Request Scripts

Open the **Scripts** tab to construct a Pre-Request routine.

This code executes strictly *before* the network stack builds the payload. It's intended strictly for mutating arguments or generating authorization secrets.

### Exposing The API360 Object
The `api360` namespace is exposed natively to your Javascript closures.

```javascript
// Example: Storing a timestamp token
const timeString = new Date().toISOString();
api360.environment.set('x-auth-timestamp', timeString);
```
API360 executes this logic synchronously. When you construct your REST body, you can safely reference the dynamic `{{x-auth-timestamp}}` payload safely knowing it was just derived locally!

## Post-Request Scripts

The bottom Monaco Editor on the **Scripts** tab handles Post-execution logic.

This sandbox spins up *after* the network stack receives the response buffer. Your scripts are injected with the `api360` object alongside the physical HTTP `response` payload.

### The Assertion Framework

You can rapidly execute Unit Tests to validate the returning structure.

```javascript
api360.test("Response is successful HTTP 200", function () {
    return response.status === 200;
});

api360.test("Security Clearance is Authorized", function () {
    const data = JSON.parse(response.body);
    return data.clearanceLevel === "admin";
});

// Programmatic key chaining
if (response.status === 200) {
    const body = JSON.parse(response.body);
    api360.environment.set("jwt_token", body.accessToken);
}
```

## The GUI Badges 
If you register `api360.test` callbacks, API360 executes them inside its native `Function()` evaluation bridge. 

The resulting booleans are translated instantly into the UI. The bottom status bar paints passing assertions as `✅ x/y Tests Passed`!
