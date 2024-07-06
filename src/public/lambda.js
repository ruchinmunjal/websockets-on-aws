import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand } = require("@aws-sdk/lib-dynamodb");
const ddbClient = new DynamoDBClient({ region: "eu-west-2" });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const createApiGatewayManagementClient = (event) => {
  const endpoint = `https://${event.requestContext.domainName}/${event.requestContext.stage}`;
  return new ApiGatewayManagementApiClient({ endpoint });
};

export const handler = async (event) => {
  const client = createApiGatewayManagementClient(event);
  const route = event.requestContext.routeKey;
  const connectionId = event.requestContext.connectionId;
  let res = "event received as : " + JSON.stringify(event, undefined, 2);

  switch (route) {
    case "$connect":
      console.log(
        "Connection established with client for connectionId: " + connectionId
      );
      break;
    case "$disconnect":
      console.log("Connection closed for connectionId: " + connectionId);
      break;
    case "report":
      res = await getData(JSON.parse(event.body));
      await sendDataUri(client, res, connectionId);
      break;
    default:
      res += " route : default";
      console.log("Unknown route");
      break;
  }
  const response = {
    statusCode: 200,
  };
  return response;
};

async function sendDataUri(client, response, connectionId) {
  const data = {
    filteredData: response,
  };
  const postToConnectionCommand = new PostToConnectionCommand({
    ConnectionId: connectionId,
    Data: Buffer.from(JSON.stringify(data)),
  });

  return await client.send(postToConnectionCommand);
}

async function getData(req) {
  let items = [];
  let lastEvaluatedKey = null;
  do {
    const params = {
      TableName: "prd-reporting",
      KeyConditionExpression:
        "wrapperId = :wrapperId AND valuation_date BETWEEN :startDate AND :endDate",
      ExpressionAttributeValues: {
        ":wrapperId": req.wrapperId,
        ":startDate": req.startDate,
        ":endDate": req.endDate,
      },
      ExclusiveStartKey: lastEvaluatedKey,
    };

    try {
      const { Items, LastEvaluatedKey } = await ddbDocClient.send(
        new QueryCommand(params)
      );
      items = items.concat(Items);
      lastEvaluatedKey = LastEvaluatedKey;
    } catch (error) {
      console.error("Error querying data from DynamoDB:", error);
      throw error;
    }
  } while (lastEvaluatedKey);
}
