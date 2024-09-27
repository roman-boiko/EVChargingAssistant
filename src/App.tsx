import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import '@aws-amplify/ui-react/styles.css';
import { useState } from 'react';
import { MapView } from '@aws-amplify/ui-react-geo';
import '@aws-amplify/ui-react-geo/styles.css';
import { Marker } from 'react-map-gl';
const client = generateClient<Schema>();
import { useEffect } from 'react';

function App() {
  const [isToggled, setIsToggled] = useState(false);
  const [{ latitude, longitude }, setMarkerLocation] = useState({
    latitude: 48.8566,
    longitude: 2.3522,
  });
  const [{ chargingOneLatitude, chargingOneLongitude, chargingOneOpacity }, setChargingOneLocation] = useState({
    chargingOneLatitude: 0,
    chargingOneLongitude: 0,
    chargingOneOpacity: 0
  })
  const [{ chargingTwoLatitude, chargingTwoLongitude, chargingTwoOpacity }, setChargingTwoLocation] = useState({
    chargingTwoLatitude: 0,
    chargingTwoLongitude: 0,
    chargingTwoOpacity: 0
  })
  const [chatMessages, setChatMessages] = useState<string[]>([]);
  const [inputText, setInputText] = useState<string>("");


  useEffect(() => {
    client.subscriptions.onCarLocationUpdate().subscribe({
      next: (data) => setMarkerLocation({
        latitude: Number(data.latitude) || 0,
        longitude: Number(data.longitude) || 0
      }),
      error: (error) => console.error(error),
    });
  }, []);


  return (

    <main style={{ display: "flex", flexDirection: "row", height: "100vh", width: "100vw" }}>
      <div style={{ flex: 3, padding: "10px", height: "50%" }}>
        <MapView style={{ height: "100%", width: "100%" }} initialViewState={{ longitude: 2.3522, latitude: 48.8566, zoom: 12 }}>
          <Marker longitude={longitude} latitude={latitude}>
            <div style={{ fontSize: '24px' }}>🚗</div>
          </Marker>
          <Marker longitude={chargingOneLongitude} latitude={chargingOneLatitude} style={{ opacity: chargingOneOpacity }}>
            <div style={{ fontSize: '24px' }}>🔋</div>
          </Marker>
          <Marker longitude={chargingTwoLongitude} latitude={chargingTwoLatitude} style={{ opacity: chargingTwoOpacity }}>
            <div style={{ fontSize: '24px' }}>🔋</div>
          </Marker>
        </MapView>
      </div>
      <div style={{ flex: 1, padding: "10px", display: "flex", flexDirection: "column" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center" }}>

            <p>Travel Advisor</p>
            <button style={{ marginLeft: "10px" }} onClick={() => setIsToggled(!isToggled)}>
              <span role="img" aria-label="microphone">{isToggled ? "🎤" : "🔇"}</span>
            </button>
          </div>
          <div style={{ borderBottom: "3px solid black", padding: "10px", height: "300px", width: "100%", overflowY: "scroll", flex: 1, marginBottom: "10px" }}>
            <p>{chatMessages}</p>
          </div>
          <input
            type="text"
            placeholder="Type your message here"
            style={{ width: "100%", marginBottom: "10px" }}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button style={{ width: "100%" }}>Submit</button>
        </div>
      </div>
    </main>
  );

}

export default App;
