# Contract Testing Engine

If you are a QA Engineer validating a backend microservice, simply checking the `200 OK` status isn't enough. You need to assert that the payload strictly adheres to the schema.

API360 bundles `Ajv` to provide synchronous JSON Schema validations in the background.

## Defining the Baseline schema

1. Open the **Contract** configuration tab.
2. Write (or paste) your canonical [JSON Schema Validator v7](https://json-schema.org/) constraints.
```json
{
  "type": "object",
  "properties": {
    "userId": {
      "type": "number"
    },
    "title": {
      "type": "string"
    }
  },
  "required": [
    "userId",
    "title"
  ]
}
```

## Running Assertions

When you **Send** a network fetch, API360 waits for the response loop to terminate.
Before rendering the view to the screen, it runs the `ajv.compile()` execution environment against your Contract Schema and the returning HTTP `Response.data`.

- **Success**: The UI will append a green `✅ Contract Passed` badge next to the execution time.
- **Failure**: The UI will append a red `❌ Contract Failed` badge and print the explicitly invalid nodes dynamically over top of the Response window, indicating precisely what failed schema validation.
