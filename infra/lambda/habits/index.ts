import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const HABITS_TABLE = process.env.HABITS_TABLE!;

interface Habit {
  id: string;
  userId: string;
  name: string;
  icon: string;
  color: string;
  scheduleDays: 'everyday' | number[] | { type: 'frequency'; timesPerWeek: number };
  startDate: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  sortOrder: number;
}

function getUserId(event: APIGatewayProxyEvent): string {
  // Extract user ID from Cognito claims
  const claims = event.requestContext.authorizer?.claims;
  if (!claims?.sub) {
    throw new Error('Unauthorized: No user ID found');
  }
  return claims.sub;
}

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(body),
  };
}

async function getHabits(userId: string, includeArchived: boolean): Promise<Habit[]> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: HABITS_TABLE,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    })
  );

  let habits = (result.Items || []) as Habit[];
  
  if (!includeArchived) {
    habits = habits.filter((h) => !h.archivedAt);
  }

  return habits.sort((a, b) => a.sortOrder - b.sortOrder);
}

async function getHabit(userId: string, habitId: string): Promise<Habit | null> {
  const result = await docClient.send(
    new GetCommand({
      TableName: HABITS_TABLE,
      Key: { userId, id: habitId },
    })
  );
  return (result.Item as Habit) || null;
}

async function createHabit(userId: string, data: Omit<Habit, 'userId'>): Promise<Habit> {
  const habit: Habit = {
    ...data,
    userId,
  };

  await docClient.send(
    new PutCommand({
      TableName: HABITS_TABLE,
      Item: habit,
    })
  );

  return habit;
}

async function updateHabit(userId: string, habitId: string, updates: Partial<Habit>): Promise<Habit> {
  const existing = await getHabit(userId, habitId);
  if (!existing) {
    throw new Error('Habit not found');
  }

  const updatedHabit: Habit = {
    ...existing,
    ...updates,
    userId,
    id: habitId,
    updatedAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: HABITS_TABLE,
      Item: updatedHabit,
    })
  );

  return updatedHabit;
}

async function deleteHabit(userId: string, habitId: string): Promise<void> {
  await docClient.send(
    new DeleteCommand({
      TableName: HABITS_TABLE,
      Key: { userId, id: habitId },
    })
  );
}

async function reorderHabits(userId: string, habitIds: string[]): Promise<void> {
  // Update sortOrder for each habit
  const writeRequests = habitIds.map((id, index) => ({
    PutRequest: {
      Item: {
        userId,
        id,
        sortOrder: index,
        updatedAt: new Date().toISOString(),
      },
    },
  }));

  // DynamoDB batch write has a limit of 25 items
  const chunks = [];
  for (let i = 0; i < writeRequests.length; i += 25) {
    chunks.push(writeRequests.slice(i, i + 25));
  }

  for (const chunk of chunks) {
    // Get existing habits first to preserve their data
    const habits = await Promise.all(
      chunk.map(async (req) => {
        const habit = await getHabit(userId, req.PutRequest.Item.id);
        if (habit) {
          return {
            ...habit,
            sortOrder: req.PutRequest.Item.sortOrder,
            updatedAt: req.PutRequest.Item.updatedAt,
          };
        }
        return null;
      })
    );

    const validHabits = habits.filter((h): h is Habit => h !== null);
    
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [HABITS_TABLE]: validHabits.map((habit) => ({
            PutRequest: { Item: habit },
          })),
        },
      })
    );
  }
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const userId = getUserId(event);
    const method = event.httpMethod;
    const habitId = event.pathParameters?.habitId;
    const path = event.resource;

    // GET /habits - List all habits
    if (method === 'GET' && path === '/habits') {
      const includeArchived = event.queryStringParameters?.includeArchived === 'true';
      const habits = await getHabits(userId, includeArchived);
      return response(200, { habits });
    }

    // GET /habits/{habitId} - Get single habit
    if (method === 'GET' && habitId) {
      const habit = await getHabit(userId, habitId);
      if (!habit) {
        return response(404, { error: 'Habit not found' });
      }
      return response(200, { habit });
    }

    // POST /habits - Create habit
    if (method === 'POST' && path === '/habits') {
      const body = JSON.parse(event.body || '{}');
      const habit = await createHabit(userId, body);
      return response(201, { habit });
    }

    // PUT /habits/{habitId} - Update habit
    if (method === 'PUT' && habitId) {
      const body = JSON.parse(event.body || '{}');
      const habit = await updateHabit(userId, habitId, body);
      return response(200, { habit });
    }

    // DELETE /habits/{habitId} - Delete habit
    if (method === 'DELETE' && habitId) {
      await deleteHabit(userId, habitId);
      return response(204, null);
    }

    // PUT /habits/reorder - Reorder habits
    if (method === 'PUT' && path === '/habits/reorder') {
      const body = JSON.parse(event.body || '{}');
      await reorderHabits(userId, body.habitIds);
      return response(200, { success: true });
    }

    return response(404, { error: 'Not found' });
  } catch (error) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return response(500, { error: message });
  }
}
