import Mapbox, { MapView, Camera } from '@rnmapbox/maps';

Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '');

export default function MapScreen() {
  return (
    <MapView
      style={{ flex: 1 }}
      styleURL="mapbox://styles/analisisconsierra/cmpr7l3bq001401s3e0qoa374"
      scaleBarEnabled={false}
    >
      <Camera
        zoomLevel={16}
        centerCoordinate={[-74.0721, 4.7110]}
        pitch={40}        
        heading={0}       
        animationMode="flyTo"
        animationDuration={2000}
      />
    </MapView>
  );
}