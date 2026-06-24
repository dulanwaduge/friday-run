import { Autocomplete, useLoadScript } from "@react-google-maps/api";
import { MapPin } from "lucide-react";
import { useRef } from "react";
import { usePublicConfig } from "../lib/publicConfig";

type Props = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

const libraries: ("places")[] = ["places"];

export function AddressAutocomplete({ label = "Address", value, onChange, required }: Props) {
  const config = usePublicConfig();
  const apiKey = config?.googleMapsApiKey;

  if (config && !apiKey) {
    return (
      <label className="label">
        {label}
        <input className="field" value={value} onChange={(event) => onChange(event.target.value)} required={required} />
      </label>
    );
  }

  if (!apiKey) {
    return (
      <label className="label">
        {label}
        <input className="field" value={value} onChange={(event) => onChange(event.target.value)} required={required} />
      </label>
    );
  }

  return <AddressAutocompleteEnabled apiKey={apiKey} label={label} value={value} onChange={onChange} required={required} />;
}

function AddressAutocompleteEnabled({ apiKey, label, value, onChange, required }: Props & { apiKey: string }) {
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries,
    preventGoogleFontsLoading: true
  });

  function applyPlace() {
    const place = autocompleteRef.current?.getPlace();
    if (place?.formatted_address) {
      onChange(place.formatted_address);
    }
  }

  return (
    <label className="label">
      {label}
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
        {isLoaded ? (
          <Autocomplete
            onLoad={(autocomplete) => {
              autocompleteRef.current = autocomplete;
              autocomplete.setComponentRestrictions({ country: "au" });
              autocomplete.setFields(["formatted_address", "geometry", "name"]);
            }}
            onPlaceChanged={applyPlace}
          >
            <input
              className="field w-full pl-9"
              placeholder="Search your address"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              required={required}
            />
          </Autocomplete>
        ) : (
          <input className="field w-full pl-9" value={value} onChange={(event) => onChange(event.target.value)} required={required} />
        )}
      </div>
    </label>
  );
}
