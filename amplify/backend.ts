import { defineBackend } from "@aws-amplify/backend";
import { CfnMap } from "aws-cdk-lib/aws-location";
import { Stack } from "aws-cdk-lib/core";
import { auth } from "./auth/resource";
import { data } from "./data/resource";
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
});

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
  },
});

// Create an EventBridge rule to route events to the AppSync API
const rule = new aws_events.CfnRule(eventBridgeStack, "MyOrderRule", {
  eventBusName: eventBus.eventBusName,
  name: "CarLocationEventBridgeRule",
  eventPattern: {
    source: ["aws.geo"],
    /* The shape of the event pattern must match EventBridge's event message structure.
    So, this field must be spelled as "detail-type". Otherwise, events will not trigger the rule.

    https://docs.aws.amazon.com/AmazonS3/latest/userguide/ev-events.html
    */
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
          $timestamp: String!
          $mileage: String!
          $battery_level: String!
        ) {
          carLocationUpdate(orderId: $orderId, status: $status, message: $message) {
            deviceId
            latitude
            longitude
            timestamp
            mileage
            battery_level
          }
        }`,
      },
      inputTransformer: {
        inputPathsMap: {
          deviceId: "$.detail.deviceId",
          latitude: "$.detail.latitude",
          longitude: "$.detail.longitude",
          timestamp: "$.detail.timestamp",
          mileage: "$.detail.mileage",
          battery_level: "$.detail.battery_level",
        },
        inputTemplate: JSON.stringify({
          deviceId: "<deviceId>",
          latitude: "<latitude>",
          longitude: "<longitude>",
          timestamp: "<timestamp>",
          mileage: "<mileage>",
          battery_level: "<battery_level>",
        }),
      },
    },
  ],
});
