# Dynamic Environments

Environments allow you to abstract hardcoded strings (like base URLs or API keys) into reusable, scoped variables.

## The Variables Engine

Instead of duplicating staging and production endpoints everywhere, you can write dynamic interpolations anywhere in API360:
`{{baseUrl}}/v1/users/{{userId}}`

Whenever you dispatch a request or a script, the API360 resolution engine automatically regex-scans those boundaries and replaces the payload safely behind the scenes.

## Managing Environments

The top right corner of the application contains the Environment Picker dropdown.

1. **Global Constants**: If you don't select an environment, you still have access to a Global scope.
2. **Environment Modal**: Click the Folder icon to open the Environment CRUD matrix.
3. **Key Values**: Add your keys (e.g., `baseUrl`) and values (e.g., `https://api.stripe.com`). 

When you toggle the active dropdown from "Localhost" to "Staging", every tab actively recalculates its injections without forcing a rigid reload.
