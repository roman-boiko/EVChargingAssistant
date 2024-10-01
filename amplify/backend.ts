import { defineBackend } from "@aws-amplify/backend";
import { CfnMap } from "aws-cdk-lib/aws-location";
import { Stack } from "aws-cdk-lib/core";
import { auth } from "./auth/resource";
import { data, chatFunction } from "./data/resource";
import { aws_events } from "aws-cdk-lib";
import {
  Policy,
  Effect,
  PolicyDocument,
  PolicyStatement,
  Role,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";


const backend = defineBackend({
  auth,
  data,
  chatFunction
});

// bedrock agent policy
backend.chatFunction.resources.lambda.addToRolePolicy(new PolicyStatement({
  actions: ["bedrock:InvokeAgent"],
  resources: ["*"],
}));



// create a geo stack
const geoStack = backend.createStack("geo-stack");

// create a location services map
const map = new CfnMap(geoStack, "Map", {
  mapName: "myMap",
  description: "Map",
  configuration: {
    style: "VectorEsriNavigation",
  },
  pricingPlan: "RequestBasedUsage",
  tags: [
    {
      key: "name",
      value: "myMap",
    },
  ],
});

// create an IAM policy to allow interacting with geo resource
const myGeoPolicy = new Policy(geoStack, "GeoPolicy", {
  policyName: "myGeoPolicy",
  statements: [
    new PolicyStatement({
      actions: [
        "geo:GetMapTile",
        "geo:GetMapSprites",
        "geo:GetMapGlyphs",
        "geo:GetMapStyleDescriptor",
      ],
      resources: [map.attrArn],
    }),
  ],
});

// apply the policy to the authenticated and unauthenticated roles
backend.auth.resources.authenticatedUserIamRole.attachInlinePolicy(myGeoPolicy);
backend.auth.resources.unauthenticatedUserIamRole.attachInlinePolicy(myGeoPolicy);

// patch the map resource to the expected output configuration
backend.addOutput({
  geo: {
    aws_region: geoStack.region,
    maps: {
      items: {
        [map.mapName]: {
          style: "VectorEsriNavigation",
        },
      },
      default: map.mapName,
    },
  },
});

// Create a new stack for the EventBridge data source
const eventBridgeStack = backend.createStack("event-bridge-stack");
//Reference default EventBridge bus
const eventBus = aws_events.EventBus.fromEventBusName(eventBridgeStack, "EventBus", "default");

//Add EventBridge data source
backend.data.addEventBridgeDataSource("CarLocationEventBridgeDataSource", eventBus);

// Create a policy statement to allow invoking the AppSync API's mutations
const policyStatement = new PolicyStatement({
  effect: Effect.ALLOW,
  actions: ["appsync:GraphQL"],
  resources: [`${backend.data.resources.graphqlApi.arn}/types/Mutation/*`],
});

// Create a role for the EventBus to assume
const eventBusRole = new Role(eventBridgeStack, "AppSyncInvokeRole", {
  assumedBy: new ServicePrincipal("events.amazonaws.com"),
  inlinePolicies: {
    PolicyStatement: new PolicyDocument({
      statements: [policyStatement],
    }),
  }
});

// Create an EventBridge rule to route events to the AppSync API to update the car location
const carLocationRule = new aws_events.CfnRule(eventBridgeStack, "CarLocationUpdate", {
  eventBusName: eventBus.eventBusName,
  name: "CarLocationEventBridgeRule",
  eventPattern: {
    source: ["aws.geo"],
    ["detail-type"]: ["Location Device Position Event"],
    detail: {
      EventType: ["UPDATE"],
      TrackerName: ["CarTracker"]
    },
  },
  targets: [
    {
      id: "carLocationReceiver",
      arn: backend.data.resources.cfnResources.cfnGraphqlApi
        .attrGraphQlEndpointArn,
      roleArn: eventBusRole.roleArn,
      appSyncParameters: {
        graphQlOperation: `
        mutation CarLocationUpdate(
          $deviceId: String!
          $latitude: String!
          $longitude: String!
        ) {
          carLocationUpdate(deviceId: $deviceId, latitude: $latitude, longitude: $longitude) {
            deviceId
            latitude
            longitude
          }
        }`,
      },
      inputTransformer: {
        inputPathsMap: {
          deviceId: "$.detail.DeviceId",
          latitude: "$.detail.Position[1]",
          longitude: "$.detail.Position[0]",
        },
        inputTemplate: JSON.stringify({
          deviceId: "<deviceId>",
          latitude: "<latitude>",
          longitude: "<longitude>",
        }),
      },
    },
  ],
});

// Create an EventBridge rule to route events to the AppSync API to update the chat on low battery
const lowBatteryChatRule = new aws_events.CfnRule(eventBridgeStack, "LowBatteryChatUpdate", {
  eventBusName: eventBus.eventBusName,
  name: "LowBatteryChatEventBridgeRule",
  eventPattern: {
    source: ["lowBatteryHandler.eventsHandler.lambda"],
    ["detail-type"]: ["lowBatteryChat"],
  },
  targets: [
    {
      id: "lowBatteryChatReceiver",
      arn: backend.data.resources.cfnResources.cfnGraphqlApi
        .attrGraphQlEndpointArn,
      roleArn: eventBusRole.roleArn,
      appSyncParameters: {
        graphQlOperation: `
        mutation lowBatteryChatUpdate(
          $message: String!
        ) {
          lowBatteryChatUpdate(message: $message) {
            message
          }
        }`,
      },
      inputTransformer: {
        inputPathsMap: {
          message: "$.detail.chat_message.completion",
        },
        inputTemplate: JSON.stringify({
          message: "<message>",
        }),
      },
    },
  ],
});

// Create an EventBridge rule to route events to the AppSync API to update the stations on low battery
const lowBatteryStationsRule = new aws_events.CfnRule(eventBridgeStack, "LowBatteryStationsUpdate", {
  eventBusName: eventBus.eventBusName,
  name: "LowBatteryStationsEventBridgeRule",
  eventPattern: {
    source: ["lowBatteryHandler.eventsHandler.lambda"],
    ["detail-type"]: ["lowBatterySations"],
  },
  targets: [
    {
      id: "lowBatteryStationsReceiver",
      arn: backend.data.resources.cfnResources.cfnGraphqlApi
        .attrGraphQlEndpointArn,
      roleArn: eventBusRole.roleArn,
      appSyncParameters: {
        graphQlOperation: `
        mutation lowBatteryStationsUpdate(
          $station1Address: String!
          $station1Latitude: String!
          $station1Longitude: String!
          $station1Distance: String!
          $station2Address: String!
          $station2Latitude: String!
          $station2Longitude: String!
          $station2Distance: String!
        ) {
          lowBatteryStationsUpdate(station1Address: $station1Address, station1Latitude: $station1Latitude, station1Longitude: $station1Longitude, station1Distance: $station1Distance, station2Address: $station2Address, station2Latitude: $station2Latitude, station2Longitude: $station2Longitude, station2Distance: $station2Distance) {
            station1Address
            station1Latitude
            station1Longitude
            station1Distance
            station2Address
            station2Latitude
            station2Longitude
            station2Distance
          }
        }`,
      },
      inputTransformer: {
        inputPathsMap: {
          station1Address: "$.detail.neareastStations.nearestChargingStations[0].address",
          station1Latitude: "$.detail.neareastStations.nearestChargingStations[0].coordinates[1]",
          station1Longitude: "$.detail.neareastStations.nearestChargingStations[0].coordinates[0]",
          station1Distance: "$.detail.neareastStations.nearestChargingStations[0].distance",
          station2Address: "$.detail.neareastStations.nearestChargingStations[1].address",
          station2Latitude: "$.detail.neareastStations.nearestChargingStations[1].coordinates[1]",
          station2Longitude: "$.detail.neareastStations.nearestChargingStations[1].coordinates[0]",
          station2Distance: "$.detail.neareastStations.nearestChargingStations[1].distance",
        },
        inputTemplate: JSON.stringify({
          station1Address: "<station1Address>",
          station1Latitude: "<station1Latitude>",
          station1Longitude: "<station1Longitude>",
          station1Distance: "<station1Distance>",
          station2Address: "<station2Address>",
          station2Latitude: "<station2Latitude>",
          station2Longitude: "<station2Longitude>",
          station2Distance: "<station2Distance>",
        }),
      },
    },
  ],
});

// Create an EventBridge rule to route events to the AppSync API to update info on the geoFence
const geoFenceRule = new aws_events.CfnRule(eventBridgeStack, "GeoFenceUpdate", {
  eventBusName: eventBus.eventBusName,
  name: "GeoFenceEventBridgeRule",
  eventPattern: {
    source: ["geofenceEventHandler.eventsHandler.lambda"],
    ["detail-type"]: ["GeofenceEventResult"],
  },
  targets: [
    {
      id: "geoFenceReceiver",
      arn: backend.data.resources.cfnResources.cfnGraphqlApi
        .attrGraphQlEndpointArn,
      roleArn: eventBusRole.roleArn,
      appSyncParameters: {
        graphQlOperation: `
        mutation geoFenceUpdate(
          $name: String!
          $latitude: String!
          $longitude: String!
          $message: String!
        ) {
          geoFenceUpdate(name: $name, latitude: $latitude, longitude: $longitude, message: $message) {
            name
            latitude
            longitude
            message
          }
        }`,
      },
      inputTransformer: {
        inputPathsMap: {
          name: "$.detail.name",
          latitude: "$.detail.geo[1]",
          longitude: "$.detail.geo[0]",
          message: "$.detail.chat_message",
        },
        inputTemplate: JSON.stringify({
          name: "<name>",
          latitude: "<latitude>",
          longitude: "<longitude>",
          message: "<message>",
        }),
      },
    },
  ],
});