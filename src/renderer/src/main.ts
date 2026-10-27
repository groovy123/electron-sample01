import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'
import './styles/changed.css'

import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { vuetify } from './plugins/vuetify'
import { setupAgGrid } from './plugins/agGrid'

setupAgGrid()
createApp(App).use(router).use(vuetify).mount('#app')
