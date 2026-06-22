import { Autocomplete, GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import { MapPin, Route } from "lucide-react";
import { MutableRefObject, useRef, useState } from "react";

type Props = {
  startLocation: string;
  endLocation: string;
  roundTrip: boolean;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
  onDistanceCalculated: (km: number) => void;
};

const libraries: ("places")[] = ["places"];
const australia = { lat: -25.2744, lng: 133.7751 };

export function MapsTripPicker({
  startLocation,
  endLocation,
  roundTrip,
  onStartChange,
  onEndChange,
  onDistanceCalculated
}: Props) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  if (!apiKey) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-200">
          <MapPin className="h-4 w-4" />
          Manual locations
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Add a Google Maps key to enable address autocomplete, map display, and automatic distance calculation.
        </p>
      </div>
    );
  }

  return (
    <MapsTripPickerEnabled
      apiKey={apiKey}
      startLocation={startLocation}
      endLocation={endLocation}
      roundTrip={roundTrip}
      onStartChange={onStartChange}
      onEndChange={onEndChange}
      onDistanceCalculated={onDistanceCalculated}
    />
  );
}

function MapsTripPickerEnabled({
  apiKey,
  startLocation,
  endLocation,
  roundTrip,
  onStartChange,
  onEndChange,
  onDistanceCalculated
}: Props & { apiKey: string }) {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
    preventGoogleFontsLoading: true
  });
  const startRef = useRef<google.maps.places.Autocomplete | null>(null);
  const endRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [startPoint, setStartPoint] = useState<google.maps.LatLngLiteral | null>(null);
  const [endPoint, setEndPoint] = useState<google.maps.LatLngLiteral | null>(null);
  const [status, setStatus] = useState<string>("");

  function readPlace(
    ref: MutableRefObject<google.maps.places.Autocomplete | null>,
    onText: (value: string) => void,
    onPoint: (value: google.maps.LatLngLiteral) => void
  ) {
    const place = ref.current?.getPlace();
    if (!place?.formatted_address || !place.geometry?.location) return;
    onText(place.formatted_address);
    onPoint({
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    });
  }

  function calculateDistance() {
    if (!startLocation.trim() || !endLocation.trim() || !window.google) return;
    setStatus("Calculating driving distance…");
    const service = new window.google.maps.DistanceMatrixService();
    service.getDistanceMatrix(
      {
        origins: [startPoint ?? startLocation.trim()],
        destinations: [endPoint ?? endLocation.trim()],
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.METRIC
      },
      (response, matrixStatus) => {
        const result = response?.rows[0]?.elements[0];
        if (matrixStatus === "OK" && result?.status === "OK") {
          const oneWayKm = Math.round((result.distance.value / 1000) * 10) / 10;
          onDistanceCalculated(oneWayKm);
          const totalKm = roundTrip ? Math.round(oneWayKm * 2 * 10) / 10 : oneWayKm;
          setStatus(
            roundTrip
              ? `Calculated ${oneWayKm.toFixed(1)} km each way, ${totalKm.toFixed(1)} km total`
              : `Calculated ${oneWayKm.toFixed(1)} km by road`
          );
        } else {
          setStatus("Distance could not be calculated for those locations");
        }
      }
    );
  }

  if (!isLoaded) {
    return <div className="h-64 rounded-lg bg-slate-100" />;
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="label">
          Start destination
          <Autocomplete
            onLoad={(ref) => {
              startRef.current = ref;
              ref.setComponentRestrictions({ country: "au" });
              ref.setFields(["formatted_address", "geometry", "name"]);
            }}
            onPlaceChanged={() => readPlace(startRef, onStartChange, setStartPoint)}
          >
            <input
              className="field w-full"
              placeholder="Search start destination"
              value={startLocation}
              onChange={(event) => {
                setStartPoint(null);
                onStartChange(event.target.value);
              }}
              required
            />
          </Autocomplete>
        </label>
        <label className="label">
          End destination
          <Autocomplete
            onLoad={(ref) => {
              endRef.current = ref;
              ref.setComponentRestrictions({ country: "au" });
              ref.setFields(["formatted_address", "geometry", "name"]);
            }}
            onPlaceChanged={() => readPlace(endRef, onEndChange, setEndPoint)}
          >
            <input
              className="field w-full"
              placeholder="Search end destination"
              value={endLocation}
              onChange={(event) => {
                setEndPoint(null);
                onEndChange(event.target.value);
              }}
              required
            />
          </Autocomplete>
        </label>
      </div>
      <GoogleMap
        center={startPoint ?? endPoint ?? australia}
        zoom={startPoint || endPoint ? 11 : 4}
        mapContainerClassName="h-72 w-full rounded-lg border border-slate-200"
        options={{ mapTypeControl: false, streetViewControl: false, fullscreenControl: false }}
      >
        {startPoint ? <Marker position={startPoint} label="A" /> : null}
        {endPoint ? <Marker position={endPoint} label="B" /> : null}
      </GoogleMap>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="min-h-5 text-sm text-slate-500">{status}</span>
        <button className="btn-secondary" type="button" onClick={calculateDistance} disabled={!startLocation.trim() || !endLocation.trim()}>
          <Route className="h-4 w-4" />
          Calculate Distance
        </button>
      </div>
    </div>
  );
}
