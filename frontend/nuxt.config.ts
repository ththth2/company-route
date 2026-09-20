export default defineNuxtConfig({
  compatibilityDate:'2026-09-20',
  modules:['@nuxt/ui'],
  css:['~/assets/css/main.css'],
  devtools:{enabled:false},
  colorMode:{preference:'light'},
  ui:{fonts:false},
  runtimeConfig:{public:{apiBase:'http://localhost:4000',googleMapsApiKey:'',googleMapsMapId:''}},
  app:{head:{htmlAttrs:{lang:'th'},title:'visit our office | innovate AI',meta:[{name:'description',content:'ค้นหาเส้นทางมายัง Innovate AI พร้อมระยะทางและเวลาเดินทางโดยประมาณ'}]}},
});
