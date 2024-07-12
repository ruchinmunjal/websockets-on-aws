const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require("@aws-sdk/client-apigatewaymanagementapi");

const ddbClient = new DynamoDBClient({ region: "your-region" });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const connectHandler = async ({ requestContext: { connectionId, domainName, stage } }) => {
  const params = {
    TableName: "WebSocketConnections",
    Item: { connectionId, domainName, stage },
  };

  try {
    await ddbDocClient.send(new PutCommand(params));
    return { statusCode: 200, body: "Connected." };
  } catch (err) {
    console.error("Error storing connection info:", err);
    return { statusCode: 500, body: "Failed to connect." };
  }
};

const getConnectionInfo = async (connectionId) => {
  const params = {
    TableName: "WebSocketConnections",
    Key: { connectionId }
  };

  const { Item } = await ddbDocClient.send(new GetCommand(params));
  return Item;
};

const sendMessageToClient = async (domainName, stage, connectionId, message) => {
  const client = new ApiGatewayManagementApiClient({
    endpoint: `https://${domainName}/${stage}`
  });

  try {
    await client.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: JSON.stringify(message),
    }));
  } catch (error) {
    console.error('Error sending message to WebSocket client:', error);
  }
};

const customRouteHandler = async (event, connectionId) => {
  // Get connection info from DynamoDB
  const connectionInfo = await getConnectionInfo(connectionId);
  
  if (!connectionInfo) {
    console.error("Connection info not found");
    return { statusCode: 400, body: "Connection not found" };
  }

  const { domainName, stage } = connectionInfo;

  // Process the incoming message
  const body = JSON.parse(event.body);
  const { wrapperId, startDate, endDate } = body;

  try {
    // Query data from DynamoDB (you'll need to implement this function)
    const data = await queryDataFromDynamoDB(parseInt(wrapperId), startDate, endDate);

    // Send response back to the client
    await sendMessageToClient(domainName, stage, connectionId, {
      message: data.length > 0 ? "Data retrieved successfully" : "No data found",
      data: data
    });

    return { statusCode: 200, body: "Message sent." };
  } catch (error) {
    console.error("Error in custom route handler:", error);
    await sendMessageToClient(domainName, stage, connectionId, { 
      message: "An error occurred while processing your request" 
    });
    return { statusCode: 500, body: "Error processing request." };
  }
};

exports.handler = async (event) => {
    if (event.requestContext && event.requestContext.routeKey) {
        const { routeKey, connectionId } = event.requestContext;
    
        if (routeKey === '$connect') {
          return connectHandler(event);
        } else if (routeKey === '$disconnect') {
          // Implement disconnect logic here
          return { statusCode: 200, body: "Disconnected." };
        }
      }
    
      // If we're here, it's likely a custom route or another type of invocation
      try {
        const body = JSON.parse(event.body || '{}');
        const connectionId = body.connectionId; // Assuming connectionId is sent in the message body
    
        if (!connectionId) {
          return { statusCode: 400, body: "ConnectionId is required" };
        }
    
        return customRouteHandler(event, connectionId);
      } catch (error) {
        console.error("Error parsing event body:", error);
        return { statusCode: 400, body: "Invalid request body" };
      }
};