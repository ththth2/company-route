<script setup lang="ts">
import {importLibrary,setOptions} from '@googlemaps/js-api-loader';
import type {Company,RouteResult} from '~/types/route';
const props = defineProps<{company:Company|null;route:RouteResult|null}>();
const config = useRuntimeConfig();
const element = ref<HTMLElement>();
const error = ref('');
const loading = ref(false);
let map:google.maps.Map|undefined;
let line:google.maps.Polyline|undefined;
let markers:google.maps.marker.AdvancedMarkerElement[] = [];
let disposed = false;
let revision = 0;

async function draw() {
  if (!map) return;
  const current = ++revision;
  const [{AdvancedMarkerElement},{encoding}] = await Promise.all([importLibrary('marker'),importLibrary('geometry')]);
  if (disposed || current !== revision || !map) return;
  line?.setMap(null);
  markers.forEach(marker => {marker.map=null;});
  markers=[];
  const destination = props.company?.location;
  if (destination) markers.push(new AdvancedMarkerElement({map,title:props.company?.name,position:{lat:destination.latitude,lng:destination.longitude}}));
  if (props.route) {
    const path = encoding.decodePath(props.route.encodedPolyline);
    line = new google.maps.Polyline({map,path,strokeColor:'#52525b',strokeOpacity:1,strokeWeight:6});
    markers.push(new AdvancedMarkerElement({map,title:'ตำแหน่งเริ่มต้นของคุณ',position:{lat:props.route.origin.latitude,lng:props.route.origin.longitude}}));
    const bounds = new google.maps.LatLngBounds();
    path.forEach(point => bounds.extend(point));
    map.fitBounds(bounds,64);
  } else if (destination) {
    map.setCenter({lat:destination.latitude,lng:destination.longitude});
    map.setZoom(16);
  }
}
onMounted(async () => {
  if (!config.public.googleMapsApiKey || !config.public.googleMapsMapId) {error.value='แผนที่ยังไม่พร้อมใช้งาน กรุณาติดต่อบริษัท';return;}
  loading.value=true;
  try {
    setOptions({key:config.public.googleMapsApiKey,v:'quarterly',language:'th',region:'TH'});
    const {Map} = await importLibrary('maps');
    if (disposed || !element.value) return;
    // Bangkok overview only. Never used as the company destination.
    map = new Map(element.value,{center:{lat:13.7563,lng:100.5018},zoom:11,mapId:config.public.googleMapsMapId,mapTypeControl:false,streetViewControl:false,fullscreenControl:true});
    await draw();
  } catch {error.value='โหลด Google Map ไม่สำเร็จ กรุณาโหลดหน้านี้ใหม่';}
  finally {loading.value=false;}
});
watch(() => [props.company,props.route],() => {draw().catch(() => {error.value='แสดงเส้นทางไม่สำเร็จ กรุณาโหลดหน้าใหม่';});});
onBeforeUnmount(() => {disposed=true;revision++;line?.setMap(null);markers.forEach(marker => {marker.map=null;});});
</script>
<template>
  <div class="relative h-full min-h-96 bg-zinc-100">
    <div ref="element" class="absolute inset-0" aria-label="Google Map แสดงเส้นทางไปบริษัท" />
    <div v-if="error || loading" class="absolute inset-0 flex items-center justify-center p-8 text-center">
      <div class="max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm" role="status">
        <UIcon :name="loading ? 'i-lucide-loader-circle' : 'i-lucide-map-pinned'" class="mb-4 size-10 text-zinc-700" :class="{'animate-spin':loading}" />
        <p class="font-medium text-zinc-800">{{ loading ? 'กำลังโหลดแผนที่' : error }}</p>
        <p class="mt-2 text-sm leading-6 text-zinc-500">{{ company?.address || 'Siam Cement Rd. Bangsue Bangkok 10800' }}</p>
      </div>
    </div>
  </div>
</template>
