import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
} from "@aws-sdk/client-apigatewaymanagementapi";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  DeleteCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";

const ddbClient = new DynamoDBClient({ region: "eu-west-2" });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export const handler = async (event) => {
  if (event.requestContext && event.requestContext.routeKey) {
    const { routeKey, connectionId } = event.requestContext;

    if (routeKey === "$connect") {
      console.log("Handling $connect route");
      return connectHandler(event);
    } else if (routeKey === "$disconnect") {
      console.log("Handling $connect route");
      return deleteConnection(connectionId);
    } else if (routeKey === "report") {
      try {
        const body = JSON.parse(event.body) || {};
        console.log("Body: ", JSON.stringify(body, undefined, 2));
        //const connectionId = connectionId || body.connectionId; // Assuming connectionId is sent in the message body
        if (!connectionId) {
          console.error("ConnectionId is required");
          return { statusCode: 400, body: "ConnectionId is required" };
        }
        return reportRouteHandler(body, connectionId);
      } catch (error) {
        console.error("Error parsing event body:", error);
        return { statusCode: 400, body: "Invalid request body" };
      }
    }
  }
};

const connectHandler = async ({
  requestContext: { connectionId, domainName, stage },
}) => {
  console.log(
    `Handling $connect route for connectionId: ${connectionId}, domainName: ${domainName}, stage: ${stage}`
  );
  await storeConnectionInfo(connectionId, domainName, stage);
  console.log("Connection details saved in dynamo");
  try {
    const res = {
      statusCode: 200,
      body: { message: "Connected", connectionId: connectionId },
    };
    // await sendMessageToClient(domainName, stage, res, connectionId);
  } catch (err) {
    console.error("Error sending connection info:", err);
    return { statusCode: 500, body: "Failed to connect." };
  }
  return { statusCode: 200, body: "Connected." };
};
const storeConnectionInfo = async (connectionId, domainName, stage) => {
  try {
    const params = {
      TableName: "WebSocketConnections",
      Item: {
        connectionId: connectionId,
        domainName: domainName,
        stage: stage,
        createdAt: new Date().toISOString(),
      },
    };
    await ddbDocClient.send(new PutCommand(params));
    console.log("Connection details saved in dynamo");
  } catch (e) {
    console.error("Error storing connection info:", e);
  }
};
const deleteConnection = async (connectionId) => {
  const params = {
    TableName: "WebSocketConnections",
    Key: {
      connectionId: connectionId,
    },
  };
  try {
    await ddbDocClient.send(new DeleteCommand(params));
    return { statusCode: 200, body: "Disconnected." };
  } catch (err) {
    console.error("Error deleting connection info:", err);
    return { statusCode: 500, body: "Failed to disconnect." };
  }
};

const reportRouteHandler = async (event, connectionId) => {
  console.log("report handler invoked");
  try {
    const connectionInfo = await getConnectionInfo(connectionId);

    if (!connectionInfo) {
      console.error("Connection info not found");
      return { statusCode: 400, body: "Connection not found" };
    }

    console.info(
      "connectionInfo found " + JSON.stringify(connectionInfo, undefined, 2)
    );

    const { domainName, stage } = connectionInfo;
    const { wrapperId = null, startDate = null, endDate = null } = event || {};

    console.log(
      `wrapperId: ${wrapperId}, startDate: ${startDate}, endDate: ${endDate}, domain: ${domainName}, stage: ${stage}`
    );
    if (wrapperId) {
      const res = await getData(wrapperId.toString(), startDate, endDate);
      await sendMessageToClient(domainName, stage, res, connectionId);
    } else {
      return { statusCode: 404, body: "Bad Request" };
    }

    const response = {
      statusCode: 200,
    };

    return response;
  } catch (e) {
    console.error("Error in custom route handler:", e);
    return { statusCode: 500, body: "Internal server error" };
  }
};

const getConnectionInfo = async (connectionId) => {
  const params = {
    TableName: "WebSocketConnections",
    Key: { connectionId: connectionId },
  };

  const { Item } = await ddbDocClient.send(new GetCommand(params));
  return Item;
};

async function sendMessageToClient(domainName, stage, response, connectionId) {
  const client = new ApiGatewayManagementApiClient({
    endpoint: `https://${domainName}/${stage}`,
  });
  const data = {
    filteredData: response,
  };
  const postToConnectionCommand = new PostToConnectionCommand({
    ConnectionId: connectionId,
    Data: Buffer.from(JSON.stringify(data)),
  });

  return await client.send(postToConnectionCommand);
}

async function getData(wrapperId, startDate, endDate) {
  let items = [];
  let lastEvaluatedKey = null;
  do {
    const params = {
      TableName: "prd-reporting",
      KeyConditionExpression:
        "wrapper_no = :wrapperId AND valuation_date BETWEEN :startDate AND :endDate",
      ExpressionAttributeValues: {
        ":wrapperId": wrapperId,
        ":startDate": startDate,
        ":endDate": endDate,
      },
    };
    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = lastEvaluatedKey;
    }

    try {
      const response = await ddbDocClient.send(new QueryCommand(params));

      if (response && response.Items) {
        items = items.concat(response.Items);
        lastEvaluatedKey = response.LastEvaluatedKey;
      } else {
        console.warn("Unexpected response structure from DynamoDB:", response);
        break;
      }
    } catch (error) {
      console.error("Error querying data from DynamoDB:", error);
      throw error;
    }
  } while (lastEvaluatedKey);
  console.log(
    "items received from dynamo: ",
    JSON.stringify(items, undefined, 2)
  );
  return items;
}
