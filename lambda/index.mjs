import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({ region: "ap-south-1" });
const db = DynamoDBDocumentClient.from(client);
const TABLE = "links";

function makeId(length) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const handler = async (event) => {
  console.log("EVENT:", JSON.stringify(event));

  const method = event.requestContext?.http?.method || "GET";
  const path = event.requestContext?.http?.path || "/";

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  try {
    if (method === "OPTIONS") {
      return { statusCode: 200, headers, body: "" };
    }

    if (method === "POST" && path === "/links") {
      const body = JSON.parse(event.body || "{}");
      if (!body.url) return { statusCode: 400, headers, body: JSON.stringify({ error: "url is required" }) };
      const code = makeId(6);
      await db.send(new PutCommand({
        TableName: TABLE,
        Item: { code, target_url: body.url, created_at: new Date().toISOString(), click_count: 0 }
      }));
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ code, short_url: `https://os81p4yzp7.execute-api.ap-south-1.amazonaws.com/${code}` })
      };
    }

    if (method === "GET" && path === "/admin/links") {
      const result = await db.send(new ScanCommand({ TableName: TABLE }));
      return { statusCode: 200, headers, body: JSON.stringify(result.Items || []) };
    }

    if (method === "GET" && path !== "/") {
      const code = path.replace("/", "");
      const result = await db.send(new GetCommand({ TableName: TABLE, Key: { code } }));
      if (!result.Item) return { statusCode: 404, headers, body: JSON.stringify({ error: "Not found" }) };
      await db.send(new UpdateCommand({
        TableName: TABLE,
        Key: { code },
        UpdateExpression: "ADD click_count :one",
        ExpressionAttributeValues: { ":one": 1 }
      }));
      return { statusCode: 301, headers: { ...headers, Location: result.Item.target_url }, body: "" };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Bad request" }) };

  } catch (err) {
    console.error("ERROR:", err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};