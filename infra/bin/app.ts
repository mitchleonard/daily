#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { HabitTrackerStack } from '../lib/habit-tracker-stack';

const app = new cdk.App();

new HabitTrackerStack(app, 'HabitTrackerStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'Daily Habit Tracker - Backend Infrastructure',
});
