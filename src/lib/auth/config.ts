/**
 * AWS Configuration
 * These values are populated after CDK deployment
 * 
 * After running `cdk deploy`, update these values from the stack outputs
 */
export const awsConfig = {
  // Cognito
  userPoolId: import.meta.env.VITE_USER_POOL_ID || '',
  userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID || '',
  
  // API Gateway
  apiEndpoint: import.meta.env.VITE_API_ENDPOINT || '',
  
  // Region
  region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
};

/**
 * Check if AWS is configured
 */
export function isAwsConfigured(): boolean {
  return !!(
    awsConfig.userPoolId &&
    awsConfig.userPoolClientId &&
    awsConfig.apiEndpoint
  );
}
