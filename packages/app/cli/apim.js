/**
 * Generates a declarative Kong config (kong.yml) from an OpenAPI object.
 * @param {object} openApi - The parsed OpenAPI document object
 * @returns {string} Kong declarative YAML configuration string
 */
export function generateKongConfig(openApi) {
  const serviceName = openApi.info?.title?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'api-service';
  const targetUrl = openApi.servers?.[0]?.url || 'http://localhost:8080';
  
  const kongServices = [{
    name: serviceName,
    url: targetUrl,
    routes: []
  }];
  
  const paths = openApi.paths || {};
  let routeCounter = 1;
  
  for (const [pathStr, pathObj] of Object.entries(paths)) {
    const methods = Object.keys(pathObj).filter(m => 
      ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(m.toLowerCase())
    );
    
    if (methods.length > 0) {
      kongServices[0].routes.push({
        name: `${serviceName}-route-${routeCounter++}`,
        paths: [pathStr.replace(/\{([^}]+)\}/g, '(?<$1>[^/]+)')], // basic path regex conversion
        methods: methods.map(m => m.toUpperCase())
      });
    }
  }

  // Generate a basic YAML structure (avoiding npm dependency for simplicity/standalone capability)
  const yamlLines = [
    `_format_version: "3.0"`,
    `services:`,
    `  - name: ${kongServices[0].name}`,
    `    url: ${kongServices[0].url}`,
    `    routes:`
  ];

  for (const route of kongServices[0].routes) {
    yamlLines.push(`      - name: ${route.name}`);
    yamlLines.push(`        paths:`);
    route.paths.forEach(p => yamlLines.push(`          - "${p}"`));
    yamlLines.push(`        methods:`);
    route.methods.forEach(m => yamlLines.push(`          - ${m}`));
  }

  return yamlLines.join('\n');
}

/**
 * Generates an AWS API Gateway OpenAPI document with mock integrations.
 * @param {object} openApi - The parsed OpenAPI document object
 * @returns {string} JSON-stringified AWS-augmented OpenAPI specification
 */
export function generateAwsGatewayConfig(openApi) {
  const augmentedOpenApi = JSON.parse(JSON.stringify(openApi)); // Deep clone
  const paths = augmentedOpenApi.paths || {};
  
  for (const [pathStr, pathObj] of Object.entries(paths)) {
    for (const [method, methodObj] of Object.entries(pathObj)) {
      if (['get', 'post', 'put', 'delete', 'patch'].includes(method.toLowerCase())) {
        // Inject x-amazon-apigateway-integration
        methodObj['x-amazon-apigateway-integration'] = {
          type: 'http_proxy',
          httpMethod: method.toUpperCase(),
          uri: `http://localhost:8080${pathStr}`, // default mock backend target URI
          responses: {
            default: {
              statusCode: '200'
            }
          },
          passthroughBehavior: 'when_no_match'
        };
      }
    }
  }

  return JSON.stringify(augmentedOpenApi, null, 2);
}

/**
 * Generates a Kubernetes Ingress YAML config routing paths defined in the OpenAPI doc.
 * @param {object} openApi - The parsed OpenAPI document object
 * @returns {string} Kubernetes Ingress YAML configuration string
 */
export function generateK8sIngress(openApi) {
  const serviceName = openApi.info?.title?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'api-service';
  const paths = openApi.paths || {};
  
  const ingressPaths = [];
  for (const pathStr of Object.keys(paths)) {
    ingressPaths.push({
      path: pathStr.replace(/\{([^}]+)\}/g, '*'), // convert path parameters to wildcards
      pathType: 'Prefix',
      backend: {
        service: {
          name: serviceName,
          port: {
            number: 80
          }
        }
      }
    });
  }

  const yamlLines = [
    `apiVersion: networking.k8s.io/v1`,
    `kind: Ingress`,
    `metadata:`,
    `  name: ${serviceName}-ingress`,
    `  annotations:`,
    `    nginx.ingress.kubernetes.io/ssl-redirect: "false"`,
    `spec:`,
    `  rules:`,
    `    - http:`,
    `        paths:`
  ];

  for (const p of ingressPaths) {
    yamlLines.push(`          - path: ${p.path}`);
    yamlLines.push(`            pathType: ${p.pathType}`);
    yamlLines.push(`            backend:`);
    yamlLines.push(`              service:`);
    yamlLines.push(`                name: ${p.backend.service.name}`);
    yamlLines.push(`                port:`);
    yamlLines.push(`                  number: ${p.backend.service.port.number}`);
  }

  return yamlLines.join('\n');
}
