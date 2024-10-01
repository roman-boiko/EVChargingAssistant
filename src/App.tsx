import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import '@aws-amplify/ui-react/styles.css';
import { useState } from 'react';
import { MapView } from '@aws-amplify/ui-react-geo';
import '@aws-amplify/ui-react-geo/styles.css';
import { Marker, Popup } from 'react-map-gl';
const client = generateClient<Schema>();
import { useEffect } from 'react';

function App() {
  const [isToggled, setIsToggled] = useState(false);
  const [showOnePopup, setShowOnePopup] = useState(false);
  const [showTwoPopup, setShowTwoPopup] = useState(false);
  const [{ latitude, longitude }, setMarkerLocation] = useState({
    latitude: 48.8566,
    longitude: 2.3522,
  });
  const [{ chargingOneLatitude, chargingOneLongitude, chargingOneOpacity, chargingOneAddress, chargingOneDistance }, setChargingOneLocation] = useState({
    chargingOneLatitude: 0,
    chargingOneLongitude: 0,
    chargingOneOpacity: 0,
    chargingOneAddress: "",
    chargingOneDistance: ""
  })
  const [{ chargingTwoLatitude, chargingTwoLongitude, chargingTwoOpacity, chargingTwoAddress, chargingTwoDistance }, setChargingTwoLocation] = useState({
    chargingTwoLatitude: 0,
    chargingTwoLongitude: 0,
    chargingTwoOpacity: 0,
    chargingTwoAddress: "",
    chargingTwoDistance: ""
  })
  const [prompt, setPrompt] = useState<string>("");
  const [answer, setAnswer] = useState<string | null>(null);

  const sendPrompt = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { data, errors } = await client.queries.chat({
      message: prompt,
    });

    if (!errors) {
      setAnswer(data);
      setPrompt("");
    } else {
      console.log(errors);
    }
  };

  const handleOneMarkerClick = ({ originalEvent }) => {
    originalEvent.stopPropagation();
    setShowOnePopup(true);
  };

  const handleTwoMarkerClick = ({ originalEvent }) => {
    originalEvent.stopPropagation();
    setShowTwoPopup(true);
  };

  useEffect(() => {
    client.subscriptions.onlowBatteryChatUpdate().subscribe({
      next: (data) => setAnswer(data.message || ""),
      error: (error) => console.error(error),
    });
  }, []);

  useEffect(() => {
    client.subscriptions.onCarLocationUpdate().subscribe({
      next: (data) => setMarkerLocation({
        latitude: Number(data.latitude) || 0,
        longitude: Number(data.longitude) || 0
      }),
      error: (error) => console.error(error),
    });
  }, []);

  useEffect(() => {
    client.subscriptions.onlowBatteryStationsUpdate().subscribe({
      next: (data) => {
        setChargingOneLocation({
          chargingOneLatitude: Number(data.station1Latitude) || 0,
          chargingOneLongitude: Number(data.station1Longitude) || 0,
          chargingOneOpacity: 1,
          chargingOneAddress: data.station1Address || "",
          chargingOneDistance: data.station1Distance || ""
        });
      },
      error: (error) => console.error(error),
    });
  }, []);

  useEffect(() => {
    client.subscriptions.onlowBatteryStationsUpdate().subscribe({
      next: (data) => {
        setChargingTwoLocation({
          chargingTwoLatitude: Number(data.station2Latitude) || 0,
          chargingTwoLongitude: Number(data.station2Longitude) || 0,
          chargingTwoOpacity: 1,
          chargingTwoAddress: data.station2Address || "",
          chargingTwoDistance: data.station2Distance || ""
        });
      },
      error: (error) => console.error(error),
    });
  }, []);



  return (

    <main style={{ display: "flex", flexDirection: "row", height: "100vh", width: "100vw" }}>
      <div style={{ flex: 3, padding: "10px", height: "100%" }}>
        <MapView style={{ height: "100%", width: "100%" }} initialViewState={{ longitude: 2.3522, latitude: 48.8566, zoom: 12 }}>
          <Marker longitude={longitude} latitude={latitude}>
            <div style={{ fontSize: '24px' }}>🚗</div>
          </Marker>
          <Marker longitude={chargingOneLongitude} latitude={chargingOneLatitude} style={{ opacity: chargingOneOpacity }} onClick={handleOneMarkerClick}>
            <div style={{ fontSize: '24px' }}>🔋</div>
          </Marker>
          {showOnePopup && (
            <Popup
              latitude={chargingOneLatitude}
              longitude={chargingOneLongitude}
              offset={{ bottom: [0, -40] }}
              onClose={() => setShowOnePopup(false)}
            >
              <p>{chargingOneAddress}</p>
              <p>Distance: {chargingOneDistance}</p>
            </Popup>
          )}
          <Marker longitude={chargingTwoLongitude} latitude={chargingTwoLatitude} style={{ opacity: chargingTwoOpacity }} onClick={handleTwoMarkerClick}>
            <div style={{ fontSize: '24px' }}>🔋</div>
          </Marker>
          {showTwoPopup && (
            <Popup
              latitude={chargingTwoLatitude}
              longitude={chargingTwoLongitude}
              offset={{ bottom: [0, -40] }}
              onClose={() => setShowTwoPopup(false)}
            >
              <p>{chargingTwoAddress}</p>
              <p>Distance: {chargingTwoDistance}</p>
            </Popup>
          )}
        </MapView>
      </div>
      <div style={{ flex: 1, padding: "10px", display: "flex", flexDirection: "column", height: "100%" }}>
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <p>Travel Advisor</p>
            <button style={{ marginLeft: "10px" }} onClick={() => setIsToggled(!isToggled)}>
              <span role="img" aria-label="microphone">{isToggled ? "🎤" : "🔇"}</span>
            </button>
          </div>
          <div style={{ borderBottom: "3px solid black", padding: "10px", flex: 1, width: "100%", overflowY: "scroll", marginBottom: "10px" }}>
            <p>{answer}</p>
          </div>
          <form onSubmit={sendPrompt}>
            <input
              type="text"
              placeholder="Type your message here"
              style={{ width: "100%", marginBottom: "10px" }}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </form>
        </div>
      </div>
    </main>
  );

}

export default App;
