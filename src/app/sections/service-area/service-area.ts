import {
  AfterViewInit,
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  PLATFORM_ID,
  ViewChild,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type * as Leaflet from 'leaflet';
import type { Feature, FeatureCollection } from 'geojson';

const MONTEREY_PENINSULA_CENTER: [number, number] = [36.5836, -121.8694];

const TILE_LAYERS = {
  Streets: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  Light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  },
};

const PARCELS_SERVICE_URL =
  'https://services6.arcgis.com/WO0sGX0trRMTSZz9/arcgis/rest/services/Parcels_Addressed_withDesignators/FeatureServer/0/query';
const PAGE_SIZE = 2000;

const OUT_FIELDS = [
  'Number_and_Street',
  'UNIT_IDENTIFIER',
  'Number',
  'Street_Name',
  'Street_Suffix',
  'ZIP_Code',
  'Descriptive_Address_1',
  'Descriptive_Address_2',
  'Descriptive_Address_3',
  'APN',
  'Block__',
  'Prefix',
  'APN_1',
  'Suffix',
  'Land_Use_Code',
].join(',');

const FIELD_LABELS: [field: string, alias: string][] = [
  ['Number_and_Street', 'Address Number with Street'],
  ['UNIT_IDENTIFIER', 'Unit Identifier'],
  ['Number', 'Address Number'],
  ['Street_Name', 'Street Name'],
  ['Street_Suffix', 'Street Suffix'],
  ['ZIP_Code', 'ZIP Code'],
  ['Descriptive_Address_1', 'Descriptive Address 1'],
  ['Descriptive_Address_2', 'Descriptive Address 2'],
  ['Descriptive_Address_3', 'Descriptive Address 3'],
  ['APN', 'APN'],
  ['Block__', 'Block_'],
  ['Prefix', 'APN Prefix'],
  ['APN_1', 'APN Short 1'],
  ['Suffix', 'APN Suffix'],
  ['Land_Use_Code', 'Land Use Code'],
];

const DEFAULT_ZOOM = 17;
const LABEL_MIN_ZOOM = 16;
const ADDRESS_LABEL_ZOOM = 19;

type ParcelCategory = 'Single Unit' | 'Multi-Unit' | 'Address Not Assigned';

const CATEGORY_COLORS: Record<ParcelCategory, string> = {
  'Single Unit': 'rgb(135,175,199)',
  'Multi-Unit': 'rgb(152,163,200)',
  'Address Not Assigned': 'rgb(191,191,191)',
};

function classifyParcel(feature: Feature): ParcelCategory {
  const props = feature.properties ?? {};
  const number = props['Number'];
  const unitIdentifier = props['UNIT_IDENTIFIER'];

  if (!number || String(number).trim() === '') {
    return 'Address Not Assigned';
  }
  if (unitIdentifier && String(unitIdentifier).trim() !== '') {
    return 'Multi-Unit';
  }
  return 'Single Unit';
}

function parcelStyle(feature: Feature): Leaflet.PathOptions {
  const category = classifyParcel(feature);
  return {
    color: '#000',
    weight: 1.5,
    fillColor: CATEGORY_COLORS[category],
    fillOpacity: 0.6,
  };
}

const SELECTED_STYLE: Leaflet.PathOptions = {
  color: '#1d4ed8',
  weight: 2,
  fillColor: '#2563eb',
  fillOpacity: 0.7,
};

function buildPopupHtml(feature: Feature): string {
  const props = feature.properties ?? {};
  const cellStyle = 'text-align:left;padding:2px 6px;border-bottom:1px solid #eee;';
  const rows = FIELD_LABELS.map(([field, alias], i) => {
    const value = props[field];
    const rowBg = i % 2 === 1 ? '#f5f5f5' : '#ffffff';
    return (
      `<tr style="background:${rowBg}">` +
      `<th style="${cellStyle}font-weight:600;color:#555;white-space:nowrap;">${alias}</th>` +
      `<td style="${cellStyle}">${value ?? ''}</td>` +
      `</tr>`
    );
  }).join('');

  return (
    `<div style="width:380px;font-size:11px;">` +
    `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;` +
    `padding:10px 32px 10px 14px;border-bottom:1px solid #ccc;font-weight:700;font-size:12px;">` +
    `<span>Parcels_Addressed_withDesignators:</span>` +
    `<button class="zoom-to-btn" type="button" style="flex-shrink:0;padding:3px 10px;` +
    `font-size:10px;cursor:pointer;border:1px solid #999;background:#f5f5f5;">Zoom to</button>` +
    `</div>` +
    `<div style="max-height:220px;overflow-y:auto;padding:6px 12px;">` +
    `<table class="parcel-popup-table" style="border-collapse:collapse;width:100%;">${rows}</table>` +
    `</div>` +
    `</div>`
  );
}

// Area-weighted centroid of a simple polygon ring (shoelace formula).
// Coordinates are translated relative to the first vertex before computing, since
// raw lng/lat values (~-121.9, ~36.5) are large relative to the polygon's extent
// (~1e-5 degrees), and the shoelace formula loses precision to floating-point
// cancellation if used directly on untranslated coordinates.
// Falls back to a plain vertex average if the ring is degenerate (zero area).
function getPolygonCentroid(ring: [number, number][]): [number, number] {
  const [ox, oy] = ring[0];
  let area = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < ring.length - 1; i++) {
    const x0 = ring[i][0] - ox;
    const y0 = ring[i][1] - oy;
    const x1 = ring[i + 1][0] - ox;
    const y1 = ring[i + 1][1] - oy;
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }

  area /= 2;

  if (Math.abs(area) < 1e-12) {
    const n = ring.length - 1;
    const avg = ring
      .slice(0, -1)
      .reduce((acc, [x, y]) => [acc[0] + x / n, acc[1] + y / n], [0, 0]);
    return [avg[0], avg[1]];
  }

  return [cx / (6 * area) + ox, cy / (6 * area) + oy];
}

// Returns [lat, lng]. Falls back to the given bounds-center tuple for non-Polygon geometries.
function getLabelPosition(feature: Feature, fallback: [number, number]): [number, number] {
  const geometry = feature.geometry;
  if (geometry?.type === 'Polygon') {
    const [lng, lat] = getPolygonCentroid(geometry.coordinates[0] as [number, number][]);
    return [lat, lng];
  }
  return fallback;
}

const LABEL_TEXT_SHADOW = [
  '-1px -1px 0 #fff',
  '1px -1px 0 #fff',
  '-1px 1px 0 #fff',
  '1px 1px 0 #fff',
  '0 0 3px #fff',
].join(',');

function buildLabelHtml(text: string, widthPx: number, heightPx: number): string {
  return (
    `<span style="display:flex;align-items:center;justify-content:center;` +
    `width:${widthPx}px;height:${heightPx}px;white-space:normal;word-break:break-word;` +
    `text-align:center;line-height:1.15;font-size:10px;font-weight:600;color:#000;` +
    `text-shadow:${LABEL_TEXT_SHADOW};">${text}</span>`
  );
}

@Component({
  selector: 'app-service-area',
  imports: [],
  templateUrl: './service-area.html',
  styleUrl: './service-area.scss',
})
export class ServiceArea implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  isLoading = signal(true);

  private map?: Leaflet.Map;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {}

  async ngAfterViewInit(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const leafletModule: unknown = await import('leaflet');
    const L: typeof Leaflet = (leafletModule as { default?: typeof Leaflet }).default ?? (leafletModule as typeof Leaflet);

    const map = L.map(this.mapContainer.nativeElement, {
      center: MONTEREY_PENINSULA_CENTER,
      zoom: 11,
      scrollWheelZoom: false,
      preferCanvas: true,
    });
    this.map = map;

    const streets = L.tileLayer(TILE_LAYERS.Streets.url, {
      attribution: TILE_LAYERS.Streets.attribution,
      maxZoom: 19,
    }).addTo(map);

    const light = L.tileLayer(TILE_LAYERS.Light.url, {
      attribution: TILE_LAYERS.Light.attribution,
      maxZoom: 19,
    });

    L.control.layers({ Streets: streets, Light: light }, undefined, { position: 'bottomleft' }).addTo(map);

    const legend = new L.Control({ position: 'topright' });
    legend.onAdd = () => {
      const div = L.DomUtil.create('div', 'service-area-legend');
      div.style.cssText =
        'background:#fff;min-width:200px;font-size:13px;color:#000;' +
        'box-shadow:0 2px 8px rgba(0,0,0,0.3);border:1px solid #ccc;';

      const legendItem = (color: string, label: string) =>
        `<div style="display:flex;align-items:center;gap:8px;padding:3px 14px;">` +
        `<span style="display:inline-block;width:16px;height:14px;background:${color};` +
        `border:1.5px solid #000;transform:skewX(-12deg);flex-shrink:0;"></span>` +
        `<span>${label}</span>` +
        `</div>`;

      div.innerHTML =
        `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;` +
        `padding:8px 10px;border-bottom:1px solid #ccc;font-weight:700;font-size:15px;">` +
        `<span>Legend</span>` +
        `<button class="legend-close" type="button" style="border:none;background:transparent;` +
        `font-size:16px;line-height:1;cursor:pointer;padding:0 2px;">&times;</button>` +
        `</div>` +
        `<div style="padding:8px 14px 2px;font-weight:700;">Addressed Parcels</div>` +
        `<div style="padding:0 14px 6px;color:#444;">Addressed Parcels</div>` +
        legendItem(CATEGORY_COLORS['Single Unit'], 'Single Unit') +
        legendItem(CATEGORY_COLORS['Multi-Unit'], 'Multi-Unit') +
        legendItem(CATEGORY_COLORS['Address Not Assigned'], 'Address Not Assigned') +
        `<div style="padding-bottom:6px;"></div>`;

      div.querySelector('.legend-close')?.addEventListener('click', () => {
        map.removeControl(legend);
      });

      return div;
    };
    legend.addTo(map);

    try {
      const parcels = await this.fetchAllParcels();

      const labelData: {
        center: [number, number];
        bounds: Leaflet.LatLngBounds;
        numberText: string;
        addressText: string;
      }[] = [];

      let selectedLayer: Leaflet.Path | null = null;
      let selectedFeature: Feature | null = null;

      const parcelLayer = L.geoJSON(parcels, {
        style: (feature) => parcelStyle(feature as Feature),
        onEachFeature: (feature, layer) => {
          const pathLayer = layer as Leaflet.Path;

          // Popup content is built lazily on open (not here) — building it for all
          // ~4,000 parcels up front is wasted work since most never get clicked.
          layer.bindPopup('', { className: 'parcel-popup', maxWidth: 380 });

          layer.on('click', () => {
            if (selectedLayer && selectedFeature && selectedLayer !== pathLayer) {
              selectedLayer.setStyle(parcelStyle(selectedFeature));
            }
            pathLayer.setStyle(SELECTED_STYLE);
            selectedLayer = pathLayer;
            selectedFeature = feature;
          });

          layer.on('popupopen', (e) => {
            e.popup.setContent(buildPopupHtml(feature));

            const popupEl = e.popup.getElement();
            const zoomBtn = popupEl?.querySelector<HTMLButtonElement>('.zoom-to-btn');
            zoomBtn?.addEventListener('click', () => {
              map.fitBounds((layer as Leaflet.Polygon).getBounds(), { maxZoom: 21, padding: [20, 20] });
            });
          });

          const featureBounds = (layer as Leaflet.Polygon).getBounds();
          const boundsCenter = featureBounds.getCenter();
          labelData.push({
            center: getLabelPosition(feature, [boundsCenter.lat, boundsCenter.lng]),
            bounds: featureBounds,
            numberText: String(feature.properties?.['Number'] ?? ''),
            addressText: String(feature.properties?.['Number_and_Street'] ?? ''),
          });
        },
      }).addTo(map);

      const activeLabelMarkers = new Map<number, Leaflet.Marker>();
      const MIN_LABEL_SIZE_PX = 24;
      const MAX_LABEL_SIZE_PX = 90;

      const renderVisibleLabels = () => {
        const zoom = map.getZoom();

        if (zoom < LABEL_MIN_ZOOM) {
          for (const marker of activeLabelMarkers.values()) {
            map.removeLayer(marker);
          }
          activeLabelMarkers.clear();
          return;
        }

        const bounds = map.getBounds();
        const showAddress = zoom >= ADDRESS_LABEL_ZOOM;

        const kept = new Map<
          number,
          { marker?: Leaflet.Marker; html: string; widthPx: number; heightPx: number }
        >();

        labelData.forEach((entry, index) => {
          if (!bounds.contains(entry.center)) {
            return;
          }

          const text = showAddress ? entry.addressText : entry.numberText;

          const nw = map.latLngToContainerPoint(entry.bounds.getNorthWest());
          const se = map.latLngToContainerPoint(entry.bounds.getSouthEast());
          const widthPx = Math.min(MAX_LABEL_SIZE_PX, Math.max(MIN_LABEL_SIZE_PX, Math.abs(se.x - nw.x)));
          const heightPx = Math.min(MAX_LABEL_SIZE_PX, Math.max(MIN_LABEL_SIZE_PX, Math.abs(se.y - nw.y)));

          kept.set(index, {
            marker: activeLabelMarkers.get(index),
            html: buildLabelHtml(text, widthPx, heightPx),
            widthPx,
            heightPx,
          });
        });

        for (const [index, marker] of activeLabelMarkers) {
          if (!kept.has(index)) {
            map.removeLayer(marker);
            activeLabelMarkers.delete(index);
          }
        }

        for (const [index, { marker, html, widthPx, heightPx }] of kept) {
          if (marker) {
            const icon = marker.options.icon as Leaflet.DivIcon;
            if (icon.options.html !== html) {
              icon.options.html = html;
              icon.options.iconSize = [widthPx, heightPx];
              icon.options.iconAnchor = [widthPx / 2, heightPx / 2];
              marker.setIcon(icon);
            }
          } else {
            const newMarker = L.marker(labelData[index].center, {
              icon: L.divIcon({
                className: 'parcel-label',
                html,
                iconSize: [widthPx, heightPx],
                iconAnchor: [widthPx / 2, heightPx / 2],
              }),
              interactive: false,
            }).addTo(map);
            activeLabelMarkers.set(index, newMarker);
          }
        }
      };

      map.on('moveend', renderVisibleLabels);

      const dataBounds = parcelLayer.getBounds();
      if (dataBounds.isValid()) {
        map.setView(dataBounds.getCenter(), DEFAULT_ZOOM);
      }

      renderVisibleLabels();
    } catch (err) {
      console.warn('Failed to load service area parcel data', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async fetchAllParcels(): Promise<FeatureCollection> {
    const countResponse = await fetch(`${PARCELS_SERVICE_URL}?where=1=1&returnCountOnly=true&f=json`);
    if (!countResponse.ok) {
      throw new Error(`Parcel count query failed: ${countResponse.status}`);
    }
    const countBody = (await countResponse.json()) as { count?: number; error?: unknown };
    if (countBody.error || typeof countBody.count !== 'number') {
      throw new Error(`Parcel count query returned an error: ${JSON.stringify(countBody.error ?? countBody)}`);
    }
    const count = countBody.count;

    const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));
    const pageRequests = Array.from({ length: pageCount }, (_, i) => {
      const offset = i * PAGE_SIZE;
      const url =
        `${PARCELS_SERVICE_URL}?where=1=1&outFields=${OUT_FIELDS}` +
        `&outSR=4326&f=geojson&resultRecordCount=${PAGE_SIZE}&resultOffset=${offset}`;
      return fetch(url).then((response) => {
        if (!response.ok) {
          throw new Error(`Parcel query failed: ${response.status}`);
        }
        return response.json() as Promise<FeatureCollection & { error?: unknown }>;
      });
    });

    const pages = await Promise.all(pageRequests);

    pages.forEach((page, i) => {
      if (page.error || !Array.isArray(page.features)) {
        throw new Error(`Parcel page ${i} returned an error: ${JSON.stringify(page.error ?? page)}`);
      }
    });

    const features: Feature[] = pages
      .flatMap((page) => page.features)
      .filter((feature): feature is Feature => {
        const geometry = feature?.geometry as { coordinates?: unknown } | undefined;
        return Array.isArray(geometry?.coordinates);
      });

    return { type: 'FeatureCollection', features };
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }
}
