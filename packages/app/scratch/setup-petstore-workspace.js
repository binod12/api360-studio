import { writeWorkspace } from '../cli/workspace.js';
import path from 'path';

const workspacePath = path.resolve('./scratch/petstore-workspace');

const petstoreWorkspaceData = {
  name: "Swagger Petstore Workspace",
  collections: [
    { id: "col-petstore", name: "Petstore Endpoints" }
  ],
  requests: [
    {
      id: "req-pet-find",
      collectionId: "col-petstore",
      method: "GET",
      name: "Find Pets by Status",
      url: "{{BASE_URL}}/pet/findByStatus",
      headers: [{ key: "Accept", value: "application/json", enabled: true }],
      params: [{ key: "status", value: "available", enabled: true }],
      body: "",
      preScript: "console.log('Querying available pets from Swagger Petstore API...')",
      postScript: "pm.test('Status is 200 OK', () => { pm.expect(pm.response.code).to.eql(200); })"
    },
    {
      id: "req-pet-create",
      collectionId: "col-petstore",
      method: "POST",
      name: "Add New Pet",
      url: "{{BASE_URL}}/pet",
      headers: [{ key: "Content-Type", value: "application/json", enabled: true }],
      params: [],
      body: JSON.stringify({ id: 887766, name: "Antigravity-Pet", status: "available" }),
      preScript: "console.log('Registering a new pet in the Petstore database...')",
      postScript: "pm.test('Pet created successfully', () => { pm.expect(pm.response.code).to.eql(200); })"
    }
  ],
  environments: [
    {
      id: "env-prod",
      name: "Production",
      variables: [
        { key: "BASE_URL", value: "https://petstore.swagger.io/v2", enabled: true }
      ]
    }
  ]
};

console.log("Generating Git-native workspace directories in scratch/petstore-workspace...");
writeWorkspace(workspacePath, petstoreWorkspaceData);
console.log("✓ Petstore workspace generated successfully.");
