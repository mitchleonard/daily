# Daily Habit Tracker - AWS Infrastructure

This directory contains the AWS CDK infrastructure for the Daily habit tracker backend.

## Architecture

- **AWS Cognito** - User authentication (sign up, sign in, password reset)
- **Amazon DynamoDB** - NoSQL database for habits and logs
- **AWS Lambda** - Serverless API handlers
- **Amazon API Gateway** - REST API with Cognito authorization

## Prerequisites

1. **AWS Account** - You need an AWS account
2. **AWS CLI** - Install and configure the AWS CLI
3. **Node.js 18+** - Required for CDK

## Setup Instructions

### 1. Configure AWS CLI (One-time setup)

If you haven't already configured AWS CLI:

```bash
aws configure
```

Enter your:
- AWS Access Key ID
- AWS Secret Access Key  
- Default region (e.g., `us-east-1`)
- Default output format (e.g., `json`)

You can find your credentials in the AWS Console under IAM → Users → Your User → Security Credentials.

### 2. Install CDK Dependencies

```bash
cd infra
npm install
```

### 3. Bootstrap CDK (First time only)

If this is your first time using CDK in this AWS account/region:

```bash
npx cdk bootstrap
```

### 4. Deploy the Stack

```bash
npm run deploy
```

This will:
- Create a Cognito User Pool
- Create DynamoDB tables (habits, logs)
- Deploy Lambda functions
- Set up API Gateway

The deployment takes about 3-5 minutes.

### 5. Copy the Output Values

After deployment, you'll see output like:

```
Outputs:
HabitTrackerStack.ApiEndpoint = https://xxxxxxxx.execute-api.us-east-1.amazonaws.com/prod/
HabitTrackerStack.UserPoolId = us-east-1_XXXXXXXXX
HabitTrackerStack.UserPoolClientId = xxxxxxxxxxxxxxxxxxxxxxxxxx
HabitTrackerStack.Region = us-east-1
```

### 6. Configure the Frontend

Create or update the `.env` file in the project root:

```bash
# In the project root (habit-tracker/.env)
VITE_USER_POOL_ID=us-east-1_XXXXXXXXX
VITE_USER_POOL_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_API_ENDPOINT=https://xxxxxxxx.execute-api.us-east-1.amazonaws.com/prod
VITE_AWS_REGION=us-east-1
```

### 7. Restart the Dev Server

```bash
npm run dev
```

The app will now:
- Show a login/signup screen
- Store all data in DynamoDB
- Sync across all your devices

## Updating the Production Site

To use cloud sync on your deployed site (daily.mitchleonard.com):

1. Add these environment variables to your GitHub repository secrets:
   - `VITE_USER_POOL_ID`
   - `VITE_USER_POOL_CLIENT_ID`
   - `VITE_API_ENDPOINT`
   - `VITE_AWS_REGION`

2. Update your GitHub Actions workflow to use these secrets during build.

## Useful Commands

```bash
# Deploy changes
npm run deploy

# View deployed resources
npx cdk list

# Compare local vs deployed
npx cdk diff

# Destroy everything (careful!)
npm run destroy
```

## Cost Estimate

For personal use (1 user, ~100 habits/logs per month):

| Service | Monthly Cost |
|---------|-------------|
| Cognito | Free (50k MAUs free) |
| DynamoDB | Free (25 GB free) |
| Lambda | Free (1M requests free) |
| API Gateway | ~$0.01 |
| **Total** | **~$0.01/month** |

## Troubleshooting

### "Access Denied" errors
- Check your AWS CLI is configured: `aws sts get-caller-identity`
- Ensure your IAM user has admin permissions

### "Resource not found" errors  
- Run `npx cdk bootstrap` if you haven't already
- Check you're in the correct AWS region

### CORS errors in browser
- The API is configured to allow `localhost:5173` and `daily.mitchleonard.com`
- For other domains, update the CORS settings in `lib/habit-tracker-stack.ts`

### Authentication not working
- Verify the environment variables are set correctly
- Check the browser console for specific error messages
- Ensure you've restarted the dev server after adding env vars
