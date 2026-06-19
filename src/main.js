import { createApp } from 'vue'
import 'remixicon/fonts/remixicon.css'
import './style.css'
import App from './App.vue'
import { pinia } from './app/providers/pinia'
import { router } from './app/router'

createApp(App)
  .use(pinia)
  .use(router)
  .mount('#app')
