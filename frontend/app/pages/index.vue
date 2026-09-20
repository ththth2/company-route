<script setup lang="ts">
import type {Company,RouteResult} from '~/types/route';
const config = useRuntimeConfig();
const company = ref<Company|null>(null);
const route = ref<RouteResult|null>(null);
const fetchingCompany = ref(true);
const busy = ref(false);
const error = ref('');
const phase = ref('');
async function loadCompany() {
  fetchingCompany.value=true;error.value='';
  try {company.value=await $fetch<Company>('/api/company',{baseURL:config.public.apiBase,timeout:60000,retry:0});}
  catch {error.value='เชื่อมต่อระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';}
  finally {fetchingCompany.value=false;}
}
onMounted(loadCompany);
const canRoute = computed(() => company.value?.routingAvailable && config.public.googleMapsApiKey && config.public.googleMapsMapId);
async function findRoute() {
  if (busy.value || !canRoute.value) return;
  busy.value=true;error.value='';route.value=null;phase.value='กำลังค้นหาตำแหน่งของคุณ';
  try {
    if (!navigator.geolocation) throw new Error('Geolocation unavailable');
    const position = await new Promise<GeolocationPosition>((resolve,reject) => navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,timeout:15000,maximumAge:0}));
    phase.value='กำลังคำนวณเส้นทางตามการจราจร';
    route.value=await $fetch<RouteResult>('/api/routes',{baseURL:config.public.apiBase,method:'POST',timeout:60000,retry:0,
      body:{latitude:position.coords.latitude,longitude:position.coords.longitude}});
  } catch (cause:unknown) {
    if (cause && typeof cause==='object' && 'code' in cause && typeof cause.code==='number') {
      error.value=cause.code===1 ? 'กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์ แล้วลองอีกครั้ง'
        : cause.code===3 ? 'ค้นหาตำแหน่งใช้เวลานานเกินไป กรุณาลองอีกครั้ง' : 'ไม่พบตำแหน่งปัจจุบัน กรุณาเปิดบริการตำแหน่ง';
    } else if (cause && typeof cause==='object' && 'data' in cause && cause.data && typeof cause.data==='object' && 'message' in cause.data && typeof cause.data.message==='string') {
      error.value=cause.data.message;
    } else error.value='ค้นหาเส้นทางไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง';
  } finally {busy.value=false;phase.value='';}
}
const number = new Intl.NumberFormat('th-TH',{maximumFractionDigits:1});
const duration = computed(() => {
  if (!route.value) return '—';
  const minutes=Math.ceil(route.value.durationSeconds/60);
  return minutes>=60 ? Math.floor(minutes/60)+' ชม. '+minutes%60+' นาที' : minutes+' นาที';
});
function time(value:string) {return new Intl.DateTimeFormat('th-TH',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Bangkok'}).format(new Date(value));}
</script>
<template>
  <div class="min-h-screen bg-zinc-50 text-zinc-900">
    <header class="border-b border-zinc-200 bg-white">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-8">
        <NuxtLink to="/" class="flex items-center gap-3" aria-label="Innovate AI หน้าหลัก">
          <span class="flex size-10 items-center justify-center rounded-xl bg-zinc-800 text-white"><UIcon name="i-lucide-route" class="size-6" /></span>
          <span class="text-lg font-bold tracking-tight">innovate<span class="text-zinc-700"> ai</span><span class="block text-[10px] font-medium tracking-[0.22em] text-zinc-500">VISIT OUR OFFICE</span></span>
        </NuxtLink>
        <UBadge color="neutral" variant="subtle" icon="i-lucide-map-pin">บางซื่อ · กรุงเทพฯ</UBadge>
      </div>
    </header>
    <main class="mx-auto max-w-7xl px-5 py-9 lg:px-8 lg:py-12">
      <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div><p class="mb-3 text-xs font-semibold tracking-[0.2em] text-zinc-700">YOUR JOURNEY TO INNOVATION</p><h1 class="text-3xl font-semibold leading-tight lg:text-4xl">เดินทางมาหาเรา</h1><p class="mt-3 text-sm leading-7 text-zinc-500">เส้นทางจากจุดที่คุณอยู่ สู่ Innovate AI พร้อมเวลาเดินทางโดยประมาณ</p></div>
        <div class="flex items-center gap-2 text-sm text-zinc-500"><UIcon name="i-lucide-car-front" class="size-5" />เดินทางด้วยรถยนต์</div>
      </div>
      <div class="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section class="space-y-5" aria-label="ข้อมูลการเดินทาง">
          <UCard :ui="{body:'p-6 sm:p-6'}">
            <p class="text-xs font-semibold tracking-widest text-zinc-400">DESTINATION</p>
            <div class="mt-4 flex gap-3"><span class="flex size-11 shrink-0 items-center justify-center rounded-xl bg-zinc-50 text-zinc-700"><UIcon name="i-lucide-building-2" class="size-6" /></span><div><h2 class="font-semibold">{{ company?.name || 'Innovate AI Co., Ltd.' }}</h2><p class="mt-2 text-sm leading-6 text-zinc-500">{{ company?.address || 'Siam Cement Rd. Bangsue Bangkok 10800' }}</p></div></div>
            <USeparator class="my-6" />
            <div class="mb-5 flex gap-3"><UIcon name="i-lucide-locate-fixed" class="mt-1 size-5 shrink-0 text-zinc-700" /><div><h3 class="text-sm font-medium">เริ่มจากตำแหน่งของคุณ</h3><p class="mt-1 text-xs leading-6 text-zinc-500">อนุญาตการเข้าถึงตำแหน่ง เพื่อค้นหาเส้นทางที่เหมาะกับการออกเดินทางตอนนี้</p></div></div>
            <UButton block size="xl" icon="i-lucide-navigation" :loading="busy || fetchingCompany" :disabled="!canRoute || fetchingCompany" @click="findRoute">{{ route ? 'คำนวณเส้นทางใหม่' : 'ค้นหาเส้นทางไปบริษัท' }}</UButton>
            <p v-if="phase" role="status" class="mt-3 text-center text-xs text-zinc-700">{{ phase }}</p>
            <p v-else class="mt-3 text-center text-xs text-zinc-400">ใช้ตำแหน่งเมื่อคุณกดค้นหาเท่านั้น</p>
          </UCard>
          <UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-alert" :description="error" role="alert" />
          <UButton v-if="!company && !fetchingCompany" block variant="outline" @click="loadCompany">ลองเชื่อมต่อระบบใหม่</UButton>
          <UAlert v-if="company && !canRoute" color="warning" variant="subtle" icon="i-lucide-info" title="กำลังเตรียมข้อมูลการเดินทาง" description="ระบบยังไม่พร้อมค้นหาเส้นทาง กรุณาติดต่อบริษัทเพื่อยืนยันจุดหมาย" />
          <UCard :ui="{body:'p-6 sm:p-6'}">
            <div class="flex items-center justify-between"><h2 class="text-sm font-semibold">สรุปการเดินทาง</h2><UBadge variant="subtle" :color="route ? 'primary' : 'neutral'">{{ route ? 'คำนวณแล้ว' : 'รอค้นหาเส้นทาง' }}</UBadge></div>
            <div class="mt-6 grid grid-cols-2 gap-4" aria-live="polite"><div><p class="text-xs text-zinc-500">ระยะทาง</p><p class="mt-2 text-2xl font-semibold">{{ route ? number.format(route.distanceMeters/1000) : '—' }}<span v-if="route" class="ml-1 text-xs font-normal text-zinc-500">กม.</span></p></div><div><p class="text-xs text-zinc-500">เวลาเดินทาง</p><p class="mt-2 text-xl font-semibold text-zinc-800">{{ duration }}</p></div></div>
            <div class="mt-5 flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3"><span class="text-xs text-zinc-500">คาดว่าจะถึงเวลา</span><span class="font-medium">{{ route ? time(route.estimatedArrivalAt)+' น.' : '—' }}</span></div>
            <p class="mt-4 text-xs leading-6 text-zinc-400">{{ route ? 'อัปเดต '+time(route.calculatedAt)+' น. · เวลากรุงเทพฯ' : 'ข้อมูลจะแสดงเมื่อค้นหาเส้นทางสำเร็จ' }}<br>เวลาโดยประมาณขึ้นอยู่กับสภาพการจราจร</p>
          </UCard>
        </section>
        <section class="flex min-h-[460px] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white lg:min-h-[680px]" aria-label="แผนที่เส้นทาง">
          <div class="flex items-center justify-between border-b border-zinc-100 px-5 py-4"><h2 class="flex items-center gap-2 text-sm font-medium"><UIcon name="i-lucide-map" class="size-4 text-zinc-700" />แผนที่การเดินทาง</h2><span class="text-xs text-zinc-400">Google Maps</span></div>
          <ClientOnly><RouteMap class="flex-1" :company="company" :route="route" /><template #fallback><div class="flex flex-1 items-center justify-center bg-zinc-100 text-sm text-zinc-500">กำลังเตรียมแผนที่</div></template></ClientOnly>
        </section>
      </div>
      <footer class="mt-9 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200 pt-5 text-xs text-zinc-400"><p>Innovate AI Co., Ltd. · Bangkok</p><nav class="flex gap-5"><NuxtLink to="/privacy" class="hover:text-zinc-700">ความเป็นส่วนตัว</NuxtLink><NuxtLink to="/terms" class="hover:text-zinc-700">ข้อกำหนดการใช้งาน</NuxtLink></nav></footer>
    </main>
  </div>
</template>
