import type { Schema } from "./resource";


export const handler: Schema["carLocationUpdate"]["functionHandler"] = async (
  event,
  context
) => {
  return {
    deviceId: event.arguments.deviceId,
    latitude: event.arguments.latitude,
    longitude: event.arguments.longitude,
  };
};