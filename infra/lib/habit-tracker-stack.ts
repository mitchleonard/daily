import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';

export class HabitTrackerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ==================== COGNITO ====================
    const userPool = new cognito.UserPool(this, 'HabitTrackerUserPool', {
      userPoolName: 'habit-tracker-users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // Don't delete users on stack destroy
    });

    const userPoolClient = new cognito.UserPoolClient(this, 'HabitTrackerWebClient', {
      userPool,
      userPoolClientName: 'habit-tracker-web',
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          implicitCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
        callbackUrls: ['http://localhost:5173', 'https://daily.mitchleonard.com'],
        logoutUrls: ['http://localhost:5173', 'https://daily.mitchleonard.com'],
      },
      preventUserExistenceErrors: true,
    });

    // ==================== DYNAMODB ====================
    const habitsTable = new dynamodb.Table(this, 'HabitsTable', {
      tableName: 'habit-tracker-habits',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const logsTable = new dynamodb.Table(this, 'LogsTable', {
      tableName: 'habit-tracker-logs',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'habitId#date', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // GSI for querying logs by date range
    logsTable.addGlobalSecondaryIndex({
      indexName: 'byDate',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    // ==================== LAMBDA FUNCTIONS ====================
    const commonLambdaProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: {
        HABITS_TABLE: habitsTable.tableName,
        LOGS_TABLE: logsTable.tableName,
        USER_POOL_ID: userPool.userPoolId,
      },
    };

    // Habits Lambda
    const habitsLambda = new NodejsFunction(this, 'HabitsFunction', {
      ...commonLambdaProps,
      entry: path.join(__dirname, '../lambda/habits/index.ts'),
      handler: 'handler',
      functionName: 'habit-tracker-habits',
    });

    // Logs Lambda
    const logsLambda = new NodejsFunction(this, 'LogsFunction', {
      ...commonLambdaProps,
      entry: path.join(__dirname, '../lambda/logs/index.ts'),
      handler: 'handler',
      functionName: 'habit-tracker-logs',
    });

    // Grant DynamoDB permissions
    habitsTable.grantReadWriteData(habitsLambda);
    habitsTable.grantReadWriteData(logsLambda);
    logsTable.grantReadWriteData(logsLambda);

    // ==================== API GATEWAY ====================
    const api = new apigateway.RestApi(this, 'HabitTrackerApi', {
      restApiName: 'Habit Tracker API',
      description: 'API for Daily Habit Tracker',
      deployOptions: {
        stageName: 'prod',
        throttlingBurstLimit: 100,
        throttlingRateLimit: 50,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: ['http://localhost:5173', 'https://daily.mitchleonard.com'],
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key'],
        allowCredentials: true,
      },
    });

    // Cognito Authorizer
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [userPool],
      identitySource: 'method.request.header.Authorization',
    });

    const authorizerProps = {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };

    // Habits endpoints
    const habitsResource = api.root.addResource('habits');
    habitsResource.addMethod('GET', new apigateway.LambdaIntegration(habitsLambda), authorizerProps);
    habitsResource.addMethod('POST', new apigateway.LambdaIntegration(habitsLambda), authorizerProps);

    const habitResource = habitsResource.addResource('{habitId}');
    habitResource.addMethod('GET', new apigateway.LambdaIntegration(habitsLambda), authorizerProps);
    habitResource.addMethod('PUT', new apigateway.LambdaIntegration(habitsLambda), authorizerProps);
    habitResource.addMethod('DELETE', new apigateway.LambdaIntegration(habitsLambda), authorizerProps);

    // Bulk update for reordering
    const habitsReorderResource = habitsResource.addResource('reorder');
    habitsReorderResource.addMethod('PUT', new apigateway.LambdaIntegration(habitsLambda), authorizerProps);

    // Logs endpoints
    const logsResource = api.root.addResource('logs');
    logsResource.addMethod('GET', new apigateway.LambdaIntegration(logsLambda), authorizerProps);
    logsResource.addMethod('POST', new apigateway.LambdaIntegration(logsLambda), authorizerProps);

    const logResource = logsResource.addResource('{habitId}').addResource('{date}');
    logResource.addMethod('PUT', new apigateway.LambdaIntegration(logsLambda), authorizerProps);
    logResource.addMethod('DELETE', new apigateway.LambdaIntegration(logsLambda), authorizerProps);

    // ==================== OUTPUTS ====================
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
      exportName: 'HabitTrackerUserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
      exportName: 'HabitTrackerUserPoolClientId',
    });

    new cdk.CfnOutput(this, 'ApiEndpoint', {
      value: api.url,
      description: 'API Gateway Endpoint',
      exportName: 'HabitTrackerApiEndpoint',
    });

    new cdk.CfnOutput(this, 'Region', {
      value: this.region,
      description: 'AWS Region',
      exportName: 'HabitTrackerRegion',
    });
  }
}
